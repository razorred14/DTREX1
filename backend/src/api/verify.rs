// ============================================
// Transaction Verification Service
// ============================================
// 
// This service periodically checks pending transactions
// against the Chia blockchain to verify confirmations.

use std::sync::Arc;
use std::time::Duration;
use tokio::time;
use crate::app_state::AppState;
use crate::ctx::Ctx;
use crate::model::{ModelManager, TransactionBmc};
use crate::rpc::ChiaRpcClient;
use tracing::{info, warn, error};

const VERIFICATION_INTERVAL_SECS: u64 = 30; // Check every 30 seconds
const MIN_CONFIRMATIONS: u64 = 6; // Require 6 confirmations for finality

/// Start the transaction verification background task
pub async fn start_verification_service(mm: ModelManager, state: Arc<AppState>) {
    tokio::spawn(async move {
        info!("Transaction verification service started");
        
        let mut interval = time::interval(Duration::from_secs(VERIFICATION_INTERVAL_SECS));
        
        loop {
            interval.tick().await;
            
            if let Err(e) = verify_pending_transactions(&mm, &state).await {
                error!("Transaction verification error: {}", e);
            }
        }
    });
}

/// Check all pending transactions and update their status
async fn verify_pending_transactions(mm: &ModelManager, state: &Arc<AppState>) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    // Create a system context (no user auth needed for background tasks)
    let ctx = Ctx::root_ctx();
    
    // Get pending transactions
    let pending = TransactionBmc::list_pending_verification(&ctx, mm).await?;
    
    if pending.is_empty() {
        return Ok(());
    }
    
    info!("Verifying {} pending transactions", pending.len());
    
    // Get RPC client
    let rpc_client = ChiaRpcClient::from_state(state.clone(), "full_node").await?;
    
    // Get current blockchain height
    let blockchain_state = rpc_client.get_blockchain_state().await?;
    let current_height = blockchain_state
        .get("peak")
        .and_then(|p| p.get("height"))
        .and_then(|h| h.as_u64())
        .unwrap_or(0);
    
    if current_height == 0 {
        warn!("Could not get current blockchain height, skipping verification");
        return Ok(());
    }
    
    for tx in pending {
        if let Some(tx_id) = &tx.tx_id {
            match verify_single_transaction(&ctx, mm, &rpc_client, tx_id, current_height).await {
                Ok(confirmed) => {
                    if confirmed {
                        info!("Transaction {} confirmed", tx_id);
                    }
                }
                Err(e) => {
                    warn!("Failed to verify transaction {}: {}", tx_id, e);
                    // Don't fail the whole batch for one error
                }
            }
        }
    }
    
    Ok(())
}

/// Verify a single transaction
async fn verify_single_transaction(
    ctx: &Ctx,
    mm: &ModelManager,
    rpc_client: &ChiaRpcClient,
    tx_id: &str,
    current_height: u64,
) -> Result<bool, Box<dyn std::error::Error + Send + Sync>> {
    // First check if it's in mempool
    let in_mempool = rpc_client.is_tx_in_mempool(tx_id).await?;
    
    if in_mempool {
        info!("Transaction {} is in mempool, waiting for confirmation", tx_id);
        return Ok(false);
    }
    
    // Try to get transaction details from wallet RPC
    match rpc_client.get_transaction(tx_id).await {
        Ok(tx_record) => {
            if tx_record.confirmed {
                // Calculate confirmations
                let confirmations = tx_record.confirmed_at_height
                    .map(|h| current_height.saturating_sub(h))
                    .unwrap_or(0);
                
                if confirmations >= MIN_CONFIRMATIONS {
                    // Mark as confirmed (we don't have coin_id from this API, pass empty string)
                    TransactionBmc::confirm(ctx, mm, tx_id, "", confirmations as i32).await?;
                    info!(
                        "Transaction {} confirmed at height {:?} ({} confirmations)",
                        tx_id, tx_record.confirmed_at_height, confirmations
                    );
                    return Ok(true);
                } else {
                    info!(
                        "Transaction {} has {} confirmations, waiting for {}",
                        tx_id, confirmations, MIN_CONFIRMATIONS
                    );
                }
            }
        }
        Err(e) => {
            // Transaction not found - might have failed or was replaced
            warn!("Transaction {} lookup failed: {}", tx_id, e);
            
            // After some time without confirmation, mark as failed
            // This is handled separately by checking creation time
        }
    }
    
    Ok(false)
}

/// Mark stale pending transactions as failed
/// Transactions pending for more than 24 hours without mempool entry are considered failed
pub async fn cleanup_stale_transactions(mm: &ModelManager) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let ctx = Ctx::root_ctx();
    
    // Find transactions that have been pending for > 24 hours
    let stale: Vec<(String,)> = sqlx::query_as(
        "SELECT tx_id FROM trade_transactions 
         WHERE status = 'pending' 
         AND tx_id IS NOT NULL
         AND created_at < NOW() - INTERVAL '24 hours'"
    )
    .fetch_all(mm.pool())
    .await?;
    
    for (tx_id,) in stale {
        TransactionBmc::fail(
            &ctx, 
            mm, 
            &tx_id, 
            "Transaction did not appear in mempool within 24 hours"
        ).await?;
        warn!("Marked stale transaction {} as failed", tx_id);
    }
    
    Ok(())
}
