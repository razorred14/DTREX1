use base64::{engine::general_purpose, Engine as _};
use hmac::{Hmac, Mac};
use serde::Deserialize;
use serde_json::{json, Value};
use sha2::Sha256;

use super::rpc::RpcError;
use crate::model::{validate_password, ModelManager, UserBmc, UserForCreate};

// ============================================================================
// Types
// ============================================================================

const AUTH_TOKEN_COOKIE_NAME: &str = "auth-token";

#[derive(Deserialize)]
pub struct LoginPayload {
    username: String,
    pwd: String,
}

#[derive(Deserialize)]
pub struct RegisterPayload {
    username: String,
    pwd: String,
}

// ============================================================================
// RPC Methods
// ============================================================================

pub async fn rpc_login(mm: ModelManager, params: Option<Value>) -> Result<Value, RpcError> {
    let params: LoginPayload =
        serde_json::from_value(params.unwrap_or(json!({}))).map_err(|e| RpcError {
            code: -32602,
            message: format!("Invalid params: {}", e),
            data: None,
        })?;

    // Get user from database
    let user = UserBmc::first_by_username(mm.db(), &params.username)
        .await
        .map_err(|_| RpcError {
            code: 4001,
            message: "Invalid username or password".to_string(),
            data: None,
        })?;

    // Validate password
    validate_password(&params.pwd, &user.pwd).map_err(|_| RpcError {
        code: 4001,
        message: "Invalid username or password".to_string(),
        data: None,
    })?;

    // Generate token
    let token = generate_token(user.id, &user.token_salt.to_string())?;

    Ok(json!({
        "success": true,
        "user": {
            "id": user.id,
            "username": user.username,
        },
        "token": token,
    }))
}

pub async fn rpc_logout() -> Result<Value, RpcError> {
    Ok(json!({
        "success": true,
        "logged_out": true,
    }))
}

pub async fn rpc_register(mm: ModelManager, params: Option<Value>) -> Result<Value, RpcError> {
    let params: RegisterPayload =
        serde_json::from_value(params.unwrap_or(json!({}))).map_err(|e| RpcError {
            code: -32602,
            message: format!("Invalid params: {}", e),
            data: None,
        })?;

    // Validate input
    if params.username.is_empty() || params.pwd.len() < 6 {
        return Err(RpcError {
            code: -32602,
            message: "Username cannot be empty and password must be at least 6 characters"
                .to_string(),
            data: None,
        });
    }

    // Create user
    let user_id = UserBmc::create(
        mm.db(),
        UserForCreate {
            username: params.username.clone(),
            pwd_clear: params.pwd,
        },
    )
    .await
    .map_err(|e| {
        let err_str = e.to_string();
        if err_str.contains("duplicate key") || err_str.contains("unique constraint") {
            RpcError {
                code: 4002,
                message: "Username already exists".to_string(),
                data: None,
            }
        } else {
            RpcError {
                code: 4000,
                message: format!("Failed to create user: {}", e),
                data: None,
            }
        }
    })?;

    Ok(json!({
        "success": true,
        "user": {
            "id": user_id,
            "username": params.username,
        }
    }))
}

// ============================================================================
// Token Generation
// ============================================================================

fn generate_token(user_id: i64, token_salt: &str) -> Result<String, RpcError> {
    let token_secret = std::env::var("TOKEN_SECRET").map_err(|_| RpcError {
        code: 5000,
        message: "TOKEN_SECRET not configured".to_string(),
        data: None,
    })?;

    // Create token payload: user_id.token_salt.timestamp
    let timestamp = chrono::Utc::now().timestamp();
    let payload = format!("{}.{}.{}", user_id, token_salt, timestamp);

    // Create HMAC signature
    type HmacSha256 = Hmac<Sha256>;
    let mut mac = HmacSha256::new_from_slice(token_secret.as_bytes()).map_err(|_| RpcError {
        code: 5000,
        message: "Invalid token secret".to_string(),
        data: None,
    })?;

    mac.update(payload.as_bytes());
    let signature = mac.finalize();
    let signature_hex = hex::encode(signature.into_bytes());

    // Final token format: base64(payload).signature
    let token = format!(
        "{}.{}",
        general_purpose::STANDARD.encode(&payload),
        signature_hex
    );

    Ok(token)
}

/// Validate token and extract user_id
pub fn validate_token(token: &str) -> Result<i64, RpcError> {
    let parts: Vec<&str> = token.split('.').collect();
    if parts.len() != 2 {
        return Err(RpcError {
            code: 4001,
            message: "Invalid token format".to_string(),
            data: None,
        });
    }

    // Decode payload
    let payload = general_purpose::STANDARD
        .decode(parts[0])
        .map_err(|_| RpcError {
            code: 4001,
            message: "Invalid token encoding".to_string(),
            data: None,
        })?;

    let payload_str = String::from_utf8(payload).map_err(|_| RpcError {
        code: 4001,
        message: "Invalid token payload".to_string(),
        data: None,
    })?;

    // Parse payload
    let payload_parts: Vec<&str> = payload_str.split('.').collect();
    if payload_parts.len() != 3 {
        return Err(RpcError {
            code: 4001,
            message: "Invalid token payload format".to_string(),
            data: None,
        });
    }

    let user_id: i64 = payload_parts[0].parse().map_err(|_| RpcError {
        code: 4001,
        message: "Invalid user ID in token".to_string(),
        data: None,
    })?;

    let _token_salt = payload_parts[1];
    let signature_expected = parts[1];

    // Verify signature
    let token_secret = std::env::var("TOKEN_SECRET").map_err(|_| RpcError {
        code: 5000,
        message: "TOKEN_SECRET not configured".to_string(),
        data: None,
    })?;

    type HmacSha256 = Hmac<Sha256>;
    let mut mac = HmacSha256::new_from_slice(token_secret.as_bytes()).map_err(|_| RpcError {
        code: 5000,
        message: "Invalid token secret".to_string(),
        data: None,
    })?;

    mac.update(payload_str.as_bytes());
    let signature = mac.finalize();
    let signature_hex = hex::encode(signature.into_bytes());

    if signature_hex != signature_expected {
        return Err(RpcError {
            code: 4001,
            message: "Invalid token signature".to_string(),
            data: None,
        });
    }

    Ok(user_id)
}
