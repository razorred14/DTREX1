# DTREX - Decentralized Trade Exchange

A peer-to-peer bartering platform built on the Chia blockchain, enabling secure trades of physical and digital assets without central authority.

## 🌟 Vision

DTREX transforms the way people exchange value. Whether you're trading Pokémon cards, rare sneakers, vintage electronics, or digital NFTs, our platform provides a trustless environment where trades are secured by blockchain technology and community reputation.

**The only limit to what can be traded is the mutual agreement between two verified participants.**

## ✨ Key Features

### 🔐 Identity Verification
Every user undergoes rigorous verification before participating in trades:
- **Driver's License Verification** - Confirms real identity
- **Phone Number Verification** - SMS-based confirmation  
- **Email Verification** - Account ownership proof
- **Verified Status Badge** - Earned after completing verification

### 🤝 Universal Bartering Protocol
- **Item-for-Item Trades** - Swap physical goods directly
- **Item-for-XCH Trades** - Exchange items for Chia cryptocurrency
- **Mixed Trades** - Combine items and XCH for fair value matching
- **Fiat Reference Pricing** - USD values help calibrate trade fairness (never transacted)

### ⭐ Multi-Dimensional Reputation System
Four pillars of trade quality assessment:
1. **Timeliness** - Speed of shipment or XCH transfer
2. **Packaging** - Protection quality for physical items
3. **Value Honesty** - Did the item match the agreed value?
4. **State Accuracy** - Was the physical description accurate?

### ⛓️ Blockchain-Secured Trades
- **Smart Coin Escrow** - XCH held securely until trade completion
- **Immutable Trade Records** - Every trade permanently recorded on Chia
- **Cryptographic Verification** - Tamper-proof trade history
- **30-Day Escrow Window** - Time for shipping and verification

## 🔄 The Five-Phase Trade Process

### Phase 1: Trade Proposal
Alice wants to trade her Near-Mint Pikachu card:
- Lists the item with photos and description
- Sets a **fiat reference value** ($50 → ~1.25 XCH)
- Creates a **wishlist** of acceptable trades:
  - A Near-Mint Charizard (Item-for-Item)
  - 1.25 XCH (Item-for-Token)
  - A lesser card + 0.5 XCH (Mixed)

### Phase 2: Value-Matched Acceptance
Bob reviews the proposal and makes an offer:
- Chooses what to offer (his Charizard valued at $55)
- System shows Alice the "surplus value" trade
- Both parties see transparent value comparison

### Phase 3: Blockchain Commitment
Once terms are agreed, both parties commit:
- **Service Fee**: Each party pays ~$1 in XCH
- **Transaction Memo**: Records Trade ID and assets
- **Sunk Cost Lock**: Agreement becomes immutable

### Phase 4: 30-Day Escrow & Swap
The delivery phase begins:
- **Item-for-Item**: Both parties ship their items
- **Item-for-XCH**: Cryptocurrency held in smart escrow
- **Verification Period**: Time to inspect received items

### Phase 5: Review & Settlement
Trade concludes with reputation updates:
- Rate your trading partner on all four pillars
- Final hash saved to Chia blockchain
- Verified Trade History updates your profile

## 📊 Summary: Asset vs. Reference

| Stage | Asset Focus | Fiat (USD) Role |
|-------|-------------|-----------------|
| **Listing** | NM Pikachu | Used to calculate XCH "Ask" |
| **Matching** | Bob offers Charizard or 1.25 XCH | Confirms value parity |
| **Commitment** | Both pay $1 in XCH | Fixed fee for platform use |
| **Settlement** | Physical Card or XCH Swap | Irrelevant (Trade complete) |

## 🏗️ Technical Architecture

### Backend (Rust + Axum + PostgreSQL)
- **Framework**: High-performance Axum web server
- **Database**: PostgreSQL 16 with sqlx compile-time checking
- **API**: JSON-RPC over HTTP at `/api/rpc`
- **Authentication**: Argon2 hashing + HMAC-SHA256 tokens
- **Blockchain**: Chia RPC integration for escrow and verification

### Frontend (React + TypeScript + Vite)
- **UI Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with custom DTREX theme
- **State**: React Context + TanStack Query
- **Routing**: React Router v6 with protected routes

