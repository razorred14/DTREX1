# DTREX Trade Workflow

## Overview

The Decentralized Trade Exchange (DTREX) implements a five-phase trading protocol that enables secure peer-to-peer bartering of any asset—physical or digital—using the Chia blockchain for trust and accountability.

## Core Principles

### Asset-First Trading
- **Primary focus**: The actual items being exchanged
- **USD as lens**: Fiat values are only for calibration, never transacted
- **XCH as medium**: Chia cryptocurrency bridges value gaps

### Trust Through Verification
- All participants must complete identity verification
- Every trade is anchored to the blockchain
- Reputation follows you across all trades

## The Five-Phase Trade Process

```
┌─────────────────────────────────────────────────────────────────┐
│                     DTREX TRADE LIFECYCLE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Phase 1          Phase 2          Phase 3                      │
│  ┌─────────┐     ┌─────────┐     ┌─────────┐                   │
│  │PROPOSAL │────▶│ MATCH   │────▶│ COMMIT  │                   │
│  │         │     │         │     │         │                   │
│  │ Alice   │     │  Bob    │     │  Both   │                   │
│  │ lists   │     │ offers  │     │  pay    │                   │
│  │ item    │     │ trade   │     │  fee    │                   │
│  └─────────┘     └─────────┘     └─────────┘                   │
│       │               │               │                         │
│       │               │               ▼                         │
│       │               │         Phase 4                         │
│       │               │         ┌─────────┐                     │
│       │               │         │ ESCROW  │                     │
│       │               │         │         │                     │
│       │               │         │ 30-day  │                     │
│       │               │         │ swap    │                     │
│       │               │         └─────────┘                     │
│       │               │               │                         │
│       │               │               ▼                         │
│       │               │         Phase 5                         │
│       │               │         ┌─────────┐                     │
│       │               │         │ REVIEW  │                     │
│       │               │         │         │                     │
│       │               │         │ Rate &  │                     │
│       │               │         │ Settle  │                     │
│       │               │         └─────────┘                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Trade Proposal

**Status**: `proposal`

### What Happens
A verified user creates a trade proposal by listing an item they want to trade.

### Required Information
| Field | Description | Example |
|-------|-------------|---------|
| Item Description | Detailed description of the item | "Near-Mint Pikachu (Base Set, 1st Edition)" |
| Item Photos | Multiple angles, condition shots | 3-5 photos |
| Fiat Reference | USD value for XCH calculation | $50.00 |
| Item Condition | Standardized condition rating | "Near-Mint" |
| Wishlist | What you'll accept in trade | See below |

### Wishlist Options
The proposer specifies acceptable trade formats:

```json
{
  "wishlist": [
    {
      "type": "item",
      "description": "Near-Mint Charizard (Base Set)",
      "estimated_value_usd": 45.00
    },
    {
      "type": "xch",
      "amount": 1.25,
      "note": "Direct XCH payment"
    },
    {
      "type": "mixed",
      "item_description": "Any Base Set Holo",
      "item_min_value_usd": 20.00,
      "xch_amount": 0.5
    }
  ]
}
```

### User Interface Flow
1. Click "Create Trade Proposal"
2. Upload item photos
3. Enter item description and condition
4. Set fiat reference value (auto-converts to XCH)
5. Build wishlist of acceptable trades
6. Submit proposal

### API Endpoint
```typescript
POST /api/rpc
{
  "method": "trade_create",
  "params": {
    "item_description": "Near-Mint Pikachu (Base Set, 1st Edition)",
    "item_condition": "near_mint",
    "item_value_usd": 50.00,
    "photos": ["base64...", "base64..."],
    "wishlist": [...]
  }
}
```

---

## Phase 2: Value-Matched Acceptance

**Status**: `matched`

### What Happens
Another verified user reviews the proposal and makes an offer that matches the wishlist criteria.

### The Matching Process
1. **Browse Proposals**: View open trade proposals
2. **Evaluate Value**: Compare offered item to wishlist
3. **Make Offer**: Submit your matching offer
4. **Await Approval**: Proposer reviews and accepts/rejects

### Value Parity Display
The system shows both parties a clear value comparison:

```
┌──────────────────────────────────────────────────────┐
│                  VALUE COMPARISON                     │
├──────────────────────────────────────────────────────┤
│  Alice Offers              Bob Offers                │
│  ─────────────             ─────────────             │
│  NM Pikachu                NM Charizard              │
│  $50.00 (~1.25 XCH)        $55.00 (~1.38 XCH)       │
│                                                      │
│  ✓ Value Match: Bob offering +10% surplus value     │
│                                                      │
│  [ACCEPT TRADE]  [COUNTER OFFER]  [DECLINE]         │
└──────────────────────────────────────────────────────┘
```

### Offer Types
| Type | Description | Example |
|------|-------------|---------|
| Item-for-Item | Physical item swap | Charizard for Pikachu |
| Item-for-XCH | Item traded for cryptocurrency | 1.25 XCH for Pikachu |
| XCH-for-Item | Cryptocurrency for item | Pikachu for 1.25 XCH |
| Mixed | Item + XCH combination | Bulbasaur + 0.5 XCH |

### API Endpoint
```typescript
POST /api/rpc
{
  "method": "trade_accept",
  "params": {
    "trade_id": 12345,
    "offer_type": "item",
    "item_description": "Near-Mint Charizard (Base Set)",
    "item_condition": "near_mint",
    "item_value_usd": 55.00,
    "photos": ["base64...", "base64..."]
  }
}
```

---

## Phase 3: Blockchain Commitment

**Status**: `committed`

### What Happens
Both parties signal serious intent by paying a service fee in XCH. This creates an immutable record of the trade agreement.

### The Commitment
| Party | Action | Amount |
|-------|--------|--------|
| Proposer (Alice) | Pay service fee | ~$1 in XCH |
| Acceptor (Bob) | Pay service fee | ~$1 in XCH |
| **Total** | Platform receives | ~$2 in XCH |

### Transaction Details
Each commitment transaction includes:
- **Trade ID**: Unique identifier
- **Asset Summary**: What's being swapped
- **Participant Addresses**: Both XCH wallets
- **Timestamp**: Commitment time

### The Memo Format
```
DTREX:COMMIT:12345:PIKACHU_FOR_CHARIZARD:xch1alice...xch1bob...
```

### Why This Matters
- **Sunk Cost**: Deters frivolous trades
- **Blockchain Record**: Immutable proof of agreement
- **Platform Sustainability**: Funds development
- **Spam Prevention**: Discourages bad actors

### API Endpoint
```typescript
POST /api/rpc
{
  "method": "trade_commit",
  "params": {
    "trade_id": 12345
  }
}

