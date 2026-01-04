use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use serde::Serialize;

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, Serialize, strum_macros::AsRefStr)]
#[serde(tag = "type", content = "data")]
pub enum Error {
    LoginFail,
    InternalServer,
    NotFound,
    BadRequest,
    // Entity operations
    EntityNotFound { entity: &'static str, id: i64 },
    // Database errors
    Database(String),
    // Authentication errors
    Auth(String),
    // Configuration errors
    Config(String),
    // Invalid state errors
    InvalidState(String),
    // Not found with message
    NotFoundMsg(String),
}

// This allows your Error to be returned directly by Axum handlers
impl IntoResponse for Error {
    fn into_response(self) -> Response {
        let error_msg = match &self {
            Error::LoginFail => "Login failed",
            Error::InternalServer => "Internal server error",
            Error::NotFound => {
                return (StatusCode::NOT_FOUND, "Resource not found").into_response();
            }
            Error::BadRequest => {
                return (StatusCode::BAD_REQUEST, "Bad request").into_response();
            }
            Error::EntityNotFound { entity, id } => {
                return (
                    StatusCode::NOT_FOUND,
                    format!("{} with id {} not found", entity, id),
                )
                    .into_response();
            }
            Error::Database(msg) => {
                return (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", msg)).into_response();
            }
            Error::Auth(msg) => {
                return (StatusCode::UNAUTHORIZED, msg.clone()).into_response();
            }
            Error::Config(msg) => {
                return (StatusCode::INTERNAL_SERVER_ERROR, format!("Configuration error: {}", msg)).into_response();
            }
            Error::InvalidState(msg) => {
                return (StatusCode::BAD_REQUEST, msg.clone()).into_response();
            }
            Error::NotFoundMsg(msg) => {
                return (StatusCode::NOT_FOUND, msg.clone()).into_response();
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