pub mod auth;
pub mod config;
pub mod discord;
pub mod downloader;
pub mod game;
pub mod system;
pub mod updater;

use auth::{AuthSession, DeviceCodeResponse};
use config::{get_system_memory, load_settings, save_settings, SystemMemoryInfo, UserSettings};
use downloader::{download_file, DownloadTask};
use game::{ensure_instance_structure, find_system_java_17, spawn_minecraft_process, ForgeLaunchConfig};
use std::path::PathBuf;
use tauri::Emitter;
use updater::{evaluate_modpack_delta, fetch_remote_manifest as fetch_manifest, DeltaReport, ModpackManifest};

#[tauri::command]
async fn start_microsoft_device_code() -> Result<DeviceCodeResponse, String> {
    let client = reqwest::Client::new();
    auth::microsoft::request_device_code(&client, None).await
}

#[tauri::command]
async fn poll_microsoft_device_code(device_code: String) -> Result<AuthSession, String> {
    let client = reqwest::Client::new();
    auth::microsoft::complete_device_code_flow(&client, &device_code, 5, None).await
}

#[tauri::command]
fn get_system_memory_info() -> SystemMemoryInfo {
    get_system_memory()
}

#[tauri::command]
fn get_settings() -> UserSettings {
    load_settings()
}

#[tauri::command]
fn save_user_settings(settings: UserSettings) -> Result<(), String> {
    save_settings(&settings)
}

#[tauri::command]
fn detect_java() -> Option<String> {
    find_system_java_17().map(|p| p.to_string_lossy().to_string())
}

#[tauri::command]
fn create_offline_user_session(username: String) -> Result<AuthSession, String> {
    let trimmed = username.trim();
    if trimmed.is_empty() || trimmed.len() > 16 {
        return Err("El nombre de usuario debe tener entre 1 y 16 caracteres".to_string());
    }
    Ok(AuthSession::new_offline(trimmed))
}

#[tauri::command]
async fn fetch_remote_manifest(url: String) -> Result<ModpackManifest, String> {
    fetch_manifest(&url).await
}

#[tauri::command]
fn check_modpack_delta(
    manifest_json: String,
    instance_path: String,
    installed_version: Option<String>,
) -> Result<DeltaReport, String> {
    let manifest: ModpackManifest = serde_json::from_str(&manifest_json)
        .map_err(|e| format!("Error al analizar el manifiesto: {}", e))?;
    let path = PathBuf::from(instance_path);
    Ok(evaluate_modpack_delta(
        &manifest,
        &path,
        installed_version.as_deref(),
    ))
}

#[tauri::command]
async fn sync_modpack(
    app: tauri::AppHandle,
    manifest_json: String,
    instance_path: String,
) -> Result<(), String> {
    let manifest: ModpackManifest = serde_json::from_str(&manifest_json)
        .map_err(|e| format!("Error al analizar el manifiesto: {}", e))?;
    let instance_dir = PathBuf::from(&instance_path);

    let delta = evaluate_modpack_delta(&manifest, &instance_dir, None);

    // 1. Delete orphan obsolete files
    for file_to_delete in delta.files_to_delete {
        if file_to_delete.exists() {
            let _ = std::fs::remove_file(file_to_delete);
        }
    }

    // 2. Download missing or modified files
    let client = reqwest::Client::new();
    for file in delta.files_to_download {
        let clean_path = file.path.replace('/', std::path::MAIN_SEPARATOR_STR);
        let destination = instance_dir.join(clean_path);

        let task = DownloadTask {
            url: file.url,
            destination_path: destination,
            expected_sha1: file.sha1,
            size_bytes: file.size,
        };

        let app_clone = app.clone();
        download_file(&client, &task, move |progress| {
            let _ = app_clone.emit("download-progress", progress);
        })
        .await?;
    }

    // 3. Save local installed_manifest.json
    let installed_manifest_path = instance_dir.join("installed_manifest.json");
    if let Some(parent) = installed_manifest_path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    let _ = std::fs::write(installed_manifest_path, manifest_json);

    Ok(())
}

#[tauri::command]
fn launch_game(app: tauri::AppHandle, modpack_id: String) -> Result<u32, String> {
    let settings = load_settings();
    let java_bin = find_system_java_17()
        .ok_or("No se encontró Java 17 en el sistema. Por favor instala Temurin/OpenJDK 17.")?;

    let instance_dir = settings.game_directory.join("instances").join(&modpack_id);
    ensure_instance_structure(&instance_dir)?;

    let account = settings
        .active_account
        .unwrap_or_else(|| AuthSession::new_offline("GekoPlayer"));

    let config = ForgeLaunchConfig {
        java_binary: &java_bin,
        ram_gb: settings.allocated_ram_gb,
        instance_dir: &instance_dir,
        account: &account,
        forge_version: "47.4.22",
    };

    let pid = spawn_minecraft_process(&config, Some(app.clone()))?;

    // Auto-close launcher when game starts if configured
    if settings.close_launcher_on_start {
        let app_handle = app.clone();
        std::thread::spawn(move || {
            std::thread::sleep(std::time::Duration::from_millis(1500));
            app_handle.exit(0);
        });
    }

    Ok(pid)
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            get_system_memory_info,
            get_settings,
            save_user_settings,
            detect_java,
            create_offline_user_session,
            fetch_remote_manifest,
            check_modpack_delta,
            sync_modpack,
            launch_game,
            system::pick_game_directory,
            system::open_directory_in_explorer,
            system::open_external_url,
            system::check_server_status,
            start_microsoft_device_code,
            poll_microsoft_device_code
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
