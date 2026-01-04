# Configuration Checklist & Quick Start

## ✅ Pre-Flight Checklist

Before opening the application, verify:

- [ ] PostgreSQL 16 is installed
  ```bash
  postgres --version
  # Expected: postgres (PostgreSQL) 16.x ...
  ```

- [ ] PostgreSQL is running
  ```bash
  # Linux
  sudo systemctl status postgresql
  
  # macOS
  brew services list | grep postgres
  ```

- [ ] Database is initialized
  ```bash
  psql -U chia_user -d chia_contracts -c "SELECT 1;"
  # Expected: (1 row)
  ```

- [ ] Rust & Cargo are installed
  ```bash
  rustc --version && cargo --version
  # Expected: rustc 1.70+, cargo 1.70+
  ```

- [ ] Node.js & npm are installeu
  ```bash
  node --version && npm --version
  # Expected: node 18+, npm 8+
  ```

## 🚀 Quick Start (Correct Order)

### Step 1: Terminal 1 - Start Backend
```bash
cd backend
cargo run
```

✅ **Wait for this message:**
```
2025-12-28T19:54:08.093529Z  INFO chia_contract_backend: Server listening on 127.0.0.1:8080
```

### Step 2: Terminal 2 - Start Frontend
```bash
cd frontend
npm run dev
```

✅ **Wait for this message:**
```
➜  Local:   http://127.0.0.1:5173/
```

### Step 3: Open Browser
```
http://127.0.0.1:5173
```

## 📊 What You Should See

### Configuration Status Panel (Home page)

**All Services Ready:**
```
✓ Backend Service: Connected
✓ Chia Node Connection: Connected
```
→ Status panel is HIDDEN (all good!)

**Backend Missing:**
```
✗ Backend Service: Not responding
  💡 Make sure to run: cd backend && cargo run

⚠ Chia Node Connection: Not configured (optional)
  💡 You can still create contracts without...
```
→ Fix: Run backend, panel auto-updates

**Chia Node Missing (but optional):**
```
✓ Backend Service: Connected

⚠ Chia Node Connection: Not configured (optional)
  💡 You can still create contracts without...
```
→ OK to proceed - Chia node is optional for contract creation

## 🎯 Use Case Checklist

### I want to create contracts only
- [ ] Start PostgreSQL
- [ ] Start backend (`cargo run`)
- [ ] Start frontend (`npm run dev`)
- [ ] Login/Register
- [ ] Configuration Status shows:
  - ✓ Backend Service
  - ⚠ Chia Node (optional - can proceed without)
- [ ] Click "Create Contract"

### I want to deploy contracts to blockchain
- [ ] All above steps completed
- [ ] Chia node is running OR
- [ ] Have Chia RPC URL (e.g., `https://localhost:8555`)
- [ ] Click "Edit" on Chia Connection card
- [ ] Enter RPC URL and test
- [ ] Configuration Status shows:
  - ✓ Backend Service
  - ✓ Chia Node Connection
- [ ] Create and deploy contracts

### I want to connect my wallet only
- [ ] Start PostgreSQL
- [ ] Start backend (`cargo run`)
- [ ] Start frontend (`npm run dev`)
- [ ] Login/Register
- [ ] Configuration Status shows:
  - ✓ Backend Service
- [ ] Click "Connect Wallet"
- [ ] Scan QR code with Chia Signer app
- [ ] Click "Request Public Key"

## 🐛 Troubleshooting Checklist

### Wallet won't connect
- [ ] Backend is running? Check Terminal 2
  - If not: `cd backend && cargo run`
- [ ] Backend shows "Server listening"?
  - If not: Wait 10 seconds or restart
- [ ] Configuration Status shows ✓ Backend?
  - If not: Refresh page (`Ctrl+R`)
- [ ] Try again

### Backend fails to start
- [ ] PostgreSQL running? Run:
  ```bash
  sudo systemctl start postgresql
  ```
- [ ] DATABASE_URL correct in `.env`?
  ```bash
  cat backend/.env | grep DATABASE_URL
  ```
- [ ] Database exists? Run:
  ```bash
  psql -U chia_user -d chia_contracts -c "SELECT 1;"
  ```
- [ ] Port 8080 in use? Check:
  ```bash
  lsof -i :8080
  # If in use: kill -9 <PID>
  ```

### Frontend won't start
- [ ] Node.js 18+? Check:
  ```bash
  node --version
  ```
- [ ] npm dependencies installed?
  ```bash
  npm install
  ```
