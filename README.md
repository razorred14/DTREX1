# Chia Contract App

A multi-user web application for creating and managing smart contracts on the Chia blockchain with secure authentication and database-backed storage.

## 🌟 Features

- **🔐 Multi-User Authentication**: Secure user registration and login with Argon2 password hashing and HMAC-SHA256 tokens
- **👥 User Ownership**: Each user has their own isolated contracts and files with database-level authorization
- **📝 Contract Management**: Full CRUD operations for smart contracts with status tracking
- **📎 File Management**: Upload and manage contract-related files with user authorization
- **🎨 Modern UI**: React + TypeScript frontend with Tailwind CSS
- **⚡ High-Performance Backend**: Rust-based JSON-RPC API with Axum framework and PostgreSQL database
- **🔗 Chia Integration**: CLVM puzzle compilation and blockchain deployment capabilities

## 🏗️ Architecture

### Backend (Rust + Axum + PostgreSQL)
- **Framework**: Axum web server with Tower middleware
- **Database**: PostgreSQL 16 with sqlx for compile-time query checking
- **API Pattern**: JSON-RPC over HTTP at `/api/rpc` endpoint
- **Authentication**: 
  - Argon2 password hashing with random salts
  - HMAC-SHA256 token generation
  - Bearer token authentication via middleware
- **Authorization**: User-based filtering at Model layer with Ctx parameter
- **Modules**:
  - `store/`: Database connection pooling
  - `ctx/`: Request context with user_id and username
  - `model/`: Business logic layer (UserBmc, ContractBmc, FileBmc)
  - `api/auth.rs`: Authentication RPC methods (login, register, logout)
  - `api/rpc.rs`: JSON-RPC router and contract/file methods
  - `api/mw_auth.rs`: AUTH-RESOLVE middleware for token validation
  - `blockchain/`: CLVM puzzle generation and Chia node integration

### Frontend (React + TypeScript + Vite)
- **Framework**: Vite + React 18 with TypeScript
- **Styling**: Tailwind CSS with custom Chia theme
- **State Management**: React Context API for auth + TanStack Query for data
- **Routing**: React Router v6 with protected routes
- **Authentication**: 
  - Auth context with useAuth hook
  - Token storage in localStorage
  - Axios interceptors for Bearer token injection
  - Auto-redirect on 401 errors
- **Components**:
  - Login and registration pages
  - Protected route wrapper
  - Contract CRUD interface
  - File upload/management
  - User-aware navigation

### Database Schema (PostgreSQL)
```sql
users (
  id BIGSERIAL PRIMARY KEY,
  username VARCHAR(128) UNIQUE,
  pwd TEXT,
  pwd_salt UUID,
  token_salt UUID
)

contracts (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id),
  name VARCHAR(256),
  description TEXT,
  party1_public_key VARCHAR(192),
  party2_public_key VARCHAR(192),
  terms TEXT,
  amount BIGINT,
  status VARCHAR(50) DEFAULT 'draft',
  puzzle_hash VARCHAR(192),
  coin_id VARCHAR(192),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

contract_files (
  id BIGSERIAL PRIMARY KEY,
  contract_id BIGINT REFERENCES contracts(id) ON DELETE CASCADE,
  user_id BIGINT REFERENCES users(id),
  filename VARCHAR(256),
  file_path TEXT,
  file_size BIGINT,
  mime_type VARCHAR(128),
  created_at TIMESTAMPTZ
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

## 🚀 Getting Started

### Prerequisites Check

```bash
# Verify installed versions
rustc --version        # Should be 1.70+
cargo --version        # Should match Rust version
postgres --version     # Should be 16+
node --version         # Should be 18+
npm --version          # Package manager
```

### 1. Database Setup

#### On Linux (Ubuntu/Debian):

```bash
# Install PostgreSQL 16 if not already installed
sudo apt update
sudo apt install postgresql-16 postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user using provided SQL script
sudo -u postgres psql -f backend/sql/00-recreate-db.sql

# Create tables and schema
psql -U chia_user -d chia_contracts -f backend/sql/01-create-schema.sql

# Verify connection
psql -U chia_user -d chia_contracts -c "SELECT version();"
```

#### On macOS:

```bash
# Install PostgreSQL using Homebrew
brew install postgresql@16

# Start PostgreSQL service
brew services start postgresql@16

