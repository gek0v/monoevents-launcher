use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use crate::auth::AuthSession;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct UserSettings {
    pub selected_modpack_id: String,
    pub allocated_ram_gb: u32,
    pub game_directory: PathBuf,
    pub active_account: Option<AuthSession>,
    pub close_launcher_on_start: bool,
    #[serde(default = "default_true")]
    pub enable_discord_rpc: bool,
}

fn default_true() -> bool {
    true
}

impl UserSettings {
    pub fn sanitize(&mut self) {
        let max_ram = super::get_system_memory().total_ram_gb.max(16);
        // Clamp RAM between 2 GB and system total physical RAM (at least 16 GB fallback)
        if self.allocated_ram_gb < 2 {
            self.allocated_ram_gb = 2;
        } else if self.allocated_ram_gb > max_ram {
            self.allocated_ram_gb = max_ram;
        }

        if self.selected_modpack_id.trim().is_empty() {
            self.selected_modpack_id = "monoevents-forge-1.20.1".to_string();
        }

        if let Some(ref mut acc) = self.active_account {
            acc.username = acc.username.trim().to_string();
            if acc.username.is_empty() {
                acc.username = "GekoPlayer".to_string();
            }
        } else {
            self.active_account = Some(AuthSession::new_offline("GekoPlayer"));
        }
    }
}

impl Default for UserSettings {
    fn default() -> Self {
        let default_dir = dirs_fallback();
        Self {
            selected_modpack_id: "monoevents-forge-1.20.1".to_string(),
            allocated_ram_gb: 6,
            game_directory: default_dir,
            active_account: Some(AuthSession::new_offline("GekoPlayer")),
            close_launcher_on_start: true,
            enable_discord_rpc: true,
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_settings_sanitization() {
        let mut settings = UserSettings {
            selected_modpack_id: "".to_string(),
            allocated_ram_gb: 1, // Too low
            game_directory: PathBuf::from("test"),
            active_account: None,
            close_launcher_on_start: false,
            enable_discord_rpc: true,
        };

        settings.sanitize();
        assert_eq!(settings.allocated_ram_gb, 2);
        assert_eq!(settings.selected_modpack_id, "monoevents-forge-1.20.1");
        assert!(settings.active_account.is_some());
        assert_eq!(settings.active_account.as_ref().unwrap().username, "GekoPlayer");

        // Custom nickname preservation and trimming
        settings.active_account = Some(AuthSession::new_offline("  CustomGamer  "));
        settings.sanitize();
        assert_eq!(settings.active_account.as_ref().unwrap().username, "CustomGamer");

        let max_ram = super::super::get_system_memory().total_ram_gb.max(16);
        settings.allocated_ram_gb = 1024; // Excessively high
        settings.sanitize();
        assert_eq!(settings.allocated_ram_gb, max_ram);
    }
}
