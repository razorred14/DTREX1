-- ============================================
-- DTREX - Transaction Tracking for Commitment Fees
-- Migration: 02-add-transactions.sql
-- ============================================

-- Exchange wallet configuration
CREATE TABLE IF NOT EXISTS exchange_config (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) NOT NULL UNIQUE,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default exchange configuration
INSERT INTO exchange_config (key, value, description) VALUES
    ('exchange_wallet_address', '', 'XCH address where commitment fees are sent'),
    ('commitment_fee_mojos', '200000000000', 'Default commitment fee in mojos (~0.2 XCH)'),
    ('escrow_duration_days', '30', 'Duration of escrow period in days'),
    ('min_trade_value_usd', '10', 'Minimum trade value in USD')
ON CONFLICT (key) DO NOTHING;

-- Transaction tracking table for all XCH movements
CREATE TABLE IF NOT EXISTS trade_transactions (
    id BIGSERIAL PRIMARY KEY,
    
    -- References
    trade_id BIGINT NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Transaction type
    tx_type VARCHAR(30) NOT NULL,  -- 'commitment_fee', 'escrow_deposit', 'escrow_release', 'refund'
    
    -- Chia blockchain data
    tx_id VARCHAR(128),           -- Transaction ID from wallet (pending)
    coin_id VARCHAR(128),         -- Coin ID once confirmed
    puzzle_hash VARCHAR(128),     -- Puzzle hash for escrow
    
    -- Addresses
    from_address VARCHAR(128),    -- Sender's XCH address
    to_address VARCHAR(128),      -- Recipient's XCH address (exchange or escrow)
    
    -- Amount
    amount_mojos BIGINT NOT NULL,
    
    -- Status tracking
    status VARCHAR(30) NOT NULL DEFAULT 'pending',  -- 'pending', 'mempool', 'confirmed', 'failed', 'refunded'
    confirmations INTEGER DEFAULT 0,
    
    -- Error handling
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    mempool_at TIMESTAMPTZ,
    confirmed_at TIMESTAMPTZ,
    
    -- Metadata (JSON for flexible data)
    metadata JSONB DEFAULT '{}'
);

-- Add columns to trades table for better commitment tracking
ALTER TABLE trades ADD COLUMN IF NOT EXISTS proposer_commit_amount_mojos BIGINT;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS acceptor_commit_amount_mojos BIGINT;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS proposer_commit_status VARCHAR(30) DEFAULT 'pending';
ALTER TABLE trades ADD COLUMN IF NOT EXISTS acceptor_commit_status VARCHAR(30) DEFAULT 'pending';
ALTER TABLE trades ADD COLUMN IF NOT EXISTS proposer_commit_at TIMESTAMPTZ;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS acceptor_commit_at TIMESTAMPTZ;

-- Indexes for trade_transactions
CREATE INDEX IF NOT EXISTS idx_trade_transactions_trade_id ON trade_transactions(trade_id);
CREATE INDEX IF NOT EXISTS idx_trade_transactions_user_id ON trade_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_transactions_tx_id ON trade_transactions(tx_id);
CREATE INDEX IF NOT EXISTS idx_trade_transactions_status ON trade_transactions(status);
CREATE INDEX IF NOT EXISTS idx_trade_transactions_type ON trade_transactions(tx_type);

-- Function to update trade commitment status when transaction is confirmed
CREATE OR REPLACE FUNCTION update_trade_on_commit_confirm()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'confirmed' AND NEW.tx_type = 'commitment_fee' THEN
        -- Determine if this is proposer or acceptor
        UPDATE trades SET
            proposer_commit_status = CASE 
                WHEN proposer_id = NEW.user_id THEN 'confirmed' 
                ELSE proposer_commit_status 
            END,
            acceptor_commit_status = CASE 
                WHEN acceptor_id = NEW.user_id THEN 'confirmed' 
                ELSE acceptor_commit_status 
            END,
            proposer_commit_at = CASE 
                WHEN proposer_id = NEW.user_id AND proposer_commit_at IS NULL THEN NOW() 
                ELSE proposer_commit_at 
            END,
            acceptor_commit_at = CASE 
                WHEN acceptor_id = NEW.user_id AND acceptor_commit_at IS NULL THEN NOW() 
                ELSE acceptor_commit_at 
            END,
            -- Update overall status to 'committed' when both parties have confirmed
            status = CASE 
                WHEN (
                    (proposer_id = NEW.user_id AND acceptor_commit_status = 'confirmed') OR
                    (acceptor_id = NEW.user_id AND proposer_commit_status = 'confirmed')
                ) THEN 'committed'
                ELSE status
            END,
            committed_at = CASE 
                WHEN (
                    (proposer_id = NEW.user_id AND acceptor_commit_status = 'confirmed') OR
                    (acceptor_id = NEW.user_id AND proposer_commit_status = 'confirmed')
                ) THEN NOW()
                ELSE committed_at
            END,
            updated_at = NOW()
        WHERE id = NEW.trade_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic status updates
DROP TRIGGER IF EXISTS trg_update_trade_on_commit ON trade_transactions;
CREATE TRIGGER trg_update_trade_on_commit
    AFTER UPDATE ON trade_transactions
    FOR EACH ROW
    WHEN (OLD.status != 'confirmed' AND NEW.status = 'confirmed')
    EXECUTE FUNCTION update_trade_on_commit_confirm();

-- View for easy transaction status checking
CREATE OR REPLACE VIEW trade_commitment_status AS
SELECT 
    t.id AS trade_id,
    t.status AS trade_status,
    t.proposer_id,
    t.acceptor_id,
    t.proposer_commit_status,
    t.acceptor_commit_status,
    COALESCE(p_tx.tx_id, '') AS proposer_tx_id,
    COALESCE(a_tx.tx_id, '') AS acceptor_tx_id,
    COALESCE(p_tx.status, 'not_started') AS proposer_tx_status,
    COALESCE(a_tx.status, 'not_started') AS acceptor_tx_status,
    COALESCE(p_tx.amount_mojos, 0) AS proposer_amount_mojos,
    COALESCE(a_tx.amount_mojos, 0) AS acceptor_amount_mojos
FROM trades t
LEFT JOIN trade_transactions p_tx ON t.id = p_tx.trade_id 
    AND t.proposer_id = p_tx.user_id 
    AND p_tx.tx_type = 'commitment_fee'
LEFT JOIN trade_transactions a_tx ON t.id = a_tx.trade_id 
    AND t.acceptor_id = a_tx.user_id 
    AND a_tx.tx_type = 'commitment_fee'
WHERE t.status IN ('matched', 'committed', 'escrow');