# Create database and user
psql -U postgres -f backend/sql/00-recreate-db.sql

# Create schema
psql -U chia_user -d chia_contracts -f backend/sql/01-create-schema.sql
```

**Note**: The scripts create a user `chia_user` with database `chia_contracts`. You can modify the SQL files if you need different credentials.

### 2. Backend Setup

#### Step 1: Navigate to backend directory

```bash
cd backend
```

#### Step 2: Generate TOKEN_SECRET

```bash
# Generate a secure random token
TOKEN_SECRET=$(openssl rand -hex 32)
echo "Generated TOKEN_SECRET: $TOKEN_SECRET"
```

#### Step 3: Create environment file

```bash
# Create .env file in backend directory
cat > .env << EOF
# Database connection
DATABASE_URL=postgresql://chia_user:postgres@localhost/chia_contracts

# Authentication secret (replace with generated value above)
TOKEN_SECRET=$TOKEN_SECRET

# Server configuration (optional, defaults shown)
RUST_LOG=info
CHIA_RPC_URL=http://localhost:8555
CHIA_ALLOW_INSECURE=false
EOF
```

#### Step 4: Build the backend

```bash
# Build the project (first time will take 2-5 minutes)
cargo build

# Or for optimized release build
cargo build --release
```

#### Step 5: Run the backend

```bash
# Development mode with debug logging
cargo run

# Or run the compiled binary directly
./target/debug/chia-contract-backend

# Production mode (optimized binary)
./target/release/chia-contract-backend
```

**Backend status**: The backend will start on `http://localhost:8080`

```
2025-12-28T19:54:08.093529Z  INFO chia_contract_backend: Server listening on 127.0.0.1:8080
```

You can verify it's running with:
```bash
curl http://localhost:8080/health
# Response: OK
```

### 3. Frontend Setup

#### Step 1: Navigate to frontend directory

```bash
cd frontend
```

#### Step 2: Install dependencies

```bash
# Install all required npm packages
npm install

# This may take 1-2 minutes on first install
```

#### Step 3: Configure API endpoint (if needed)

The frontend is preconfigured to connect to `http://localhost:8080` (the default backend location). If your backend is running on a different address, update:

- **File**: `frontend/src/api/client.ts`
- **Change**: `baseURL` in the axios configuration if needed

For local development, the default configuration should work.

#### Step 4: Start the development server

```bash
# Start the Vite dev server
npm run dev

# Output will show:
# ➜  Local:   http://127.0.0.1:5173/
# ➜  press h to show help
```

**Frontend status**: The application will be available at `http://127.0.0.1:5173`

You can now access the application in your browser!

### 4. Complete Setup Summary

Your application is now running with:
- ✅ Backend API on `http://localhost:8080`
- ✅ Frontend on `http://127.0.0.1:5173`
- ✅ PostgreSQL database on `localhost:5432`

#### Next steps:

1. Open http://127.0.0.1:5173 in your browser
2. Register a new user or use demo credentials:
   - Username: `alice` / Password: `password123`
   - Username: `bob` / Password: `bobpass123`
3. Create your first contract
4. Upload files and manage your contracts

#### Troubleshooting:

```bash
# If backend fails to start:
# 1. Check PostgreSQL is running
psql -U chia_user -d chia_contracts -c "SELECT 1;"

# 2. Verify DATABASE_URL in .env is correct
cat backend/.env | grep DATABASE_URL

# 3. Check port 8080 is not in use
lsof -i :8080

# If frontend fails to start:
# 1. Check Node.js version is 18+
node --version

# 2. Clear npm cache and reinstall
rm -rf node_modules package-lock.json
npm install

# 3. Check port 5173 is not in use
lsof -i :5173
```

## 🔧 Configuration

### Backend Environment Variables

Create a `.env` file in the `backend/` directory with the following variables:

```env
# Database Connection (REQUIRED)
DATABASE_URL=postgresql://chia_user:postgres@localhost/chia_contracts
# Format: postgresql://username:password@host:port/database

# Authentication Secret (REQUIRED)
TOKEN_SECRET=your-32-byte-hex-string
# Generate with: openssl rand -hex 32
# Used for HMAC-SHA256 token signing - NEVER share or commit this!

# Server Configuration (Optional)
RUST_LOG=info
# Log levels: error, warn, info, debug, trace
# Default: info

# Chia Node RPC Configuration (Optional)
CHIA_RPC_URL=http://localhost:8555
# Default: http://localhost:8555
# Change to your Chia node's RPC endpoint

CHIA_ALLOW_INSECURE=false
# Set to true only for development/testing
# WARNING: Disables certificate validation - never use in production

# Server Binding (Optional)
SERVER_HOST=127.0.0.1
# Default: 127.0.0.1 (localhost only)
# Change to 0.0.0.0 to accept external connections

SERVER_PORT=8080
# Default: 8080
```

