use axum::extract::FromRequestParts;
use axum::http::request::Parts;

use crate::ctx::Ctx;

pub struct OptionCtx(pub Option<Ctx>);

#[axum::async_trait]
impl<S> FromRequestParts<S> for OptionCtx
where
    S: Send + Sync,
{
    type Rejection = std::convert::Infallible;
    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let ctx = parts.extensions.get::<Ctx>().cloned();
        Ok(OptionCtx(ctx))
    }
}
