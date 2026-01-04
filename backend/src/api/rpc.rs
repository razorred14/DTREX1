use crate::ctx::OptionCtx;
use axum::extract::State;
use axum::{response::IntoResponse, Json};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::sync::Arc;

use crate::ctx::Ctx;
use crate::model::{
    ContractBmc, ContractForCreate, ContractForUpdate, ModelManager,
    TradeBmc, TradeForCreate, TradeAcceptParams, ReviewBmc, ReviewForCreate,
};
use crate::app_state::AppState;

#[derive(Deserialize)]
pub struct RpcRequest {
    pub id: Option<Value>,
    pub method: String,
    pub params: Option<Value>,
}

#[derive(Serialize)]
pub struct RpcResponse {
    pub id: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<RpcError>,
}

#[derive(Serialize, Clone)]
pub struct RpcError {
    pub code: i32,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<Value>,
}

#[derive(Clone)]
pub struct RpcState(pub ModelManager, pub Arc<AppState>);

impl axum::extract::FromRef<RpcState> for ModelManager {
    fn from_ref(state: &RpcState) -> Self { state.0.clone() }
}

impl axum::extract::FromRef<RpcState> for Arc<AppState> {
    fn from_ref(state: &RpcState) -> Self { state.1.clone() }
}

// FIX: Explicitly set state type for the debug macro
#[axum::debug_handler(state = crate::api::rpc::RpcState)]
pub async fn rpc_handler(
    State(mm): State<ModelManager>,
    State(app_state): State<Arc<AppState>>,
    OptionCtx(ctx): OptionCtx,
    Json(rpc_req): Json<RpcRequest>,
) -> impl IntoResponse {
    let rpc_id = rpc_req.id.clone();
    
    let result = match rpc_req.method.as_str() {
        // ============================================
        // Authentication
        // ============================================
        "login" => crate::api::auth::rpc_login(mm, rpc_req.params).await,
        "logout" => crate::api::auth::rpc_logout().await,
        "register" => crate::api::auth::rpc_register(mm, rpc_req.params).await,

        // ============================================
        // Trade Proposals (Public)
        // ============================================
        "trade_list_proposals" => rpc_trade_list_proposals(mm, rpc_req.params).await,
        "trade_get_public" => rpc_trade_get_public(mm, rpc_req.params).await,

        // ============================================
        // Trade Management (Authenticated)
        // ============================================
        "trade_create" => {
            if let Some(ctx) = ctx { rpc_trade_create(mm, ctx, rpc_req.params).await }
            else { Err(unauthorized_error()) }
        }
        "trade_my_trades" => {
            if let Some(ctx) = ctx { rpc_trade_my_trades(mm, ctx).await }
            else { Err(unauthorized_error()) }
        }
        "trade_get" => {
            if let Some(ctx) = ctx { rpc_trade_get(mm, ctx, rpc_req.params).await }
            else { Err(unauthorized_error()) }
        }
        "trade_accept" => {
            if let Some(ctx) = ctx { rpc_trade_accept(mm, ctx, rpc_req.params).await }
            else { Err(unauthorized_error()) }
        }
        "trade_commit" => {
            if let Some(ctx) = ctx { rpc_trade_commit(mm, ctx, rpc_req.params).await }
            else { Err(unauthorized_error()) }
        }
        "trade_add_tracking" => {
            if let Some(ctx) = ctx { rpc_trade_add_tracking(mm, ctx, rpc_req.params).await }
            else { Err(unauthorized_error()) }
        }
        "trade_complete" => {
            if let Some(ctx) = ctx { rpc_trade_complete(mm, ctx, rpc_req.params).await }
            else { Err(unauthorized_error()) }
        }
        "trade_cancel" => {
            if let Some(ctx) = ctx { rpc_trade_cancel(mm, ctx, rpc_req.params).await }
            else { Err(unauthorized_error()) }
        }
        "trade_delete" => {
            if let Some(ctx) = ctx { rpc_trade_delete(mm, ctx, rpc_req.params).await }
            else { Err(unauthorized_error()) }
        }

        // ============================================
        // Reviews
        // ============================================
        "trade_review" => {
            if let Some(ctx) = ctx { rpc_trade_review(mm, ctx, rpc_req.params).await }
            else { Err(unauthorized_error()) }
        }
        "user_reviews" => rpc_user_reviews(mm, rpc_req.params).await,

        // ============================================
        // Legacy Contract API (backward compatibility)
        // ============================================
        "contract_list" => {
            if let Some(ctx) = ctx { rpc_contract_list(mm, ctx).await } 
            else { Err(unauthorized_error()) }
        }
        "contract_get" => {
            if let Some(ctx) = ctx { rpc_contract_get(mm, ctx, rpc_req.params).await } 
            else { Err(unauthorized_error()) }
        }
        "contract_create" => {
            if let Some(ctx) = ctx { rpc_contract_create(mm, ctx, rpc_req.params).await } 
            else { Err(unauthorized_error()) }
        }
        "contract_delete" => {
            if let Some(ctx) = ctx { rpc_contract_delete(mm, ctx, rpc_req.params).await } 
            else { Err(unauthorized_error()) }
        }
        "contract_update" => {
            if let Some(ctx) = ctx { rpc_contract_update(mm, ctx, rpc_req.params).await } 
            else { Err(unauthorized_error()) }
        }

        // ============================================
        // Wallet RPC
        // ============================================
        "get_sync_status" | "get_wallets" | "get_wallet_balance" | "wallet_get_address" => {
            crate::api::wallet_rpc::wallet_rpc_handler(
                axum::extract::State(app_state), 
                ctx, 
                rpc_req.method.as_str(), 
                rpc_req.params
            ).await
        }
        
        _ => Err(RpcError {
            code: -32601,
            message: "Method not found".to_string(),
            data: None,
        }),
    };

    let rpc_response = match result {
        Ok(res) => RpcResponse { id: rpc_id, result: Some(res), error: None },
        Err(e) => RpcResponse { id: rpc_id, result: None, error: Some(e) },
    };

    Json(rpc_response).into_response()
}

