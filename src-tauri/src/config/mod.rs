pub mod settings;

pub use settings::UserSettings;
use std::fs;
use std::path::PathBuf;

pub fn get_settings_path() -> PathBuf {
    if let Ok(app_data) = std::env::var("APPDATA") {
        PathBuf::from(app_data)
            .join("MonoEventsLauncher")
            .join("settings.json")
    } else {
        PathBuf::from("settings.json")
    }
}

pub fn load_settings_from_path(path: &PathBuf) -> UserSettings {
    if let Ok(content) = fs::read_to_string(path) {
        if let Ok(mut settings) = serde_json::from_str::<UserSettings>(&content) {
            settings.sanitize();
            return settings;
        }
    }
    UserSettings::default()
}

pub fn load_settings() -> UserSettings {
    let path = get_settings_path();
    load_settings_from_path(&path)
}

pub fn save_settings_to_path(settings: &UserSettings, path: &PathBuf) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Could not create config dir: {}", e))?;
    }
    let mut sanitized = settings.clone();
    sanitized.sanitize();
    let data = serde_json::to_string_pretty(&sanitized)
        .map_err(|e| format!("JSON serialize error: {}", e))?;
    fs::write(path, data).map_err(|e| format!("File write error: {}", e))?;
    Ok(())
}

pub fn save_settings(settings: &UserSettings) -> Result<(), String> {
    let path = get_settings_path();
    save_settings_to_path(settings, &path)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_save_and_load_settings() {
        let temp_dir = std::env::temp_dir().join("monoevents_test_config");
        let _ = fs::remove_dir_all(&temp_dir);
        let test_path = temp_dir.join("settings.json");

        let custom_settings = UserSettings {
            selected_modpack_id: "custom-pack".to_string(),
            allocated_ram_gb: 8,
            game_directory: temp_dir.join("instances"),
            active_account: None,
            close_launcher_on_start: false,
        };

        save_settings_to_path(&custom_settings, &test_path).expect("Failed to save settings");
        let loaded = load_settings_from_path(&test_path);

        assert_eq!(loaded.selected_modpack_id, "custom-pack");
        assert_eq!(loaded.allocated_ram_gb, 8);
        assert_eq!(loaded.close_launcher_on_start, false);

        let _ = fs::remove_dir_all(temp_dir);
    }
}
