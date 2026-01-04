/// Clear all Chia RPC and SSL state (node and wallet)
pub async fn clear_chia_config(State(state): State<Arc<AppState>>) -> Result<Json<ChiaConfigResponse>, (StatusCode, String)> {
    // Reset RPC URL and connection mode to defaults
    state.set_rpc_url("http://localhost:8555".to_string()).await;
    state.set_connection_mode("full_node".to_string()).await;
    // Clear SSL paths for both node and wallet
    state.set_ssl_paths_for_mode("wallet", "".to_string(), "".to_string()).await;
    state.set_ssl_paths_for_mode("full_node", "".to_string(), "".to_string()).await;
    state.set_ssl_ca_path_for_mode("wallet", "".to_string()).await;
    state.set_ssl_ca_path_for_mode("full_node", "".to_string()).await;
    Ok(Json(ChiaConfigResponse {
        success: true,
        message: "Chia RPC and SSL configuration cleared".to_string(),
    }))
}
use axum::{
    extract::{State, Query},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use crate::app_state::AppState;
use crate::rpc::client::ChiaRpcClient;

#[derive(Debug, Deserialize)]
pub struct ChiaConfigRequest {
    pub rpc_url: String,
    pub mode: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ChiaConfigResponse {
    pub success: bool,
    pub message: String,
}

#[derive(Debug, Serialize)]
pub struct ChiaNodeStatus {
    pub connected: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub network: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub peak_height: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sync_mode: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rpc_url: Option<String>,
}

/// Set Chia RPC configuration
pub async fn set_chia_config(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<ChiaConfigRequest>,
) -> Result<Json<ChiaConfigResponse>, (StatusCode, String)> {
    tracing::info!(
        "Setting Chia RPC config: url={}, mode={:?}",
        payload.rpc_url,
        payload.mode
    );

    // Update the RPC URL in state
    state.set_rpc_url(payload.rpc_url.clone()).await;

    // Optionally update connection mode if needed
    if let Some(mode) = payload.mode {
        state.set_connection_mode(mode).await;
    }

    Ok(Json(ChiaConfigResponse {
        success: true,
        message: format!("Chia RPC URL set to {}", payload.rpc_url),
    }))
}

// Only test connection if user requests (no auto-test on upload/config)
use std::collections::HashMap;
pub async fn chia_node_status(
    State(state): State<Arc<AppState>>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<ChiaNodeStatus>, (StatusCode, String)> {
    let rpc_url = state.rpc_url().await;
    let mode = if let Some(m) = params.get("type").cloned() {
        m
    } else {
        state.connection_mode().await
    };

    // Compute effective URL as used by ChiaRpcClient
    let effective_url = {
        let is_local = rpc_url.contains("localhost") || rpc_url.contains("127.0.0.1");
        let has_port = rpc_url.contains(":9256") || rpc_url.contains(":8555");
        // Force wallet mode to use 9256 if rpc_url is empty or points to 8555
        if mode == "wallet" && (rpc_url.is_empty() || rpc_url.ends_with(":8555") || rpc_url == "http://localhost" || rpc_url == "https://localhost" || rpc_url == "http://127.0.0.1" || rpc_url == "https://127.0.0.1") {
            "https://localhost:9256".to_string()
        } else if rpc_url.is_empty() || rpc_url == "http://localhost" || rpc_url == "https://localhost" || rpc_url == "http://127.0.0.1" || rpc_url == "https://127.0.0.1" {
            if mode == "wallet" {
                "https://localhost:9256".to_string()
            } else {
                "https://localhost:8555".to_string()
            }
        } else if is_local && !has_port {
            if mode == "wallet" {
                rpc_url.replace("http://", "https://").replace("https://", "https://") + ":9256"
            } else {
                rpc_url.replace("http://", "https://").replace("https://", "https://") + ":8555"
            }
        } else if is_local && has_port {
            rpc_url.replace("http://", "https://")
        } else {
            rpc_url.clone()
        }
    };

    tracing::info!(
        "Checking Chia node status: url={}, mode={}",
        effective_url,
        mode
    );

    // Only test connection if explicitly requested (e.g., via frontend button)
    if params.get("test").map(|v| v == "1" || v == "true").unwrap_or(false) {
        let client = match ChiaRpcClient::from_state(state.clone(), &mode).await {
            Ok(c) => c,
            Err(e) => {
                tracing::warn!("Falling back to env client: {}", e);
                ChiaRpcClient::from_env(effective_url.clone())
            }
        };

        // Try to get blockchain state to verify connection
        match client.get_blockchain_state().await {
            Ok(state_response) => {
                let network: Option<String> = state_response
                    .get("network_name")
                    .and_then(|v: &serde_json::Value| v.as_str())
                    .map(|s: &str| s.to_string());

                let peak_height: Option<u64> = state_response
                    .get("peak")
                    .and_then(|v: &serde_json::Value| v.get("height"))
                    .and_then(|v: &serde_json::Value| v.as_u64());

                let sync_mode: Option<bool> = state_response
                    .get("sync")
                    .and_then(|v: &serde_json::Value| v.get("sync_mode"))
                    .and_then(|v: &serde_json::Value| v.as_bool());

                Ok(Json(ChiaNodeStatus {
                    connected: true,
                    network,
                    peak_height,
                    sync_mode,
                    error: None,
                    rpc_url: Some(effective_url),
                }))
            }
            Err(e) => {
                tracing::warn!("Failed to connect to Chia node: {}", e);
                Ok(Json(ChiaNodeStatus {
                    connected: false,
                    network: None,
                    peak_height: None,
                    sync_mode: None,
                    error: Some(format!("Failed to connect: {}", e)),
                    rpc_url: Some(rpc_url),
                }))
            }
        }
    } else {
        // If not testing, just return config info (no connection attempt)
        Ok(Json(ChiaNodeStatus {
            connected: false,
            network: None,
            peak_height: None,
            sync_mode: None,
            error: None,
            rpc_url: Some(rpc_url),
        }))
    }
}
