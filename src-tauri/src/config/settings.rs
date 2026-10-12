use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use crate::auth::AuthSession;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserSettings {
    pub selected_modpack_id: String,
    pub allocated_ram_gb: u32,
    pub game_directory: PathBuf,
    pub active_account: Option<AuthSession>,
    pub close_launcher_on_start: bool,
}

impl Default for UserSettings {
    fn default() -> Self {
        let default_dir = dirs_fallback();
        Self {
            selected_modpack_id: "monoevents-forge-1.20.1".to_string(),
            allocated_ram_gb: 6,
            game_directory: default_dir,
            active_account: None,
            close_launcher_on_start: true,
        }
    }
}

fn dirs_fallback() -> PathBuf {
    if let Ok(app_data) = std::env::var("APPDATA") {
        PathBuf::from(app_data).join(".monoevents")
    } else {
        PathBuf::from(".monoevents")
    }
}
