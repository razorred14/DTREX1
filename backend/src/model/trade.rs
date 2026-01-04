use crate::ctx::Ctx;
use crate::error::Error;
use crate::model::ModelManager;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

// ============================================
// Trade Entity
// ============================================

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct Trade {
    pub id: i64,
    pub proposer_id: i64,
    pub acceptor_id: Option<i64>,
    pub status: String,

    // Proposer's item
    pub proposer_item_title: String,
    pub proposer_item_description: String,
    pub proposer_item_condition: Option<String>,
    pub proposer_item_value_usd: f64,
    pub proposer_item_category: Option<String>,

    // Acceptor's offer
    pub acceptor_item_title: Option<String>,
    pub acceptor_item_description: Option<String>,
    pub acceptor_item_condition: Option<String>,
    pub acceptor_item_value_usd: Option<f64>,
    pub acceptor_xch_offer: Option<i64>,

    // XCH involvement
    pub xch_amount: Option<i64>,
    pub trade_type: Option<String>,

    // Commitment
    pub proposer_commitment_tx: Option<String>,
    pub acceptor_commitment_tx: Option<String>,
    pub commitment_memo: Option<String>,
    pub committed_at: Option<chrono::DateTime<chrono::Utc>>,

    // Escrow
    pub escrow_coin_id: Option<String>,
    pub escrow_puzzle_hash: Option<String>,
    pub escrow_start_date: Option<chrono::DateTime<chrono::Utc>>,
    pub escrow_end_date: Option<chrono::DateTime<chrono::Utc>>,

    // Shipping
    pub proposer_tracking_number: Option<String>,
    pub proposer_tracking_carrier: Option<String>,
    pub proposer_shipped_at: Option<chrono::DateTime<chrono::Utc>>,
    pub proposer_received_at: Option<chrono::DateTime<chrono::Utc>>,
    pub acceptor_tracking_number: Option<String>,
    pub acceptor_tracking_carrier: Option<String>,
    pub acceptor_shipped_at: Option<chrono::DateTime<chrono::Utc>>,
    pub acceptor_received_at: Option<chrono::DateTime<chrono::Utc>>,

    // Completion
    pub completed_at: Option<chrono::DateTime<chrono::Utc>>,
    pub final_blockchain_hash: Option<String>,

    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

// ============================================
// Trade DTOs
// ============================================

#[derive(Deserialize)]
pub struct TradeForCreate {
    pub item_title: String,
    pub item_description: String,
    pub item_condition: Option<String>,
    pub item_value_usd: f64,
    pub item_category: Option<String>,
    pub wishlist: Option<Vec<WishlistItem>>,
}

#[derive(Deserialize, Serialize, Clone)]
pub struct WishlistItem {
    pub wishlist_type: String, // "item", "xch", "mixed"
    pub item_description: Option<String>,
    pub item_min_value_usd: Option<f64>,
    pub xch_amount: Option<i64>, // in mojos
}

#[derive(Deserialize)]
pub struct TradeAcceptParams {
    pub trade_id: i64,
    pub offer_type: String, // "item", "xch", "mixed"
    pub item_title: Option<String>,
    pub item_description: Option<String>,
    pub item_condition: Option<String>,
    pub item_value_usd: Option<f64>,
    pub xch_amount: Option<i64>,
}

#[derive(Deserialize)]
pub struct TradeForUpdate {
    pub status: Option<String>,
    pub acceptor_id: Option<i64>,
    pub proposer_tracking_number: Option<String>,
    pub proposer_tracking_carrier: Option<String>,
    pub acceptor_tracking_number: Option<String>,
    pub acceptor_tracking_carrier: Option<String>,
}

// ============================================
// Trade Review
// ============================================

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct TradeReview {
    pub id: i64,
    pub trade_id: i64,
    pub reviewer_id: i64,
    pub reviewee_id: i64,
    pub timeliness_score: i16,
    pub packaging_score: i16,
    pub value_honesty_score: i16,
    pub state_accuracy_score: i16,
    pub overall_score: f64,
    pub comment: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Deserialize)]
