# Application Workflow & Configuration Requirements

## Overview

The Chia Contract Application now includes an intelligent configuration validation system that ensures all necessary services are running before users attempt to connect their wallets or perform blockchain operations.

## Application Startup Sequence

### Recommended Order (for optimal user experience):

```bash
# Terminal 1: Start PostgreSQL (if not running)
sudo systemctl start postgresql      # Linux
# or
brew services start postgresql@16    # macOS

# Terminal 2: Start Backend
cd backend
cargo run
# ✓ Listening on http://localhost:8080

# Terminal 3: Start Frontend
cd frontend
npm run dev
# ✓ Available on http://127.0.0.1:5173
```

## Configuration Checks

### What Gets Validated?

The application automatically checks the following on page load and every 30 seconds:

1. **Backend Service Status** ✅
   - Endpoint: `GET /health`
   - Required for: All RPC operations, wallet operations
   - Status: **REQUIRED** for wallet connection

2. **Chia Node Connection** ⚠️
   - Endpoint: `GET /chia/node/status`
   - Used for: On-chain contract deployment
   - Status: **OPTIONAL** - Users can create contracts without it

3. **Database Connection** (implicit)
   - Validated through backend health check
   - All user data requires this

### Status Display

Users see a **Configuration Status** panel at the top of the Home page showing:

```
✓ Backend Service: Connected
✓ Chia Node Connection: Connected

OR (if not ready):

✗ Backend Service: Not responding
  💡 Make sure to run: cd backend && cargo run

⚠ Chia Node Connection: Not configured (optional)
  💡 You can still create contracts without a Chia node connection
```

## Workflow by Use Case

### Use Case 1: Create Contracts Only (No Blockchain)

**Requirements:**
- ✅ Backend running (`cargo run`)
- ❌ Chia node (optional)

**Steps:**
1. Start backend
2. Open application
3. Login/Register
4. Create contracts
5. No wallet connection needed

**Configuration Status:**
```
✓ Backend Service: Connected
⚠ Chia Node Connection: Not configured (optional)
```

### Use Case 2: Create & Deploy Contracts (With Blockchain)

**Requirements:**
- ✅ Backend running
- ✅ Chia node connected
- ✅ Wallet connected

**Steps:**
1. Start backend
2. Configure Chia node (RPC URL)
3. Connect wallet (requires backend to be running)
4. Create contracts
5. Deploy to blockchain

**Configuration Status:**
```
✓ Backend Service: Connected
✓ Chia Node Connection: Connected
```

### Use Case 3: Sign Existing Contracts with Wallet

**Requirements:**
- ✅ Backend running
- ❌ Chia node (optional)

**Steps:**
1. Start backend
2. Connect wallet
3. Select contract to sign
4. Approve signature in wallet app
5. Contract marked as signed

**Configuration Status:**
```
✓ Backend Service: Connected
⚠ Chia Node Connection: Not configured (optional)
```

## Error Handling

### Backend Not Running

**User sees:**
```
❌ Backend Service: Not responding
  💡 Make sure to run: cd backend && cargo run
```

**Wallet Connect Button:**
- Disabled/Grayed out
- Clicking shows error: "Backend service is not running. Please start the backend before connecting your wallet."

**What user should do:**
```bash
# In separate terminal
cd backend
cargo run
```

### Chia Node Not Configured

**User sees:**
```
⚠ Chia Node Connection: Not configured (optional)
  💡 You can still create contracts without a Chia node connection
```

**Can user still proceed?**
- Yes - wallet can connect and contracts can be created
- No blockchain deployment possible until node is configured
- Use the "Chia Connection" card below to configure it

**What user should do:**
1. Have a Chia node running or get RPC URL
2. For mainnet HTTPS setup with SSL certificates, see **[SSL_SETUP_GUIDE.md](SSL_SETUP_GUIDE.md)** for detailed frontend configuration instructions
3. Click "Edit" on Chia Connection card
4. Enter RPC URL
5. Click "Test Connection"

