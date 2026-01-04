// ============================================
// Transaction Model for Commitment Fees
// ============================================

use crate::ctx::Ctx;
use super::ModelManager;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use crate::error::{Error, Result};

// ============================================
// Transaction Types
// ============================================

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum TxType {
    CommitmentFee,
    EscrowDeposit,
    EscrowRelease,
    Refund,
}

impl ToString for TxType {
    fn to_string(&self) -> String {
        match self {
            TxType::CommitmentFee => "commitment_fee".to_string(),
            TxType::EscrowDeposit => "escrow_deposit".to_string(),
            TxType::EscrowRelease => "escrow_release".to_string(),
            TxType::Refund => "refund".to_string(),
        }
    }
}

impl From<&str> for TxType {
    fn from(s: &str) -> Self {
        match s {
            "commitment_fee" => TxType::CommitmentFee,
            "escrow_deposit" => TxType::EscrowDeposit,
            "escrow_release" => TxType::EscrowRelease,
            "refund" => TxType::Refund,
            _ => TxType::CommitmentFee,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum TxStatus {
    Pending,
    Mempool,
    Confirmed,
    Failed,
    Refunded,
}

impl ToString for TxStatus {
    fn to_string(&self) -> String {
        match self {
            TxStatus::Pending => "pending".to_string(),
            TxStatus::Mempool => "mempool".to_string(),
            TxStatus::Confirmed => "confirmed".to_string(),
            TxStatus::Failed => "failed".to_string(),
            TxStatus::Refunded => "refunded".to_string(),
        }
    }
}

impl From<&str> for TxStatus {
    fn from(s: &str) -> Self {
        match s {
            "pending" => TxStatus::Pending,
            "mempool" => TxStatus::Mempool,
            "confirmed" => TxStatus::Confirmed,
            "failed" => TxStatus::Failed,
            "refunded" => TxStatus::Refunded,
            _ => TxStatus::Pending,
        }
    }
}

// ============================================
// Trade Transaction
// ============================================

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct TradeTransaction {
    pub id: i64,
    pub trade_id: i64,
    pub user_id: i64,
    pub tx_type: String,
    pub tx_id: Option<String>,
    pub coin_id: Option<String>,
    pub puzzle_hash: Option<String>,
    pub from_address: Option<String>,
    pub to_address: Option<String>,
    pub amount_mojos: i64,
    pub status: String,
    pub confirmations: Option<i32>,
    pub error_message: Option<String>,
    pub retry_count: Option<i32>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub mempool_at: Option<chrono::DateTime<chrono::Utc>>,
    pub confirmed_at: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct TradeTransactionForCreate {
    pub trade_id: i64,
    pub tx_type: String,
    pub tx_id: Option<String>,
    pub from_address: Option<String>,
    pub to_address: Option<String>,
    pub amount_mojos: i64,
}

// ============================================
// Exchange Config
// ============================================

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct ExchangeConfig {
    pub id: i32,
    pub key: String,
    pub value: String,
    pub description: Option<String>,
}

// ============================================
// Commitment Details Response
// ============================================

#[derive(Debug, Clone, Serialize)]
pub struct CommitmentDetails {
    pub trade_id: i64,
    pub exchange_wallet_address: String,
    pub commitment_fee_usd: f64,  // Fee in USD - frontend calculates XCH dynamically
    pub user_role: String,  // "proposer" or "acceptor"
    pub user_commit_status: String,
    pub other_commit_status: String,
    pub memo: String,
}

// ============================================
// Trade Transaction BMC
// ============================================

pub struct TransactionBmc;

impl TransactionBmc {
    /// Get the exchange wallet address from config
    pub async fn get_exchange_wallet(_ctx: &Ctx, mm: &ModelManager) -> Result<String> {
        let config: Option<ExchangeConfig> = sqlx::query_as::<_, ExchangeConfig>(
            "SELECT * FROM exchange_config WHERE key = 'exchange_wallet_address'"
        )
        .fetch_optional(mm.pool())
        .await
        .map_err(|e: sqlx::Error| Error::Database(e.to_string()))?;
        
        match config {
            Some(c) if !c.value.is_empty() => Ok(c.value),
            _ => Err(Error::Config("Exchange wallet address not configured".to_string())),
        }
    }
    
    /// Get the default commitment fee in USD
    pub async fn get_commitment_fee_usd(_ctx: &Ctx, mm: &ModelManager) -> Result<f64> {
        let config: Option<ExchangeConfig> = sqlx::query_as::<_, ExchangeConfig>(
            "SELECT * FROM exchange_config WHERE key = 'commitment_fee_usd'"
        )
        .fetch_optional(mm.pool())
        .await
        .map_err(|e: sqlx::Error| Error::Database(e.to_string()))?;
        
        match config {
            Some(c) => c.value.parse::<f64>().map_err(|_| Error::Config("Invalid commitment fee value".to_string())),
            None => Ok(1.0), // Default: $1.00 USD
        }
    }
    
    /// Set the exchange wallet address
    pub async fn set_exchange_wallet(_ctx: &Ctx, mm: &ModelManager, address: &str) -> Result<()> {
        sqlx::query(
            "INSERT INTO exchange_config (key, value, description, updated_at) 
             VALUES ('exchange_wallet_address', $1, 'XCH address where commitment fees are sent', NOW())
             ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()"
        )
        .bind(address)
        .execute(mm.pool())
        .await
        .map_err(|e: sqlx::Error| Error::Database(e.to_string()))?;
        
        Ok(())
    }
    
    /// Get commitment details for a trade
    pub async fn get_commitment_details(ctx: &Ctx, mm: &ModelManager, trade_id: i64) -> Result<CommitmentDetails> {
        let user_id = ctx.user_id();
        
        // Get the trade
        let trade: Option<(i64, i64, Option<i64>, String, Option<String>, Option<String>)> = sqlx::query_as(
            "SELECT id, proposer_id, acceptor_id, status, proposer_commit_status, acceptor_commit_status 
             FROM trades WHERE id = $1"
        )
        .bind(trade_id)
        .fetch_optional(mm.pool())
        .await
        .map_err(|e: sqlx::Error| Error::Database(e.to_string()))?;
        
        let (id, proposer_id, acceptor_id, status, prop_status, acc_status) = trade
            .ok_or_else(|| Error::NotFoundMsg("Trade not found".to_string()))?;
        
        // Verify user is a participant
        let is_proposer = user_id == proposer_id;
        let is_acceptor = acceptor_id.map(|a| a == user_id).unwrap_or(false);
        
        if !is_proposer && !is_acceptor {
            return Err(Error::Auth("Not a participant in this trade".to_string()));
        }
        
        // Check trade status allows commitment
        if status != "matched" && status != "committed" {
            return Err(Error::InvalidState(format!(
                "Trade status '{}' does not allow commitment. Must be 'matched'.", status
            )));
        }
        
        let exchange_wallet = Self::get_exchange_wallet(ctx, mm).await?;
        let fee_usd = Self::get_commitment_fee_usd(ctx, mm).await?;
        
        let user_role = if is_proposer { "proposer" } else { "acceptor" };
        let user_commit_status = if is_proposer { 
            prop_status.clone().unwrap_or_else(|| "pending".to_string())
        } else { 
            acc_status.clone().unwrap_or_else(|| "pending".to_string())
        };
        let other_commit_status = if is_proposer {
            acc_status.unwrap_or_else(|| "pending".to_string())
        } else {
            prop_status.unwrap_or_else(|| "pending".to_string())
        };
        
        Ok(CommitmentDetails {
            trade_id: id,
            exchange_wallet_address: exchange_wallet,
            commitment_fee_usd: fee_usd,
            user_role: user_role.to_string(),
            user_commit_status,
            other_commit_status,
            memo: format!("DTREX-COMMIT-{}-{}", trade_id, user_id),
        })
    }
    
    /// Create a pending transaction record
    pub async fn create(ctx: &Ctx, mm: &ModelManager, tx: TradeTransactionForCreate) -> Result<i64> {
        let user_id = ctx.user_id();
        
        // Verify user is a participant in the trade
        let is_participant: Option<(i64,)> = sqlx::query_as(
            "SELECT id FROM trades WHERE id = $1 AND (proposer_id = $2 OR acceptor_id = $2)"
        )
        .bind(tx.trade_id)
        .bind(user_id)
        .fetch_optional(mm.pool())
        .await
        .map_err(|e: sqlx::Error| Error::Database(e.to_string()))?;
        
        if is_participant.is_none() {
            return Err(Error::Auth("Not a participant in this trade".to_string()));
        }
        
        // Check for existing pending/confirmed transaction of same type
        let existing: Option<(i64, String)> = sqlx::query_as(
            "SELECT id, status FROM trade_transactions 
             WHERE trade_id = $1 AND user_id = $2 AND tx_type = $3 
             AND status NOT IN ('failed', 'refunded')"
        )
        .bind(tx.trade_id)
        .bind(user_id)
        .bind(&tx.tx_type)
        .fetch_optional(mm.pool())
        .await
        .map_err(|e: sqlx::Error| Error::Database(e.to_string()))?;
        
        if let Some((_, status)) = existing {
            return Err(Error::InvalidState(format!(
                "A {} transaction already exists with status '{}'", tx.tx_type, status
            )));
        }
        
        let (id,): (i64,) = sqlx::query_as(
            "INSERT INTO trade_transactions (trade_id, user_id, tx_type, tx_id, from_address, to_address, amount_mojos, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
             RETURNING id"
        )
        .bind(tx.trade_id)
        .bind(user_id)
        .bind(&tx.tx_type)
        .bind(&tx.tx_id)
        .bind(&tx.from_address)
        .bind(&tx.to_address)
        .bind(tx.amount_mojos)
        .fetch_one(mm.pool())
        .await
        .map_err(|e: sqlx::Error| Error::Database(e.to_string()))?;
        
        Ok(id)
    }
    
    /// Submit a transaction ID (after wallet signs)
    pub async fn submit_tx_id(ctx: &Ctx, mm: &ModelManager, transaction_id: i64, tx_id: &str) -> Result<()> {
        let user_id = ctx.user_id();
        
        let result = sqlx::query(
            "UPDATE trade_transactions 
             SET tx_id = $1, status = 'mempool', mempool_at = NOW()
             WHERE id = $2 AND user_id = $3 AND status = 'pending'"
        )
        .bind(tx_id)
        .bind(transaction_id)
        .bind(user_id)
        .execute(mm.pool())
        .await
        .map_err(|e: sqlx::Error| Error::Database(e.to_string()))?;
        
        if result.rows_affected() == 0 {
            return Err(Error::NotFoundMsg("Transaction not found or already submitted".to_string()));
        }
        
        Ok(())
    }
    
    /// Confirm a transaction (called after blockchain verification)
    pub async fn confirm(_ctx: &Ctx, mm: &ModelManager, tx_id: &str, coin_id: &str, confirmations: i32) -> Result<()> {
        let result = sqlx::query(
            "UPDATE trade_transactions 
             SET status = 'confirmed', coin_id = $1, confirmations = $2, confirmed_at = NOW()
             WHERE tx_id = $3 AND status IN ('pending', 'mempool')"
        )
        .bind(coin_id)
        .bind(confirmations)
        .bind(tx_id)
        .execute(mm.pool())
        .await
        .map_err(|e: sqlx::Error| Error::Database(e.to_string()))?;
        
        if result.rows_affected() == 0 {
            return Err(Error::NotFoundMsg("Transaction not found or already confirmed".to_string()));
        }
        
        Ok(())
    }
    
    /// Mark transaction as failed
    pub async fn fail(_ctx: &Ctx, mm: &ModelManager, tx_id: &str, error_message: &str) -> Result<()> {
        sqlx::query(
            "UPDATE trade_transactions 
             SET status = 'failed', error_message = $1
             WHERE tx_id = $2 AND status IN ('pending', 'mempool')"
        )
        .bind(error_message)
        .bind(tx_id)
        .execute(mm.pool())
        .await
        .map_err(|e: sqlx::Error| Error::Database(e.to_string()))?;
        
        Ok(())
    }
    
    /// Get transactions for a trade
    pub async fn list_for_trade(ctx: &Ctx, mm: &ModelManager, trade_id: i64) -> Result<Vec<TradeTransaction>> {
        let user_id = ctx.user_id();
        
        // Verify user is a participant
        let is_participant: Option<(i64,)> = sqlx::query_as(
            "SELECT id FROM trades WHERE id = $1 AND (proposer_id = $2 OR acceptor_id = $2)"
        )
        .bind(trade_id)
        .bind(user_id)
        .fetch_optional(mm.pool())
        .await
        .map_err(|e: sqlx::Error| Error::Database(e.to_string()))?;
        
        if is_participant.is_none() {
            return Err(Error::Auth("Not a participant in this trade".to_string()));
        }
        
        let transactions: Vec<TradeTransaction> = sqlx::query_as::<_, TradeTransaction>(
            "SELECT * FROM trade_transactions WHERE trade_id = $1 ORDER BY created_at DESC"
        )
        .bind(trade_id)
        .fetch_all(mm.pool())
        .await
        .map_err(|e: sqlx::Error| Error::Database(e.to_string()))?;
        
        Ok(transactions)
    }
    
    /// Get pending transactions that need verification
    pub async fn list_pending_verification(_ctx: &Ctx, mm: &ModelManager) -> Result<Vec<TradeTransaction>> {
        let transactions: Vec<TradeTransaction> = sqlx::query_as::<_, TradeTransaction>(
            "SELECT * FROM trade_transactions WHERE status = 'mempool' ORDER BY mempool_at ASC"
        )
        .fetch_all(mm.pool())
        .await
        .map_err(|e: sqlx::Error| Error::Database(e.to_string()))?;
        
        Ok(transactions)
    }
}
