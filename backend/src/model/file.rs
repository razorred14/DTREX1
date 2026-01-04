use crate::ctx::Ctx;
use crate::store::Db;
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, Row};
use std::path::Path;

// ============================================================================
// Types
// ============================================================================

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct ContractFile {
    pub id: i64,
    pub contract_id: i64,
    pub user_id: i64,
    pub filename: String,
    pub file_path: String,
    pub file_size: i64,
    pub mime_type: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Deserialize)]
pub struct FileForCreate {
    pub contract_id: i64,
    pub filename: String,
    pub file_path: String,
    pub file_size: i64,
    pub mime_type: Option<String>,
}

// ============================================================================
// FileBmc (Business Model Controller)
// ============================================================================

pub struct FileBmc;

impl FileBmc {
    /// List all files for a contract (with authorization check)
    pub async fn list_by_contract(
        ctx: &Ctx,
        db: &Db,
        contract_id: i64,
    ) -> Result<Vec<ContractFile>, sqlx::Error> {
        // First verify the user owns this contract
        let contract_check =
            sqlx::query_scalar::<_, i64>("SELECT id FROM contracts WHERE id = $1 AND user_id = $2")
                .bind(contract_id)
                .bind(ctx.user_id())
                .fetch_optional(db)
                .await?;

        if contract_check.is_none() {
            return Err(sqlx::Error::RowNotFound);
        }

        // Then fetch files for this contract
        let files = sqlx::query_as::<_, ContractFile>(
            "SELECT * FROM contract_files WHERE contract_id = $1 ORDER BY created_at DESC",
        )
        .bind(contract_id)
        .fetch_all(db)
        .await?;

        Ok(files)
    }

    /// Get a single file by ID (with authorization check)
    pub async fn get(ctx: &Ctx, db: &Db, id: i64) -> Result<ContractFile, sqlx::Error> {
        let file = sqlx::query_as::<_, ContractFile>(
            "SELECT * FROM contract_files WHERE id = $1 AND user_id = $2",
        )
        .bind(id)
        .bind(ctx.user_id())
        .fetch_one(db)
        .await?;

        Ok(file)
    }

    /// Create a new file record
    pub async fn create(ctx: &Ctx, db: &Db, file_c: FileForCreate) -> Result<i64, sqlx::Error> {
        // First verify the user owns this contract
        let contract_check =
            sqlx::query_scalar::<_, i64>("SELECT id FROM contracts WHERE id = $1 AND user_id = $2")
                .bind(file_c.contract_id)
                .bind(ctx.user_id())
                .fetch_optional(db)
                .await?;

        if contract_check.is_none() {
            return Err(sqlx::Error::RowNotFound);
        }

        let result = sqlx::query(
            "INSERT INTO contract_files (contract_id, user_id, filename, file_path, file_size, mime_type)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id"
        )
        .bind(file_c.contract_id)
        .bind(ctx.user_id())
        .bind(file_c.filename)
        .bind(file_c.file_path)
        .bind(file_c.file_size)
        .bind(file_c.mime_type)
        .fetch_one(db)
        .await?;

        let file_id: i64 = result.get("id");
        Ok(file_id)
    }

    /// Delete a file (with authorization check)
    pub async fn delete(ctx: &Ctx, db: &Db, id: i64) -> Result<ContractFile, sqlx::Error> {
        // First fetch the file to get its path and verify ownership
        let file = sqlx::query_as::<_, ContractFile>(
            "SELECT * FROM contract_files WHERE id = $1 AND user_id = $2",
        )
        .bind(id)
        .bind(ctx.user_id())
        .fetch_one(db)
        .await?;

        // Delete from database
        sqlx::query("DELETE FROM contract_files WHERE id = $1 AND user_id = $2")
            .bind(id)
            .bind(ctx.user_id())
            .execute(db)
            .await?;

        Ok(file)
    }

    /// Delete file from filesystem
    pub async fn delete_from_disk(file_path: &str) -> Result<(), std::io::Error> {
        if Path::new(file_path).exists() {
            tokio::fs::remove_file(file_path).await?;
        }
        Ok(())
    }
}