### Database Schema
```sql
-- Users with verification status
users (
  id, username, pwd, pwd_salt, token_salt,
  email, email_verified, phone, phone_verified,
  drivers_license_verified, verification_status,
  reputation_score, total_trades
)

-- Trade proposals and active trades
trades (
  id, proposer_id, acceptor_id,
  status, -- 'proposal' | 'matched' | 'committed' | 'escrow' | 'completed' | 'disputed'
  proposer_item_description, proposer_item_value_usd, proposer_item_photos,
  acceptor_item_description, acceptor_item_value_usd, acceptor_item_photos,
  xch_amount, escrow_coin_id, commitment_tx_id,
  escrow_start_date, escrow_end_date,
  created_at, updated_at
)

-- Trade reviews (4-pillar system)
trade_reviews (
  id, trade_id, reviewer_id, reviewee_id,
  timeliness_score, packaging_score, 
  value_honesty_score, state_accuracy_score,
  comment, created_at
)

-- Wishlist items for proposals
trade_wishlists (
  id, trade_id, description, estimated_value_usd,
  accept_xch, xch_amount
)
```

## 📋 Prerequisites

### Backend
- Rust 1.70+ and Cargo
- PostgreSQL 16+
- OpenSSL development libraries

### Frontend  
- Node.js 18+
- npm or yarn

### Optional (for blockchain features)
- Chia node (full or light)
- Chia wallet with XCH for fees

## 🚀 Quick Start

### 1. Database Setup
```bash
# Start PostgreSQL
brew services start postgresql@16  # macOS
# or
sudo systemctl start postgresql    # Linux

# Initialize database
cd backend
psql -U postgres -f sql/00-recreate-db.sql
psql -U chia_user -d chia_contracts -f sql/01-create-schema.sql
```

### 2. Backend
```bash
cd backend

# Create .env file
cat > .env << EOF
DATABASE_URL=postgres://chia_user:chia_password@localhost:5432/chia_contracts
TOKEN_SECRET=your-secret-key-here-min-32-chars!!
EOF

# Run server
cargo run
# ✓ Listening on http://localhost:8080
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
# ✓ Available on http://127.0.0.1:5173
```

### 4. Open Browser
Navigate to `http://127.0.0.1:5173` and:
1. **Register** an account
2. **Verify** your identity (email → phone → ID)
3. **Browse** existing trade proposals
4. **Create** your first trade proposal

## 🔒 Security Model

### Identity Verification Tiers
| Tier | Requirements | Capabilities |
|------|-------------|--------------|
| Unverified | Email only | Browse proposals |
| Basic | Email + Phone | Create proposals up to $100 |
| Verified | Email + Phone + ID | Full trading access |

### Trade Protection
- **Blockchain Commitment**: Both parties stake XCH
- **Smart Escrow**: Funds locked until confirmation
- **Dispute Resolution**: Community arbitration system
- **Reputation Impact**: Bad actors face permanent record

## 📊 API Reference

### Authentication
```typescript
// Register new account
POST /api/rpc { method: "register", params: { username, password, email } }

// Login
POST /api/rpc { method: "login", params: { username, password } }

// Verify email/phone
POST /api/rpc { method: "verify_email", params: { code } }
POST /api/rpc { method: "verify_phone", params: { code } }
```

### Trades
```typescript
// Create trade proposal
POST /api/rpc { method: "trade_create", params: { 
  item_description, item_value_usd, photos, wishlist 
}}

// Accept/match a trade
POST /api/rpc { method: "trade_accept", params: { 
  trade_id, offer_description, offer_value_usd 
}}

// Commit to trade (pays fee)
POST /api/rpc { method: "trade_commit", params: { trade_id } }

// Complete trade (releases escrow)
POST /api/rpc { method: "trade_complete", params: { trade_id } }

// Submit review
POST /api/rpc { method: "trade_review", params: { 
  trade_id, timeliness, packaging, value_honesty, state_accuracy, comment 
}}
```

### Reputation
```typescript
// Get user profile and reputation
POST /api/rpc { method: "user_profile", params: { user_id } }

// Get trade history
POST /api/rpc { method: "trade_history", params: { user_id } }
```

## 🗺️ Roadmap

### Phase 1 - Foundation ✅
- [x] User authentication system
- [x] Basic trade proposal creation
- [x] PostgreSQL data persistence
- [x] Chia node integration

### Phase 2 - Verification (Current)
- [ ] Email verification flow
- [ ] Phone verification (SMS)
- [ ] ID verification integration
- [ ] Verification status UI

### Phase 3 - Trading Core
- [ ] Full 5-phase trade flow
- [ ] XCH escrow smart coins
- [ ] Trade matching algorithm
- [ ] Photo upload for items

### Phase 4 - Reputation
- [ ] 4-pillar review system
- [ ] Reputation scoring algorithm
- [ ] Trade history blockchain anchoring
- [ ] Community trust metrics

### Phase 5 - Scale
- [ ] Mobile application
- [ ] Advanced search/filtering
- [ ] Category-specific marketplaces
- [ ] International shipping integration

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines and code of conduct.

## 📄 License

MIT License - see LICENSE file for details.

## 🔗 Links

- [Chia Network](https://chia.net)
- [DTREX Documentation](./docs/)
- [API Reference](./API.md)