fn unauthorized_error() -> RpcError {
    RpcError { code: 4001, message: "Unauthorized".to_string(), data: None }
}

// ============================================
// Trade RPC Handlers
// ============================================

/// User info for display on trades
#[derive(Serialize)]
struct UserPublicInfo {
    id: i64,
    username: String,
    verification_status: String,
    reputation_score: f64,
    total_trades: i32,
}

/// Trade with proposer info
#[derive(Serialize)]
struct TradeWithUser {
    #[serde(flatten)]
    trade: crate::model::Trade,
    proposer: Option<UserPublicInfo>,
}

/// List open trade proposals (public) - enriched with user info
async fn rpc_trade_list_proposals(mm: ModelManager, params: Option<Value>) -> Result<Value, RpcError> {
    #[derive(Deserialize, Default)]
    struct Params { limit: Option<i64>, offset: Option<i64> }
    let params: Params = serde_json::from_value(params.unwrap_or(json!({}))).unwrap_or_default();
    
    let trades = TradeBmc::list_proposals(&mm, params.limit.unwrap_or(50), params.offset.unwrap_or(0))
        .await
        .map_err(|e| RpcError {
            code: 5000,
            message: format!("Database error: {}", e),
            data: None,
        })?;
    
    // Enrich trades with user info
    let mut trades_with_users = Vec::new();
    for trade in trades {
        let proposer = get_user_public_info(mm.db(), trade.proposer_id).await;
        trades_with_users.push(TradeWithUser { trade, proposer });
    }
    
    Ok(json!({ "trades": trades_with_users }))
}