// Returns transaction details for wallet signing
{
  "result": {
    "tx_to_sign": {
      "amount": 25000000,  // ~$1 in mojos
      "to_address": "xch1dtrex...",
      "memo": "DTREX:COMMIT:12345:..."
    }
  }
}
```

---

## Phase 4: 30-Day Escrow & Swap

**Status**: `escrow`

### What Happens
The actual exchange of items or XCH occurs during a 30-day window that allows for shipping, receipt, and verification.

### Timeline
```
Day 0           Day 7          Day 21         Day 30
│               │              │              │
▼               ▼              ▼              ▼
┌───────────────┬──────────────┬──────────────┐
│   SHIPPING    │   TRANSIT    │  VERIFICATION│
│               │              │              │
│ Mail items    │ Items in     │ Inspect &    │
│ or lock XCH   │ transit      │ confirm      │
└───────────────┴──────────────┴──────────────┘
```

### For Item-for-Item Trades
1. Both parties ship their items
2. Tracking numbers uploaded to platform
3. Receipt confirmed when items arrive
4. Inspection period for verification

### For XCH-Involved Trades
1. XCH amount locked in smart coin escrow
2. Item shipped by other party
3. Upon receipt confirmation, escrow releases
4. XCH transferred to recipient's wallet

### Smart Escrow Contract
```lisp
; DTREX Escrow Smart Coin
(mod (
  TRADE_ID
  PROPOSER_PUBKEY
  ACCEPTOR_PUBKEY
  XCH_AMOUNT
  ESCROW_END_HEIGHT
  release_signature
)
  ; Release conditions:
  ; 1. Both parties sign release, OR
  ; 2. Timeout reached + arbitration
  
  (if (verify_signatures release_signature PROPOSER_PUBKEY ACCEPTOR_PUBKEY)
    (release_to_acceptor XCH_AMOUNT)
    (if (> CURRENT_HEIGHT ESCROW_END_HEIGHT)
      (initiate_arbitration)
      (FAIL)
    )
  )
)
```

### Shipping Guidelines
- Use tracked shipping methods
- Package items securely
- Upload tracking info within 48 hours of commitment
- Take photos of packaging process

### API Endpoints
```typescript
// Upload tracking information
POST /api/rpc
{
  "method": "trade_add_tracking",
  "params": {
    "trade_id": 12345,
    "carrier": "USPS",
    "tracking_number": "9400111899223..."
  }
}

// Confirm item receipt
POST /api/rpc
{
  "method": "trade_confirm_receipt",
  "params": {
    "trade_id": 12345,
    "item_received": true,
    "condition_as_described": true
  }
}
```

---

## Phase 5: Multi-Pillar Review & Settlement

**Status**: `completed`

### What Happens
After both parties confirm satisfaction, the trade is finalized with mutual reviews and a blockchain record.

### The Four Pillars of Review

| Pillar | What It Measures | Scale |
|--------|------------------|-------|
| **Timeliness** | How quickly items shipped / XCH transferred | 1-5 ⭐ |
| **Packaging** | Quality of physical item protection | 1-5 ⭐ |
| **Value Honesty** | Did item match stated value/condition? | 1-5 ⭐ |
| **State Accuracy** | Was physical description accurate? | 1-5 ⭐ |

### Review Interface
```
┌────────────────────────────────────────────────────────┐
│         REVIEW YOUR TRADE WITH @charizard_master       │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ⏱️ Timeliness       ★ ★ ★ ★ ★                        │
│  How quickly did they ship?                           │
│                                                        │
│  📦 Packaging        ★ ★ ★ ★ ☆                        │
│  How well was the item protected?                     │
│                                                        │
│  💰 Value Honesty    ★ ★ ★ ★ ★                        │
│  Did it match the stated value?                       │
│                                                        │
│  📋 State Accuracy   ★ ★ ★ ★ ★                        │
│  Was the description accurate?                        │
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │ Additional comments (optional):                  │ │
│  │ Great trade! Card was exactly as described.     │ │
│  │ Fast shipping, double-sleeved and top-loaded.   │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│             [SUBMIT REVIEW]                            │
└────────────────────────────────────────────────────────┘
```

### Reputation Score Calculation
```
Overall Score = (
  Timeliness × 0.20 +
  Packaging × 0.25 +
  Value Honesty × 0.30 +
  State Accuracy × 0.25
) / 5 × 100

