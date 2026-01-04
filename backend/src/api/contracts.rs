use axum::{
    extract::Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::app_state::AppState;
use crate::blockchain::puzzles;
use crate::rpc::client::ChiaRpcClient;
use crate::storage::files;
use crate::util::hashing;
use axum::extract::Path;
use axum::extract::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateContractRequest {
    pub title: String,
    pub participants: Vec<String>, // Public keys
    pub required_signatures: usize,
    pub file_path: Option<String>,
    pub terms_text: Option<String>,
    pub attached_files: Option<Vec<String>>, // File IDs from upload
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateContractResponse {
    pub contract_id: String,
    pub terms_hash: String,
    pub puzzle_hash: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HashContractRequest {
    pub path: Option<String>,
    pub content: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HashContractResponse {
    pub terms_hash: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CompileContractRequest {
    pub participants: Vec<String>,
    pub terms_hash: String,
    pub required_signatures: usize,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CompileContractResponse {
    pub puzzle_hash: String,
    pub puzzle_reveal: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DeployContractRequest {
    pub puzzle_hash: String,
    pub amount: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DeployContractResponse {
    pub coin_id: String,
    pub status: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SpendContractRequest {
    pub coin_id: String,
    pub signatures: Vec<String>,
    pub solution: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SpendContractResponse {
    pub spend_bundle_id: String,
    pub status: String,
}

// Create a new contract
pub async fn create_contract(
    Json(payload): Json<CreateContractRequest>,
) -> Result<Json<CreateContractResponse>, AppError> {
    tracing::info!("Creating contract: {}", payload.title);

    // Generate contract ID
    let contract_id = Uuid::new_v4().to_string();

    // Basic validation for m-of-n constraints
    if payload.participants.is_empty() {
        return Err(AppError::BadRequest(
            "participants must not be empty".to_string(),
        ));
    }
    if payload.required_signatures == 0 {
        return Err(AppError::BadRequest(
            "required_signatures must be at least 1".to_string(),
        ));
    }
    if payload.required_signatures > payload.participants.len() {
        return Err(AppError::BadRequest(
            "required_signatures cannot exceed number of participants".to_string(),
        ));
    }

    // Hash the contract terms
    let terms_hash = if let Some(ref path) = payload.file_path {
        hashing::hash_contract_file(path)
            .map_err(|e| AppError::InternalError(format!("Failed to hash file: {}", e)))?
    } else if let Some(content) = &payload.terms_text {
        hashing::hash_contract_content(content)
    } else {
        return Err(AppError::BadRequest(
            "Either file_path or terms_text must be provided".to_string(),
        ));
    };

    // Generate puzzle hash
    let puzzle_hash = puzzles::generate_contract_puzzle_hash(
        &payload.participants,
        &terms_hash,
        payload.required_signatures,
    )
    .map_err(|e| AppError::InternalError(format!("Failed to generate puzzle: {}", e)))?;

    // Store contract terms if provided as text
    if let Some(content) = &payload.terms_text {
        let filename = format!("{}.txt", contract_id);
        files::store_contract_file(content.as_bytes(), &filename).map_err(|e| {
            AppError::InternalError(format!("Failed to store contract file: {}", e))
        })?;
    }

    // Store contract metadata
    let metadata = serde_json::json!({
        "contract_id": contract_id,
        "title": payload.title,
        "participants": payload.participants,
        "required_signatures": payload.required_signatures,
        "terms_hash": terms_hash,
        "puzzle_hash": puzzle_hash,
        "created_at": chrono::Utc::now().to_rfc3339(),
        "file_path": payload.file_path,
        "attached_files": payload.attached_files,
    });

    files::store_contract_metadata(&contract_id, &metadata)
        .map_err(|e| AppError::InternalError(format!("Failed to store metadata: {}", e)))?;

    tracing::info!("Contract created and saved with ID: {}", contract_id);

    Ok(Json(CreateContractResponse {
        contract_id,
        terms_hash,
        puzzle_hash,
    }))
}

// Hash a contract file or content
pub async fn hash_contract(
    Json(payload): Json<HashContractRequest>,
) -> Result<Json<HashContractResponse>, AppError> {
    let terms_hash = if let Some(path) = payload.path {
        hashing::hash_contract_file(&path)
            .map_err(|e| AppError::InternalError(format!("Failed to hash file: {}", e)))?
    } else if let Some(content) = payload.content {
        hashing::hash_contract_content(&content)
    } else {
        return Err(AppError::BadRequest(
            "Either path or content must be provided".to_string(),
        ));
    };

    Ok(Json(HashContractResponse { terms_hash }))
}

// Compile a contract puzzle
pub async fn compile_contract(
    Json(payload): Json<CompileContractRequest>,
) -> Result<Json<CompileContractResponse>, AppError> {
    // m-of-n constraints
    if payload.participants.is_empty() {
        return Err(AppError::BadRequest(
            "participants must not be empty".to_string(),
        ));
    }
    if payload.required_signatures == 0 {
        return Err(AppError::BadRequest(
            "required_signatures must be at least 1".to_string(),
        ));
    }
    if payload.required_signatures > payload.participants.len() {
        return Err(AppError::BadRequest(
            "required_signatures cannot exceed number of participants".to_string(),
        ));
    }

    let puzzle_hash = puzzles::generate_contract_puzzle_hash(
        &payload.participants,
        &payload.terms_hash,
        payload.required_signatures,
    )
    .map_err(|e| AppError::InternalError(format!("Failed to compile puzzle: {}", e)))?;

    Ok(Json(CompileContractResponse {
        puzzle_hash: puzzle_hash.clone(),
        puzzle_reveal: format!("0x{}", puzzle_hash), // Simplified for now
    }))
}

// Deploy a contract to the blockchain
pub async fn deploy_contract(
    Json(payload): Json<DeployContractRequest>,
) -> Result<Json<DeployContractResponse>, AppError> {
    tracing::info!(
        "Deploying contract with puzzle hash: {}",
        payload.puzzle_hash
    );

    // This would interact with Chia RPC to create the initial coin
    // For now, return a mock response
    Ok(Json(DeployContractResponse {
        coin_id: format!("0x{}", hex::encode(&[0u8; 32])),
        status: "pending".to_string(),
    }))
}

// Get contract status
pub async fn contract_status() -> Result<Json<serde_json::Value>, AppError> {
    Ok(Json(serde_json::json!({
        "status": "active",
        "message": "Contract status endpoint"
    })))
}

// Chia node status: connected and network (mainnet/testnet)
pub async fn chia_node_status(
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, AppError> {
    let base_url = state.rpc_url().await;
    let client = ChiaRpcClient::from_env(base_url.clone());
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

            Ok(Json(serde_json::json!({
                "connected": true,
                "network": network.unwrap_or("unknown".to_string()),
                "peak_height": peak_height,
                "sync_mode": sync_mode,
                "rpc_url": base_url,
            })))
        }
        Err(e) => Ok(Json(serde_json::json!({
            "connected": false,
            "error": format!("{}", e),
            "rpc_url": base_url,
        }))),
    }
}

#[derive(Debug, Deserialize)]
pub struct SetChiaConfigRequest {
    pub rpc_url: String,
    #[serde(default)]
    pub mode: Option<String>,
}

// Set RPC URL (node or wallet) at runtime
pub async fn set_chia_config(
    State(state): State<AppState>,
    Json(payload): Json<SetChiaConfigRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    if payload.rpc_url.trim().is_empty() {
        return Err(AppError::BadRequest("rpc_url cannot be empty".to_string()));
    }

    state.set_rpc_url(payload.rpc_url.clone()).await;

    Ok(Json(serde_json::json!({
        "saved": true,
        "rpc_url": payload.rpc_url,
        "mode": payload.mode.unwrap_or("unknown".to_string()),
    })))
}

// Spend a contract
pub async fn spend_contract(
    Json(payload): Json<SpendContractRequest>,
) -> Result<Json<SpendContractResponse>, AppError> {
    tracing::info!("Spending contract coin: {}", payload.coin_id);

    // Feature flag: require multi-sig aggregation
    let multi_sig_enabled = std::env::var("FEATURE_MULTI_SIG")
        .map(|v| v == "true" || v == "1")
        .unwrap_or(false);
    if payload.signatures.len() > 1 && !multi_sig_enabled {
        return Err(AppError::BadRequest(
            "multi-sig required: enable FEATURE_MULTI_SIG to submit spends with multiple signatures".to_string(),
        ));
    }

    // This would build and submit a spend bundle
    // For now, return a mock response
    Ok(Json(SpendContractResponse {
        spend_bundle_id: format!("0x{}", hex::encode(&[0u8; 32])),
        status: "submitted".to_string(),
    }))
}

// List all contracts
pub async fn list_contracts() -> Result<Json<Vec<serde_json::Value>>, AppError> {
    tracing::info!("Listing all contracts");

    // Get all metadata files
    let storage_dir = "storage/metadata";
    let mut contracts = Vec::new();

    if let Ok(entries) = std::fs::read_dir(storage_dir) {
        for entry in entries.flatten() {
            if entry.path().extension().and_then(|s| s.to_str()) == Some("json") {
                if let Some(contract_id) = entry.path().file_stem().and_then(|s| s.to_str()) {
                    match files::load_contract_metadata(contract_id) {
                        Ok(metadata) => contracts.push(metadata),
                        Err(e) => {
                            tracing::warn!("Failed to load metadata for {}: {}", contract_id, e)
                        }
                    }
                }
            }
        }
    }

    tracing::info!("Found {} contracts", contracts.len());
    Ok(Json(contracts))
}

// Get a single contract by ID
pub async fn get_contract(
    axum::extract::Path(contract_id): axum::extract::Path<String>,
) -> Result<Json<serde_json::Value>, AppError> {
    tracing::info!("Getting contract: {}", contract_id);

    let metadata = files::load_contract_metadata(&contract_id)
        .map_err(|e| AppError::BadRequest(format!("Contract not found: {}", e)))?;

    Ok(Json(metadata))
}

// Validate contract presence on-chain by puzzle hash
pub async fn validate_contract(
    State(state): State<AppState>,
    Path(contract_id): Path<String>,
) -> Result<Json<serde_json::Value>, AppError> {
    let metadata = files::load_contract_metadata(&contract_id)
        .map_err(|e| AppError::BadRequest(format!("Contract not found: {}", e)))?;

    let puzzle_hash = metadata
        .get("puzzle_hash")
        .and_then(|v| v.as_str())
        .ok_or_else(|| AppError::InternalError("Missing puzzle_hash in metadata".to_string()))?;

    let base_url = state.rpc_url().await;
    let client = ChiaRpcClient::from_env(base_url.clone());

    match client.get_coin_records_by_puzzle_hash(puzzle_hash).await {
        Ok(records) => {
            let validated = !records.is_empty();
            Ok(Json(serde_json::json!({
                "validated": validated,
                "records": records.len(),
                "rpc_url": base_url,
            })))
        }
        Err(e) => Ok(Json(serde_json::json!({
            "validated": false,
            "error": format!("{}", e),
            "rpc_url": base_url,
        }))),
    }
}

// Error handling
#[derive(Debug)]
pub enum AppError {
    BadRequest(String),
    InternalError(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match self {
            AppError::BadRequest(msg) => (StatusCode::BAD_REQUEST, msg),
            AppError::InternalError(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg),
        };

        (status, message).into_response()
    }
}
