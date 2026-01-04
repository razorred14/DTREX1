use axum::{
    middleware,
    routing::{get, post},
    Router,
};
use std::net::SocketAddr;
use tower_http::cors::CorsLayer;
use tower_cookies::CookieManagerLayer;
use tracing_subscriber;

mod api;
mod blockchain;
mod rpc;
mod storage;
mod util;
mod app_state;
mod store;
mod ctx;
mod model;
mod error;

pub use self::error::{Error, Result};
use app_state::AppState;
use model::ModelManager;
use api::mw_auth::mw_ctx_resolve;

#[tokio::main]
async fn main() {
    // Initialize tracing
    tracing_subscriber::fmt::init();

    // Load environment variables
    dotenv::dotenv().ok();

    // Initialize database
    let db = store::new_db_pool()
        .await
        .expect("Failed to connect to database");
    
    let mm = ModelManager::new(db);

    let default_rpc = std::env::var("CHIA_RPC_URL").unwrap_or_else(|_| "http://localhost:8555".to_string());
    let state = AppState::new(default_rpc);
    let app_state = std::sync::Arc::new(state);

    // Build application routes
    let app = Router::new()
        .route("/", get(root))
        .route("/health", get(health_check))
        
        // Authenticated file upload/download (REST - binary data doesn't work well with JSON-RPC)
        .route("/files", get(api::files::list_files).post(api::files::upload_file))
        .route("/files/:id", get(api::files::get_file).delete(api::files::delete_file))
        .layer(middleware::from_fn_with_state(mm.clone(), mw_ctx_resolve))
        .layer(CookieManagerLayer::new())
        .with_state(mm.clone());
        
        // Legacy REST endpoints - DISABLED in favor of JSON-RPC
        // Keeping these commented for reference, but they are replaced by /api/rpc methods
        // .route("/contacts", get(api::contacts::list_contacts).post(api::contacts::create_contact))
        // .route("/contacts/:id", get(api::contacts::get_contact))
        // .route("/contacts/:id/update", post(api::contacts::update_contact))
        // .route("/contacts/:id/delete", post(api::contacts::delete_contact))
        // .route("/contracts", get(api::contracts::list_contracts))
        // .route("/contracts/:id", get(api::contracts::get_contract))
        // .route("/contracts/:id/validate", get(api::contracts::validate_contract))
        // .route("/contracts/create", post(api::contracts::create_contract))
        // .route("/contracts/hash", post(api::contracts::hash_contract))
        // .route("/contracts/compile", post(api::contracts::compile_contract))
        // .route("/contracts/deploy", post(api::contracts::deploy_contract))
        // .route("/contracts/status", get(api::contracts::contract_status))
        // .route("/contracts/spend", post(api::contracts::spend_contract))
        // .route("/chia/node/status", get(api::contracts::chia_node_status))
        // .route("/chia/config", post(api::contracts::set_chia_config))
        // .route("/ssl/upload", post(api::ssl::upload_ssl_certificates))
        // .route("/ssl/status", get(api::ssl::get_ssl_status))
        // .route("/ssl/delete", post(api::ssl::delete_ssl_certificates))
        
    let app = app
        .layer(CorsLayer::permissive())
        .layer(tower_http::limit::RequestBodyLimitLayer::new(15 * 1024 * 1024)); // 15MB limit
    
    // Create RPC routes with authentication (ModelManager + AppState)
    let rpc_state = api::rpc::RpcState(mm.clone(), app_state.clone());

    let rpc_routes = Router::new()
        .route("/api/rpc", post(crate::api::rpc::rpc_handler))
        .layer(axum::middleware::from_fn_with_state(mm.clone(), mw_ctx_resolve))
        .layer(CookieManagerLayer::new())
        .with_state(rpc_state);

    // Create configuration routes (AppState state)
    let config_routes = Router::new()
        // Chia node connection endpoints
        .route("/chia/config", post(api::chia::set_chia_config))
        .route("/chia/node/status", get(api::chia::chia_node_status))
        .route("/chia/clear", post(api::chia::clear_chia_config))
        // SSL management endpoints
        .route("/ssl/upload", post(api::ssl::upload_ssl_certificates))
        .route("/ssl/status", get(api::ssl::get_ssl_status))
        .route("/ssl/delete", post(api::ssl::delete_ssl_certificates))
        .route("/ssl/set", post(api::ssl::set_ssl_paths))
        .with_state(app_state.clone());
    
    // Merge all routes
    let app = app.merge(rpc_routes).merge(config_routes)
        .layer(CorsLayer::permissive());

    // Start the transaction verification background service
    api::verify::start_verification_service(mm.clone(), app_state.clone()).await;

    // Start server
    let addr = SocketAddr::from(([127, 0, 0, 1], 8080));
    tracing::info!("Server listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn root() -> &'static str {
    "Chia Contract Backend API"
}

use axum::http::HeaderMap;
async fn health_check() -> (HeaderMap, &'static str) {
    let mut headers = HeaderMap::new();
    if std::env::var("CHIA_ALLOW_INSECURE").map(|v| v == "1" || v.eq_ignore_ascii_case("true")).unwrap_or(false) {
        headers.insert("X-Chia-Insecure", "true".parse().unwrap());
    }
    (headers, "OK")
}
