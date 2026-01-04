# DTREX Authentication & Identity Verification

## Overview

DTREX implements a multi-tiered identity verification system to ensure every participant is a real person with a traceable identity. This deters fraudulent accounts, Sybil attacks, and builds a foundation of trust within the trading community.

## Verification Philosophy

> "To establish a foundation of trust within the community, every user must undergo a rigorous identity verification process before they are permitted to propose or accept a trade."

While anyone can create a basic account and browse, **full participation is gated behind identity verification**.

---

## Verification Tiers

### Tier 0: Unverified
**Capabilities:** Browse only
- ✅ View trade proposals
- ✅ Search marketplace
- ❌ Cannot create proposals
- ❌ Cannot make offers
- ❌ Cannot participate in trades

### Tier 1: Email Verified
**Capabilities:** Limited participation
- ✅ All Tier 0 capabilities
- ✅ Save favorites
- ✅ Follow traders
- ❌ Cannot create proposals
- ❌ Cannot participate in trades

### Tier 2: Phone Verified
**Capabilities:** Micro-trades
- ✅ All Tier 1 capabilities
- ✅ Create proposals up to $25 value
- ✅ Make offers on micro-trades
- ❌ Cannot access higher-value trades

### Tier 3: Fully Verified (ID)
**Capabilities:** Full access
- ✅ All previous capabilities
- ✅ Create unlimited proposals
- ✅ Participate in any trade
- ✅ "Verified" badge on profile
- ✅ Access to premium features

---

## Verification Process

### Step 1: Email Verification

**Purpose:** Confirm account ownership and enable communication

```
┌─────────────────────────────────────────────────────────┐
│                  EMAIL VERIFICATION                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📧 We've sent a verification link to:                  │
│     user@example.com                                    │
│                                                         │
│  Click the link in your email to verify.                │
│                                                         │
│  [Resend Email]    [Change Email Address]               │
│                                                         │
│  ⏱️ Link expires in 24 hours                            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Technical Flow:**
1. User registers with email
2. Backend generates 6-character code + unique token
3. Email sent with verification link
4. User clicks link or enters code
5. Email marked as verified

**API:**
```typescript
// Request verification email
POST /api/rpc { method: "send_email_verification" }

// Verify email
POST /api/rpc { method: "verify_email", params: { code: "ABC123" } }
```

### Step 2: Phone Verification

**Purpose:** Add additional identity layer, enable 2FA

```
┌─────────────────────────────────────────────────────────┐
│                  PHONE VERIFICATION                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📱 Enter your phone number:                            │
│  ┌───────────────────────────────────────────────────┐ │
│  │  +1  │  (555) 123-4567                           │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  [Send Verification Code]                               │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Enter the 6-digit code sent to your phone:             │
│  ┌─────────────────────────────────────────┐           │
│  │  [_] [_] [_] [_] [_] [_]                │           │
│  └─────────────────────────────────────────┘           │
│                                                         │
│  [Verify Phone]                                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Technical Flow:**
1. User enters phone number
2. Backend sends SMS with 6-digit code (via Twilio/similar)
3. User enters code
4. Phone marked as verified

**API:**
```typescript
// Send SMS code
POST /api/rpc { method: "send_phone_verification", params: { phone: "+15551234567" } }

// Verify phone
POST /api/rpc { method: "verify_phone", params: { code: "123456" } }
```

### Step 3: ID Verification

**Purpose:** Confirm real-world identity, prevent fraud

```
┌─────────────────────────────────────────────────────────┐
│                  ID VERIFICATION                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  🪪 Upload a valid government-issued ID:                │
│                                                         │
│  Accepted documents:                                    │
│  • Driver's License                                     │
│  • Passport                                             │
│  • State ID Card                                        │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │                                                 │   │
│  │         📷 Drop image here or click            │   │
│  │            to upload front of ID               │   │
│  │                                                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │                                                 │   │
│  │         📷 Drop image here or click            │   │
│  │            to upload back of ID                │   │
│  │                                                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [Submit for Verification]                              │
│                                                         │
│  ⏱️ Verification typically takes 1-2 business days     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Technical Flow:**
1. User uploads front and back of ID
2. Images stored securely (encrypted at rest)
3. Automated OCR extracts information
4. Manual review if needed
5. ID marked as verified or rejected

**API:**
```typescript
// Upload ID images
POST /files/verification
Content-Type: multipart/form-data
{
  id_front: <image>,
  id_back: <image>
}

// Check verification status
POST /api/rpc { method: "verification_status" }
```

---

## Authentication Flow

### Registration

```typescript
POST /api/rpc
{
  "method": "register",
  "params": {
    "username": "trader_alice",
    "password": "SecureP@ss123!",
    "email": "alice@example.com"
  }
}

