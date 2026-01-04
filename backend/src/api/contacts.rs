use axum::{
    extract::{Json, Path},
    http::StatusCode,
    response::IntoResponse,
};
use serde::Deserialize;
use uuid::Uuid;

use crate::api::contracts::AppError;
use crate::storage::contacts::{self, Contact};

#[derive(Debug, Deserialize)]
pub struct CreateContactRequest {
    pub name: String,
    pub public_key: String,
    pub xch_address: Option<String>,
    pub email: Option<String>,
    pub note: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateContactRequest {
    pub name: Option<String>,
    pub public_key: Option<String>,
    pub xch_address: Option<String>,
    pub email: Option<String>,
    pub note: Option<String>,
}

fn validate_public_key(key: &str) -> bool {
    let hex = key.len() == 96 && key.chars().all(|c| c.is_ascii_hexdigit());
    hex
}

fn validate_contact_fields(name: &str, public_key: &str) -> Result<(), AppError> {
    if name.trim().is_empty() {
        return Err(AppError::BadRequest("name is required".to_string()));
    }

    if !validate_public_key(public_key) {
        return Err(AppError::BadRequest(
            "public_key must be a 96-character hex string (compressed BLS pubkey)".to_string(),
        ));
    }

    Ok(())
}

pub async fn create_contact(
    Json(payload): Json<CreateContactRequest>,
) -> Result<Json<Contact>, AppError> {
    validate_contact_fields(&payload.name, &payload.public_key)?;

    let now = chrono::Utc::now().to_rfc3339();
    let contact = Contact {
        id: Uuid::new_v4().to_string(),
        name: payload.name.trim().to_string(),
        public_key: payload.public_key.trim().to_string(),
        xch_address: payload
            .xch_address
            .as_ref()
            .map(|v| v.trim().to_string())
            .filter(|v| !v.is_empty()),
        email: payload
            .email
            .as_ref()
            .map(|v| v.trim().to_string())
            .filter(|v| !v.is_empty()),
        note: payload
            .note
            .as_ref()
            .map(|v| v.trim().to_string())
            .filter(|v| !v.is_empty()),
        created_at: now.clone(),
        updated_at: now,
    };

    contacts::store_contact(&contact)
        .map_err(|e| AppError::InternalError(format!("Failed to save contact: {}", e)))?;

    Ok(Json(contact))
}

pub async fn list_contacts() -> Result<Json<Vec<Contact>>, AppError> {
    let contacts = contacts::list_contacts()
        .map_err(|e| AppError::InternalError(format!("Failed to list contacts: {}", e)))?;
    Ok(Json(contacts))
}

pub async fn get_contact(Path(id): Path<String>) -> Result<Json<Contact>, AppError> {
    let contact = contacts::load_contact(&id)
        .map_err(|e| AppError::BadRequest(format!("Contact not found: {}", e)))?;
    Ok(Json(contact))
}

pub async fn update_contact(
    Path(id): Path<String>,
    Json(payload): Json<UpdateContactRequest>,
) -> Result<Json<Contact>, AppError> {
    let mut contact = contacts::load_contact(&id)
        .map_err(|e| AppError::BadRequest(format!("Contact not found: {}", e)))?;

    if let Some(name) = payload.name {
        if name.trim().is_empty() {
            return Err(AppError::BadRequest("name cannot be empty".to_string()));
        }
        contact.name = name.trim().to_string();
    }

    if let Some(key) = payload.public_key {
        validate_contact_fields(&contact.name, &key)?;
        contact.public_key = key.trim().to_string();
    }

    if let Some(xch_address) = payload.xch_address {
        let clean = xch_address.trim();
        contact.xch_address = if clean.is_empty() {
            None
        } else {
            Some(clean.to_string())
        };
    }

    if let Some(email) = payload.email {
        let clean = email.trim();
        contact.email = if clean.is_empty() {
            None
        } else {
            Some(clean.to_string())
        };
    }

    if let Some(note) = payload.note {
        let clean = note.trim();
        contact.note = if clean.is_empty() {
            None
        } else {
            Some(clean.to_string())
        };
    }

    contact.updated_at = chrono::Utc::now().to_rfc3339();

    contacts::store_contact(&contact)
        .map_err(|e| AppError::InternalError(format!("Failed to save contact: {}", e)))?;

    Ok(Json(contact))
}

pub async fn delete_contact(Path(id): Path<String>) -> Result<impl IntoResponse, AppError> {
    contacts::delete_contact(&id)
        .map_err(|e| AppError::InternalError(format!("Failed to delete contact: {}", e)))?;

    Ok(StatusCode::NO_CONTENT)
}
