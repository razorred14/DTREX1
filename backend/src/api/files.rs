use axum::{
    extract::{Json, Multipart, Path, State},
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::api::contracts::AppError;
use crate::ctx::Ctx;
use crate::model::{FileBmc, FileForCreate, ModelManager};
use crate::storage::files;

#[derive(Debug, Serialize)]
pub struct UploadFileResponse {
    pub file_id: String,
    pub filename: String,
    pub content_type: String,
    pub size: usize,
    pub hash: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FileMetadata {
    pub file_id: String,
    pub filename: String,
    pub content_type: String,
    pub size: usize,
    pub hash: String,
    pub uploaded_at: String,
}

pub async fn upload_file(
    ctx: Ctx,
    State(mm): State<ModelManager>,
    mut multipart: Multipart,
) -> Result<Json<UploadFileResponse>, AppError> {
    let mut file_data: Option<Vec<u8>> = None;
    let mut filename: Option<String> = None;
    let mut content_type: Option<String> = None;

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| AppError::BadRequest(format!("Invalid multipart data: {}", e)))?
    {
        let field_name = field.name().unwrap_or("").to_string();

        if field_name == "file" {
            filename = field.file_name().map(|s| s.to_string());
            content_type = field.content_type().map(|s| s.to_string());

            let data = field
                .bytes()
                .await
                .map_err(|e| AppError::BadRequest(format!("Failed to read file data: {}", e)))?;

            file_data = Some(data.to_vec());
        }
    }

    let data = file_data.ok_or_else(|| AppError::BadRequest("No file provided".to_string()))?;
    let filename =
        filename.ok_or_else(|| AppError::BadRequest("No filename provided".to_string()))?;
    let content_type = content_type.unwrap_or_else(|| "application/octet-stream".to_string());

    if data.is_empty() {
        return Err(AppError::BadRequest("File is empty".to_string()));
    }

    // Validate file size (10MB limit)
    const MAX_FILE_SIZE: usize = 10 * 1024 * 1024;
    if data.len() > MAX_FILE_SIZE {
        return Err(AppError::BadRequest(
            "File too large (max 10MB)".to_string(),
        ));
    }

    // Determine file extension
    let ext = std::path::Path::new(&filename)
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("bin");

    let file_id = Uuid::new_v4().to_string();
    let stored_filename = format!("{}.{}", file_id, ext);
    let file_path = format!("storage/contracts/{}", stored_filename);

    // Store file on disk
    files::store_contract_file(&data, &stored_filename)
        .map_err(|e| AppError::InternalError(format!("Failed to store file: {}", e)))?;

    // Create database record
    let file_data = FileForCreate {
        contract_id: 0, // Will be set by client or update later
        filename: filename.clone(),
        file_path: file_path.clone(),
        file_size: data.len() as i64,
        mime_type: Some(content_type.clone()),
    };

    let file_id = FileBmc::create(&ctx, mm.db(), file_data)
        .await
        .map_err(|e| AppError::InternalError(format!("Failed to create file record: {}", e)))?;

    tracing::info!(
        "File uploaded by user {}: {} ({} bytes)",
        ctx.user_id(),
        filename,
        data.len()
    );

    Ok(Json(UploadFileResponse {
        file_id: file_id.to_string(),
        filename,
        content_type,
        size: data.len(),
        hash: String::new(), // Can add hash if needed
    }))
}

pub async fn get_file(
    ctx: Ctx,
    State(mm): State<ModelManager>,
    Path(file_id): Path<i64>,
) -> Result<Response, AppError> {
    // Get file record from database
    let file = FileBmc::get(&ctx, mm.db(), file_id)
        .await
        .map_err(|_| AppError::BadRequest("File not found".to_string()))?;

    // Read file from disk
    let file_data = files::load_contract_file(&file.file_path)
        .map_err(|_| AppError::BadRequest("File not found on disk".to_string()))?;

    let content_type = file
        .mime_type
        .unwrap_or_else(|| "application/octet-stream".to_string());

    Ok((
        StatusCode::OK,
        [
            ("Content-Type".to_string(), content_type),
            (
                "Content-Disposition".to_string(),
                format!("inline; filename=\"{}\"", file.filename),
            ),
        ],
        file_data,
    )
        .into_response())
}

pub async fn list_files(
    _ctx: Ctx,
    State(_mm): State<ModelManager>,
) -> Result<Json<Vec<FileMetadata>>, AppError> {
    // This is a placeholder - in practice, you'd need a contract_id parameter
    // For now, returning an empty list
    let metadata: Vec<FileMetadata> = vec![];
    Ok(Json(metadata))
}

pub async fn delete_file(
    ctx: Ctx,
    State(mm): State<ModelManager>,
    Path(file_id): Path<i64>,
) -> Result<impl IntoResponse, AppError> {
    // Get file record to get the path
    let file = FileBmc::get(&ctx, mm.db(), file_id)
        .await
        .map_err(|_| AppError::BadRequest("File not found".to_string()))?;

    // Delete file from disk
    files::delete_contract_file(&file.file_path)
        .map_err(|e| AppError::InternalError(format!("Failed to delete file: {}", e)))?;

    // Delete database record
    FileBmc::delete(&ctx, mm.db(), file_id)
        .await
        .map_err(|e| AppError::InternalError(format!("Failed to delete file record: {}", e)))?;

    tracing::info!("File deleted by user {}: {}", ctx.user_id(), file_id);

    Ok(StatusCode::NO_CONTENT)
}
