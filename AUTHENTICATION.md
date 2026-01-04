# Authentication Implementation Complete

## Overview
Full-stack authentication system implemented with multi-user support, token-based authorization, and database-backed contract/file management.

## Backend (Rust + Axum + PostgreSQL)

### Architecture
- **Rust10x Web App Blueprint**: JSON-RPC API pattern
- **PostgreSQL 16**: Database with user ownership model
- **Argon2**: Password hashing with scheme prefix for versioning
- **HMAC-SHA256**: Token generation and validation
- **Tower Middleware**: AUTH-RESOLVE for token validation

### Database Schema
```sql
users (id, username, pwd, pwd_salt, token_salt)
contracts (id, user_id, name, party1/2_public_key, terms, amount, status, puzzle_hash, coin_id)
contract_files (id, contract_id, user_id, filename, file_path, file_size, mime_type)
```

### API Endpoints (JSON-RPC at `/api/rpc`)

**Authentication:**
- `register` - Create account (username, pwd)
- `login` - Get auth token (returns user + token)
- `logout` - Invalidate session

**Contracts:**
- `contract_list` - List user's contracts
- `contract_get` - Get contract by ID (with auth check)
- `contract_create` - Create new contract
- `contract_update` - Update fields (name, description, status, puzzle_hash, coin_id)
- `contract_delete` - Delete contract

**Files:**
- `file_list` - List files for a contract (requires contract ownership)
- `file_get` - Get file metadata by ID
- `file_create` - Create file record
- `file_delete` - Delete file record and file from disk

### Authorization Model
- All protected endpoints require Bearer token in `Authorization` header
- AUTH-RESOLVE middleware validates token and creates `Ctx` with user_id
- Model layer (UserBmc, ContractBmc, FileBmc) enforces user_id filtering
- Database-level foreign key constraints provide defense in depth

## Frontend (React + TypeScript + Vite)

### New Files Created
```
src/
├── api/
│   └── auth.ts              # Auth API calls, token management
├── contexts/
│   └── AuthContext.tsx      # Auth context provider and useAuth hook
├── components/
│   └── ProtectedRoute.tsx   # Route wrapper for authenticated pages
└── pages/
    ├── Login.tsx            # Login page with form validation
    └── Register.tsx         # Registration page with password confirmation
```

### Features Implemented

**1. Authentication Context (`AuthContext.tsx`)**
- Global auth state management
- User and token persistence in localStorage
- Login, register, logout functions
- `useAuth()` hook for components

**2. Token Management**
- Automatic token storage/retrieval
- Axios request interceptor adds `Bearer ${token}` to all requests
- Axios response interceptor handles 401 errors (auto-logout)

**3. Protected Routes**
- `<ProtectedRoute>` wrapper component
- Redirects to `/login` if not authenticated
- Loading state while checking auth

**4. Login/Register Pages**
- Form validation (password length, confirmation match)
- Error handling with user-friendly messages
- Auto-redirect to home on success
- Links to switch between login/register

**5. Navbar Updates**
- Shows username when authenticated
- Logout button
- Hides protected links when logged out
- Shows Login/Sign Up when not authenticated

## Testing

### Backend Test Users
```bash
# Alice (user_id: 2)
username: alice
password: password123

# Bob (user_id: 3)
username: bob
password: bobpass123
```

### Test Results
✅ User registration with Argon2 hashing
✅ Login returns valid HMAC-SHA256 token
✅ Protected endpoints reject requests without token (401)
✅ Protected endpoints accept valid tokens
✅ Contract CRUD with user ownership enforced
✅ File management with authorization checks
✅ Users can only access their own contracts/files

### Example API Calls
```bash
# Register
curl -X POST http://localhost:8080/api/rpc \
  -H "Content-Type: application/json" \
  -d '{"id":"1","method":"register","params":{"username":"alice","pwd":"password123"}}'

# Login
curl -X POST http://localhost:8080/api/rpc \
  -H "Content-Type: application/json" \
  -d '{"id":"2","method":"login","params":{"username":"alice","pwd":"password123"}}'
# Returns: {"id":"2","result":{"success":true,"user":{"id":2,"username":"alice"},"token":"..."}}

# Create Contract (with token)
curl -X POST http://localhost:8080/api/rpc \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"id":"3","method":"contract_create","params":{"name":"Test Contract","party1_public_key":"...","party2_public_key":"...","terms":"Net 30","amount":1000000}}'

# List Contracts
curl -X POST http://localhost:8080/api/rpc \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"id":"4","method":"contract_list","params":{}}'
```

## Running the Application

### Backend
```bash
cd backend
cargo run
# Runs on http://localhost:8080
```

### Frontend
```bash
cd frontend
npm run dev
# Runs on http://127.0.0.1:5173
```

### Database
```bash
# Create database
psql -U postgres -f backend/sql/00-recreate-db.sql

# Create schema
psql -U chia_user -d chia_contracts -f backend/sql/01-create-schema.sql
```

## Security Features

1. **Password Security**
   - Argon2 hashing with random salts
   - Scheme prefix for algorithm versioning
   - Never stored in plaintext

2. **Token Security**
   - HMAC-SHA256 signatures
   - User-specific token_salt
   - Timestamp-based tokens

3. **Authorization**
   - Model layer enforces user_id filtering
   - Database foreign keys prevent orphaned data
   - 401 responses trigger auto-logout

4. **SQL Injection Prevention**
   - sqlx compile-time query checking
   - Parameterized queries only

## Environment Variables
```bash
# .env
DATABASE_URL=postgresql://chia_user:your_password@localhost/chia_contracts
TOKEN_SECRET=<32-byte-hex-secret>
```

Generate TOKEN_SECRET with:
```bash
openssl rand -hex 32
```

## Next Steps
- [ ] Add refresh token mechanism for long-lived sessions
- [ ] Implement email verification for registration
- [ ] Add password reset functionality
- [ ] Create admin panel for user management
- [ ] Add rate limiting to prevent brute force attacks
- [ ] Implement 2FA (two-factor authentication)
- [ ] Add session management (active sessions list)
- [ ] Create audit log for security events

## Files Modified/Created

### Backend
- `backend/src/store/mod.rs` - Database connection pooling
- `backend/src/ctx/mod.rs` - Request context with user_id
- `backend/src/model/mod.rs` - Model layer entry point
- `backend/src/model/user.rs` - UserBmc with Argon2
- `backend/src/model/contract.rs` - ContractBmc with CRUD
- `backend/src/model/file.rs` - FileBmc with authorization
- `backend/src/api/auth.rs` - Auth RPC methods
- `backend/src/api/rpc.rs` - JSON-RPC router
- `backend/src/api/mw_auth.rs` - AUTH-RESOLVE middleware
- `backend/src/main.rs` - Application setup
- `backend/sql/00-recreate-db.sql` - Database creation
- `backend/sql/01-create-schema.sql` - Table schema
- `.env` - Environment configuration

### Frontend
- `frontend/src/api/auth.ts` - Auth API client
- `frontend/src/api/client.ts` - Added interceptors
- `frontend/src/contexts/AuthContext.tsx` - Auth state management
- `frontend/src/components/ProtectedRoute.tsx` - Route protection
- `frontend/src/components/Navbar.tsx` - Added auth UI
- `frontend/src/pages/Login.tsx` - Login page
- `frontend/src/pages/Register.tsx` - Registration page
- `frontend/src/main.tsx` - Added AuthProvider and routes
