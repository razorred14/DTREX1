-- ============================================
-- DTREX - Decentralized Trade Exchange Schema
-- ============================================

-- Users table with verification status
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(128) NOT NULL UNIQUE,
    
    -- Password (Argon2 hashed with scheme prefix)
    pwd VARCHAR(256) NOT NULL,
    pwd_salt UUID NOT NULL,
    token_salt UUID NOT NULL,
    
    -- Email verification
    email VARCHAR(256),
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_code VARCHAR(6),
    email_verification_expires TIMESTAMPTZ,
    
    -- Phone verification
    phone VARCHAR(20),
    phone_verified BOOLEAN DEFAULT FALSE,
    phone_verification_code VARCHAR(6),
    phone_verification_expires TIMESTAMPTZ,
    
    -- ID verification
    id_verified BOOLEAN DEFAULT FALSE,
    id_verification_status VARCHAR(20) DEFAULT 'none',  -- none, pending, verified, rejected
    id_submitted_at TIMESTAMPTZ,
    id_verified_at TIMESTAMPTZ,
    
    -- Overall verification status: unverified, email, phone, verified
    verification_status VARCHAR(20) DEFAULT 'unverified',
    
    -- Reputation (calculated from trade reviews)
    reputation_score DECIMAL(3,2) DEFAULT 0.00,
    total_trades INTEGER DEFAULT 0,
    
    -- XCH wallet address for trading
    xch_address VARCHAR(64),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trade proposals and active trades
