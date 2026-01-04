-- Users table
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(128) NOT NULL UNIQUE,
    
    -- Password (Argon2 hashed with scheme prefix)
    pwd VARCHAR(256) NOT NULL,
    pwd_salt UUID NOT NULL,
    token_salt UUID NOT NULL,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Contracts table
CREATE TABLE IF NOT EXISTS contracts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    name VARCHAR(256) NOT NULL,
    description TEXT,
    
    -- Contract parties (Hex Public Keys - kept for future use)
    party1_public_key VARCHAR(96) NOT NULL,
    party2_public_key VARCHAR(96) NOT NULL,

    -- XCH Wallet Addresses (New fields for frontend participation)
    party1_xch_address VARCHAR(64),
    party2_xch_address VARCHAR(64),
    
    -- Contract terms
    terms TEXT NOT NULL,
    amount BIGINT NOT NULL,
    
    -- Contract state
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    puzzle_hash VARCHAR(64),
    coin_id VARCHAR(64),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Contract files table
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

-- Indexes
CREATE INDEX idx_contracts_user_id ON contracts(user_id);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_party1_address ON contracts(party1_xch_address);
CREATE INDEX idx_contract_files_contract_id ON contract_files(contract_id);
CREATE INDEX idx_contract_files_user_id ON contract_files(user_id);

-- Demo user (username: demo1, password: welcome)
INSERT INTO users (username, pwd, pwd_salt, token_salt) VALUES
  ('demo1', '#02#Rm5SYmlqNFJUZGFOM2FYdnNaZA==#0MBeul5KQKjYUJQqKDPMpCMo9PZxNTdBnZTEfGmDl0w=', '9c2b4e9c-ba6b-4d6a-94f8-51b5e7e5e0b1', 'f9e8d7c6-b5a4-3c2b-1a0b-9c8d7e6f5a4b');