/// Get user public info (username, verification status, reputation, trade count)
async fn get_user_public_info(db: &crate::store::Db, user_id: i64) -> Option<UserPublicInfo> {
    // Use a struct for cleaner type handling
    #[derive(sqlx::FromRow)]
    struct UserRow {
        id: i64,
        username: String,
        verification_status: Option<String>,
        reputation_score: Option<f64>,
        total_trades: Option<i32>,
    }
    
    sqlx::query_as::<_, UserRow>(
        "SELECT id, username, verification_status, reputation_score::float8, total_trades FROM users WHERE id = $1"
    )
    .bind(user_id)
    .fetch_optional(db)
    .await
    .ok()
    .flatten()
    .map(|row| {
        UserPublicInfo {
            id: row.id,
            username: row.username,
            verification_status: row.verification_status.unwrap_or_else(|| "unverified".to_string()),
            reputation_score: row.reputation_score.unwrap_or(0.0),
            total_trades: row.total_trades.unwrap_or(0),
        }
    })
}

/// Get a public trade proposal
async fn rpc_trade_get_public(mm: ModelManager, params: Option<Value>) -> Result<Value, RpcError> {
    #[derive(Deserialize)]
    struct Params { id: i64 }
    let params: Params = serde_json::from_value(params.unwrap_or(json!({}))).map_err(|e| RpcError {
        code: -32602,
        message: format!("Invalid params: {}", e),
        data: None,
    })?;
    
    let trade = TradeBmc::get_public(&mm, params.id).await.map_err(|_| RpcError {
        code: 4004,
        message: "Trade not found".to_string(),
        data: None,
    })?;
    
    let proposer = get_user_public_info(mm.db(), trade.proposer_id).await;
    let trade_with_user = TradeWithUser { trade, proposer };
    
    Ok(json!({ "trade": trade_with_user }))
}

/// Create a new trade proposal
async fn rpc_trade_create(mm: ModelManager, ctx: Ctx, params: Option<Value>) -> Result<Value, RpcError> {
    let trade_c: TradeForCreate = serde_json::from_value(params.unwrap_or(json!({}))).map_err(|e| RpcError {
        code: -32602,
        message: format!("Invalid params: {}", e),
        data: None,
    })?;
    
    let trade_id = TradeBmc::create(&ctx, &mm, trade_c).await.map_err(|e| RpcError {
        code: 5000,
        message: format!("Create failed: {}", e),
        data: None,
    })?;
    Ok(json!({ "trade_id": trade_id }))
}

/// List user's own trades
async fn rpc_trade_my_trades(mm: ModelManager, ctx: Ctx) -> Result<Value, RpcError> {
    let trades = TradeBmc::list_my_trades(&ctx, &mm).await.map_err(|e| RpcError {
        code: 5000,
        message: format!("Database error: {}", e),
        data: None,
    })?;
    Ok(json!({ "trades": trades }))
}

/// Get a trade (participant only)
async fn rpc_trade_get(mm: ModelManager, ctx: Ctx, params: Option<Value>) -> Result<Value, RpcError> {
    #[derive(Deserialize)]
    struct Params { id: i64 }
    let params: Params = serde_json::from_value(params.unwrap_or(json!({}))).map_err(|e| RpcError {
        code: -32602,
        message: format!("Invalid params: {}", e),
        data: None,
    })?;
    
    let trade = TradeBmc::get(&ctx, &mm, params.id).await.map_err(|_| RpcError {
        code: 4004,
        message: "Trade not found or unauthorized".to_string(),
        data: None,
    })?;
    Ok(json!({ "trade": trade }))
}

/// Accept a trade proposal (make an offer)
async fn rpc_trade_accept(mm: ModelManager, ctx: Ctx, params: Option<Value>) -> Result<Value, RpcError> {
    let accept_params: TradeAcceptParams = serde_json::from_value(params.unwrap_or(json!({}))).map_err(|e| RpcError {
        code: -32602,
        message: format!("Invalid params: {}", e),
        data: None,
    })?;
    
    TradeBmc::accept(&ctx, &mm, accept_params).await.map_err(|e| RpcError {
        code: 5000,
        message: format!("Accept failed: {}", e),
        data: None,
    })?;
    Ok(json!({ "success": true }))
}