### Frontend Configuration

The frontend is configured in `frontend/src/api/client.ts`:

```typescript
// API Base URL - automatically set to http://localhost:8080
// For production, change baseURL in the axios configuration
export const api = axios.create({
  baseURL: "/",  // Proxy via Vite dev server
  headers: {
    "Content-Type": "application/json",
  },
});
```

For **production deployment**, update the API endpoint in your build configuration:

```bash
# Build with custom API URL
VITE_API_URL=https://api.yourdomain.com npm run build
```

### Chia Node Connection Configuration

The application supports two connection modes for blockchain operations:

#### 1. WalletConnect (For Signing Only)

**Recommended for:** Contract signing and wallet operations without full node

- Scan QR code with Chia Signer mobile app
- Or paste URI in Chia Wallet desktop app
- No backend configuration required
- Works without a running Chia node

#### 2. Chia RPC Connection (For Full Node Operations)

**Required for:** Blockchain status queries, coin tracking, transaction broadcasting

##### Testnet Setup (HTTP - Development Only)

```bash
# In backend/.env
CHIA_RPC_URL=http://localhost:8555
CHIA_ALLOW_INSECURE=true
```

**Note:** Testnet typically uses HTTP without TLS. Set `CHIA_ALLOW_INSECURE=true` for development.

##### Mainnet Setup (HTTPS with mTLS)

Mainnet requires secure HTTPS connections with client certificate authentication (mutual TLS).

**📖 For detailed step-by-step frontend instructions, see [SSL_SETUP_GUIDE.md](SSL_SETUP_GUIDE.md)**

**Option A: Via Settings Page (Recommended)**

1. Start the application and navigate to **Settings** page
2. Configure Chia RPC URL:
   ```
   RPC URL: https://localhost:8555
   Connection Mode: node
   ```
3. Upload SSL certificates:
   - **Certificate (.crt or .pem)**: Public certificate for your mode (wallet or full node)
   - **Key (.key or .pem)**: Private key for your mode
   - **CA Certificate (chia_ca.crt)**: Required for secure connections
     - File: `~/.chia/mainnet/config/ssl/ca/chia_ca.crt`


**Option B: Via API**

```bash
# Set RPC URL
curl -X POST http://localhost:3000/chia/config \
  -H "Content-Type: application/json" \
  -d '{"rpc_url":"https://localhost:8555","mode":"node"}'

# Upload certificate, key, and CA
curl -X POST http://localhost:3000/ssl/upload \
  -F "cert=@$HOME/.chia/mainnet/config/ssl/full_node/private_full_node.crt" \
  -F "key=@$HOME/.chia/mainnet/config/ssl/full_node/private_full_node.key" \
  -F "ca=@$HOME/.chia/mainnet/config/ssl/ca/chia_ca.crt"

# Or set paths manually
curl -X POST http://localhost:3000/ssl/set \
  -H "Content-Type: application/json" \
  -d '{
    "cert_path":"'$HOME'/.chia/mainnet/config/ssl/full_node/private_full_node.crt",
    "key_path":"'$HOME'/.chia/mainnet/config/ssl/full_node/private_full_node.key",
    "ca_path":"'$HOME'/.chia/mainnet/config/ssl/ca/chia_ca.crt",
    "mode":"full_node"
  }'
```

**Verify SSL Status:**

```bash
curl http://localhost:3000/ssl/status
```


Expected response:
```json
{
  "has_cert": true,
  "has_key": true,
  "has_ca": true,
  "ca_path": "/home/user/.chia/mainnet/config/ssl/ca/chia_ca.crt"
}
```

**Test Connection:**

```bash
curl http://localhost:3000/chia/node/status
```

Expected response:
```json
{
  "connected": true,
  "network": "mainnet",
  "peak_height": 6234567,
  "sync_mode": false,
  "rpc_url": "https://localhost:8555"
}
```

