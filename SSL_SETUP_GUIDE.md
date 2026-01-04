# SSL/HTTPS Setup Guide for Chia Node Connection

## Overview

This guide explains how to configure SSL certificates in the **Settings page** of the Chia Contract Application to enable secure HTTPS connections to your Chia node on mainnet.

## Why SSL Certificates?

- **Testnet**: Uses HTTP without SSL (simpler, less secure)
- **Mainnet**: Requires HTTPS with mutual TLS (mTLS) for security
  - Your app needs to prove its identity to the Chia node
  - The Chia node proves its identity back to your app

## Prerequisites

Before you begin:

1. ✅ Application is running (backend + frontend)
2. ✅ You have access to your Chia node configuration directory
3. ✅ Chia node is running and accessible

Default Chia config location: `~/.chia/mainnet/config/ssl/`

## Step-by-Step Setup Guide

### Step 1: Navigate to Settings

1. Open the application at http://127.0.0.1:5173
2. Login or register if needed
3. Click **"Settings"** in the navigation menu

### Step 2: Configure Chia RPC URL

In the "Chia Connection" section:

1. **RPC URL**: Enter your Chia node HTTPS URL
   - Full Node: `https://localhost:8555`
   - Wallet: `https://localhost:9256`
   
2. **Connection Mode**: Select mode
   - `node` for Full Node operations
   - `wallet` for Wallet-only operations

3. Click **"Save Configuration"**

### Step 3: Prepare SSL Certificates

You have **two options** for client authentication:

#### Required: PEM Certificate, Key, and CA Files

You need to upload the following three files for each mode:

- **Certificate (.crt or .pem)**
- **Key (.key or .pem)**
- **CA Certificate (chia_ca.crt)**

**Locations:**

- Full Node:
   - Certificate: `~/.chia/mainnet/config/ssl/full_node/private_full_node.crt`
   - Key:         `~/.chia/mainnet/config/ssl/full_node/private_full_node.key`
- Wallet:
   - Certificate: `~/.chia/mainnet/config/ssl/wallet/private_wallet.crt`
   - Key:         `~/.chia/mainnet/config/ssl/wallet/private_wallet.key`
- CA (both):
   - CA Cert:     `~/.chia/mainnet/config/ssl/ca/chia_ca.crt`

### Step 4: Upload SSL Certificates in Settings

Scroll down to the **"SSL Certificates (Mainnet)"** section:

1. Click **"Choose File"** for each of:
   - Certificate (public, `.crt` or `.pem`)
   - Key (private, `.key` or `.pem`)
   - CA Certificate (`chia_ca.crt`)
2. Select the correct files for your chosen mode (wallet or full node)
3. Click **"Upload Certificates"**
4. Wait for success message

### Step 5: (Optional) Set CA Certificate Path Manually

If you prefer, you can set the CA certificate path manually in the UI.

### Step 6: Verify Configuration

Check the **"Current Status"** section in Settings:

```
Certificate: ✓ Present
Key: ✓ Present
CA Certificate: ✓ Present
```

### Step 7: Test Connection

1. Go back to **Home** page
2. Look at the **Configuration Status** panel:
   ```
   ✓ Backend Service: Connected
   ✓ Chia Node Connection: Connected
   ```

If you see a green checkmark for "Chia Node Connection", SSL is working! 🎉

## Troubleshooting

### Issue: "Certificate or Key: ✗ Missing"

**Possible causes:**
- File path is incorrect
- File doesn't exist at specified location
- Upload failed

**Solutions:**
1. Verify file exists:
   ```bash
   ls -la ~/.chia/mainnet/config/ssl/full_node/private_full_node.crt ~/.chia/mainnet/config/ssl/full_node/private_full_node.key
   ```
2. Check file permissions:
   ```bash
   chmod 600 ~/.chia/mainnet/config/ssl/full_node/private_full_node.key ~/.chia/mainnet/config/ssl/full_node/private_full_node.crt
   ```
3. Try uploading again or use manual path method

### Issue: "Chia Node Connection: Not connected"

**Possible causes:**
- Wrong RPC URL
- SSL certificates not loaded
- Chia node not running
- Incorrect certificate for the service

**Solutions:**

1. **Verify Chia node is running:**
   ```bash
   # Check if Chia is running
   ps aux | grep chia
   
   # Check Chia status
   chia show -s
   ```

2. **Test RPC URL manually:**
   ```bash
   # This should fail with certificate error if node requires SSL:
   curl https://localhost:8555/get_blockchain_state
   
   # This should succeed if node is running:
   telnet localhost 8555
   ```

3. **Verify certificate matches RPC mode:**
   - Full Node RPC → Use `full_node` certificates
   - Wallet RPC → Use `wallet` certificates