/// Commit to a trade (pay fee)
async fn rpc_trade_commit(mm: ModelManager, ctx: Ctx, params: Option<Value>) -> Result<Value, RpcError> {
    #[derive(Deserialize)]
    struct Params { trade_id: i64 }
    let params: Params = serde_json::from_value(params.unwrap_or(json!({}))).map_err(|e| RpcError {
        code: -32602,
        message: format!("Invalid params: {}", e),
        data: None,
    })?;
    
    // TODO: Implement actual commitment transaction creation
    // For now, just update status
    TradeBmc::update_status(&ctx, &mm, params.trade_id, "committed").await.map_err(|e| RpcError {
        code: 5000,
        message: format!("Commit failed: {}", e),
        data: None,
    })?;
    
    Ok(json!({ 
        "success": true,
        "message": "Trade committed. Implement wallet signing in Phase 3."
    }))
}

/// Add tracking information
async fn rpc_trade_add_tracking(mm: ModelManager, ctx: Ctx, params: Option<Value>) -> Result<Value, RpcError> {
    #[derive(Deserialize)]
    struct Params { trade_id: i64, tracking_number: String, carrier: String }
    let params: Params = serde_json::from_value(params.unwrap_or(json!({}))).map_err(|e| RpcError {
        code: -32602,
        message: format!("Invalid params: {}", e),
        data: None,
    })?;
    
    TradeBmc::add_tracking(&ctx, &mm, params.trade_id, &params.tracking_number, &params.carrier)
        .await
        .map_err(|e| RpcError {
            code: 5000,
            message: format!("Add tracking failed: {}", e),
            data: None,
        })?;
    Ok(json!({ "success": true }))
}

/// Complete a trade
async fn rpc_trade_complete(mm: ModelManager, ctx: Ctx, params: Option<Value>) -> Result<Value, RpcError> {
    #[derive(Deserialize)]
    struct Params { trade_id: i64 }
    let params: Params = serde_json::from_value(params.unwrap_or(json!({}))).map_err(|e| RpcError {
        code: -32602,
        message: format!("Invalid params: {}", e),
        data: None,
    })?;
    
    TradeBmc::update_status(&ctx, &mm, params.trade_id, "completed").await.map_err(|e| RpcError {
        code: 5000,
        message: format!("Complete failed: {}", e),
        data: None,
    })?;
    Ok(json!({ "success": true }))
}

/// Cancel a trade
async fn rpc_trade_cancel(mm: ModelManager, ctx: Ctx, params: Option<Value>) -> Result<Value, RpcError> {
    #[derive(Deserialize)]
    struct Params { trade_id: i64 }
    let params: Params = serde_json::from_value(params.unwrap_or(json!({}))).map_err(|e| RpcError {
        code: -32602,
        message: format!("Invalid params: {}", e),
        data: None,
    })?;
    
    TradeBmc::cancel(&ctx, &mm, params.trade_id).await.map_err(|e| RpcError {
        code: 5000,
        message: format!("Cancel failed: {}", e),
        data: None,
    })?;
    Ok(json!({ "success": true }))
}

/// Delete a trade proposal
async fn rpc_trade_delete(mm: ModelManager, ctx: Ctx, params: Option<Value>) -> Result<Value, RpcError> {
    #[derive(Deserialize)]
    struct Params { id: i64 }
    let params: Params = serde_json::from_value(params.unwrap_or(json!({}))).map_err(|e| RpcError {
        code: -32602,
        message: format!("Invalid params: {}", e),
        data: None,
    })?;
    
    TradeBmc::delete(&ctx, &mm, params.id).await.map_err(|e| RpcError {
        code: 5000,
        message: format!("Delete failed: {}", e),
        data: None,
    })?;
    Ok(json!({ "success": true }))
}

/// Submit a trade review
async fn rpc_trade_review(mm: ModelManager, ctx: Ctx, params: Option<Value>) -> Result<Value, RpcError> {
    let review: ReviewForCreate = serde_json::from_value(params.unwrap_or(json!({}))).map_err(|e| RpcError {
        code: -32602,
        message: format!("Invalid params: {}", e),
        data: None,
    })?;
    
    let review_id = ReviewBmc::create(&ctx, &mm, review).await.map_err(|e| RpcError {
        code: 5000,
        message: format!("Review failed: {}", e),
        data: None,
    })?;
    Ok(json!({ "review_id": review_id }))
}