Example: (5×0.20 + 4×0.25 + 5×0.30 + 5×0.25) = 4.75 → 95%
```

### Final Blockchain Record
A hash of the complete trade record is saved to the Chia blockchain:

```json
{
  "trade_id": 12345,
  "proposer": "xch1alice...",
  "acceptor": "xch1bob...",
  "items_exchanged": {
    "proposer_gave": "NM Pikachu (Base Set)",
    "acceptor_gave": "NM Charizard (Base Set)"
  },
  "completion_date": "2026-01-04T12:00:00Z",
  "reviews": {
    "alice_reviewed_bob": { "avg": 4.75, "comment": "..." },
    "bob_reviewed_alice": { "avg": 5.0, "comment": "..." }
  },
  "final_hash": "sha256:abc123..."
}
```

### API Endpoint
```typescript
POST /api/rpc
{
  "method": "trade_review",
  "params": {
    "trade_id": 12345,
    "timeliness": 5,
    "packaging": 4,
    "value_honesty": 5,
    "state_accuracy": 5,
    "comment": "Great trade! Card was exactly as described."
  }
}
```

---

## Trade Status Reference

| Status | Description | Next Actions |
|--------|-------------|--------------|
| `proposal` | Listed, awaiting offers | Accept offer / Cancel |
| `matched` | Offer accepted, awaiting commit | Pay fee / Withdraw |
| `committed` | Fees paid, trade locked | Ship items / Lock XCH |
| `escrow` | Items in transit / XCH locked | Confirm receipt |
| `completed` | Trade finished | Leave review |
| `disputed` | Issue raised | Arbitration |
| `cancelled` | Trade cancelled | N/A |

---

## Error Handling

### Common Issues

| Error | Cause | Resolution |
|-------|-------|------------|
| `INSUFFICIENT_VERIFICATION` | User not fully verified | Complete verification |
| `INSUFFICIENT_XCH` | Can't pay commitment fee | Add XCH to wallet |
| `TRADE_EXPIRED` | 30-day escrow ended | Contact support |
| `ITEM_MISMATCH` | Item doesn't match description | Open dispute |

### Dispute Resolution
1. Either party can open a dispute during escrow
2. Both parties submit evidence (photos, messages)
3. Community arbitrators review the case
4. Resolution: Refund, release escrow, or split

---

## Configuration Requirements

### For Full Trading
- ✅ Backend running (`cargo run`)
- ✅ Verified account status
- ✅ Connected Chia wallet
- ✅ XCH for commitment fees

### For Browsing Only
- ✅ Backend running
- ✅ Basic account (email verified)
- ❌ Wallet not required
- ❌ Full verification not required

---

## Example: Complete Trade Flow

```
Alice                    DTREX                     Bob
  │                        │                        │
  │ CREATE PROPOSAL        │                        │
  │ "NM Pikachu, $50"      │                        │
  │───────────────────────▶│                        │
  │                        │                        │
  │                        │   BROWSE PROPOSALS     │
  │                        │◀───────────────────────│
  │                        │                        │
  │                        │   MAKE OFFER           │
  │                        │   "NM Charizard, $55"  │
  │                        │◀───────────────────────│
  │                        │                        │
  │ OFFER NOTIFICATION     │                        │
  │◀───────────────────────│                        │
  │                        │                        │
  │ ACCEPT OFFER           │                        │
  │───────────────────────▶│                        │
  │                        │                        │
  │ PAY FEE ($1 XCH)       │   PAY FEE ($1 XCH)    │
  │───────────────────────▶│◀───────────────────────│
  │                        │                        │
  │ SHIP PIKACHU           │   SHIP CHARIZARD      │
  │───────────────────────▶│◀───────────────────────│
  │                        │                        │
  │ CONFIRM RECEIPT        │   CONFIRM RECEIPT     │
  │───────────────────────▶│◀───────────────────────│
  │                        │                        │
  │ LEAVE REVIEW           │   LEAVE REVIEW        │
  │───────────────────────▶│◀───────────────────────│
  │                        │                        │
  │     TRADE COMPLETE - BLOCKCHAIN RECORD SAVED    │
  │                        │                        │
```
