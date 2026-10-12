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
}

impl UserSettings {
    pub fn sanitize(&mut self) {
        // Clamp RAM between 2 GB and 32 GB
        if self.allocated_ram_gb < 2 {
            self.allocated_ram_gb = 2;
        } else if self.allocated_ram_gb > 32 {
            self.allocated_ram_gb = 32;
        }

        if self.selected_modpack_id.trim().is_empty() {
            self.selected_modpack_id = "monoevents-forge-1.20.1".to_string();
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
        };

        settings.sanitize();
        assert_eq!(settings.allocated_ram_gb, 2);
        assert_eq!(settings.selected_modpack_id, "monoevents-forge-1.20.1");

        settings.allocated_ram_gb = 64; // Too high
        settings.sanitize();
        assert_eq!(settings.allocated_ram_gb, 32);
    }
}