/// Get reviews for a user
async fn rpc_user_reviews(mm: ModelManager, params: Option<Value>) -> Result<Value, RpcError> {
    #[derive(Deserialize)]
    struct Params { user_id: i64 }
    let params: Params = serde_json::from_value(params.unwrap_or(json!({}))).map_err(|e| RpcError {
        code: -32602,
        message: format!("Invalid params: {}", e),
        data: None,
    })?;
    
    let reviews = ReviewBmc::get_for_user(&mm, params.user_id).await.map_err(|e| RpcError {
        code: 5000,
        message: format!("Database error: {}", e),
        data: None,
    })?;
    Ok(json!({ "reviews": reviews }))
}

// ============================================
// Legacy Contract RPC Handlers (backward compatibility)
// ============================================

async fn rpc_contract_list(mm: ModelManager, ctx: Ctx) -> Result<Value, RpcError> {
    let contracts = ContractBmc::list(&ctx, &mm).await.map_err(|e| RpcError {
        code: 5000,
        message: format!("Database error: {}", e),
        data: None,
    })?;
    Ok(json!({ "contracts": contracts }))
}

async fn rpc_contract_get(mm: ModelManager, ctx: Ctx, params: Option<Value>) -> Result<Value, RpcError> {
    #[derive(Deserialize)] struct Params { id: i64 }
    let params: Params = serde_json::from_value(params.unwrap_or(json!({}))).map_err(|e| RpcError {
        code: -32602,
        message: format!("Invalid params: {}", e),
        data: None,
    })?;
    let contract = ContractBmc::get(&ctx, &mm, params.id).await.map_err(|e| RpcError {
        code: 4004,
        message: format!("Contract not found: {}", e),
        data: None,
    })?;
    Ok(json!({ "contract": contract }))
}

async fn rpc_contract_create(mm: ModelManager, ctx: Ctx, params: Option<Value>) -> Result<Value, RpcError> {
    let contract_c: ContractForCreate = serde_json::from_value(params.unwrap_or(json!({}))).map_err(|e| RpcError {
        code: -32602,
        message: format!("Invalid params: {}", e),
        data: None,
    })?;
    let contract_id = ContractBmc::create(&ctx, &mm, contract_c).await.map_err(|e| RpcError {
        code: 5000,
        message: format!("Create failed: {}", e),
        data: None,
    })?;
    Ok(json!({ "contract_id": contract_id }))
}

async fn rpc_contract_delete(mm: ModelManager, ctx: Ctx, params: Option<Value>) -> Result<Value, RpcError> {
    #[derive(Deserialize)] struct Params { id: i64 }
    let params: Params = serde_json::from_value(params.unwrap_or(json!({}))).map_err(|e| RpcError {
        code: -32602,
        message: format!("Invalid params: {}", e),
        data: None,
    })?;
    ContractBmc::delete(&ctx, &mm, params.id).await.map_err(|e| RpcError {
        code: 5000,
        message: format!("Delete failed: {}", e),
        data: None,
    })?;
    Ok(json!({ "success": true }))
}

async fn rpc_contract_update(mm: ModelManager, ctx: Ctx, params: Option<Value>) -> Result<Value, RpcError> {
    #[derive(Deserialize)] struct Params { id: i64, #[serde(flatten)] data: ContractForUpdate }
    let params: Params = serde_json::from_value(params.unwrap_or(json!({}))).map_err(|e| RpcError {
        code: -32602,
        message: format!("Invalid params: {}", e),
        data: None,
    })?;
    ContractBmc::update(&ctx, &mm, params.id, params.data).await.map_err(|e| RpcError {
        code: 5000,
        message: format!("Update failed: {}", e),
        data: None,
    })?;
    Ok(json!({ "success": true }))
}