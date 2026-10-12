pub mod microsoft;
pub mod offline;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum SessionType {
    Microsoft,
    Offline,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct AuthSession {
    pub session_type: SessionType,
    pub username: String,
    pub uuid: String,
    pub access_token: Option<String>,
}

impl AuthSession {
    pub fn new_offline(username: &str) -> Self {
        let uuid = offline::generate_offline_uuid(username);
        Self {
            session_type: SessionType::Offline,
            username: username.to_string(),
            uuid,
            access_token: None,
        }
    }
}
