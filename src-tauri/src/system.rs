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

#[tauri::command]
pub fn open_external_url(url: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("rundll32")
            .args(["url.dll,FileProtocolHandler", &url])
            .spawn()
            .map_err(|e| format!("Error al abrir URL externa: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&url)
            .spawn()
            .map_err(|e| format!("Error al abrir URL externa: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&url)
            .spawn()
            .map_err(|e| format!("Error al abrir URL externa: {}", e))?;
    }

    Ok(())
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, PartialEq)]
pub struct ServerStatus {
    pub online: bool,
    pub host: String,
    pub port: u16,
    pub ping_ms: Option<u64>,
    pub players_online: Option<u32>,
    pub players_max: Option<u32>,
}

#[derive(serde::Deserialize)]
struct McStatusPlayers {
    online: Option<u32>,
    max: Option<u32>,
}

#[derive(serde::Deserialize)]
struct McStatusResponse {
    online: bool,
    players: Option<McStatusPlayers>,
}

#[tauri::command]
pub async fn check_server_status(host: String, port: Option<u16>) -> ServerStatus {
    let target_port = port.unwrap_or(25565);
    let start = std::time::Instant::now();

    // 1. Direct TCP handshake probe with 1.5s timeout
    let tcp_addr = format!("{}:{}", host, target_port);
    let tcp_probe = tokio::time::timeout(
        std::time::Duration::from_millis(1500),
        tokio::net::TcpStream::connect(&tcp_addr),
    )
    .await;

    let tcp_online = matches!(tcp_probe, Ok(Ok(_)));
    let ping_ms = if tcp_online {
        Some(start.elapsed().as_millis() as u64)
    } else {
        None
    };

    // 2. Query public Minecraft status API for player metadata or fallback verification
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_millis(2000))
        .build()
        .unwrap_or_default();

    let api_url = format!("https://api.mcstatus.io/v2/status/java/{}:{}", host, target_port);
    let mut api_online = false;
    let mut players_online = None;
    let mut players_max = None;

    if let Ok(resp) = client.get(&api_url).send().await {
        if let Ok(info) = resp.json::<McStatusResponse>().await {
            api_online = info.online;
            if let Some(pl) = info.players {
                players_online = pl.online;
                players_max = pl.max;
            }
        }
    }

    let is_online = tcp_online || api_online;

    ServerStatus {
        online: is_online,
        host,
        port: target_port,
        ping_ms,
        players_online,
        players_max,
    }
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

    #[test]
    fn test_server_status_serialization() {
        let status = ServerStatus {
            online: true,
            host: "gek0.duckdns.org".to_string(),
            port: 25565,
            ping_ms: Some(35),
            players_online: Some(3),
            players_max: Some(20),
        };
        let json = serde_json::to_string(&status).unwrap();
        assert!(json.contains("\"online\":true"));
        assert!(json.contains("\"players_online\":3"));
    }
}