- [ ] Port 5173 in use? Check:
  ```bash
  lsof -i :5173
  ```
- [ ] .env correct?
  ```bash
  cat frontend/.env
  ```

### Configuration Status not updating
- [ ] Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- [ ] Backend still running? Check log
- [ ] Network error in console? (F12)
- [ ] Try: Stop and restart frontend

### Cannot create contracts
- [ ] Logged in? See username in navbar
- [ ] Configuration Status all green?
- [ ] Browser console errors? (F12)
- [ ] Refresh page
- [ ] Clear browser cache: `Ctrl+Shift+Delete`

## 📋 System Health Check

Run this to verify everything:

```bash
#!/bin/bash

echo "🔍 Checking Chia Contract App Setup..."
echo ""

# Check PostgreSQL
echo "1. PostgreSQL:"
if psql --version &> /dev/null; then
    echo "   ✓ PostgreSQL installed: $(psql --version)"
else
    echo "   ✗ PostgreSQL not found"
fi

# Check database
echo ""
echo "2. Database:"
if psql -U chia_user -d chia_contracts -c "SELECT 1;" &> /dev/null; then
    echo "   ✓ Database connected"
else
    echo "   ✗ Database connection failed"
fi

# Check Rust
echo ""
echo "3. Rust/Cargo:"
if rustc --version &> /dev/null; then
    echo "   ✓ $(rustc --version)"
else
    echo "   ✗ Rust not found"
fi

# Check Node.js
echo ""
echo "4. Node.js:"
if node --version &> /dev/null; then
    echo "   ✓ $(node --version)"
else
    echo "   ✗ Node.js not found"
fi

# Check npm
echo ""
echo "5. npm:"
if npm --version &> /dev/null; then
    echo "   ✓ npm $(npm --version)"
else
    echo "   ✗ npm not found"
fi

# Check ports
echo ""
echo "6. Port Availability:"
if ! lsof -i :8080 &> /dev/null; then
    echo "   ✓ Port 8080 available (backend)"
else
    echo "   ✗ Port 8080 in use"
fi

if ! lsof -i :5173 &> /dev/null; then
    echo "   ✓ Port 5173 available (frontend)"
else
    echo "   ✗ Port 5173 in use"
fi

echo ""
echo "✅ Check complete!"
```

Save as `check-setup.sh` and run:
```bash
chmod +x check-setup.sh
./check-setup.sh
```

## 🔧 Common Commands

```bash
# Start everything (in separate terminals)
cd backend && cargo run           # Terminal 1
cd frontend && npm run dev        # Terminal 2

# Stop services
Ctrl+C (in each terminal)

# Reset database
sudo -u postgres psql -f backend/sql/00-recreate-db.sql
psql -U chia_user -d chia_contracts -f backend/sql/01-create-schema.sql

# Clear browser cache
Ctrl+Shift+Delete

# Hard refresh
Ctrl+Shift+R (Windows/Linux)
Cmd+Shift+R (Mac)

# Check backend health
curl http://localhost:8080/health

# Check Chia node status
curl http://localhost:8080/chia/node/status

# View backend logs
# In the backend terminal - all logs displayed

# View frontend logs
# In the frontend terminal - all logs displayed
```

## 📞 When to Check What

| Symptom | Check | Solution |
|---------|-------|----------|
| "Backend not responding" in Status | Backend logs | Start backend |
| Wallet won't connect | Browser console (F12) | Refresh, check backend |
| Can't create contract | Backend logs | Check RPC endpoint |
| Slow response | System resources | Restart services |
| Configuration Status not updating | Browser console | Hard refresh |
| Database connection error | PostgreSQL status | Start PostgreSQL |

## ✨ Success Indicators

You'll know everything is working when:

1. ✅ Backend starts with: "Server listening on 127.0.0.1:8080"
2. ✅ Frontend starts with: "Local: http://127.0.0.1:5173/"
3. ✅ Configuration Status is hidden (all good!)
4. ✅ Can login/register
5. ✅ Can create a contract
6. ✅ Wallet connects on command
7. ✅ No errors in browser console (F12)
8. ✅ No errors in backend logs

## 🎓 Next Steps

After setup is complete:

1. Read [WORKFLOW.md](WORKFLOW.md) for detailed workflow
2. Check [WORKFLOW_DIAGRAMS.md](WORKFLOW_DIAGRAMS.md) for visual guides
3. Review [README.md](README.md) for API documentation
4. Create your first contract
5. Test wallet connection
6. Deploy a contract to blockchain (optional)