pub struct ReviewForCreate {
    pub trade_id: i64,
    pub timeliness: i16,
    pub packaging: i16,
    pub value_honesty: i16,
    pub state_accuracy: i16,
    pub comment: Option<String>,
}

// ============================================
// Trade BMC (Business Model Controller)
// ============================================

pub struct TradeBmc;

impl TradeBmc {
    /// Create a new trade proposal
    pub async fn create(ctx: &Ctx, mm: &ModelManager, trade: TradeForCreate) -> Result<i64, Error> {
        let db = mm.db();

        let (id,) = sqlx::query_as::<_, (i64,)>(
            r#"INSERT INTO trades 
               (proposer_id, status, proposer_item_title, proposer_item_description, 
                proposer_item_condition, proposer_item_value_usd, proposer_item_category, trade_type)
               VALUES ($1, 'proposal', $2, $3, $4, $5, $6, 'item_for_item') 
               RETURNING id"#,
        )
        .bind(ctx.user_id())
        .bind(&trade.item_title)
        .bind(&trade.item_description)
        .bind(&trade.item_condition)
        .bind(trade.item_value_usd)
        .bind(&trade.item_category)
        .fetch_one(db)
        .await
        .map_err(|_| Error::InternalServer)?;

        // Insert wishlist items if provided
        if let Some(wishlist) = trade.wishlist {
            for item in wishlist {
                sqlx::query(
                    r#"INSERT INTO trade_wishlists 
                       (trade_id, wishlist_type, item_description, item_min_value_usd, xch_amount)
                       VALUES ($1, $2, $3, $4, $5)"#,
                )
                .bind(id)
                .bind(&item.wishlist_type)
                .bind(&item.item_description)
                .bind(item.item_min_value_usd)
                .bind(item.xch_amount)
                .execute(db)
                .await
                .map_err(|_| Error::InternalServer)?;
            }
        }

        Ok(id)
    }

    /// Get a trade by ID (participant access only)
    pub async fn get(ctx: &Ctx, mm: &ModelManager, id: i64) -> Result<Trade, Error> {
        sqlx::query_as::<_, Trade>(
            "SELECT * FROM trades WHERE id = $1 AND (proposer_id = $2 OR acceptor_id = $2)",
        )
        .bind(id)
        .bind(ctx.user_id())
        .fetch_one(mm.db())
        .await
        .map_err(|_| Error::NotFound)
    }

    /// Get a trade by ID (public for proposals)
    pub async fn get_public(mm: &ModelManager, id: i64) -> Result<Trade, Error> {
        sqlx::query_as::<_, Trade>("SELECT * FROM trades WHERE id = $1")
            .bind(id)
            .fetch_one(mm.db())
            .await
            .map_err(|_| Error::NotFound)
    }

    /// List open trade proposals (public)
    pub async fn list_proposals(mm: &ModelManager, limit: i64, offset: i64) -> Result<Vec<Trade>, Error> {
        sqlx::query_as::<_, Trade>(
            "SELECT * FROM trades WHERE status = 'proposal' ORDER BY created_at DESC LIMIT $1 OFFSET $2",
        )
        .bind(limit)
        .bind(offset)
        .fetch_all(mm.db())
        .await
        .map_err(|e| {
            tracing::error!("list_proposals error: {:?}", e);
            Error::InternalServer
        })
    }

    /// List user's own trades (as proposer or acceptor)
    pub async fn list_my_trades(ctx: &Ctx, mm: &ModelManager) -> Result<Vec<Trade>, Error> {
        sqlx::query_as::<_, Trade>(
            "SELECT * FROM trades WHERE proposer_id = $1 OR acceptor_id = $1 ORDER BY updated_at DESC",
        )
        .bind(ctx.user_id())
        .fetch_all(mm.db())
        .await
        .map_err(|_| Error::InternalServer)
    }

