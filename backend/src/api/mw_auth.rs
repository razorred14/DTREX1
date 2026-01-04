use axum::{
    extract::{Request, State},
    http::StatusCode,
    middleware::Next,
    response::Response,
};

use crate::api::auth::validate_token;
use crate::ctx::Ctx;
use crate::model::{ModelManager, UserBmc};

/// AUTH-RESOLVE middleware - attempts to resolve Ctx from token
/// Does not fail if no token present, just leaves ctx as None
pub async fn mw_ctx_resolve(
    State(mm): State<ModelManager>,
    mut req: Request,
    next: Next,
) -> Response {
    // Try to get token from Authorization header
    let token = req
        .headers()
        .get("Authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "));

    // If token exists, validate and create Ctx
    if let Some(token) = token {
        if let Ok(user_id) = validate_token(token) {
            // Get user from database
            if let Ok(user) = UserBmc::first_by_id_for_auth(mm.db(), user_id).await {
                let ctx = Ctx::new_with_admin(user.id, user.username, user.is_admin);
                req.extensions_mut().insert(ctx);
            }
        }
    }

    next.run(req).await
}

/// AUTH-REQUIRE middleware - requires Ctx to be present
/// Returns 401 if no Ctx found
pub async fn mw_ctx_require(
    ctx: Option<Ctx>,
    req: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    ctx.ok_or(StatusCode::UNAUTHORIZED)?;
    Ok(next.run(req).await)
}

/// Extractor for Ctx - allows handlers to get Ctx from request
#[axum::async_trait]
impl<S> axum::extract::FromRequestParts<S> for Ctx
where
    S: Send + Sync,
{
    type Rejection = StatusCode;

    async fn from_request_parts(
        parts: &mut axum::http::request::Parts,
        _state: &S,
    ) -> Result<Self, Self::Rejection> {
        parts
            .extensions
            .get::<Ctx>()
            .cloned()
            .ok_or(StatusCode::UNAUTHORIZED)
    }
}
