
use axum::extract::State;
use serde_json::Value;
use crate::ctx::Ctx;
use crate::app_state::AppState;
use crate::api::rpc::RpcError;
use std::sync::Arc;

// Handles wallet RPC passthrough methods (get_sync_status, get_wallets, etc.)
pub async fn wallet_rpc_handler(
    State(state): State<Arc<AppState>>,
    ctx: Option<Ctx>,
    method: &str,
    params: Option<Value>,
) -> Result<Value, RpcError> {
    match method {
        "get_sync_status" => {
            if let Some(_ctx) = ctx {
                return match crate::rpc::client::ChiaRpcClient::from_state(state.clone(), "wallet").await {
                    Ok(client) => {
                        match client.get_blockchain_state().await {
                            Ok(result) => Ok(result),
                            Err(e) => Err(RpcError {
                                code: 5000,
                                message: format!("Wallet RPC error: {}", e),
                                data: None,
                            })
                        }
                    }
                    Err(e) => Err(RpcError {
                        code: 5000,
                        message: format!("Failed to create wallet RPC client: {}", e),
                        data: None,
                    })
                };
            } else {
                return Err(RpcError {
                    code: 4001,
                    message: "Unauthorized - login required".to_string(),
                    data: None,
                });
            }
        }
        "get_wallets" => {
            if let Some(_ctx) = ctx {
                // Use Python proxy for wallet RPC
                return match crate::rpc::client::ChiaRpcClient::from_state(state.clone(), "wallet").await {
                    Ok(_client) => {
                        let cert_path = "ssl/wallet/private_wallet.crt";
                        let key_path = "ssl/wallet/private_wallet.key";
                        let proxy_path = "ssl/wallet/wallet_rpc_proxy.py";
                        let method = "get_wallets";
                        let params = "{}";
                        let mut cmd = std::process::Command::new("python3");
                        cmd.arg(proxy_path)
                            .arg(method)
                            .arg(params)
                            .env("CHIA_WALLET_RPC_URL", format!("https://localhost:9256/{}", method))
                            .env("CHIA_WALLET_CERT", cert_path)
                            .env("CHIA_WALLET_KEY", key_path);
                        let output = match cmd.output() {
                            Ok(o) => o,
                            Err(e) => {
                                return Err(RpcError {
                                    code: 5000,
                                    message: format!("Failed to run wallet_rpc_proxy.py: {}", e),
                                    data: None,
                                });
                            }
                        };
                        if !output.status.success() {
                            let err = String::from_utf8_lossy(&output.stderr);
                            return Err(RpcError {
                                code: 5000,
                                message: format!("wallet_rpc_proxy.py failed: {}", err),
                                data: None,
                            });
                        }
                        let stdout = String::from_utf8_lossy(&output.stdout);
                        let parsed: serde_json::Value = match serde_json::from_str(&stdout) {
                            Ok(val) => val,
                            Err(e) => {
                                return Err(RpcError {
                                    code: 5000,
                                    message: format!("Failed to parse wallet_rpc_proxy.py output as JSON: {}\nRaw output: {}", e, stdout),
                                    data: None,
                                });
                            }
                        };
                        if let Some(error) = parsed.get("error") {
                            return Err(RpcError {
                                code: 5000,
                                message: format!("wallet_rpc_proxy.py error: {}\nRaw output: {}", error, stdout),
                                data: None,
                            });
                        }
                        return Ok(parsed);
                    }
                    Err(e) => Err(RpcError {
                        code: 5000,
                        message: format!("Failed to create wallet RPC client: {}", e),
                        data: None,
                    })
                };
            } else {
                return Err(RpcError {
                    code: 4001,
                    message: "Unauthorized - login required".to_string(),
                    data: None,
                });
            }
        }
        "get_wallet_balance" => {
            if let Some(_ctx) = ctx {
                // Use Python proxy for wallet RPC
                return match crate::rpc::client::ChiaRpcClient::from_state(state.clone(), "wallet").await {
                    Ok(_client) => {
                        let cert_path = "ssl/wallet/private_wallet.crt";
                        let key_path = "ssl/wallet/private_wallet.key";
                        let proxy_path = "ssl/wallet/wallet_rpc_proxy.py";
                        let method = "get_wallet_balance";
                        // Pass params as JSON string, or '{}' if none
                        let params = params
                            .as_ref()
                            .map(|p| p.to_string())
                            .unwrap_or_else(|| "{}".to_string());
                        let mut cmd = std::process::Command::new("python3");
                        cmd.arg(proxy_path)
                            .arg(method)
                            .arg(&params)
                            .env("CHIA_WALLET_RPC_URL", format!("https://localhost:9256/{}", method))
                            .env("CHIA_WALLET_CERT", cert_path)
                            .env("CHIA_WALLET_KEY", key_path);
                        let output = match cmd.output() {
                            Ok(o) => o,
                            Err(e) => {
                                return Err(RpcError {
                                    code: 5000,
                                    message: format!("Failed to run wallet_rpc_proxy.py: {}", e),
                                    data: None,
                                });
                            }
                        };
                        if !output.status.success() {
                            let err = String::from_utf8_lossy(&output.stderr);
                            return Err(RpcError {
                                code: 5000,
                                message: format!("wallet_rpc_proxy.py failed: {}", err),
                                data: None,
                            });
                        }
                        let stdout = String::from_utf8_lossy(&output.stdout);
                        let parsed: serde_json::Value = match serde_json::from_str(&stdout) {
                            Ok(val) => val,
                            Err(e) => {
                                return Err(RpcError {
                                    code: 5000,
                                    message: format!("Failed to parse wallet_rpc_proxy.py output as JSON: {}\nRaw output: {}", e, stdout),
                                    data: None,
                                });
                            }
                        };
                        if let Some(error) = parsed.get("error") {
                            return Err(RpcError {
                                code: 5000,
                                message: format!("wallet_rpc_proxy.py error: {}\nRaw output: {}", error, stdout),
                                data: None,
                            });
                        }
                        return Ok(parsed);
                    }
                    Err(e) => Err(RpcError {
                        code: 5000,
                        message: format!("Failed to create wallet RPC client: {}", e),
                        data: None,
                    })
                };
            } else {
                return Err(RpcError {
                    code: 4001,
                    message: "Unauthorized - login required".to_string(),
                    data: None,
                });
            }
        }
        "wallet_get_address" => {
            if let Some(_ctx) = ctx {
                // Use Python proxy for wallet RPC - calls get_next_address
                return match crate::rpc::client::ChiaRpcClient::from_state(state.clone(), "wallet").await {
                    Ok(_client) => {
                        let cert_path = "ssl/wallet/private_wallet.crt";
                        let key_path = "ssl/wallet/private_wallet.key";
                        let proxy_path = "ssl/wallet/wallet_rpc_proxy.py";
                        // Chia wallet RPC uses "get_next_address" to fetch addresses
                        let chia_method = "get_next_address";
                        // Transform params: frontend sends {wallet_id, new_address}
                        // Chia expects {wallet_id, new_address}
                        let params = params
                            .as_ref()
                            .map(|p| p.to_string())
                            .unwrap_or_else(|| r#"{"wallet_id": 1, "new_address": false}"#.to_string());
                        let mut cmd = std::process::Command::new("python3");
                        cmd.arg(proxy_path)
                            .arg(chia_method)
                            .arg(&params)
                            .env("CHIA_WALLET_RPC_URL", format!("https://localhost:9256/{}", chia_method))
                            .env("CHIA_WALLET_CERT", cert_path)
                            .env("CHIA_WALLET_KEY", key_path);
                        let output = match cmd.output() {
                            Ok(o) => o,
                            Err(e) => {
                                return Err(RpcError {
                                    code: 5000,
                                    message: format!("Failed to run wallet_rpc_proxy.py: {}", e),
                                    data: None,
                                });
                            }
                        };
                        if !output.status.success() {
                            let err = String::from_utf8_lossy(&output.stderr);
                            return Err(RpcError {
                                code: 5000,
                                message: format!("wallet_rpc_proxy.py failed: {}", err),
                                data: None,
                            });
                        }
                        let stdout = String::from_utf8_lossy(&output.stdout);
                        let parsed: serde_json::Value = match serde_json::from_str(&stdout) {
                            Ok(val) => val,
                            Err(e) => {
                                return Err(RpcError {
                                    code: 5000,
                                    message: format!("Failed to parse wallet_rpc_proxy.py output as JSON: {}\nRaw output: {}", e, stdout),
                                    data: None,
                                });
                            }
                        };
                        if let Some(error) = parsed.get("error") {
                            return Err(RpcError {
                                code: 5000,
                                message: format!("wallet_rpc_proxy.py error: {}\nRaw output: {}", error, stdout),
                                data: None,
                            });
                        }
                        return Ok(parsed);
                    }
                    Err(e) => Err(RpcError {
                        code: 5000,
                        message: format!("Failed to create wallet RPC client: {}", e),
                        data: None,
                    })
                };
            } else {
                return Err(RpcError {
                    code: 4001,
                    message: "Unauthorized - login required".to_string(),
                    data: None,
                });
            }
        }
        "create_offer_for_ids" | "take_offer" => {
            if let Some(_ctx) = ctx {
                return match crate::rpc::client::ChiaRpcClient::from_state(state.clone(), "wallet").await {
                    Ok(_client) => {
                        let cert_path = "ssl/wallet/private_wallet.crt";
                        let key_path = "ssl/wallet/private_wallet.key";
                        let proxy_path = "ssl/wallet/wallet_rpc_proxy.py";
                        let method = method;
                        let params = params
                            .as_ref()
                            .map(|p| p.to_string())
                            .unwrap_or_else(|| "{}".to_string());
                        let mut cmd = std::process::Command::new("python3");
                        cmd.arg(proxy_path)
                            .arg(method)
                            .arg(&params)
                            .env("CHIA_WALLET_RPC_URL", format!("https://localhost:9256/{}", method))
                            .env("CHIA_WALLET_CERT", cert_path)
                            .env("CHIA_WALLET_KEY", key_path);
                        let output = match cmd.output() {
                            Ok(o) => o,
                            Err(e) => {
                                return Err(RpcError {
                                    code: 5000,
                                    message: format!("Failed to run wallet_rpc_proxy.py: {}", e),
                                    data: None,
                                });
                            }
                        };
                        if !output.status.success() {
                            let err = String::from_utf8_lossy(&output.stderr);
                            return Err(RpcError {
                                code: 5000,
                                message: format!("wallet_rpc_proxy.py failed: {}", err),
                                data: None,
                            });
                        }
                        let stdout = String::from_utf8_lossy(&output.stdout);
                        let parsed: serde_json::Value = match serde_json::from_str(&stdout) {
                            Ok(val) => val,
                            Err(e) => {
                                return Err(RpcError {
                                    code: 5000,
                                    message: format!("Failed to parse wallet_rpc_proxy.py output as JSON: {}\nRaw output: {}", e, stdout),
                                    data: None,
                                });
                            }
                        };
                        if let Some(error) = parsed.get("error") {
                            return Err(RpcError {
                                code: 5000,
                                message: format!("wallet_rpc_proxy.py error: {}\nRaw output: {}", error, stdout),
                                data: None,
                            });
                        }
                        return Ok(parsed);
                    }
                    Err(e) => Err(RpcError {
                        code: 5000,
                        message: format!("Failed to create wallet RPC client: {}", e),
                        data: None,
                    })
                };
            } else {
                return Err(RpcError {
                    code: 4001,
                    message: "Unauthorized - login required".to_string(),
                    data: None,
                });
            }
        }
        _ => Err(RpcError {
            code: -32601,
            message: "Wallet method not found".to_string(),
            data: None,
        })
    }
}
