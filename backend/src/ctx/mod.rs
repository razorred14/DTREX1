pub mod option_ctx;
pub use option_ctx::OptionCtx;
use serde::Serialize;

/// The request context carrying authentication/authorization data
#[derive(Clone, Debug, Serialize)]
pub struct Ctx {
    user_id: i64,
    username: String,
}

impl Ctx {
    pub fn new(user_id: i64, username: String) -> Self {
        Self { user_id, username }
    }

    pub fn user_id(&self) -> i64 {
        self.user_id
    }

    pub fn username(&self) -> &str {
        &self.username
    }
}
