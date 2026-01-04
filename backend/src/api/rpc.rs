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
    TransactionBmc, TradeTransactionForCreate, UserBmc,
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
        "user_me" => {
            if let Some(ctx) = ctx { rpc_user_me(ctx).await }
            else { Err(unauthorized_error()) }
        }

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
        // Commitment & Transactions
        // ============================================
        "commitment_get_details" => {
            if let Some(ctx) = ctx { rpc_commitment_get_details(mm, ctx, rpc_req.params).await }
            else { Err(unauthorized_error()) }
        }
        "commitment_create_pending" => {
            if let Some(ctx) = ctx { rpc_commitment_create_pending(mm, ctx, rpc_req.params).await }
            else { Err(unauthorized_error()) }
        }
        "commitment_submit_tx" => {
            if let Some(ctx) = ctx { rpc_commitment_submit_tx(mm, ctx, rpc_req.params).await }
            else { Err(unauthorized_error()) }
        }
        "commitment_list_transactions" => {
            if let Some(ctx) = ctx { rpc_commitment_list_transactions(mm, ctx, rpc_req.params).await }
            else { Err(unauthorized_error()) }
        }
        "config_set_exchange_wallet" => {
            if let Some(ctx) = ctx { rpc_config_set_exchange_wallet(mm, ctx, rpc_req.params).await }
            else { Err(unauthorized_error()) }
        }
        "config_get_exchange_wallet" => {
            if let Some(ctx) = ctx { rpc_config_get_exchange_wallet(mm, ctx).await }
            else { Err(unauthorized_error()) }
        }

        // ============================================
        // User Administration (Admin only)
        // ============================================
        "admin_list_users" => {
            if let Some(ctx) = ctx { rpc_admin_list_users(mm, ctx).await }
            else { Err(unauthorized_error()) }
        }
        "admin_set_user_admin" => {
            if let Some(ctx) = ctx { rpc_admin_set_user_admin(mm, ctx, rpc_req.params).await }
            else { Err(unauthorized_error()) }
        }
        "admin_get_user_stats" => {
            if let Some(ctx) = ctx { rpc_admin_get_user_stats(mm, ctx, rpc_req.params).await }
            else { Err(unauthorized_error()) }
        }
        "admin_get_platform_stats" => {
            if let Some(ctx) = ctx { rpc_admin_get_platform_stats(mm, ctx).await }
            else { Err(unauthorized_error()) }
        }
        "admin_list_trades" => {
            if let Some(ctx) = ctx { rpc_admin_list_trades(mm, ctx, rpc_req.params).await }
            else { Err(unauthorized_error()) }
        }
        "admin_cancel_trade" => {
            if let Some(ctx) = ctx { rpc_admin_cancel_trade(mm, ctx, rpc_req.params).await }
            else { Err(unauthorized_error()) }
        }
        "admin_delete_trade" => {
            if let Some(ctx) = ctx { rpc_admin_delete_trade(mm, ctx, rpc_req.params).await }
            else { Err(unauthorized_error()) }
        }

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

