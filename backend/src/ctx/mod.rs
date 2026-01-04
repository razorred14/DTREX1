pub mod option_ctx;
pub use option_ctx::OptionCtx;
use serde::Serialize;

/// The request context carrying authentication/authorization data
#[derive(Clone, Debug, Serialize)]
pub struct Ctx {
    user_id: i64,
    username: String,
    is_admin: bool,
}

impl Ctx {
    pub fn new(user_id: i64, username: String) -> Self {
        Self { user_id, username, is_admin: false }
    }
    
    pub fn new_with_admin(user_id: i64, username: String, is_admin: bool) -> Self {
        Self { user_id, username, is_admin }
    }
    
    /// Create a root/system context for background tasks
    /// This bypasses normal user authorization
    pub fn root_ctx() -> Self {
        Self {
            user_id: 0,
            username: "system".to_string(),
            is_admin: true,
        }
    }

    pub fn user_id(&self) -> i64 {
        self.user_id
    }

    pub fn username(&self) -> &str {
        &self.username
    }
    
    pub fn is_admin(&self) -> bool {
        self.is_admin
    }
}