## Component Architecture

### New Components Added

#### `useAppConfiguration` Hook
```typescript
import { useAppConfiguration } from "../hooks/useAppConfiguration";

const config = useAppConfiguration();
// Returns:
// {
//   backendReady: boolean
//   backendError?: string
//   chiaNodeConnected: boolean
//   chiaNodeError?: string
//   walletConnectable: boolean
// }
```

**Features:**
- Auto-validates every 30 seconds
- Returns cached results between checks
- Provides specific error messages

#### `ConfigurationStatus` Component
```tsx
<ConfigurationStatus />
```

**Features:**
- Displays status of backend and Chia node
- Shows helpful hints when services aren't ready
- Automatically hides when everything is ready
- Located at top of Home page

#### Updated `WalletConnector` Component
- Now uses `useAppConfiguration` hook
- Prevents wallet connection if backend not ready
- Shows helpful error message with instructions

## Best Practices for Users

### ✅ Do This

1. **Start services in order:**
   ```bash
   # Terminal 1: Backend
   cd backend && cargo run
   
   # Terminal 2: Frontend (after backend is ready)
   cd frontend && npm run dev
   ```

2. **Wait for green status indicators** before attempting wallet connection

3. **Check backend logs** if wallet connection fails:
   ```bash
   # Look for: "Server listening on 127.0.0.1:8080"
   ```

4. **Use Configuration Status panel** to diagnose issues

### ❌ Don't Do This

1. ❌ Try to connect wallet while backend is starting
2. ❌ Assume Chia node is required for all operations
3. ❌ Ignore error messages in Configuration Status
4. ❌ Start frontend before backend is fully running

## Development Notes

### Adding Configuration Requirements

To add a new configuration check:

1. **Add to `useAppConfiguration` hook:**
   ```typescript
   // Check 3: New service
   try {
     const response = await api.get("/new-endpoint");
     if (response.status === 200) {
       newServiceReady = true;
     }
   } catch (err) {
     newServiceError = "Service not available";
   }
   ```

2. **Update `AppConfiguration` interface:**
   ```typescript
   export interface AppConfiguration {
     backendReady: boolean;
     newServiceReady: boolean;  // Add here
     // ...
   }
   ```

3. **Add to `ConfigurationStatus` component:**
   ```tsx
   {config.backendReady && (
     <div>
       {/* New service status UI */}
     </div>
   )}
   ```

### Testing Configuration Checks

```bash
# Test without backend running
# Should show red "Backend Service: Not responding"

# Start backend
cd backend && cargo run

# Should immediately show green "Backend Service: Connected"

# Test wallet connection attempts
# Should fail gracefully with helpful error message
```

## Troubleshooting

### Wallet Won't Connect

**Check:**
1. Is backend running? (`curl http://localhost:8080/health`)
2. Look at Configuration Status panel
3. Check browser console for errors

**Solution:**
```bash
# In new terminal
cd backend
cargo run

# Wait for: "Server listening on 127.0.0.1:8080"
# Then try wallet connection again
```

### Configuration Status Not Updating

**Check:**
1. Is frontend connected to correct backend URL?
2. Browser console errors?
3. Network tab showing failed requests?

**Solution:**
1. Hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
2. Check backend is on `localhost:8080`
3. Restart both frontend and backend

### Wallet Connected but Operations Failing

**Check:**
1. Is Chia node connected? (See Configuration Status)
2. Do you need blockchain operations?
3. Check wallet app - is it still connected?

**Solution:**
1. For contract creation only: Chia node not needed
2. For blockchain operations: Configure Chia node RPC
3. Re-connect wallet if needed

## Future Enhancements

Potential configuration checks to add:
- SSL certificate validation for production
- Database schema version check
- Blockchain network selection (testnet vs mainnet)
- Minimum balance requirements
- API rate limit status
- Puzzle compilation service health
