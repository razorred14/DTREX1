# Code Cleanup & Migration Checklist

## ⚠️ Files Not Aligned with New Authentication Architecture

### Backend - Files That Need Cleanup/Update

#### ❌ **Legacy REST Endpoints** (No longer needed - superseded by JSON-RPC)
These files contain old REST API handlers that duplicate functionality now in JSON-RPC:

1. **`backend/src/api/contracts.rs`** (380 lines)
   - Old REST handlers: `create_contract`, `list_contracts`, `get_contract`, etc.
   - **Status**: Superseded by `contract_*` methods in `api/rpc.rs`
   - **Action**: Can be removed or refactored to use Model layer only

2. **`backend/src/api/files.rs`** (224 lines)
   - Old REST multipart file upload handlers
   - **Status**: Superseded by `file_*` methods in `api/rpc.rs`
   - **Action**: Can be removed or refactored for actual file upload (currently only metadata)

3. **`backend/src/api/contacts.rs`**
   - Old REST contact management
   - **Status**: Still used by legacy routes
   - **Action**: Migrate to JSON-RPC or remove if not needed

4. **`backend/src/api/ssl.rs`**
   - SSL certificate upload for Chia node
   - **Status**: Still used by legacy routes
   - **Action**: Migrate to JSON-RPC or keep if needed

5. **`backend/src/api/signing.rs`**
   - Signature aggregation and verification
   - **Status**: May be needed for blockchain features
   - **Action**: Review and integrate with auth system if needed

#### ⚠️ **Backend Files Needing Review**

6. **`backend/src/storage/files.rs`**
   - File system storage operations
   - **Status**: Used by old REST API, not integrated with database
   - **Action**: Update to work with FileBmc database model

7. **`backend/src/storage/contacts.rs`**
   - File-based contact storage
   - **Status**: Not using database
   - **Action**: Create ContactBmc model or remove if not needed

8. **`backend/src/storage/mod.rs`**
   - File storage module
   - **Action**: Review if still needed or migrate to database

9. **`backend/src/app_state.rs`**
   - Legacy AppState for REST routes
   - **Status**: Still used but separate from ModelManager
   - **Action**: Keep for Chia RPC client or consolidate

10. **`backend/src/main.rs`** (Lines 50-75)
    - Legacy REST routes still active
    - **Action**: Remove old routes or add deprecation notices

### Frontend - Files That Need Cleanup/Update

#### ❌ **Old API Client Methods** (Not using JSON-RPC)

11. **`frontend/src/api/client.ts`** (Lines 10-120)
    - Old REST API methods: `contractApi`, `fileApi`, `contactApi`
    - **Status**: Not using new JSON-RPC pattern or authentication
    - **Action**: Replace with JSON-RPC methods or create new RPC client

#### ⚠️ **Frontend Components Using Old APIs**

12. **`frontend/src/pages/CreateContract.tsx`**
    - Uses old `contractApi.create()` REST endpoint
    - **Status**: Not using authenticated JSON-RPC
    - **Action**: Update to use JSON-RPC `contract_create` method

13. **`frontend/src/pages/ViewContracts.tsx`**
    - Uses old `contractApi.list()` and `contractApi.get()`
    - **Status**: Not using authenticated JSON-RPC
    - **Action**: Update to use JSON-RPC `contract_list` and `contract_get`

14. **`frontend/src/components/ContractEditor.tsx`**
    - Uses old `contractApi.hash()` REST endpoint
    - **Status**: Not using authenticated JSON-RPC
    - **Action**: Update or integrate with new contract flow

15. **`frontend/src/components/ChiaNodeConnector.tsx`**
    - Uses old REST API for Chia config
    - **Action**: Migrate to JSON-RPC or keep separate if needed

16. **`frontend/src/components/FileUploader.tsx`**
    - Old file upload component
    - **Action**: Update to work with new `file_create` JSON-RPC method

17. **`frontend/src/pages/Home.tsx`**
    - **Action**: Review to ensure it uses authenticated components

### Other Files to Review

18. **`frontend/src/App.tsx`**
    - Currently empty (only returns null)
    - **Action**: Remove if not needed or implement

19. **`frontend/src/wallet/*`**
    - Wallet integration files (mockWallet.ts, walletConnect.ts)
    - **Status**: May be needed for blockchain features
    - **Action**: Review and integrate with auth system

20. **`backend/src/blockchain/*`**
    - CLVM puzzle compilation
    - **Status**: Core functionality, keep
    - **Action**: Integrate with authenticated contract flow

21. **`backend/src/rpc/client.rs`**
    - Chia node RPC client
    - **Status**: Core functionality, keep
    - **Action**: Ensure works with authenticated system

## ✅ Files Aligned with New Architecture

### Backend - Good Files
- ✅ `backend/src/store/mod.rs` - Database connection
- ✅ `backend/src/ctx/mod.rs` - Request context
- ✅ `backend/src/model/user.rs` - UserBmc with auth
- ✅ `backend/src/model/contract.rs` - ContractBmc with authorization
- ✅ `backend/src/model/file.rs` - FileBmc with authorization
- ✅ `backend/src/api/auth.rs` - Auth RPC methods
- ✅ `backend/src/api/rpc.rs` - JSON-RPC router
- ✅ `backend/src/api/mw_auth.rs` - Auth middleware
- ✅ `backend/sql/` - Database schema

### Frontend - Good Files
- ✅ `frontend/src/api/auth.ts` - Auth API client
- ✅ `frontend/src/contexts/AuthContext.tsx` - Auth state
- ✅ `frontend/src/components/ProtectedRoute.tsx` - Route protection
- ✅ `frontend/src/components/Navbar.tsx` - User-aware navigation
- ✅ `frontend/src/pages/Login.tsx` - Login page
- ✅ `frontend/src/pages/Register.tsx` - Registration page
- ✅ `frontend/src/main.tsx` - App entry with auth

## 📋 Recommended Actions

### High Priority (Breaking Changes)

1. **Update main.rs** - Remove or deprecate legacy REST routes
2. **Create RPC contract client** - Replace old `contractApi` in frontend
3. **Update CreateContract page** - Use JSON-RPC with authentication
4. **Update ViewContracts page** - Use JSON-RPC with authentication

### Medium Priority (Functionality)

5. **File upload implementation** - Add actual file upload to complement database records
6. **Contact management** - Migrate to database or remove
7. **SSL certificate management** - Migrate to JSON-RPC or keep separate

### Low Priority (Cleanup)

8. **Remove unused code** - Delete old REST handlers if fully migrated
9. **Update App.tsx** - Implement or remove
10. **Documentation** - Update inline comments to reflect new architecture

## 🔄 Migration Strategy

### Phase 1: Update Frontend to Use JSON-RPC
- Create new RPC client methods in `frontend/src/api/client.ts`
- Update all pages to use new authenticated RPC methods
- Test with existing backend

### Phase 2: Remove Legacy Backend Routes
- Verify all frontend uses new RPC methods
- Remove old REST routes from `main.rs`
- Delete or archive old API handler files

### Phase 3: Additional Features
- Implement proper file upload with storage
- Add contact management to database
- Integrate blockchain features with auth

## ⚠️ Notes

- **Do not remove blockchain/puzzle code** - This is core functionality
- **Keep Chia RPC client** - Needed for blockchain interaction
- **Test thoroughly** - Ensure all features work after migration
- **Backwards compatibility** - Consider if any external clients use REST API
