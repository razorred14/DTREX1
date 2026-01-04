use axum::{
    extract::{Multipart, State, Query},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tokio::fs;
use tokio::io::AsyncWriteExt;
// use crate::util::pem_to_pkcs12::pem_to_pkcs12; // removed, no longer needed
use std::sync::Arc;

use crate::app_state::AppState;

#[derive(Debug, Serialize)]
pub struct SslUploadResponse {
    success: bool,
    message: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SslStatus {
    has_cert: bool,
    has_key: bool,
    cert_path: Option<String>,
    key_path: Option<String>,
    // PKCS#12 fields removed
    has_ca: bool,
    ca_path: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SetSslPathsRequest {
    pub mode: String, // "wallet" or "full_node"
    pub cert_path: String,
    pub key_path: String,
    // PKCS#12 fields removed
    pub ca_path: Option<String>,
}

/// Upload SSL certificate files for Chia RPC connection
pub async fn upload_ssl_certificates(
    State(state): State<Arc<AppState>>,
    mut multipart: Multipart,
) -> Result<Json<SslUploadResponse>, StatusCode> {
    // Determine type: wallet or full_node (from query param or multipart field)
    // For now, default to full_node unless a field 'type'=='wallet' is present
    let mut ssl_type = "full_node".to_string();
    let mut fields: Vec<(String, Vec<u8>)> = Vec::new();
    while let Some(field) = multipart.next_field().await.unwrap_or(None) {
        let name = field.name().unwrap_or("").to_string();
        if name == "type" {
            let data = field.bytes().await.unwrap_or_default();
            if let Ok(s) = std::str::from_utf8(&data) {
                if s.trim() == "wallet" { ssl_type = "wallet".to_string(); }
            }
            continue;
        }
        let data = field.bytes().await.unwrap_or_default().to_vec();
        fields.push((name, data));
    }
    let ssl_dir = PathBuf::from("ssl").join(&ssl_type);

    // Create ssl directory if it doesn't exist
    if let Err(e) = fs::create_dir_all(&ssl_dir).await {
        eprintln!("Failed to create ssl directory: {}", e);
        return Err(StatusCode::INTERNAL_SERVER_ERROR);
    }

    let mut cert_saved = false;
    let mut key_saved = false;
    let mut cert_path: Option<String> = None;
    let mut key_path: Option<String> = None;
    // let mut ca_path: Option<String> = None;
    let mut ca_saved = false;

    for (name, data) in fields {
        // Ignore p12_password and p12 fields
        if name == "p12_password" || name == "p12" { continue; }

        let file_path = match name.as_str() {
            "cert" => {
                cert_saved = true;
                let path = ssl_dir.join(if ssl_type == "wallet" { "private_wallet.crt" } else { "private_full_node.crt" });
                cert_path = Some(path.to_string_lossy().to_string());
                path
            }
            "key" => {
                key_saved = true;
                let path = ssl_dir.join(if ssl_type == "wallet" { "private_wallet.key" } else { "private_full_node.key" });
                key_path = Some(path.to_string_lossy().to_string());
                path
            }
            "ca" => {
                ca_saved = true;
                let path = ssl_dir.join("chia_ca.crt");
                path
            }
            _ => continue,
        };

        // Write file
        let mut file = match fs::File::create(&file_path).await {
            Ok(f) => f,
            Err(e) => {
                eprintln!("Failed to create file {:?}: {}", file_path, e);
                return Err(StatusCode::INTERNAL_SERVER_ERROR);
            }
        };

        if let Err(e) = file.write_all(&data).await {
            eprintln!("Failed to write file {:?}: {}", file_path, e);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }

        println!("✅ Saved SSL file: {:?}", file_path);
    }

    // Update app state with provided files
    let mut messages = Vec::new();
    if cert_saved && key_saved {
        let cert_path_val = cert_path.clone().unwrap_or_default();
        let key_path_val = key_path.clone().unwrap_or_default();
        state.set_ssl_paths_for_mode(&ssl_type, cert_path_val.clone(), key_path_val.clone()).await;
        messages.push(format!("{} cert+key", ssl_type));
    }

    // No PKCS#12 logic

    if ca_saved {
        let ca_path = ssl_dir.join("chia_ca.crt");
        state.set_ssl_ca_path_for_mode(&ssl_type, ca_path.to_string_lossy().to_string()).await;
        messages.push(format!("{} ca", ssl_type));
    }

    if messages.is_empty() {
        return Ok(Json(SslUploadResponse {
            success: false,
            message: format!("No recognized SSL files provided (expected cert/key or p12) for {}", ssl_type),
        }));
    }

    Ok(Json(SslUploadResponse {
        success: true,
        message: format!("SSL material saved: {}", messages.join(", ")),
    }))
}

/// Get SSL certificate status (accepts ?type=wallet or ?type=full_node)
use std::collections::HashMap;
pub async fn get_ssl_status(
    State(state): State<Arc<AppState>>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<SslStatus>, StatusCode> {
    let mode = if let Some(m) = params.get("type").cloned() {
        m
    } else {
        state.connection_mode().await
    };
    let ssl_dir = if mode == "wallet" {
        PathBuf::from("ssl/wallet")
    } else {
        PathBuf::from("ssl/full_node")
    };
    let cert_path = ssl_dir.join(if mode == "wallet" { "private_wallet.crt" } else { "private_full_node.crt" });
    let key_path = ssl_dir.join(if mode == "wallet" { "private_wallet.key" } else { "private_full_node.key" });
    let ca_path_fs = ssl_dir.join("chia_ca.crt");
    let has_cert = cert_path.exists();
    let has_key = key_path.exists();
    let has_ca = ca_path_fs.exists();
    Ok(Json(SslStatus {
        has_cert,
        has_key,
        cert_path: if has_cert {
            Some(cert_path.to_string_lossy().to_string())
        } else {
            None
        },
        key_path: if has_key {
            Some(key_path.to_string_lossy().to_string())
        } else {
            None
        },
        has_ca,
        ca_path: if has_ca {
            Some(ca_path_fs.to_string_lossy().to_string())
        } else {
            state.get_ssl_ca_path_for_mode(&mode).await
        },
    }))
}

/// Delete SSL certificates (accepts ?type=wallet or ?type=full_node)
pub async fn delete_ssl_certificates(
    State(state): State<Arc<AppState>>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<SslUploadResponse>, StatusCode> {
    let mode = if let Some(m) = params.get("type").cloned() {
        m
    } else {
        state.connection_mode().await
    };
    let ssl_dir = if mode == "wallet" {
        PathBuf::from("ssl/wallet")
    } else {
        PathBuf::from("ssl/full_node")
    };
    let cert_path = ssl_dir.join(if mode == "wallet" { "private_wallet.crt" } else { "private_full_node.crt" });
    let key_path = ssl_dir.join(if mode == "wallet" { "private_wallet.key" } else { "private_full_node.key" });
    let ca_path = ssl_dir.join("chia_ca.crt");
    let mut deleted = Vec::new();
    let mut errors = Vec::new();
    if cert_path.exists() {
        match fs::remove_file(&cert_path).await {
            Ok(_) => deleted.push("certificate"),
            Err(e) => errors.push(format!("cert: {}", e)),
        }
    }
    if key_path.exists() {
        match fs::remove_file(&key_path).await {
            Ok(_) => deleted.push("key"),
            Err(e) => errors.push(format!("key: {}", e)),
        }
    }
    if ca_path.exists() {
        match fs::remove_file(&ca_path).await {
            Ok(_) => deleted.push("ca"),
            Err(e) => errors.push(format!("ca: {}", e)),
        }
    }

    if !errors.is_empty() {
        return Ok(Json(SslUploadResponse {
            success: false,
            message: format!("Errors: {}", errors.join(", ")),
        }));
    }

    Ok(Json(SslUploadResponse {
        success: true,
        message: if deleted.is_empty() {
            "No certificates to delete".to_string()
        } else {
            format!("Deleted: {}", deleted.join(", "))
        },
    }))
}

/// Manually set SSL certificate and key paths
pub async fn set_ssl_paths(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<SetSslPathsRequest>,
) -> Result<Json<SslUploadResponse>, StatusCode> {
    state.set_ssl_paths_for_mode(&payload.mode, payload.cert_path.clone(), payload.key_path.clone()).await;
    if let Some(ca_path) = payload.ca_path.clone() {
        state.set_ssl_ca_path_for_mode(&payload.mode, ca_path).await;
    }
    Ok(Json(SslUploadResponse {
        success: true,
        message: "SSL certificate paths/identity/CA set successfully".to_string(),
    }))
}