##### Certificate Locations by Service

| Service | Cert Path | Key Path |
|---------|-----------|----------|
| Full Node | `~/.chia/mainnet/config/ssl/full_node/private_full_node.crt` | `~/.chia/mainnet/config/ssl/full_node/private_full_node.key` |
| Wallet | `~/.chia/mainnet/config/ssl/wallet/private_wallet.crt` | `~/.chia/mainnet/config/ssl/wallet/private_wallet.key` |
| CA | `~/.chia/mainnet/config/ssl/ca/chia_ca.crt` | - |

##### Important Notes

- **Certificate (.crt/.pem), Key (.key/.pem), and CA (.crt) are required** for secure client authentication (mutual TLS)
- **Never commit** SSL certificates or private keys to version control
- For production, store certificates securely and rotate regularly

## 📡 API Endpoints

### JSON-RPC API (`/api/rpc`)

All requests use JSON-RPC format:
```json
{
  "id": "unique-request-id",
  "method": "method_name",
  "params": { }
}
```

### Authentication Methods (No token required)

| Method | Description | Parameters |
|--------|-------------|------------|
| `register` | Create new user account | `username`, `pwd` |
| `login` | Authenticate and get token | `username`, `pwd` |
| `logout` | Invalidate session | none |

### Contract Methods (Token required)

| Method | Description | Parameters |
|--------|-------------|------------|
| `contract_list` | List user's contracts | none |
| `contract_get` | Get contract by ID | `id` |
| `contract_create` | Create new contract | `name`, `description`, `party1_public_key`, `party2_public_key`, `terms`, `amount` |
| `contract_update` | Update contract fields | `id`, optional: `name`, `description`, `status`, `puzzle_hash`, `coin_id` |
| `contract_delete` | Delete contract | `id` |

### File Methods (Token required)

| Method | Description | Parameters |
|--------|-------------|------------|
| `file_list` | List files for a contract | `contract_id` |
| `file_get` | Get file metadata | `id` |
| `file_create` | Create file record | `contract_id`, `filename`, `file_path`, `file_size`, `mime_type` |
| `file_delete` | Delete file | `id` |

### Example: Register User

```bash
curl -X POST http://localhost:8080/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "id": "1",
    "method": "register",
    "params": {
      "username": "alice",
      "pwd": "password123"
    }
  }'
```

Response:
```json
{
  "id": "1",
  "result": {
    "success": true,
    "user": {
      "id": 2,
      "username": "alice"
    },
    "token": "Mi4zZDAwMDhlZi0wNTgxLTQ3YWQtYjYxOC05N2MxN2MxYTAyZWEuMTc2NjYxMDMyOQ==.967a3df5..."
  }
}
```

### Example: Create Contract

```bash
curl -X POST http://localhost:8080/api/rpc \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "id": "2",
    "method": "contract_create",
    "params": {
      "name": "Service Agreement",
      "description": "Contract for web development services",
      "party1_public_key": "0123456789abcdef...",
      "party2_public_key": "fedcba9876543210...",
      "terms": "Payment terms: Net 30 days",
      "amount": 1000000
    }
  }'
```

Response:
```json
{
  "id": "2",
  "result": {
    "success": true,
    "contract_id": 1
  }
}
```

## 🧪 Testing

### Test Users

The application comes with demo users for testing:

```bash
# Alice (user_id: 2)
username: alice
password: password123

# Bob (user_id: 3)
username: bob
password: bobpass123
```

### Backend Tests

```bash
cd backend
cargo test

# Run with output
cargo test -- --nocapture
```

### Frontend Manual Testing

1. Open http://127.0.0.1:5173
2. Register a new user or login with demo credentials
3. Create a contract with required fields
4. List your contracts
5. Update contract status (draft → active → completed)
6. Create file records for contracts
7. Verify authorization (users can only see their own data)

### API Testing with curl

See [AUTHENTICATION.md](AUTHENTICATION.md) for comprehensive API testing examples.

## 🔐 Security

### Authentication & Authorization

1. **Password Security**
   - Argon2 hashing with random salts per user
   - Scheme prefix `#02#` for algorithm versioning
   - Never stored in plaintext

2. **Token Security**
   - HMAC-SHA256 signatures with user-specific salt
   - Bearer token format: `Authorization: Bearer <token>`
   - Tokens include timestamp for expiration tracking
   - Auto-logout on 401 responses in frontend