/// Get current user info including admin status
async fn rpc_user_me(ctx: Ctx) -> Result<Value, RpcError> {
    Ok(json!({
        "user": {
            "id": ctx.user_id(),
            "username": ctx.username(),
            "is_admin": ctx.is_admin()
        }
    }))
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
    
    // Enrich with proposer info
    let proposer = get_user_public_info(mm.db(), trade.proposer_id).await;
    let trade_with_user = TradeWithUser { trade, proposer };
    
    Ok(json!({ "trade": trade_with_user }))
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

// ============================================
// Commitment & Transaction RPC Functions
// ============================================

/// Get commitment details for a trade (fee amount, exchange wallet, status)
async fn rpc_commitment_get_details(mm: ModelManager, ctx: Ctx, params: Option<Value>) -> Result<Value, RpcError> {
    #[derive(Deserialize)]
    struct Params { trade_id: i64 }
    
    let params: Params = serde_json::from_value(params.unwrap_or(json!({}))).map_err(|e| RpcError {
        code: -32602,
        message: format!("Invalid params: {}", e),
        data: None,
    })?;
    
    let details = TransactionBmc::get_commitment_details(&ctx, &mm, params.trade_id)
        .await
        .map_err(|e| RpcError {
            code: 5000,
            message: format!("Failed to get commitment details: {}", e),
            data: None,
        })?;
    
    Ok(json!({
        "trade_id": details.trade_id,
        "exchange_wallet_address": details.exchange_wallet_address,
        "commitment_fee_usd": details.commitment_fee_usd,
        "user_role": details.user_role,
        "user_commit_status": details.user_commit_status,
        "other_commit_status": details.other_commit_status,
        "memo": details.memo
    }))
}

/// Create a pending transaction record before wallet signing
async fn rpc_commitment_create_pending(mm: ModelManager, ctx: Ctx, params: Option<Value>) -> Result<Value, RpcError> {
    #[derive(Deserialize)]
    struct Params {
        trade_id: i64,
        from_address: Option<String>,
        amount_mojos: i64,  // Frontend calculates XCH amount from USD fee using live price
    }
    
    let params: Params = serde_json::from_value(params.unwrap_or(json!({}))).map_err(|e| RpcError {
        code: -32602,
        message: format!("Invalid params: {}", e),
        data: None,
    })?;
    
    // Validate amount is reasonable (at least 1000 mojos, less than 10 XCH)
    if params.amount_mojos < 1000 {
        return Err(RpcError {
            code: -32602,
            message: "Amount too small".to_string(),
            data: None,
        });
    }
    if params.amount_mojos > 10_000_000_000_000 {
        return Err(RpcError {
            code: -32602,
            message: "Amount too large".to_string(),
            data: None,
        });
    }
    
    // Get commitment details (for destination address and validation)
    let details = TransactionBmc::get_commitment_details(&ctx, &mm, params.trade_id)
        .await
        .map_err(|e| RpcError {
            code: 5000,
            message: format!("Failed to get commitment details: {}", e),
            data: None,
        })?;
    
    // Create pending transaction with frontend-calculated amount
    let tx = TradeTransactionForCreate {
        trade_id: params.trade_id,
        tx_type: "commitment_fee".to_string(),
        tx_id: None,
        from_address: params.from_address,
        to_address: Some(details.exchange_wallet_address.clone()),
        amount_mojos: params.amount_mojos,
    };
    
    let transaction_id = TransactionBmc::create(&ctx, &mm, tx)
        .await
        .map_err(|e| RpcError {
            code: 5000,
            message: format!("Failed to create pending transaction: {}", e),
            data: None,
        })?;
    
    let amount_xch = params.amount_mojos as f64 / 1_000_000_000_000.0;
    
    Ok(json!({
        "transaction_id": transaction_id,
        "to_address": details.exchange_wallet_address,
        "amount_mojos": params.amount_mojos,
        "amount_xch": amount_xch,
        "memo": details.memo
    }))
}

/// Submit the transaction ID after wallet has signed and broadcast
async fn rpc_commitment_submit_tx(mm: ModelManager, ctx: Ctx, params: Option<Value>) -> Result<Value, RpcError> {
    #[derive(Deserialize)]
    struct Params {
        transaction_id: i64,
        tx_id: String,
    }
    
    let params: Params = serde_json::from_value(params.unwrap_or(json!({}))).map_err(|e| RpcError {
        code: -32602,
        message: format!("Invalid params: {}", e),
        data: None,
    })?;
    
    TransactionBmc::submit_tx_id(&ctx, &mm, params.transaction_id, &params.tx_id)
        .await
        .map_err(|e| RpcError {
            code: 5000,
            message: format!("Failed to submit transaction: {}", e),
            data: None,
        })?;
    
    Ok(json!({
        "success": true,
        "status": "mempool",
        "message": "Transaction submitted. Awaiting blockchain confirmation."
    }))
}

/// List all transactions for a trade
async fn rpc_commitment_list_transactions(mm: ModelManager, ctx: Ctx, params: Option<Value>) -> Result<Value, RpcError> {
    #[derive(Deserialize)]
    struct Params { trade_id: i64 }
    
    let params: Params = serde_json::from_value(params.unwrap_or(json!({}))).map_err(|e| RpcError {
        code: -32602,
        message: format!("Invalid params: {}", e),
        data: None,
    })?;
    
    let transactions = TransactionBmc::list_for_trade(&ctx, &mm, params.trade_id)
        .await
        .map_err(|e| RpcError {
            code: 5000,
            message: format!("Failed to list transactions: {}", e),
            data: None,
        })?;
    
    Ok(json!({ "transactions": transactions }))
}

/// Set the exchange wallet address (admin only)
async fn rpc_config_set_exchange_wallet(mm: ModelManager, ctx: Ctx, params: Option<Value>) -> Result<Value, RpcError> {
    // Admin check
    if !ctx.is_admin() {
        return Err(RpcError {
            code: 4003,
            message: "Admin access required".to_string(),
            data: None,
        });
    }
    
    #[derive(Deserialize)]
    struct Params { 
        wallet_address: String,
        commitment_fee_usd: Option<f64>,  // Fee in USD (e.g., 1.0 for $1)
    }
    
    let params: Params = serde_json::from_value(params.unwrap_or(json!({}))).map_err(|e| RpcError {
        code: -32602,
        message: format!("Invalid params: {}", e),
        data: None,
    })?;
    
    // Validate address format
    if !params.wallet_address.starts_with("xch1") || params.wallet_address.len() != 62 {
        return Err(RpcError {
            code: -32602,
            message: "Invalid XCH address format".to_string(),
            data: None,
        });
    }
    
    TransactionBmc::set_exchange_wallet(&ctx, &mm, &params.wallet_address)
        .await
        .map_err(|e| RpcError {
            code: 5000,
            message: format!("Failed to set exchange wallet: {}", e),
            data: None,
        })?;
    
    // Store commitment fee in USD (default $1.00 if not provided)
    let fee_usd = params.commitment_fee_usd.unwrap_or(1.0);
    sqlx::query(
        "INSERT INTO exchange_config (key, value, description, updated_at) 
         VALUES ('commitment_fee_usd', $1, 'Commitment fee in USD - XCH calculated dynamically', NOW())
         ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()"
    )
    .bind(fee_usd.to_string())
    .execute(mm.db())
    .await
    .map_err(|e| RpcError {
        code: 5000,
        message: format!("Failed to set commitment fee: {}", e),
        data: None,
    })?;
    
    Ok(json!({
        "success": true,
        "message": "Exchange wallet configuration updated"
    }))
}

/// Get the exchange wallet address - readable by any authenticated user (needed for commitment fees)
/// Returns USD fee amount - frontend calculates XCH dynamically using live price
async fn rpc_config_get_exchange_wallet(mm: ModelManager, ctx: Ctx) -> Result<Value, RpcError> {
    let address = TransactionBmc::get_exchange_wallet(&ctx, &mm)
        .await
        .ok();
    
    // Get fee in USD (default $1.00)
    let fee_usd: f64 = sqlx::query_as::<_, (String,)>(
        "SELECT value FROM exchange_config WHERE key = 'commitment_fee_usd'"
    )
    .fetch_optional(mm.db())
    .await
    .map_err(|e| RpcError {
        code: 5000,
        message: format!("Database error: {}", e),
        data: None,
    })?
    .and_then(|(v,)| v.parse::<f64>().ok())
    .unwrap_or(1.0); // Default $1.00
    
    Ok(json!({
        "wallet_address": address,
        "commitment_fee_usd": fee_usd
    }))
}

// ============================================
// User Administration RPCs (Admin only)
// ============================================

/// List all users (admin only)
async fn rpc_admin_list_users(mm: ModelManager, ctx: Ctx) -> Result<Value, RpcError> {
    // Admin check
    if !ctx.is_admin() {
        return Err(RpcError {
            code: 4003,
            message: "Admin access required".to_string(),
            data: None,
        });
    }
    
    let users = UserBmc::list_all(mm.db())
        .await
        .map_err(|e| RpcError {
            code: 5000,
            message: format!("Failed to list users: {}", e),
            data: None,
        })?;
    
    Ok(json!({ "users": users }))
}

/// Set user admin status (admin only)
async fn rpc_admin_set_user_admin(mm: ModelManager, ctx: Ctx, params: Option<Value>) -> Result<Value, RpcError> {
    // Admin check
    if !ctx.is_admin() {
        return Err(RpcError {
            code: 4003,
            message: "Admin access required".to_string(),
            data: None,
        });
    }
    
    #[derive(Deserialize)]
    struct Params {
        user_id: i64,
        is_admin: bool,
    }
    
    let params: Params = serde_json::from_value(params.unwrap_or(json!({}))).map_err(|e| RpcError {
        code: -32602,
        message: format!("Invalid params: {}", e),
        data: None,
    })?;
    
    // Prevent admin from removing their own admin status
    if params.user_id == ctx.user_id() && !params.is_admin {
        return Err(RpcError {
            code: 4003,
            message: "Cannot remove your own admin status".to_string(),
            data: None,
        });
    }
    
    UserBmc::set_admin_status(mm.db(), params.user_id, params.is_admin)
        .await
        .map_err(|e| RpcError {
            code: 5000,
            message: format!("Failed to update user: {}", e),
            data: None,
        })?;
    
    Ok(json!({
        "success": true,
        "message": if params.is_admin { "User promoted to admin" } else { "Admin status removed" }
    }))
}

/// Get user stats (admin only)
async fn rpc_admin_get_user_stats(mm: ModelManager, ctx: Ctx, params: Option<Value>) -> Result<Value, RpcError> {
    // Admin check
    if !ctx.is_admin() {
        return Err(RpcError {
            code: 4003,
            message: "Admin access required".to_string(),
            data: None,
        });
    }
    
    #[derive(Deserialize)]
    struct Params {
        user_id: i64,
    }
    
    let params: Params = serde_json::from_value(params.unwrap_or(json!({}))).map_err(|e| RpcError {
        code: -32602,
        message: format!("Invalid params: {}", e),
        data: None,
    })?;
    
    let stats = UserBmc::get_user_stats(mm.db(), params.user_id)
        .await
        .map_err(|e| RpcError {
            code: 5000,
            message: format!("Failed to get user stats: {}", e),
            data: None,
        })?;
    
    Ok(json!(stats))
}

/// Get platform-wide stats (admin only)
async fn rpc_admin_get_platform_stats(mm: ModelManager, ctx: Ctx) -> Result<Value, RpcError> {
    // Admin check
    if !ctx.is_admin() {
        return Err(RpcError {
            code: 4003,
            message: "Admin access required".to_string(),
            data: None,
        });
    }
    
    // User count
    let user_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM users")
        .fetch_one(mm.db())
        .await
        .map_err(|e| RpcError {
            code: 5000,
            message: format!("Database error: {}", e),
            data: None,
        })?;
    
    // Trade counts by status
    let total_trades: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM trades")
        .fetch_one(mm.db())
        .await
        .unwrap_or((0,));
    
    let active_trades: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM trades WHERE status IN ('proposal', 'matched', 'committed', 'escrow')"
    )
        .fetch_one(mm.db())
        .await
        .unwrap_or((0,));
    
    let completed_trades: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM trades WHERE status = 'completed'"
    )
        .fetch_one(mm.db())
        .await
        .unwrap_or((0,));
    
    Ok(json!({
        "total_users": user_count.0,
        "total_trades": total_trades.0,
        "active_trades": active_trades.0,
        "completed_trades": completed_trades.0
    }))
}

