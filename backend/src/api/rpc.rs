use crate::ctx::OptionCtx;
use axum::extract::State;
use axum::{response::IntoResponse, Json};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::sync::Arc;

use crate::ctx::Ctx;
use crate::model::{
    ContractBmc, ContractForCreate, ContractForUpdate, ModelManager,
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
        "login" => crate::api::auth::rpc_login(mm, rpc_req.params).await,
        "logout" => crate::api::auth::rpc_logout().await,
        "register" => crate::api::auth::rpc_register(mm, rpc_req.params).await,

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