3. **Authorization Model**
   - All protected endpoints require valid Bearer token
   - AUTH-RESOLVE middleware validates token and creates Ctx
   - Model layer enforces user_id filtering on all queries
   - Database foreign keys prevent orphaned data

4. **SQL Injection Prevention**
   - sqlx with compile-time query checking
   - Parameterized queries only
   - No dynamic SQL string concatenation

### Best Practices

1. **Never commit .env files** - Contains database credentials and TOKEN_SECRET
2. **Rotate TOKEN_SECRET regularly** - Invalidates all existing tokens
3. **Use HTTPS in production** - Encrypt token transmission
4. **Set strong passwords** - Minimum 6 characters (increase in production)
5. **Test on testnet first** - Deploy to Chia testnet before mainnet

## 🛠️ Development Workflow

### Quick Start Commands (One Terminal Per Service)

```bash
# Terminal 1: Database (if needed)
sudo systemctl start postgresql  # Or: brew services start postgresql@16

# Terminal 2: Backend
cd backend
cargo run
# Listening on http://localhost:8080

# Terminal 3: Frontend
cd frontend
npm run dev
# Listening on http://127.0.0.1:5173
```

### Creating Your First Contract

1. **Open Application**: Navigate to http://127.0.0.1:5173
2. **Register or Login**:
   ```bash
   # Via UI: Click "Register" and create account
   # Or use demo credentials:
   # Username: alice
   # Password: password123
   ```
3. **Create Contract**:
   - Click "Create Contract" button
   - Fill in contract details (title, description, etc.)
   - Add participants with their public keys
   - Set contract amount and terms
   - Click "Create"
4. **Manage Contracts**:
   - View all your contracts on the Contracts page
   - Update contract status (draft → active → completed)
   - Upload related files
   - Track contract history

### Working with Chia Wallet

1. **Connect Wallet** (on Home page):
   - Click "Connect Wallet" button
   - Scan QR code with Chia Signer app
   - Approve connection on your mobile device
   - Public key will be automatically filled for new contracts

2. **Sign Contract**:
   - Select contract from list
   - Click "Sign" button
   - Approve signature request in wallet app
   - Contract marked as signed

### Database Management

#### Viewing Data

```bash
# Connect to database
psql -U chia_user -d chia_contracts

# Useful queries:
\dt                    # List all tables
SELECT * FROM users;   # View all users
SELECT * FROM contracts; # View all contracts
SELECT * FROM contract_files; # View all files
```

#### Resetting Database

```bash
# Completely reset and recreate schema
sudo -u postgres psql -f backend/sql/00-recreate-db.sql
psql -U chia_user -d chia_contracts -f backend/sql/01-create-schema.sql

# Or just clear all data (keeping schema)
psql -U chia_user -d chia_contracts -c "TRUNCATE TABLE contract_files CASCADE; TRUNCATE TABLE contracts CASCADE; TRUNCATE TABLE users CASCADE;"
```

#### Schema Modifications

When updating database schema:

1. Edit `backend/sql/01-create-schema.sql`
2. Recreate the database:
   ```bash
   sudo -u postgres psql -f backend/sql/00-recreate-db.sql
   psql -U chia_user -d chia_contracts -f backend/sql/01-create-schema.sql
   ```
3. Test all API endpoints that use the modified tables
4. Update backend model layer if column names changed

### Backend Development

```bash
# Run with debug logging
RUST_LOG=debug cargo run

# Run tests
cargo test

# Run tests with output
cargo test -- --nocapture --test-threads=1

# Check code quality
cargo clippy

# Format code
cargo fmt

# Build optimized release
cargo build --release
```

### Frontend Development

```bash
# Start dev server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview

# Lint code
npm run lint

# Type check (TypeScript)
tsc --noEmit
```

### Testing an API Endpoint Manually

```bash
# Test registration
curl -X POST http://localhost:8080/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "id": "1",
    "method": "register",
    "params": {
      "username": "testuser",
      "pwd": "testpass123"
    }
  }'

# Login and save token
TOKEN=$(curl -s -X POST http://localhost:8080/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "id": "2",
    "method": "login",
    "params": {
      "username": "testuser",
      "pwd": "testpass123"
    }
  }' | jq -r '.result.token')

# Use token to call protected endpoint
curl -X POST http://localhost:8080/api/rpc \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "id": "3",
    "method": "contract_list",
    "params": {}
  }'
```