4. **Check backend logs:**
   ```bash
   # Look for SSL/TLS errors in terminal where cargo run is active
   ```

### Issue: Upload succeeds but connection still fails

**Possible causes:**
- Wrong certificate type (full_node vs wallet)
- CA certificate needed but not provided

**Solutions:**

1. **Match certificates to RPC mode:**
   ```
   If RPC URL is https://localhost:8555 (Full Node):
   → Use: ~/.chia/mainnet/config/ssl/full_node/private_full_node.crt and private_full_node.key
   
   If RPC URL is https://localhost:9256 (Wallet):
   → Use: ~/.chia/mainnet/config/ssl/wallet/private_wallet.crt and private_wallet.key
   ```

2. **Try uploading CA certificate:**
   - File: `~/.chia/mainnet/config/ssl/ca/chia_ca.crt`
   - This helps if Chia uses self-signed certificates

### Issue: Only have .crt/.key, no CA

**Solution:**
You must also upload the CA file (`chia_ca.crt`) from your Chia install's `ssl/ca/` directory. This is required for secure connections.

## Certificate File Locations Reference

### Full Node Certificates
```
Certificate: ~/.chia/mainnet/config/ssl/full_node/private_full_node.crt
Key:         ~/.chia/mainnet/config/ssl/full_node/private_full_node.key
```

### Wallet Certificates
```
Certificate: ~/.chia/mainnet/config/ssl/wallet/private_wallet.crt
Key:         ~/.chia/mainnet/config/ssl/wallet/private_wallet.key
```

### CA Certificate
```
CA Cert:     ~/.chia/mainnet/config/ssl/ca/chia_ca.crt
```

## Important Security Notes

⚠️ **Certificate Security:**
- Never share your private keys or .p12 files
- Never commit certificates to version control
- Keep file permissions restricted: `chmod 600 *.key *.p12`
- Rotate certificates periodically

⚠️ **Application Security:**
- Uploaded certificates are stored in `backend/ssl/` directory
- Backend manages certificate paths in memory
- Restart backend to clear certificate configuration



## Testing Your Setup

### Quick Test Commands

```bash
# 1. Check SSL status
curl http://localhost:3000/ssl/status

# Expected response:
# {
#   "has_cert": true,
#   "has_key": true,
#   "has_ca": true,
#   "ca_path": "/home/user/.chia/mainnet/config/ssl/ca/chia_ca.crt"
# }

# 2. Test Chia node connection
curl http://localhost:3000/chia/node/status

# Expected response:
# {
#   "connected": true,
#   "network": "mainnet",
#   "peak_height": 6234567,
#   "sync_mode": false,
#   "rpc_url": "https://localhost:8555"
# }
```

### Successful Setup Checklist

  
- ✅ Configuration Status shows Chia Node Connection: Connected
- ✅ curl test to `/chia/node/status` returns `"connected": true`
- ✅ No SSL/TLS errors in backend logs
- ✅ Can see blockchain height and network name

## FAQ


**Q: Do I need both certificate files and PKCS#12?**

A: No. You only need the certificate (.crt), key (.key), and CA (.crt) files. PKCS#12 (.p12) is not supported or required.

**Q: What's the difference between uploading and setting paths?**

A: 
- **Upload**: Copies file to backend `ssl/` directory
- **Manual Path**: Backend reads from your specified location
- Both work the same way; choose based on your preference

**Q: Can I use the same certificates for testnet?**

A: Testnet typically uses HTTP without SSL, so certificates aren't needed. If your testnet requires HTTPS, use testnet-specific certificates from `~/.chia/testnet10/config/ssl/`

**Q: Will this work with remote Chia nodes?**

A: Yes, but you'll need:
1. Network access to the remote node
2. That node's client certificates (not your local ones)
3. Updated RPC URL to point to remote address

**Q: Do I need to restart anything after uploading certificates?**

A: No, the backend automatically uses the new certificates for the next RPC call. Just click "Save Configuration" and it's active.

**Q: What if I'm getting "connection refused" errors?**

A: This usually means:
1. Chia node is not running, OR
2. RPC URL is incorrect (wrong port or host), OR
3. Firewall is blocking the connection

Double-check your Chia node is running with `chia show -s`

## Summary

✅ **Recommended workflow:**
1. Navigate to Settings page
2. Set RPC URL to `https://localhost:8555`
3. Create .p12 from your Chia certificates
4. Upload .p12 file (no password)
5. Optionally upload CA certificate
6. Verify green checkmark in Configuration Status
7. Start using blockchain features!

For more help, check:
- [README.md](README.md) - Complete application setup
- [WORKFLOW.md](WORKFLOW.md) - Application workflow guide
- Backend logs - Run `cargo run` and watch for SSL/TLS messages