    /// Accept a trade proposal (make an offer)
    pub async fn accept(ctx: &Ctx, mm: &ModelManager, params: TradeAcceptParams) -> Result<(), Error> {
        let db = mm.db();

        // Verify trade exists and is a proposal
        let trade: Trade = sqlx::query_as("SELECT * FROM trades WHERE id = $1 AND status = 'proposal'")
            .bind(params.trade_id)
            .fetch_one(db)
            .await
            .map_err(|_| Error::NotFound)?;

        // Cannot accept your own trade
        if trade.proposer_id == ctx.user_id() {
            return Err(Error::BadRequest);
        }

        // Determine trade type based on offer
        let trade_type = match params.offer_type.as_str() {
            "xch" => "item_for_xch",
            "mixed" => "mixed",
            _ => "item_for_item",
        };

        sqlx::query(
            r#"UPDATE trades SET 
               acceptor_id = $2,
               status = 'matched',
               acceptor_item_title = $3,
               acceptor_item_description = $4,
               acceptor_item_condition = $5,
               acceptor_item_value_usd = $6,
               acceptor_xch_offer = $7,
               trade_type = $8,
               updated_at = NOW()
               WHERE id = $1"#,
        )
        .bind(params.trade_id)
        .bind(ctx.user_id())
        .bind(&params.item_title)
        .bind(&params.item_description)
        .bind(&params.item_condition)
        .bind(params.item_value_usd)
        .bind(params.xch_amount)
        .bind(trade_type)
        .execute(db)
        .await
        .map_err(|_| Error::InternalServer)?;

        Ok(())
    }

    /// Update trade status (participant only)
    pub async fn update_status(ctx: &Ctx, mm: &ModelManager, id: i64, status: &str) -> Result<(), Error> {
        let result = sqlx::query(
            "UPDATE trades SET status = $3, updated_at = NOW() WHERE id = $1 AND (proposer_id = $2 OR acceptor_id = $2)",
        )
        .bind(id)
        .bind(ctx.user_id())
        .bind(status)
        .execute(mm.db())
        .await
        .map_err(|_| Error::InternalServer)?;

        if result.rows_affected() == 0 {
            return Err(Error::NotFound);
        }

        Ok(())
    }

    /// Add tracking information
    pub async fn add_tracking(
        ctx: &Ctx,
        mm: &ModelManager,
        trade_id: i64,
        tracking_number: &str,
        carrier: &str,
    ) -> Result<(), Error> {
        let trade = Self::get(ctx, mm, trade_id).await?;

        // Determine which party is adding tracking
        let (column_tracking, column_carrier, column_shipped) = if trade.proposer_id == ctx.user_id() {
            ("proposer_tracking_number", "proposer_tracking_carrier", "proposer_shipped_at")
        } else {
            ("acceptor_tracking_number", "acceptor_tracking_carrier", "acceptor_shipped_at")
        };

        let query = format!(
            "UPDATE trades SET {} = $2, {} = $3, {} = NOW(), updated_at = NOW() WHERE id = $1",
            column_tracking, column_carrier, column_shipped
        );

        sqlx::query(&query)
            .bind(trade_id)
            .bind(tracking_number)
            .bind(carrier)
            .execute(mm.db())
            .await
            .map_err(|_| Error::InternalServer)?;

        Ok(())
    }

    /// Cancel a trade (proposer only, must be in proposal/matched status)
    pub async fn cancel(ctx: &Ctx, mm: &ModelManager, id: i64) -> Result<(), Error> {
        let result = sqlx::query(
            "UPDATE trades SET status = 'cancelled', updated_at = NOW() WHERE id = $1 AND proposer_id = $2 AND status IN ('proposal', 'matched')",
        )
        .bind(id)
        .bind(ctx.user_id())
        .execute(mm.db())
        .await
        .map_err(|_| Error::InternalServer)?;

        if result.rows_affected() == 0 {
            return Err(Error::NotFound);
        }

        Ok(())
    }

    /// Cancel a trade as admin (any open trade)
    pub async fn admin_cancel(mm: &ModelManager, id: i64) -> Result<(), Error> {
        let result = sqlx::query(
            "UPDATE trades SET status = 'cancelled', updated_at = NOW() WHERE id = $1 AND status IN ('proposal', 'matched', 'committed')",
        )
        .bind(id)
        .execute(mm.db())
        .await
        .map_err(|_| Error::InternalServer)?;

        if result.rows_affected() == 0 {
            return Err(Error::NotFound);
        }

        Ok(())
    }