## 📦 Project Structure

```
ChiaContractApp/
├── backend/                 # Rust backend
│   ├── src/
│   │   ├── main.rs         # Server entry point
│   │   ├── store/          # Database connection
│   │   ├── ctx/            # Request context
│   │   ├── model/          # Business logic (UserBmc, ContractBmc, FileBmc)
│   │   ├── api/            # JSON-RPC handlers
│   │   │   ├── auth.rs     # Authentication methods
│   │   │   ├── rpc.rs      # RPC router
│   │   │   └── mw_auth.rs  # Auth middleware
│   │   ├── blockchain/     # CLVM puzzle engine
│   │   ├── rpc/            # Chia node client
│   │   └── util/           # Utilities
│   ├── sql/                # Database schema
│   │   ├── 00-recreate-db.sql
│   │   └── 01-create-schema.sql
│   ├── Cargo.toml
│   └── .env
├── frontend/               # React frontend
│   ├── src/
│   │   ├── api/           
│   │   │   ├── auth.ts     # Auth API client
│   │   │   └── client.ts   # Axios with interceptors
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx  # Auth state management
│   │   ├── components/
│   │   │   ├── ProtectedRoute.tsx
│   │   │   └── Navbar.tsx  # User-aware navigation
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── Home.tsx
│   │   │   ├── CreateContract.tsx
│   │   │   ├── ViewContracts.tsx
│   │   │   └── Contacts.tsx
│   │   └── main.tsx        # App entry with AuthProvider
│   └── package.json
├── puzzles/               # Chialisp puzzles
│   ├── contract.clsp
│   ├── timelock.clsp
│   └── escrow.clsp
├── AUTHENTICATION.md      # Detailed auth documentation
└── README.md             # This file
```

## 🚢 Deployment

### Backend Deployment

```bash
# Build release binary
cd backend
cargo build --release

# Set up production database
# Edit .env with production DATABASE_URL and new TOKEN_SECRET

# Run in production
./target/release/chia-contract-backend
```

**Production considerations:**
- Use a reverse proxy (Nginx/Caddy) with HTTPS
- Set up database backups
- Configure log rotation
- Use systemd service for auto-restart
- Set strong TOKEN_SECRET (rotate regularly)

### Frontend Deployment

```bash
cd frontend
npm run build

# Deploy dist/ folder to your hosting service
# (Vercel, Netlify, AWS S3, Cloudflare Pages, etc.)
```

**Note**: Update API baseURL in production to point to your backend server.

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow Rust naming conventions (snake_case)
- Add tests for new features
- Update documentation for API changes
- Ensure `cargo clippy` passes
- Format code with `cargo fmt`

## 📄 License

This project is licensed under the MIT License.

## 🔗 Resources

- [Chia Documentation](https://docs.chia.net/)
- [Chialisp Documentation](https://chialisp.com/)
- [CLVM Reference](https://chialisp.com/clvm)
- [Rust Axum Framework](https://github.com/tokio-rs/axum)
- [sqlx Documentation](https://github.com/launchbadge/sqlx)
- [Argon2 Password Hashing](https://github.com/RustCrypto/password-hashes)

## 💬 Support

For issues and questions:
- Open an issue on GitHub
- Check [AUTHENTICATION.md](AUTHENTICATION.md) for auth-specific details
- Review the API examples in this README

## 🎯 Roadmap

- [x] User authentication with Argon2 + HMAC tokens
- [x] Database-backed contract storage
- [x] File management with authorization
- [x] Frontend authentication integration
- [ ] Refresh token mechanism
- [ ] Email verification
- [ ] Password reset functionality
- [ ] Contract templates library
- [ ] Blockchain deployment integration
- [ ] Signature collection workflow
- [ ] Multi-party contract execution
- [ ] Audit log for security events

## ⚠️ Disclaimer

This is experimental software under active development. Use at your own risk. Always test thoroughly on testnet before deploying to mainnet with real funds.

**Security Note**: The current implementation stores tokens in localStorage. For production use, consider implementing:
- HTTP-only cookies for token storage
- Refresh token rotation
- Rate limiting on auth endpoints
- CAPTCHA for registration
- Two-factor authentication (2FA)
