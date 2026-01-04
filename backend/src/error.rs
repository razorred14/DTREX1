use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use serde::Serialize;

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, Serialize, strum_macros::AsRefStr)]
#[serde(tag = "type", content = "data")]
pub enum Error {
    LoginFail,
    InternalServer,
    // Add this for your contract operations
    EntityNotFound { entity: &'static str, id: i64 },
}

// This allows your Error to be returned directly by Axum handlers
impl IntoResponse for Error {
    fn into_response(self) -> Response {
        let error_msg = match &self {
            Error::LoginFail => "Login failed",
            Error::InternalServer => "Internal server error",
            Error::EntityNotFound { entity, id } => {
                return (
                    StatusCode::NOT_FOUND,
                    format!("{} with id {} not found", entity, id),
                )
                    .into_response();
            }
        };
        (StatusCode::INTERNAL_SERVER_ERROR, error_msg).into_response()
    }
}

// Standard boilerplate to allow Error to be used with '?'
impl std::fmt::Display for Error {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        write!(f, "{:?}", self)
    }
}

impl std::error::Error for Error {}