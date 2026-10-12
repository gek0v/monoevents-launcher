pub mod auth;
pub mod config;
pub mod downloader;
pub mod game;
pub mod updater;

use config::{load_settings, save_settings, UserSettings};

#[tauri::command]
fn get_settings() -> UserSettings {
    load_settings()
}

#[tauri::command]
fn update_settings(settings: UserSettings) -> Result<(), String> {
    save_settings(&settings)
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            get_settings,
            update_settings
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