// List all trades for admin
async fn rpc_admin_list_trades(mm: ModelManager, ctx: Ctx, params: Option<Value>) -> Result<Value, RpcError> {
    // Admin check
    if !ctx.is_admin() {
        return Err(RpcError {
            code: 4003,
            message: "Admin access required".to_string(),
            data: None,
        });
    }
    
    let limit = params.as_ref()
        .and_then(|p| p.get("limit"))
        .and_then(|v| v.as_i64())
        .unwrap_or(50) as i32;
    let offset = params.as_ref()
        .and_then(|p| p.get("offset"))
        .and_then(|v| v.as_i64())
        .unwrap_or(0) as i32;
    let status_filter = params.as_ref()
        .and_then(|p| p.get("status"))
        .and_then(|v| v.as_str());
    
    // Build query based on status filter
    let trades: Vec<(i64, i64, String, String, Option<String>, f64, String, chrono::DateTime<chrono::Utc>)> = 
        if let Some(status) = status_filter {
            sqlx::query_as(
                r#"SELECT t.id, t.proposer_id, t.proposer_item_title, t.proposer_item_description, t.trade_type, t.proposer_item_value_usd, t.status, t.created_at
                   FROM trades t
                   WHERE t.status = $1
                   ORDER BY t.created_at DESC
                   LIMIT $2 OFFSET $3"#
            )
            .bind(status)
            .bind(limit)
            .bind(offset)
            .fetch_all(mm.db())
            .await
        } else {
            sqlx::query_as(
                r#"SELECT t.id, t.proposer_id, t.proposer_item_title, t.proposer_item_description, t.trade_type, t.proposer_item_value_usd, t.status, t.created_at
                   FROM trades t
                   ORDER BY t.created_at DESC
                   LIMIT $1 OFFSET $2"#
            )
            .bind(limit)
            .bind(offset)
            .fetch_all(mm.db())
            .await
        }
        .map_err(|e| RpcError {
            code: 5000,
            message: format!("Database error: {}", e),
            data: None,
        })?;
    
    let trades_json: Vec<Value> = trades.iter().map(|t| {
        json!({
            "id": t.0,
            "proposer_id": t.1,
            "item_title": t.2,
            "item_description": t.3,
            "trade_type": t.4.clone().unwrap_or_else(|| "item_for_item".to_string()),
            "item_value_usd": t.5,
            "status": t.6,
            "created_at": t.7.to_rfc3339()
        })
    }).collect();
    
    Ok(json!({ "trades": trades_json }))
}

