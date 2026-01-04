mod contract;
mod file;
mod trade;
mod transaction;
mod user;

pub use contract::*;
pub use file::*;
pub use trade::*;
pub use transaction::*;
pub use user::*;

use crate::store::Db;

/// ModelManager - holds resources needed by Model layer
#[derive(Clone)]
pub struct ModelManager {
    db: Db,
}

impl ModelManager {
    pub fn new(db: Db) -> Self {
        Self { db }
    }

    pub fn db(&self) -> &Db {
        &self.db
    }
    
    pub fn pool(&self) -> &Db {
        &self.db
    }
}