CREATE TABLE IF NOT EXISTS trades (
    id BIGSERIAL PRIMARY KEY,
    
    -- Participants
    proposer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    acceptor_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    
    -- Trade status: proposal, matched, committed, escrow, completed, disputed, cancelled
    status VARCHAR(20) NOT NULL DEFAULT 'proposal',
    
    -- Proposer's item
    proposer_item_title VARCHAR(256) NOT NULL,
    proposer_item_description TEXT NOT NULL,
    proposer_item_condition VARCHAR(50),  -- mint, near_mint, excellent, good, fair, poor
    proposer_item_value_usd DOUBLE PRECISION NOT NULL,
    proposer_item_category VARCHAR(100),
    
    -- Acceptor's offer (filled when matched)
    acceptor_item_title VARCHAR(256),
    acceptor_item_description TEXT,
    acceptor_item_condition VARCHAR(50),
    acceptor_item_value_usd DOUBLE PRECISION,
    acceptor_xch_offer BIGINT,  -- in mojos, if offering XCH
    
    -- XCH involvement
    xch_amount BIGINT,  -- in mojos, for XCH-involved trades
    trade_type VARCHAR(20) DEFAULT 'item_for_item',  -- item_for_item, item_for_xch, xch_for_item, mixed
    
    -- Blockchain commitment (Phase 3)
    proposer_commitment_tx VARCHAR(64),
    acceptor_commitment_tx VARCHAR(64),
    commitment_memo TEXT,
    committed_at TIMESTAMPTZ,
    
    -- Escrow (Phase 4)
    escrow_coin_id VARCHAR(64),
    escrow_puzzle_hash VARCHAR(64),
    escrow_start_date TIMESTAMPTZ,
    escrow_end_date TIMESTAMPTZ,  -- 30 days from start
    
    -- Shipping info
    proposer_tracking_number VARCHAR(100),
    proposer_tracking_carrier VARCHAR(50),
    proposer_shipped_at TIMESTAMPTZ,
    proposer_received_at TIMESTAMPTZ,
    
    acceptor_tracking_number VARCHAR(100),
    acceptor_tracking_carrier VARCHAR(50),
    acceptor_shipped_at TIMESTAMPTZ,
    acceptor_received_at TIMESTAMPTZ,
    
    -- Completion
    completed_at TIMESTAMPTZ,
    final_blockchain_hash VARCHAR(64),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trade wishlist items (what proposer will accept)
CREATE TABLE IF NOT EXISTS trade_wishlists (
    id BIGSERIAL PRIMARY KEY,
    trade_id BIGINT NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
    
    wishlist_type VARCHAR(20) NOT NULL,  -- item, xch, mixed
    item_description TEXT,
    item_min_value_usd DECIMAL(10,2),
    xch_amount BIGINT,  -- in mojos
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trade photos
CREATE TABLE IF NOT EXISTS trade_photos (
    id BIGSERIAL PRIMARY KEY,
    trade_id BIGINT NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    photo_type VARCHAR(20) NOT NULL,  -- proposer_item, acceptor_item, packaging, received
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(128),
    display_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trade reviews (4-pillar rating system)
CREATE TABLE IF NOT EXISTS trade_reviews (
    id BIGSERIAL PRIMARY KEY,
    trade_id BIGINT NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
    reviewer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewee_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- The four pillars (1-5 scale)
    timeliness_score SMALLINT NOT NULL CHECK (timeliness_score BETWEEN 1 AND 5),
    packaging_score SMALLINT NOT NULL CHECK (packaging_score BETWEEN 1 AND 5),
    value_honesty_score SMALLINT NOT NULL CHECK (value_honesty_score BETWEEN 1 AND 5),
    state_accuracy_score SMALLINT NOT NULL CHECK (state_accuracy_score BETWEEN 1 AND 5),
    
    -- Calculated average
    overall_score DECIMAL(3,2) NOT NULL,
    
    comment TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure one review per trade per direction
    UNIQUE(trade_id, reviewer_id, reviewee_id)
);

-- Trade messages (chat between participants)
CREATE TABLE IF NOT EXISTS trade_messages (
    id BIGSERIAL PRIMARY KEY,
    trade_id BIGINT NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
    sender_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    message TEXT NOT NULL,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Verification documents (temporary storage for ID verification)
CREATE TABLE IF NOT EXISTS verification_documents (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    document_type VARCHAR(20) NOT NULL,  -- drivers_license, passport, state_id
    front_image_path TEXT NOT NULL,
    back_image_path TEXT,
    
    status VARCHAR(20) DEFAULT 'pending',  -- pending, approved, rejected
    rejection_reason TEXT,
    reviewed_by BIGINT REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Verification audit log
CREATE TABLE IF NOT EXISTS verification_audit (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    action VARCHAR(50) NOT NULL,  -- email_sent, email_verified, phone_sent, phone_verified, id_submitted, id_verified
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Legacy contracts table (kept for backward compatibility during migration)
CREATE TABLE IF NOT EXISTS contracts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    name VARCHAR(256) NOT NULL,
    description TEXT,
    party1_public_key VARCHAR(96) NOT NULL,
    party2_public_key VARCHAR(96) NOT NULL,
    party1_xch_address VARCHAR(64),
    party2_xch_address VARCHAR(64),
    terms TEXT NOT NULL,
    amount BIGINT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    puzzle_hash VARCHAR(64),
    coin_id VARCHAR(64),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Legacy contract files table
CREATE TABLE IF NOT EXISTS contract_files (
    id BIGSERIAL PRIMARY KEY,
    contract_id BIGINT NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    filename VARCHAR(256) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(128),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- Indexes
-- ============================================

-- Users indexes
CREATE INDEX idx_users_verification_status ON users(verification_status);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_xch_address ON users(xch_address);

-- Trades indexes
CREATE INDEX idx_trades_proposer_id ON trades(proposer_id);
CREATE INDEX idx_trades_acceptor_id ON trades(acceptor_id);
CREATE INDEX idx_trades_status ON trades(status);
CREATE INDEX idx_trades_trade_type ON trades(trade_type);
CREATE INDEX idx_trades_created_at ON trades(created_at DESC);

-- Trade wishlists index
CREATE INDEX idx_trade_wishlists_trade_id ON trade_wishlists(trade_id);

-- Trade photos index
CREATE INDEX idx_trade_photos_trade_id ON trade_photos(trade_id);

-- Trade reviews indexes
CREATE INDEX idx_trade_reviews_trade_id ON trade_reviews(trade_id);
CREATE INDEX idx_trade_reviews_reviewee_id ON trade_reviews(reviewee_id);

-- Trade messages index
CREATE INDEX idx_trade_messages_trade_id ON trade_messages(trade_id);

-- Verification indexes
CREATE INDEX idx_verification_documents_user_id ON verification_documents(user_id);
CREATE INDEX idx_verification_audit_user_id ON verification_audit(user_id);

-- Legacy indexes (for backward compatibility)
CREATE INDEX idx_contracts_user_id ON contracts(user_id);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contract_files_contract_id ON contract_files(contract_id);
CREATE INDEX idx_contract_files_user_id ON contract_files(user_id);

-- ============================================
-- Demo user (username: demo1, password: welcome)
-- ============================================
INSERT INTO users (username, pwd, pwd_salt, token_salt, email, email_verified, verification_status) VALUES
  ('demo1', '#02#Rm5SYmlqNFJUZGFOM2FYdnNaZA==#0MBeul5KQKjYUJQqKDPMpCMo9PZxNTdBnZTEfGmDl0w=', '9c2b4e9c-ba6b-4d6a-94f8-51b5e7e5e0b1', 'f9e8d7c6-b5a4-3c2b-1a0b-9c8d7e6f5a4b', 'demo@dtrex.io', true, 'verified');