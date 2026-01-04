# Copilot Instructions for DTREX (Decentralized Trade Exchange)

Use this to get productive fast. Keep answers specific to the files and flows in this project.

## Big Picture
DTREX is a peer-to-peer bartering platform built on the Chia blockchain. Users can trade physical or digital items using a 5-phase process: Proposal → Match → Commit → Escrow → Review.

- **Backend**: Rust + Axum JSON-RPC on /api/rpc with Postgres (sqlx). Auth is HMAC token via Bearer header.
- **Frontend**: React + Vite calling JSON-RPC through axios with an interceptor that injects Authorization from localStorage.
- **Chia integration**: Node RPC access via reqwest client; runtime RPC URL and optional TLS identity managed in AppState.

## Key Directories
- Backend entry/routes: [backend/src/main.rs](backend/src/main.rs), API modules under [backend/src/api](backend/src/api)
- Auth + middleware: [backend/src/api/auth.rs](backend/src/api/auth.rs), [backend/src/api/mw_auth.rs](backend/src/api/mw_auth.rs)
- JSON-RPC router: [backend/src/api/rpc.rs](backend/src/api/rpc.rs)
- Model layer (BMC pattern): [backend/src/model](backend/src/model) exporting `UserBmc`, `TradeBmc`, `ReviewBmc`, plus legacy `ContractBmc`
- DB pool: [backend/src/store/mod.rs](backend/src/store/mod.rs); SQL schema: [backend/sql/01-create-schema.sql](backend/sql/01-create-schema.sql)
- Frontend API client + Trade helper: [frontend/src/api/client.ts](frontend/src/api/client.ts), auth: [frontend/src/api/auth.ts](frontend/src/api/auth.ts)
- Frontend pages: [frontend/src/pages](frontend/src/pages) - BrowseTrades, CreateTrade, MyTrades

## The 5-Phase Trade Flow
1. **Proposal** (status: `proposal`): User lists item with value, description, wishlist
2. **Match** (status: `matched`): Another user accepts with their offer
3. **Commit** (status: `committed`): Both pay ~$1 XCH fee, trade locked on-chain
4. **Escrow** (status: `escrow`): 30-day period for shipping/verification
5. **Review** (status: `completed`): Both parties rate using 4-pillar system

## Trade Types
- `item_for_item`: Physical/digital item swap
- `item_for_xch`: Item for Chia cryptocurrency
- `xch_for_item`: XCH for item
- `mixed`: Item + XCH combination

## 4-Pillar Reputation System
1. **Timeliness** (20%): Speed of shipment/transfer
2. **Packaging** (25%): Protection quality
3. **Value Honesty** (30%): Item matched stated value
4. **State Accuracy** (25%): Description accuracy

## Architectural Conventions
- JSON-RPC for all business actions at /api/rpc; binary file uploads stay REST at /files/*
- Auth: Bearer token created in `auth.rs` (HMAC-SHA256) and injected by axios interceptor
- Authorization enforced in Model layer via `Ctx` parameter filtering on `user_id`
- Error shape: `RpcError { code, message, data? }` - codes like 4001 (unauthorized), 4004 (not found), 5000 (server)

## Key RPC Methods

### Authentication
- `register` - Create account (username, pwd, email)
- `login` - Get auth token
- `logout` - Invalidate session

### Trades (Public)
- `trade_list_proposals` - List open proposals (params: limit, offset)
- `trade_get_public` - Get any proposal by ID

### Trades (Authenticated)
- `trade_create` - Create proposal (item_title, item_description, item_value_usd, wishlist)
- `trade_my_trades` - List user's trades
- `trade_get` - Get trade (participant only)
- `trade_accept` - Make offer on proposal
- `trade_commit` - Pay fee and lock trade
- `trade_add_tracking` - Add shipping info
- `trade_complete` - Mark as complete
- `trade_cancel` - Cancel (proposer only, pre-commit)
- `trade_delete` - Delete proposal

### Reviews
- `trade_review` - Submit review (trade_id, timeliness, packaging, value_honesty, state_accuracy)
- `user_reviews` - Get reviews for a user

## Database Tables
- `users` - Accounts with verification status, reputation_score, total_trades
- `trades` - Trade proposals and active trades with status workflow
- `trade_wishlists` - What proposer will accept
- `trade_photos` - Item images
- `trade_reviews` - 4-pillar ratings
- `trade_messages` - Chat between participants
- `verification_documents` - ID verification (pending feature)

## Frontend Routes
- `/` - Home (5-phase explainer, feature cards)
- `/trades` - Browse open proposals (public)
- `/create` - Create trade proposal (authenticated)
- `/my-trades` - User's trades (authenticated)
- `/trade/:id` - Trade detail view
- `/settings` - User settings, wallet config
- `/contacts` - Contact management

## Add/Change Trade RPC Methods
- Route through match in [backend/src/api/rpc.rs](backend/src/api/rpc.rs)
- Implement in `TradeBmc` or `ReviewBmc` under [backend/src/model/trade.rs](backend/src/model/trade.rs)
- Always pass `&Ctx` for authorization
- Return stable keys like `{ "trades": [...] }`, `{ "trade": {...} }`

## Local Dev Workflows (macOS)
- Backend: `cd backend && cargo run` (http://localhost:8080)
- Frontend: `cd frontend && npm install && npm run dev` (http://127.0.0.1:5173)
- Database init: `psql -U postgres -f backend/sql/00-recreate-db.sql && psql -U chia_user -d chia_contracts -f backend/sql/01-create-schema.sql`

## Gotchas
- USD is reference only ("fiat lens") - never transacted
- XCH amounts stored in mojos (1 XCH = 1,000,000,000,000 mojos)
- Always thread `Ctx` through model calls for per-user authorization
- Legacy contract API retained for backward compatibility
