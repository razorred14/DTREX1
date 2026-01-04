# Authentication Setup Guide

## Database Setup

### 1. Install PostgreSQL (if not already installed)

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2. Initialize Database

```bash
cd backend
./sql/init-db.sh
```

This will:
- Create database `chia_contracts`
- Create user `chia_user`
- Create tables (users, contracts, contract_files)
- Insert demo user: username=`demo1`, password=`welcome`

### 3. Update .env File

Edit `.env` in project root and update:
```
DATABASE_URL=postgresql://chia_user:your_password@localhost/chia_contracts
TOKEN_SECRET=your-256-bit-secret-key-change-this-in-production
```

## Testing JSON-RPC API

### Register a new user

```bash
curl -X POST http://localhost:8080/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "id": "req_1",
    "method": "register",
    "params": {
      "username": "alice",
      "pwd": "password123"
    }
  }'
```

### Login

```bash
curl -X POST http://localhost:8080/api/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "id": "req_2",
    "method": "login",
    "params": {
      "username": "demo1",
      "pwd": "welcome"
    }
  }'
```

Response will include a token:
```json
{
  "id": "req_2",
  "result": {
    "success": true,
    "user": {
      "id": 1,
      "username": "demo1"
    },
    "token": "base64_payload.hmac_signature"
  }
}
```

### Access Protected Endpoint

```bash
curl -X POST http://localhost:8080/api/rpc \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "id": "req_3",
    "method": "contract_list",
    "params": {}
  }'
```

## Architecture Overview

```
Web Layer (Axum)
    ↓
Middleware (AUTH-RESOLVE)  ← Validates token, creates Ctx
    ↓
RPC Router  ← Routes method calls
    ↓
Model Layer  ← Business logic + Authorization
    ↓
Store Layer  ← Database access (PostgreSQL)
```

### Key Components

- **Ctx**: Request context with user info
- **ModelManager**: Holds database connection
- **UserBmc**: User model controller (login, register)
- **RPC Router**: Single endpoint `/api/rpc` with method-based routing
- **Middleware**: AUTH-RESOLVE (optional auth) and AUTH-REQUIRE (mandatory auth)

## Next Steps

1. Run database init script
2. Start backend: `cargo run`
3. Test JSON-RPC endpoints
4. Update frontend to use new auth system
5. Migrate contracts to database

## Security Notes

- Passwords hashed with Argon2 (scheme `#02#`)
- Tokens use HMAC-SHA256 signatures
- Change `TOKEN_SECRET` in production
- Use HTTPS in production
- Tokens include timestamp for expiration (implement validation as needed)
