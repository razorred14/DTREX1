    impl ChiaRpcClient {
        fn log_request_details(method: &str, url: &str, body: Option<&serde_json::Value>) {
            tracing::info!("ChiaRpcClient: Outgoing request: method={}, url={}, body={}",
                method,
                url,
                body.map(|b| b.to_string()).unwrap_or_else(|| "<none>".to_string())
            );
        }
        fn log_response_details(status: reqwest::StatusCode, headers: &reqwest::header::HeaderMap) {
            let mut header_map = serde_json::Map::new();
            for (k, v) in headers.iter() {
                if k.as_str().eq_ignore_ascii_case("authorization") { continue; }
                header_map.insert(k.to_string(), serde_json::Value::String(v.to_str().unwrap_or("").to_string()));
            }
            tracing::info!("ChiaRpcClient: Response: status={}, headers={}", status, serde_json::Value::Object(header_map));
        }
    }
use reqwest::{Client, Certificate};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::Arc;

use std::process::Command;
use std::path::Path;

use crate::app_state::AppState;

#[derive(Clone)]
pub struct ChiaRpcClient {
    base_url: String,
    client: Client,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PushTxRequest {
    pub spend_bundle: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PushTxResponse {
    pub success: bool,
    pub status: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CoinRecord {
    pub coin_id: String,
    pub puzzle_hash: String,
    pub amount: u64,
    pub spent: bool,
}

impl ChiaRpcClient {
    pub fn new(base_url: String) -> Self {
        Self::new_with_insecure(base_url, false)
    }

    pub fn new_with_insecure(base_url: String, allow_insecure: bool) -> Self {
        let client = reqwest::Client::builder()
            .danger_accept_invalid_certs(allow_insecure)
            .build()
            .unwrap();

        Self { base_url, client }
    }

    pub fn from_env(base_url: String) -> Self {
        let allow_insecure = std::env::var("CHIA_ALLOW_INSECURE")
            .map(|v| v == "1" || v.eq_ignore_ascii_case("true"))
            .unwrap_or(false);
        Self::new_with_insecure(base_url, allow_insecure)
    }

    pub fn new_with_client(base_url: String, client: Client) -> Self {
        Self { base_url, client }
    }

    /// Construct client from AppState, wiring HTTPS client identity for the given mode (wallet/full_node)
    pub async fn from_state(state: Arc<AppState>, mode: &str) -> Result<Self, Box<dyn std::error::Error + Send + Sync>> {
        // Use correct default port and scheme for wallet/full_node if not specified
        let mut base_url = state.rpc_url().await;
        let needs_wallet = mode == "wallet";
        let is_local = base_url.contains("localhost") || base_url.contains("127.0.0.1");
        let has_port = base_url.contains(":9256") || base_url.contains(":8555");
        // (removed unused needs_full_node)
        if needs_wallet && (base_url.is_empty() || base_url.ends_with(":8555") || base_url == "http://localhost" || base_url == "https://localhost" || base_url == "http://127.0.0.1" || base_url == "https://127.0.0.1") {
            base_url = "https://localhost:9256".to_string();
        } else if base_url.is_empty() || base_url == "http://localhost" || base_url == "https://localhost" || base_url == "http://127.0.0.1" || base_url == "https://127.0.0.1" {
            base_url = if needs_wallet {
                "https://localhost:9256".to_string()
            } else {
                "https://localhost:8555".to_string()
            };
        } else if is_local && !has_port {
            base_url = if needs_wallet {
                base_url.replace("http://", "https://").replace("https://", "https://") + ":9256"
            } else {
                base_url.replace("http://", "https://").replace("https://", "https://") + ":8555"
            };
        } else if is_local && has_port {
            base_url = base_url.replace("http://", "https://");
        }
        tracing::info!("ChiaRpcClient: connection_mode = {}", mode);
        if needs_wallet {
            // For wallet mode, we use the Python subprocess proxy
            Ok(Self::new_with_client(base_url, Client::new()))
        } else {
            // For full_node, use reqwest as before
            let mut builder = reqwest::Client::builder();
            if let Some(ca_path) = state.get_ssl_ca_path_for_mode(mode).await {
                if !ca_path.is_empty() {
                    tracing::info!("ChiaRpcClient: CA file path = {}", ca_path);
                    if Path::new(&ca_path).exists() {
                        let meta = std::fs::metadata(&ca_path);
                        if let Ok(meta) = meta {
                            tracing::info!("CA file size: {} bytes", meta.len());
                        }
                        match std::fs::read(&ca_path) {
                            Ok(bytes) => match Certificate::from_pem(&bytes) {
                                Ok(cert) => {
                                    tracing::info!("Loaded CA certificate from {} ({} bytes)", ca_path, bytes.len());
                                    let preview = &bytes[..std::cmp::min(64, bytes.len())];
                                    tracing::info!("CA file first 64 bytes: {:02x?}", preview);
                                    builder = builder.add_root_certificate(cert);
                                }
                                Err(e) => tracing::error!("Failed to parse CA PEM at {}: {}", ca_path, e),
                            },
                            Err(e) => tracing::error!("Failed to read CA file at {}: {}", ca_path, e),
                        }
                    } else {
                        tracing::error!("CA file path set but file does not exist: {}", ca_path);
                    }
                } else {
                    tracing::warn!("CA file path is empty in state; skipping CA trust");
                }
            } else {
                tracing::info!("ChiaRpcClient: CA file path = <none>");
            }
            let allow_insecure = std::env::var("CHIA_ALLOW_INSECURE")
                .map(|v| v == "1" || v.eq_ignore_ascii_case("true"))
                .unwrap_or(false);
            builder = builder.danger_accept_invalid_certs(allow_insecure);
            let client = builder.build()?;
            Ok(Self::new_with_client(base_url, client))
        }
    }

    /// Push a spend bundle to the mempool
    pub async fn push_tx(
        &self,
        spend_bundle_hex: &str,
    ) -> Result<PushTxResponse, Box<dyn std::error::Error + Send + Sync>> {
        // If wallet mode, use Python subprocess
        if self.base_url.contains(":9256") {
            // Find PEM paths
            let cert_path = "ssl/wallet/private_wallet.crt";
            let key_path = "ssl/wallet/private_wallet.key";
            let proxy_path = "ssl/wallet/wallet_rpc_proxy.py";
            let method = "push_tx";
            let params = json!({ "spend_bundle": spend_bundle_hex }).to_string();
            let mut cmd = Command::new("python3");
            cmd.arg(proxy_path)
                .arg(method)
                .arg(&params)
                .env("CHIA_WALLET_RPC_URL", format!("{}/{}", self.base_url, method))
                .env("CHIA_WALLET_CERT", cert_path)
                .env("CHIA_WALLET_KEY", key_path);
            tracing::info!("[wallet_rpc_proxy] Running: python3 {} {} <params> (CHIA_WALLET_RPC_URL={}, CHIA_WALLET_CERT={}, CHIA_WALLET_KEY={})", proxy_path, method, format!("{}/{}", self.base_url, method), cert_path, key_path);
            let output = cmd.output()?;
            tracing::info!("[wallet_rpc_proxy] status: {:?}", output.status);
            tracing::info!("[wallet_rpc_proxy] stdout: {}", String::from_utf8_lossy(&output.stdout));
            tracing::info!("[wallet_rpc_proxy] stderr: {}", String::from_utf8_lossy(&output.stderr));
            if !output.status.success() {
                let err = String::from_utf8_lossy(&output.stderr);
                return Err(format!("wallet_rpc_proxy.py failed: {}\nstdout: {}\nstderr: {}", err, String::from_utf8_lossy(&output.stdout), String::from_utf8_lossy(&output.stderr)).into());
            }
            let stdout = String::from_utf8_lossy(&output.stdout);
            let parsed: serde_json::Value = serde_json::from_str(&stdout)
                .map_err(|e| format!("Failed to parse wallet_rpc_proxy.py output as JSON: {}\nRaw output: {}", e, stdout))?;
            if let Some(error) = parsed.get("error") {
                return Err(format!("wallet_rpc_proxy.py error: {}\nRaw output: {}", error, stdout).into());
            }
            let result: PushTxResponse = serde_json::from_value(parsed)?;
            Ok(result)
        } else {
            // Full node: use reqwest
            let url = format!("{}/push_tx", self.base_url);
            let body = json!({ "spend_bundle": spend_bundle_hex });
            Self::log_request_details("POST", &url, Some(&body));
            let response = self.client.post(&url).json(&body).send().await?;
            Self::log_response_details(response.status(), response.headers());
            let result = response.json::<PushTxResponse>().await?;
            tracing::info!("Push TX result: {:?}", result);
            Ok(result)
        }
    }

    /// Get coin records by puzzle hash
    pub async fn get_coin_records_by_puzzle_hash(
        &self,
        puzzle_hash: &str,
    ) -> Result<Vec<CoinRecord>, Box<dyn std::error::Error + Send + Sync>> {
        let url = format!("{}/get_coin_records_by_puzzle_hash", self.base_url);

        let body = json!({
            "puzzle_hash": puzzle_hash,
            "include_spent_coins": false
        });

        Self::log_request_details("POST", &url, Some(&body));
        let response = self.client.post(&url).json(&body).send().await?;
        Self::log_response_details(response.status(), response.headers());
        let result: serde_json::Value = response.json().await?;
        let mut out: Vec<CoinRecord> = Vec::new();

        if let Some(arr) = result.get("coin_records").and_then(|v| v.as_array()) {
            for cr in arr {
                let coin = cr.get("coin").unwrap_or(&serde_json::Value::Null);
                let coin_id = coin
                    .get("name")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                let ph = coin
                    .get("puzzle_hash")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                let amount = coin.get("amount").and_then(|v| v.as_u64()).unwrap_or(0);
                let spent = cr.get("spent").and_then(|v| v.as_bool()).unwrap_or(false);

                if !ph.is_empty() {
                    out.push(CoinRecord {
                        coin_id,
                        puzzle_hash: ph,
                        amount,
                        spent,
                    });
                }
            }
        }

        Ok(out)
    }

    /// Get puzzle and solution for a coin
    pub async fn get_puzzle_and_solution(
        &self,
        coin_id: &str,
        height: u64,
    ) -> Result<PuzzleAndSolution, Box<dyn std::error::Error + Send + Sync>> {
        let url = format!("{}/get_puzzle_and_solution", self.base_url);

        let body = json!({
            "coin_id": coin_id,
            "height": height
        });

        Self::log_request_details("POST", &url, Some(&body));
        let response = self.client.post(&url).json(&body).send().await?;
        Self::log_response_details(response.status(), response.headers());
        let result = response.json::<PuzzleAndSolution>().await?;
        Ok(result)
    }

    /// Get blockchain state
    pub async fn get_blockchain_state(
        &self,
    ) -> Result<serde_json::Value, Box<dyn std::error::Error + Send + Sync>> {
        // If wallet mode, use Python subprocess proxy to respect insecure mode
        if self.base_url.contains(":9256") {
            let cert_path = "ssl/wallet/private_wallet.crt";
            let key_path = "ssl/wallet/private_wallet.key";
            let proxy_path = "ssl/wallet/wallet_rpc_proxy.py";
            let method = "get_sync_status";
            let params = "{}";
            let mut cmd = std::process::Command::new("python3");
            cmd.arg(proxy_path)
                .arg(method)
                .arg(params)
                .env("CHIA_WALLET_RPC_URL", format!("{}/{}", self.base_url, method))
                .env("CHIA_WALLET_CERT", cert_path)
                .env("CHIA_WALLET_KEY", key_path);
            tracing::info!("[wallet_rpc_proxy] Running: python3 {} {} <params> (CHIA_WALLET_RPC_URL={}, CHIA_WALLET_CERT={}, CHIA_WALLET_KEY={})", proxy_path, method, format!("{}/{}", self.base_url, method), cert_path, key_path);
            let output = cmd.output()?;
            tracing::info!("[wallet_rpc_proxy] status: {:?}", output.status);
            tracing::info!("[wallet_rpc_proxy] stdout: {}", String::from_utf8_lossy(&output.stdout));
            tracing::info!("[wallet_rpc_proxy] stderr: {}", String::from_utf8_lossy(&output.stderr));
            if !output.status.success() {
                let err = String::from_utf8_lossy(&output.stderr);
                return Err(format!("wallet_rpc_proxy.py failed: {}\nstdout: {}\nstderr: {}", err, String::from_utf8_lossy(&output.stdout), String::from_utf8_lossy(&output.stderr)).into());
            }
            let stdout = String::from_utf8_lossy(&output.stdout);
            let parsed: serde_json::Value = serde_json::from_str(&stdout)
                .map_err(|e| format!("Failed to parse wallet_rpc_proxy.py output as JSON: {}\nRaw output: {}", e, stdout))?;
            if let Some(error) = parsed.get("error") {
                return Err(format!("wallet_rpc_proxy.py error: {}\nRaw output: {}", error, stdout).into());
            }
            Ok(parsed)
        } else {
            let url = format!("{}/get_blockchain_state", self.base_url);
            Self::log_request_details("POST", &url, None);
            let response = self.client.post(&url).send().await?;
            Self::log_response_details(response.status(), response.headers());
            let result = response.json::<serde_json::Value>().await?;
            // Extract the blockchain_state from the response
            if let Some(blockchain_state) = result.get("blockchain_state") {
                Ok(blockchain_state.clone())
            } else {
                Ok(result)
            }
        }
    }

    /// Get a transaction record from the wallet by transaction ID
    /// This is used to verify commitment fee payments
    pub async fn get_transaction(
        &self,
        transaction_id: &str,
    ) -> Result<TransactionRecord, Box<dyn std::error::Error + Send + Sync>> {
        // Use wallet RPC endpoint
        let wallet_url = self.base_url.replace(":8555", ":9256");
        let url = format!("{}/get_transaction", wallet_url);
        
        let body = json!({
            "transaction_id": transaction_id
        });

        // Use wallet proxy for SSL
        let cert_path = "ssl/wallet/private_wallet.crt";
        let key_path = "ssl/wallet/private_wallet.key";
        let proxy_path = "ssl/wallet/wallet_rpc_proxy.py";
        
        let mut cmd = Command::new("python3");
        cmd.arg(proxy_path)
            .arg("get_transaction")
            .arg(body.to_string())
            .env("CHIA_WALLET_RPC_URL", &url)
            .env("CHIA_WALLET_CERT", cert_path)
            .env("CHIA_WALLET_KEY", key_path);
        
        tracing::info!("[wallet_rpc_proxy] Getting transaction: {}", transaction_id);
        let output = cmd.output()?;
        
        if !output.status.success() {
            let err = String::from_utf8_lossy(&output.stderr);
            return Err(format!("Failed to get transaction: {}", err).into());
        }
        
        let stdout = String::from_utf8_lossy(&output.stdout);
        let parsed: serde_json::Value = serde_json::from_str(&stdout)?;
        
        if let Some(error) = parsed.get("error") {
            return Err(format!("Transaction lookup error: {}", error).into());
        }
        
        // Parse transaction from response
        let tx = parsed.get("transaction")
            .ok_or("No transaction in response")?;
        
        Ok(TransactionRecord {
            transaction_id: tx.get("name").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            confirmed: tx.get("confirmed").and_then(|v| v.as_bool()).unwrap_or(false),
            confirmed_at_height: tx.get("confirmed_at_height").and_then(|v| v.as_u64()),
            amount: tx.get("amount").and_then(|v| v.as_u64()).unwrap_or(0),
            fee_amount: tx.get("fee_amount").and_then(|v| v.as_u64()).unwrap_or(0),
            to_address: tx.get("to_address").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            sent_to: tx.get("sent_to").and_then(|v| v.as_array()).map(|a| a.len()).unwrap_or(0) > 0,
        })
    }

    /// Check if a transaction is in the mempool
    pub async fn is_tx_in_mempool(
        &self,
        transaction_id: &str,
    ) -> Result<bool, Box<dyn std::error::Error + Send + Sync>> {
        let url = format!("{}/get_all_mempool_tx_ids", self.base_url);
        
        Self::log_request_details("POST", &url, None);
        let response = self.client.post(&url).json(&json!({})).send().await?;
        Self::log_response_details(response.status(), response.headers());
        
        let result: serde_json::Value = response.json().await?;
        
        if let Some(tx_ids) = result.get("tx_ids").and_then(|v| v.as_array()) {
            for tx_id in tx_ids {
                if let Some(id) = tx_id.as_str() {
                    if id == transaction_id {
                        return Ok(true);
                    }
                }
            }
        }
        
        Ok(false)
    }

    /// Check node health
    pub async fn health_check(&self) -> Result<bool, Box<dyn std::error::Error + Send + Sync>> {
        let url = format!("{}/healthz", self.base_url);

        let response = self.client.get(&url).send().await?;

        Ok(response.status().is_success())
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PuzzleAndSolution {
    pub puzzle_reveal: String,
    pub solution: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TransactionRecord {
    pub transaction_id: String,
    pub confirmed: bool,
    pub confirmed_at_height: Option<u64>,
    pub amount: u64,
    pub fee_amount: u64,
    pub to_address: String,
    pub sent_to: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BlockchainState {
    pub peak_height: Option<u64>,
    pub sync_mode: bool,
    pub difficulty: Option<u64>,
    pub network: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_client_creation() {
        let client = ChiaRpcClient::new("http://localhost:8555".to_string());
        assert_eq!(client.base_url, "http://localhost:8555");
    }
}