// Admin cancel any trade
async fn rpc_admin_cancel_trade(mm: ModelManager, ctx: Ctx, params: Option<Value>) -> Result<Value, RpcError> {
    // Admin check
    if !ctx.is_admin() {
        return Err(RpcError {
            code: 4003,
            message: "Admin access required".to_string(),
            data: None,
        });
    }
    
    let id = params.as_ref()
        .and_then(|p| p.get("id"))
        .and_then(|v| v.as_i64())
        .ok_or_else(|| RpcError {
            code: 4000,
            message: "Missing required parameter: id".to_string(),
            data: None,
        })?;
    
    TradeBmc::admin_cancel(&mm, id).await
        .map_err(|e| RpcError {
            code: 5000,
            message: format!("Failed to cancel trade: {:?}", e),
            data: None,
        })?;
    
    Ok(json!({ "success": true, "message": "Trade cancelled by admin" }))
}

// Admin delete any trade
async fn rpc_admin_delete_trade(mm: ModelManager, ctx: Ctx, params: Option<Value>) -> Result<Value, RpcError> {
    // Admin check
    if !ctx.is_admin() {
        return Err(RpcError {
            code: 4003,
            message: "Admin access required".to_string(),
            data: None,
        });
    }
    
    let id = params.as_ref()
        .and_then(|p| p.get("id"))
        .and_then(|v| v.as_i64())
        .ok_or_else(|| RpcError {
            code: 4000,
            message: "Missing required parameter: id".to_string(),
            data: None,
        })?;
    
    TradeBmc::admin_delete(&mm, id).await
        .map_err(|e| RpcError {
            code: 5000,
            message: format!("Failed to delete trade: {:?}", e),
            data: None,
        })?;
    
    Ok(json!({ "success": true, "message": "Trade deleted by admin" }))
}