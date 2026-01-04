use axum::extract::State;
use serde_json::Value;
use crate::ctx::Ctx;
use crate::model::ModelManager;
use crate::api::rpc::RpcError;

// Handles node RPC passthrough methods (add as needed)
pub async fn node_rpc_handler(
    State(_mm): State<ModelManager>,
    _ctx: Option<Ctx>,
    method: &str,
    _params: Option<Value>,
) -> Result<Value, RpcError> {
    match method {
        // Add node RPC passthroughs here
        _ => Err(RpcError {
            code: -32601,
            message: "Node method not found".to_string(),
            data: None,
        }),
    }
}
