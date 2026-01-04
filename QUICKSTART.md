# DTREX Quick Start Guide

Get up and running with the Decentralized Trade Exchange in under 10 minutes.

## ✅ Pre-Flight Checklist

Before starting, verify your system has:

### Required
```bash
# PostgreSQL 16+
postgres --version
# Expected: postgres (PostgreSQL) 16.x

# Rust 1.70+
rustc --version && cargo --version
# Expected: rustc 1.70+, cargo 1.70+

# Node.js 18+
node --version && npm --version
# Expected: v18+, npm 8+
```

### Optional (for blockchain features)
- Chia node running (mainnet or testnet)
- Chia wallet with XCH for trade fees

---

## 🚀 Quick Start

### Step 1: Start PostgreSQL

```bash
# macOS
brew services start postgresql@16

# Linux
sudo systemctl start postgresql

# Verify it's running
psql -U postgres -c "SELECT 1;"
```

### Step 2: Initialize Database

```bash
cd backend

# Create database and user
psql -U postgres -f sql/00-recreate-db.sql

# Create tables
psql -U chia_user -d chia_contracts -f sql/01-create-schema.sql
```

### Step 3: Configure Backend

```bash
cd backend

# Create environment file
cat > .env << 'EOF'
DATABASE_URL=postgres://chia_user:chia_password@localhost:5432/chia_contracts
TOKEN_SECRET=your-secret-key-change-this-min-32-chars!!
EOF
```

### Step 4: Start Backend (Terminal 1)

```bash
cd backend
cargo run
```

✅ **Wait for:**
```
INFO chia_contract_backend: Server listening on 127.0.0.1:8080
```

### Step 5: Start Frontend (Terminal 2)

```bash
cd frontend
npm install
npm run dev
```

✅ **Wait for:**
```
➜  Local:   http://127.0.0.1:5173/
```

### Step 6: Open Browser

Navigate to `http://127.0.0.1:5173`

---

## 📊 System Status Check

When everything is running correctly, you'll see:

```
┌─────────────────────────────────────────────┐
│          DTREX SYSTEM STATUS               │
├─────────────────────────────────────────────┤
│  ✓ Backend Service     Connected           │
│  ✓ Database            Connected           │
│  ○ Chia Node           Not configured      │
│  ○ Wallet              Not connected       │
└─────────────────────────────────────────────┘
```

**Note:** Chia node and wallet are optional for browsing and account setup. They're only required for committing to trades.

---

## 👤 First-Time User Flow

### 1. Create Account
- Click "Sign Up" in the top navigation
- Enter username, email, and password
- You now have an **Unverified** account

### 2. Complete Verification (Required for Trading)

To participate in trades, you must verify your identity:

| Step | What | How |
|------|------|-----|
| **Email** | Verify email address | Click link sent to your email |
| **Phone** | Verify phone number | Enter SMS code |
| **ID** | Upload driver's license | Take photo or upload scan |

After completing all three, you receive **Verified Status** ✓

### 3. Connect Wallet (Optional)
- Navigate to Settings → Wallet
- Enter your Chia RPC URL
- Optionally upload SSL certificates
- Click "Connect"

### 4. Browse Trade Proposals
- Go to "Browse Trades" to see open proposals
- Filter by category, value range, or location
- No verification needed to browse

### 5. Create Your First Trade
- Requires **Verified Status**
- Click "Create Trade Proposal"
- Upload photos and describe your item
- Set your asking price (in USD, converted to XCH)
- Specify what you'll accept in trade

---

## 🔧 Troubleshooting

### Backend won't start

**Error:** `connection refused` to database
```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432

# If not, start it
brew services start postgresql@16  # macOS
sudo systemctl start postgresql     # Linux
```

**Error:** `TOKEN_SECRET must be at least 32 characters`
```bash
# Edit .env file
nano backend/.env
# Make TOKEN_SECRET longer
```

### Frontend shows "Disconnected"

```bash
# Verify backend is running
curl http://localhost:8080/health
# Should return: {"status":"ok"}

# If not running, start it
cd backend && cargo run
```

### Database connection failed

```bash
# Check credentials in .env match database setup
cat backend/.env

# Verify user can connect
psql -U chia_user -d chia_contracts -c "SELECT 1;"
```

---

## 🎯 Use Case Quick Reference

### Just Browsing
| Need | Status |
|------|--------|
| Backend | ✅ Required |
| Database | ✅ Required |
| Account | ✅ Basic (email only) |
| Verification | ❌ Not needed |
| Wallet | ❌ Not needed |
| Chia Node | ❌ Not needed |

### Creating Trade Proposals
| Need | Status |
|------|--------|
| Backend | ✅ Required |
| Database | ✅ Required |
| Account | ✅ Verified |
| Verification | ✅ Email + Phone + ID |
| Wallet | ❌ Not needed |
| Chia Node | ❌ Not needed |

### Committing to Trades
| Need | Status |
|------|--------|
| Backend | ✅ Required |
| Database | ✅ Required |
| Account | ✅ Verified |
| Verification | ✅ Email + Phone + ID |
| Wallet | ✅ With XCH balance |
| Chia Node | ✅ For transaction signing |

---

## 🧪 Test Account

For development and testing, a demo account is pre-created:

```
Username: demo1
Password: welcome
Status: Unverified (complete verification to trade)
```

---

## 📁 Project Structure

```
DTREX1/
├── backend/           # Rust + Axum API server
│   ├── src/
│   │   ├── api/       # RPC endpoints
│   │   ├── model/     # Database models (User, Trade, Review)
│   │   └── ...
│   └── sql/           # Database migrations
├── frontend/          # React + TypeScript UI
│   ├── src/
│   │   ├── api/       # API client
│   │   ├── pages/     # Trade, Profile, Settings pages
│   │   └── components/ # Reusable UI components
│   └── ...
└── puzzles/           # Chia CLVM puzzles for escrow
```

---

## 🔗 Next Steps

1. **[WORKFLOW.md](./WORKFLOW.md)** - Understand the 5-phase trade process
2. **[AUTHENTICATION.md](./AUTHENTICATION.md)** - Identity verification details
3. **[SSL_SETUP_GUIDE.md](./SSL_SETUP_GUIDE.md)** - Secure Chia node connection
4. **[README.md](./README.md)** - Full platform documentation

---

## 💡 Tips

- **Start small**: Your first trade should be a low-value item to learn the process
- **Build reputation**: Successful trades increase your trust score
- **Communicate**: Use the trade chat to coordinate shipping details
- **Document everything**: Take photos of items before and during packaging
- **Use tracked shipping**: Always get a tracking number for physical items
