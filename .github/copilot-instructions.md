# Copilot Instructions for This Repo

Use this to get productive fast. Keep answers specific to the files and flows in this project.

## Big Picture
- Backend: Rust + Axum JSON-RPC on /api/rpc with Postgres (sqlx). Auth is HMAC token via Bearer header. File upload/download remains REST on /files/*.
- Frontend: React + Vite calling JSON-RPC through axios with an interceptor that injects Authorization from localStorage.
- Chia integration: Node RPC access via reqwest client; runtime RPC URL and optional TLS identity managed in AppState.

## Key Directories
- Backend entry/routes: [backend/src/main.rs](backend/src/main.rs), API modules under [backend/src/api](backend/src/api)
- Auth + middleware: [backend/src/api/auth.rs](backend/src/api/auth.rs), [backend/src/api/mw_auth.rs](backend/src/api/mw_auth.rs)
- JSON-RPC router: [backend/src/api/rpc.rs](backend/src/api/rpc.rs)
- Model layer (BMC pattern): [backend/src/model](backend/src/model) exporting `UserBmc`, `ContractBmc`, `FileBmc`
- DB pool: [backend/src/store/mod.rs](backend/src/store/mod.rs); SQL schema: [backend/sql/01-create-schema.sql](backend/sql/01-create-schema.sql)
- File storage helpers: [backend/src/storage/files.rs](backend/src/storage/files.rs)
- Chia RPC client + config state: [backend/src/rpc/client.rs](backend/src/rpc/client.rs), [backend/src/app_state.rs](backend/src/app_state.rs)
- Frontend API client + RPC helper: [frontend/src/api/client.ts](frontend/src/api/client.ts), auth: [frontend/src/api/auth.ts](frontend/src/api/auth.ts)

## Architectural Conventions
- JSON-RPC only for business actions (auth, contracts, files metadata) at /api/rpc; binary file transfer stays REST: /files, /files/:id.
- Auth: Bearer token created in `auth.rs` (HMAC-SHA256 over payload) and injected by axios interceptor; backend middleware `mw_ctx_resolve` sets a `Ctx` if token is valid.
- Authorization is enforced in the Model layer by passing `Ctx` and filtering on `user_id` (see `ContractBmc::list/get`, `FileBmc::*`). Do not bypass model checks in handlers.
- Error shape for RPC: `RpcError { code, message, data? }`; prefer codes used in [backend/src/api/rpc.rs](backend/src/api/rpc.rs) (e.g., 4001 unauthorized, 4004 not found, 5000 server/db).
- Storage: Files saved under storage/contracts, metadata under storage/metadata via functions in [backend/src/storage/files.rs](backend/src/storage/files.rs).

## Add/Change Backend RPC Methods
- Route all methods through the match in [backend/src/api/rpc.rs](backend/src/api/rpc.rs). For protected methods, require `ctx: Option<Ctx>` and gate with `if let Some(ctx)`.
- Implement business logic in the corresponding `*Bmc` type under [backend/src/model](backend/src/model), not directly in the handler. Always pass `&Ctx` and `mm.db()`.
- Return `serde_json::Value` results with stable keys (e.g., `{ "contract": Contract }`, `{ "contracts": [...] }`) to match frontend expectations in [frontend/src/api/client.ts](frontend/src/api/client.ts).
- Prefer sqlx parameter binding; never build SQL with string concatenation. Update schema in [backend/sql/01-create-schema.sql](backend/sql/01-create-schema.sql) if needed.

## Frontend Integration Patterns
- All RPC calls go through `rpcCall` in [frontend/src/api/client.ts](frontend/src/api/client.ts), which posts `{ id, method, params }` to `/api/rpc` and throws if `error` is present.
- The axios client adds `Authorization: Bearer <token>` automatically when `chia_auth_token` is in localStorage. A 401 response clears auth and navigates to `/login`.
- Contracts API expects result shapes `{ contracts }`, `{ contract }`, `{ success }`. Keep those keys stable when modifying backend responses.
- Files: upload via `POST /files` (multipart), download via `/files/:id`; see `fileApi` in [frontend/src/api/client.ts](frontend/src/api/client.ts).

## Chia RPC & SSL
- Runtime RPC URL, identity (PKCS#12), and CA are set via endpoints under `/chia/*` and `/ssl/*` defined in [backend/src/api/chia.rs](backend/src/api/chia.rs) and [backend/src/api/ssl.rs](backend/src/api/ssl.rs).
- `ChiaRpcClient::from_state` wires TLS identity/CA if configured; otherwise uses `from_env` with `CHIA_ALLOW_INSECURE` for dev.

## Local Dev Workflows (macOS)
- Backend: from `backend/`
  - Build: `cargo build`
  - Run: `cargo run` (listens on http://localhost:8080)
  - Test: `cargo test`
- Database:
  - Init: `psql -U postgres -f backend/sql/00-recreate-db.sql && psql -U chia_user -d chia_contracts -f backend/sql/01-create-schema.sql`
  - Env: `.env` needs `DATABASE_URL` and `TOKEN_SECRET` (see README).
- Frontend: from `frontend/`
  - Dev: `npm install && npm run dev` (http://127.0.0.1:5173)

## Gotchas
- Keep REST for binary files; do not push large payloads through JSON-RPC.
- Always thread `Ctx` through model calls to enforce per-user data access.
- Match frontend field names: the backend `Contract` serializes `name` as `title` and `terms` as `content` (see [backend/src/model/contract.rs](backend/src/model/contract.rs)).
- Respect request size limit set in `main.rs` and file size checks in `files.rs`.

## Helpful Examples
- RPC method example: see `contract_*` and `file_*` functions in [backend/src/api/rpc.rs](backend/src/api/rpc.rs).
- Auth flow: login/register in [backend/src/api/auth.rs](backend/src/api/auth.rs), token added by [frontend/src/api/client.ts](frontend/src/api/client.ts).
- Health check: `GET /health` and `GET /chia/node/status`.