// Response
{
  "result": {
    "user": {
      "id": 12345,
      "username": "trader_alice",
      "email": "alice@example.com",
      "verification_status": "unverified"
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### Login

```typescript
POST /api/rpc
{
  "method": "login",
  "params": {
    "username": "trader_alice",
    "password": "SecureP@ss123!"
  }
}

// Response
{
  "result": {
    "user": {
      "id": 12345,
      "username": "trader_alice",
      "verification_status": "verified",
      "reputation_score": 4.8,
      "total_trades": 15
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### Token Usage

All authenticated requests include the token in the Authorization header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

---

## Security Implementation

### Password Security
- **Algorithm**: Argon2id
- **Salt**: Random 16-byte per user
- **Parameters**: Memory 64MB, Iterations 3, Parallelism 4

### Token Security
- **Algorithm**: HMAC-SHA256
- **Format**: `version.user_id.timestamp.signature`
- **Expiration**: 7 days (configurable)
- **Refresh**: New token on each login

### Data Protection
- **Email/Phone**: Stored hashed for verification lookup
- **ID Images**: Encrypted at rest (AES-256)
- **Retention**: ID images deleted after 30 days post-verification
- **Access**: Verification data never exposed via API

---

## Database Schema

```sql
-- Users table with verification fields
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(128) NOT NULL UNIQUE,
    
    -- Authentication
    pwd VARCHAR(256) NOT NULL,  -- Argon2 hash
    pwd_salt UUID NOT NULL,
    token_salt UUID NOT NULL,
    
    -- Email verification
    email VARCHAR(256),
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_code VARCHAR(6),
    email_verification_expires TIMESTAMPTZ,
    
    -- Phone verification
    phone VARCHAR(20),
    phone_verified BOOLEAN DEFAULT FALSE,
    phone_verification_code VARCHAR(6),
    phone_verification_expires TIMESTAMPTZ,
    
    -- ID verification
    id_verified BOOLEAN DEFAULT FALSE,
    id_verification_status VARCHAR(20) DEFAULT 'none',  -- none, pending, verified, rejected
    id_submitted_at TIMESTAMPTZ,
    id_verified_at TIMESTAMPTZ,
    
    -- Overall status
    verification_status VARCHAR(20) DEFAULT 'unverified',  -- unverified, email, phone, verified
    
    -- Reputation
    reputation_score DECIMAL(3,2) DEFAULT 0.00,
    total_trades INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Verification documents (temporary storage)
CREATE TABLE verification_documents (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    document_type VARCHAR(20) NOT NULL,  -- drivers_license, passport, state_id
    front_image_path TEXT NOT NULL,  -- Encrypted path
    back_image_path TEXT,
    
    status VARCHAR(20) DEFAULT 'pending',  -- pending, approved, rejected
    rejection_reason TEXT,
    reviewed_by BIGINT,
    reviewed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Verification audit log
CREATE TABLE verification_audit (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    action VARCHAR(50) NOT NULL,  -- email_sent, email_verified, phone_sent, phone_verified, id_submitted, id_verified
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## Verification Status Display

### Profile Badge

```
┌─────────────────────────────────────┐
│  @trader_alice                      │
│  ─────────────────────────────────  │
│  ✓ Verified Trader                  │
│  ⭐ 4.8 (15 trades)                 │
│                                     │
│  Member since Dec 2025              │
└─────────────────────────────────────┘
```

### Verification Progress

```
┌─────────────────────────────────────────────────────────┐
│              VERIFICATION STATUS                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ✓ Email Verified                                       │
│    alice@example.com                                    │
│                                                         │
│  ✓ Phone Verified                                       │
│    +1 (555) ***-4567                                    │
│                                                         │
│  ⏳ ID Verification Pending                             │
│    Submitted 2 hours ago                                │
│    Typically takes 1-2 business days                    │
│                                                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 67%            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Best Practices

### For Users
1. **Use a strong, unique password** (12+ characters, mixed case, numbers, symbols)
2. **Verify early** - Complete all verification steps before you want to trade
3. **Keep contact info current** - Update email/phone if they change
4. **Protect your token** - Don't share or expose your auth token

### For Developers
1. **Never log tokens or passwords** in plain text
2. **Rate limit** verification attempts (3 per hour)
3. **Expire codes quickly** (10 minutes for phone, 24 hours for email)
4. **Audit all verification events**
5. **Delete ID images** after verification (data minimization)

---

## Error Codes

| Code | Message | Resolution |
|------|---------|------------|
| 4001 | `UNAUTHORIZED` | Token invalid or expired - re-login |
| 4002 | `EMAIL_NOT_VERIFIED` | Complete email verification |
| 4003 | `PHONE_NOT_VERIFIED` | Complete phone verification |
| 4004 | `ID_NOT_VERIFIED` | Submit ID for verification |
| 4005 | `VERIFICATION_CODE_EXPIRED` | Request new code |
| 4006 | `VERIFICATION_CODE_INVALID` | Check code and retry |
| 4007 | `TOO_MANY_ATTEMPTS` | Wait and try again |
| 4010 | `ID_REJECTED` | Contact support |
