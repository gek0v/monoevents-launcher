pub mod settings;

pub use settings::UserSettings;
use std::fs;
use std::path::PathBuf;

pub fn get_settings_path() -> PathBuf {
    if let Ok(app_data) = std::env::var("APPDATA") {
        PathBuf::from(app_data).join("MonoEventsLauncher").join("settings.json")
    } else {
        PathBuf::from("settings.json")
    }
}

pub fn load_settings() -> UserSettings {
    let path = get_settings_path();
    if let Ok(content) = fs::read_to_string(&path) {
        if let Ok(settings) = serde_json::from_str::<UserSettings>(&content) {
            return settings;
        }
    }
    UserSettings::default()
}

pub fn save_settings(settings: &UserSettings) -> Result<(), String> {
    let path = get_settings_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let data = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    fs::write(path, data).map_err(|e| e.to_string())?;
    Ok(())
}
