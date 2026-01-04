use crate::ctx::Ctx;
use crate::model::ModelManager;
// FIX: Point specifically to your error module
use crate::error::Error;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct Contract {
    pub id: i64,
    pub user_id: i64,
    pub name: String,
    pub description: Option<String>,
    pub party1_public_key: String,
    pub party2_public_key: String,
    pub party1_xch_address: Option<String>,
    pub party2_xch_address: Option<String>,
    pub terms: String,
    pub amount: i64,
    pub status: String,
    pub puzzle_hash: Option<String>,
    pub coin_id: Option<String>,
}

#[derive(Deserialize)]
pub struct ContractForCreate {
    pub name: String,
    pub description: Option<String>,
    pub party1_public_key: String,
    pub party2_public_key: String,
    pub party1_xch_address: Option<String>,
    pub party2_xch_address: Option<String>,
    pub terms: String,
    pub amount: i64,
}

#[derive(Deserialize)]
pub struct ContractForUpdate {
    pub name: Option<String>,
    pub description: Option<String>,
    pub party1_xch_address: Option<String>,
    pub party2_xch_address: Option<String>,
    pub status: Option<String>,
}

pub struct ContractBmc;

impl ContractBmc {
    pub async fn create(ctx: &Ctx, mm: &ModelManager, c_c: ContractForCreate) -> Result<i64, Error> {
        let db = mm.db();
        let (id,) = sqlx::query_as::<_, (i64,)>(
            r#"INSERT INTO contracts 
               (user_id, name, description, party1_public_key, party2_public_key, 
                party1_xch_address, party2_xch_address, terms, amount, status)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id"#
        )
        .bind(ctx.user_id()).bind(c_c.name).bind(c_c.description)
        .bind(c_c.party1_public_key).bind(c_c.party2_public_key)
        .bind(c_c.party1_xch_address).bind(c_c.party2_xch_address)
        .bind(c_c.terms).bind(c_c.amount).bind("draft")
        .fetch_one(db).await.map_err(|_| Error::InternalServer)?;
        Ok(id)
    }

    pub async fn get(ctx: &Ctx, mm: &ModelManager, id: i64) -> Result<Contract, Error> {
        sqlx::query_as::<_, Contract>("SELECT * FROM contracts WHERE id = $1 AND user_id = $2")
            .bind(id).bind(ctx.user_id()).fetch_one(mm.db()).await.map_err(|_| Error::InternalServer)
    }

    pub async fn list(ctx: &Ctx, mm: &ModelManager) -> Result<Vec<Contract>, Error> {
        sqlx::query_as::<_, Contract>("SELECT * FROM contracts WHERE user_id = $1 ORDER BY id DESC")
            .bind(ctx.user_id()).fetch_all(mm.db()).await.map_err(|_| Error::InternalServer)
    }

    pub async fn delete(ctx: &Ctx, mm: &ModelManager, id: i64) -> Result<(), Error> {
        sqlx::query("DELETE FROM contracts WHERE id = $1 AND user_id = $2")
            .bind(id).bind(ctx.user_id()).execute(mm.db()).await.map_err(|_| Error::InternalServer)?;
        Ok(())
    }

    pub async fn update(ctx: &Ctx, mm: &ModelManager, id: i64, c_u: ContractForUpdate) -> Result<(), Error> {
        sqlx::query(
            r#"UPDATE contracts SET name = COALESCE($3, name), description = COALESCE($4, description),
               party1_xch_address = COALESCE($5, party1_xch_address), status = COALESCE($6, status)
               WHERE id = $1 AND user_id = $2"#
        )
        .bind(id).bind(ctx.user_id()).bind(c_u.name).bind(c_u.description)
        .bind(c_u.party1_xch_address).bind(c_u.status)
        .execute(mm.db()).await.map_err(|_| Error::InternalServer)?;
        Ok(())
    }
}