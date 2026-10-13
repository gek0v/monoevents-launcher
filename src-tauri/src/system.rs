use std::path::{Path, PathBuf};
use tauri_plugin_dialog::DialogExt;

pub fn ensure_directory_exists<P: AsRef<Path>>(path: P) -> Result<(), String> {
    let p = path.as_ref();
    if !p.exists() {
        std::fs::create_dir_all(p)
            .map_err(|e| format!("No se pudo crear la carpeta de instalación: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
pub async fn pick_game_directory(app: tauri::AppHandle) -> Result<Option<String>, String> {
    // Open native folder picker using Tauri 2 dialog plugin
    let response = app.dialog().file().blocking_pick_folder();
    match response {
        Some(file_path) => Ok(Some(file_path.to_string())),
        None => Ok(None),
    }
}

#[tauri::command]
pub fn open_directory_in_explorer(path: String) -> Result<(), String> {
    let target = PathBuf::from(&path);
    ensure_directory_exists(&target)?;

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&target)
            .spawn()
            .map_err(|e| format!("Error al abrir el Explorador de Windows: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&target)
            .spawn()
            .map_err(|e| format!("Error al abrir Finder: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&target)
            .spawn()
            .map_err(|e| format!("Error al abrir el gestor de archivos: {}", e))?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_open_directory_creates_dir_if_missing() {
        let temp = std::env::temp_dir().join("monoevents_test_open_explorer");
        let _ = std::fs::remove_dir_all(&temp);
        assert!(!temp.exists());

        let res = ensure_directory_exists(&temp);
        assert!(res.is_ok());
        assert!(temp.exists());

        let _ = std::fs::remove_dir_all(&temp);
    }
}
