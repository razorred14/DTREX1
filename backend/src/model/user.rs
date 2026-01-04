use crate::store::Db;
use argon2::password_hash::SaltString;
use argon2::{Argon2, PasswordHash, PasswordHasher, PasswordVerifier};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, Row};
use uuid::Uuid;

// ============================================================================
// Types
// ============================================================================

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct User {
    pub id: i64,
    pub username: String,
}

/// User info for admin dashboard
#[derive(Debug, Clone, FromRow, Serialize)]
pub struct UserAdmin {
    pub id: i64,
    pub username: String,
    pub is_admin: bool,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, FromRow)]
pub struct UserForLogin {
    pub id: i64,
    pub username: String,
    pub pwd: String,
    pub pwd_salt: Uuid,
    pub token_salt: Uuid,
    pub is_admin: bool,
}

#[derive(Debug, FromRow)]
pub struct UserForAuth {
    pub id: i64,
    pub username: String,
    pub token_salt: Uuid,
    pub is_admin: bool,
}

#[derive(Deserialize)]
pub struct UserForCreate {
    pub username: String,
    pub pwd_clear: String,
}

// ============================================================================
// UserBmc (Business Model Controller)
// ============================================================================

pub struct UserBmc;

impl UserBmc {
    /// Get user for login (includes password hash)
    pub async fn first_by_username(db: &Db, username: &str) -> Result<UserForLogin, sqlx::Error> {
        let user = sqlx::query_as::<_, UserForLogin>(
            "SELECT id, username, pwd, pwd_salt, token_salt, COALESCE(is_admin, false) as is_admin FROM users WHERE username = $1",
        )
        .bind(username)
        .fetch_one(db)
        .await?;

        Ok(user)
    }

    /// Get user for auth (for token validation)
    pub async fn first_by_id_for_auth(db: &Db, user_id: i64) -> Result<UserForAuth, sqlx::Error> {
        let user = sqlx::query_as::<_, UserForAuth>(
            "SELECT id, username, token_salt, COALESCE(is_admin, false) as is_admin FROM users WHERE id = $1",
        )
        .bind(user_id)
        .fetch_one(db)
        .await?;

        Ok(user)
    }

    /// Create a new user
    pub async fn create(db: &Db, user_c: UserForCreate) -> Result<i64, sqlx::Error> {
        let pwd_salt = Uuid::new_v4();
        let token_salt = Uuid::new_v4();

        // Hash password with Argon2
        let pwd = hash_password(&user_c.pwd_clear, &pwd_salt)?;

        let result = sqlx::query(
            r#"
            INSERT INTO users (username, pwd, pwd_salt, token_salt)
            VALUES ($1, $2, $3, $4)
            RETURNING id
            "#,
        )
        .bind(&user_c.username)
        .bind(&pwd)
        .bind(&pwd_salt)
        .bind(&token_salt)
        .fetch_one(db)
        .await?;

        let user_id: i64 = result.get("id");
        Ok(user_id)
    }
    
    /// List all users (admin only)
    pub async fn list_all(db: &Db) -> Result<Vec<UserAdmin>, sqlx::Error> {
        let users = sqlx::query_as::<_, UserAdmin>(
            "SELECT id, username, COALESCE(is_admin, false) as is_admin, created_at 
             FROM users 
             ORDER BY created_at DESC"
        )
        .fetch_all(db)
        .await?;
        
        Ok(users)
    }
    
    /// Set user admin status (admin only)
    pub async fn set_admin_status(db: &Db, user_id: i64, is_admin: bool) -> Result<(), sqlx::Error> {
        sqlx::query("UPDATE users SET is_admin = $1 WHERE id = $2")
            .bind(is_admin)
            .bind(user_id)
            .execute(db)
            .await?;
        
        Ok(())
    }
    
    /// Get user trade stats
    pub async fn get_user_stats(db: &Db, user_id: i64) -> Result<UserStats, sqlx::Error> {
        // Count trades where user is proposer or acceptor
        let trade_count: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM trades WHERE proposer_id = $1 OR acceptor_id = $1"
        )
        .bind(user_id)
        .fetch_one(db)
        .await?;
        
        let completed_count: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM trades WHERE (proposer_id = $1 OR acceptor_id = $1) AND status = 'completed'"
        )
        .bind(user_id)
        .fetch_one(db)
        .await?;
        
        Ok(UserStats {
            total_trades: trade_count.0,
            completed_trades: completed_count.0,
        })
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct UserStats {
    pub total_trades: i64,
    pub completed_trades: i64,
}

// ============================================================================
// Password Hashing
// ============================================================================

/// Hash password using Argon2
fn hash_password(pwd_clear: &str, salt_uuid: &Uuid) -> Result<String, sqlx::Error> {
    let salt = SaltString::encode_b64(salt_uuid.as_bytes())
        .map_err(|e| sqlx::Error::Protocol(format!("Salt encoding error: {}", e)))?;

    let argon2 = Argon2::default();

    let pwd_hash = argon2
        .hash_password(pwd_clear.as_bytes(), &salt)
        .map_err(|e| sqlx::Error::Protocol(format!("Password hashing error: {}", e)))?
        .to_string();

    // Prepend scheme identifier for future flexibility
    Ok(format!("#02#{}", pwd_hash))
}

/// Validate password against stored hash
pub fn validate_password(pwd_clear: &str, pwd_hash: &str) -> Result<(), sqlx::Error> {
    // Remove scheme identifier
    let pwd_hash = pwd_hash
        .strip_prefix("#02#")
        .ok_or_else(|| sqlx::Error::Protocol("Invalid password hash format".into()))?;

    let parsed_hash = PasswordHash::new(pwd_hash)
        .map_err(|e| sqlx::Error::Protocol(format!("Invalid password hash: {}", e)))?;

    let argon2 = Argon2::default();

    argon2
        .verify_password(pwd_clear.as_bytes(), &parsed_hash)
        .map_err(|_| sqlx::Error::Protocol("Password verification failed".into()))?;

    Ok(())
}