    /// Delete a trade proposal (proposer only, proposal status only)
    pub async fn delete(ctx: &Ctx, mm: &ModelManager, id: i64) -> Result<(), Error> {
        let result = sqlx::query(
            "DELETE FROM trades WHERE id = $1 AND proposer_id = $2 AND status = 'proposal'",
        )
        .bind(id)
        .bind(ctx.user_id())
        .execute(mm.db())
        .await
        .map_err(|_| Error::InternalServer)?;

        if result.rows_affected() == 0 {
            return Err(Error::NotFound);
        }

        Ok(())
    }

    /// Delete a trade as admin (any proposal or cancelled trade)
    pub async fn admin_delete(mm: &ModelManager, id: i64) -> Result<(), Error> {
        let result = sqlx::query(
            "DELETE FROM trades WHERE id = $1 AND status IN ('proposal', 'cancelled')",
        )
        .bind(id)
        .execute(mm.db())
        .await
        .map_err(|_| Error::InternalServer)?;

        if result.rows_affected() == 0 {
            return Err(Error::NotFound);
        }

        Ok(())
    }
}

// ============================================
// Review BMC
// ============================================

pub struct ReviewBmc;

impl ReviewBmc {
    /// Create a review for a trade
    pub async fn create(ctx: &Ctx, mm: &ModelManager, review: ReviewForCreate) -> Result<i64, Error> {
        let db = mm.db();

        // Verify user is participant in this trade
        let trade: Trade = sqlx::query_as(
            "SELECT * FROM trades WHERE id = $1 AND (proposer_id = $2 OR acceptor_id = $2) AND status = 'completed'",
        )
        .bind(review.trade_id)
        .bind(ctx.user_id())
        .fetch_one(db)
        .await
        .map_err(|_| Error::NotFound)?;

        // Determine reviewee (the other party)
        let reviewee_id = if trade.proposer_id == ctx.user_id() {
            trade.acceptor_id.ok_or(Error::BadRequest)?
        } else {
            trade.proposer_id
        };

        // Calculate overall score
        let overall = (review.timeliness as f64 * 0.20
            + review.packaging as f64 * 0.25
            + review.value_honesty as f64 * 0.30
            + review.state_accuracy as f64 * 0.25) as f64;

        let (id,) = sqlx::query_as::<_, (i64,)>(
            r#"INSERT INTO trade_reviews 
               (trade_id, reviewer_id, reviewee_id, timeliness_score, packaging_score, 
                value_honesty_score, state_accuracy_score, overall_score, comment)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
               RETURNING id"#,
        )
        .bind(review.trade_id)
        .bind(ctx.user_id())
        .bind(reviewee_id)
        .bind(review.timeliness)
        .bind(review.packaging)
        .bind(review.value_honesty)
        .bind(review.state_accuracy)
        .bind(overall)
        .bind(&review.comment)
        .fetch_one(db)
        .await
        .map_err(|_| Error::InternalServer)?;

        // Update reviewee's reputation score
        Self::update_reputation(mm, reviewee_id).await?;

        Ok(id)
    }

    /// Get reviews for a user
    pub async fn get_for_user(mm: &ModelManager, user_id: i64) -> Result<Vec<TradeReview>, Error> {
        sqlx::query_as::<_, TradeReview>(
            "SELECT * FROM trade_reviews WHERE reviewee_id = $1 ORDER BY created_at DESC",
        )
        .bind(user_id)
        .fetch_all(mm.db())
        .await
        .map_err(|_| Error::InternalServer)
    }

    /// Update user's reputation score (average of all reviews)
    async fn update_reputation(mm: &ModelManager, user_id: i64) -> Result<(), Error> {
        sqlx::query(
            r#"UPDATE users SET 
               reputation_score = (
                   SELECT COALESCE(AVG(overall_score), 0) 
                   FROM trade_reviews WHERE reviewee_id = $1
               ),
               total_trades = (
                   SELECT COUNT(DISTINCT trade_id) 
                   FROM trade_reviews WHERE reviewee_id = $1
               ),
               updated_at = NOW()
               WHERE id = $1"#,
        )
        .bind(user_id)
        .execute(mm.db())
        .await
        .map_err(|_| Error::InternalServer)?;

        Ok(())
    }
}
