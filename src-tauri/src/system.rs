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
    #[serde(default)]
    online: bool,
    players: Option<McStatusPlayers>,
}

fn write_varint(buf: &mut Vec<u8>, val: i32) {
    let mut unsigned = val as u32;
    loop {
        let mut temp = (unsigned & 0x7F) as u8;
        unsigned >>= 7;
        if unsigned != 0 {
            temp |= 0x80;
        }
        buf.push(temp);
        if unsigned == 0 {
            break;
        }
    }
}

async fn read_varint<R: tokio::io::AsyncReadExt + Unpin>(reader: &mut R) -> Result<i32, String> {
    let mut num_read = 0;
    let mut result: u32 = 0;
    loop {
        let byte = reader.read_u8().await.map_err(|e| e.to_string())?;
        let value = (byte & 0x7F) as u32;
        result |= value << (7 * num_read);
        num_read += 1;
        if num_read > 5 {
            return Err("VarInt too long".to_string());
        }
        if (byte & 0x80) == 0 {
            break;
        }
    }
    Ok(result as i32)
}

async fn ping_minecraft_native(host: &str, port: u16) -> Result<(u64, Option<u32>, Option<u32>), String> {
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    use tokio::net::TcpStream;

    let start = std::time::Instant::now();
    let addr = format!("{}:{}", host, port);

    let mut stream = tokio::time::timeout(
        std::time::Duration::from_millis(2000),
        TcpStream::connect(&addr),
    )
    .await
    .map_err(|_| "Timeout de conexión al servidor de Minecraft".to_string())?
    .map_err(|e| e.to_string())?;

    let ping_ms = start.elapsed().as_millis() as u64;

    // Handshake packet (ID 0x00)
    let mut body = Vec::new();
    write_varint(&mut body, 0x00); // Packet ID
    write_varint(&mut body, 763);  // Protocol 1.20.1
    write_varint(&mut body, host.len() as i32);
    body.extend_from_slice(host.as_bytes());
    body.extend_from_slice(&port.to_be_bytes());
    write_varint(&mut body, 1);    // Next state: 1 (Status)

    let mut handshake = Vec::new();
    write_varint(&mut handshake, body.len() as i32);
    handshake.extend(body);

    stream.write_all(&handshake).await.map_err(|e| e.to_string())?;

    // Status Request packet: length 1, packet ID 0x00
    stream.write_all(&[0x01, 0x00]).await.map_err(|e| e.to_string())?;

    // Read Response
    let _packet_len = read_varint(&mut stream).await?;
    let packet_id = read_varint(&mut stream).await?;
    if packet_id != 0 {
        return Err(format!("ID de paquete de estado inválido: {}", packet_id));
    }

    let json_len = read_varint(&mut stream).await?;
    if json_len <= 0 || json_len > 1_000_000 {
        return Err(format!("Longitud JSON inválida: {}", json_len));
    }

    let mut json_buf = vec![0u8; json_len as usize];
    stream.read_exact(&mut json_buf).await.map_err(|e| e.to_string())?;

    let json_str = String::from_utf8(json_buf).map_err(|e| e.to_string())?;
    let resp: McStatusResponse = serde_json::from_str(&json_str).map_err(|e| e.to_string())?;

    let (online, max) = match resp.players {
        Some(p) => (p.online, p.max),
        None => (None, None),
    };

    Ok((ping_ms, online, max))
}

#[tauri::command]
pub async fn check_server_status(host: String, port: Option<u16>) -> ServerStatus {
    let target_port = port.unwrap_or(25565);

    // 1. Direct native Minecraft Server List Ping (instantáneo, preciso con conteo de jugadores real)
    if let Ok((ping_ms, players_online, players_max)) = ping_minecraft_native(&host, target_port).await {
        return ServerStatus {
            online: true,
            host,
            port: target_port,
            ping_ms: Some(ping_ms),
            players_online,
            players_max,
        };
    }

    // 2. Fallback: Consulta a API pública mcstatus.io con User-Agent personalizado
    let client = reqwest::Client::builder()
        .user_agent("MonoEventsLauncher/1.0 (Windows NT 10.0; Win64; x64)")
        .timeout(std::time::Duration::from_millis(3000))
        .build()
        .unwrap_or_default();

    let api_url = format!("https://api.mcstatus.io/v2/status/java/{}:{}", host, target_port);
    if let Ok(resp) = client.get(&api_url).send().await {
        if let Ok(info) = resp.json::<McStatusResponse>().await {
            if info.online {
                let (players_online, players_max) = match info.players {
                    Some(pl) => (pl.online, pl.max),
                    None => (None, None),
                };
                return ServerStatus {
                    online: true,
                    host,
                    port: target_port,
                    ping_ms: None,
                    players_online,
                    players_max,
                };
            }
        }
    }

    // 3. Fallback final: Handshake TCP simple de conectividad
    let tcp_addr = format!("{}:{}", host, target_port);
    let start = std::time::Instant::now();
    let tcp_probe = tokio::time::timeout(
        std::time::Duration::from_millis(1500),
        tokio::net::TcpStream::connect(&tcp_addr),
    )
    .await;

    if matches!(tcp_probe, Ok(Ok(_))) {
        return ServerStatus {
            online: true,
            host,
            port: target_port,
            ping_ms: Some(start.elapsed().as_millis() as u64),
            players_online: None,
            players_max: None,
        };
    }

    // Servidor inaccesible
    ServerStatus {
        online: false,
        host,
        port: target_port,
        ping_ms: None,
        players_online: None,
        players_max: None,
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

    #[tokio::test]
    async fn test_varint_roundtrip() {
        let test_values = [0, 1, 127, 128, 255, 25565, -1];
        for &val in &test_values {
            let mut buf = Vec::new();
            write_varint(&mut buf, val);

            let mut cursor = std::io::Cursor::new(buf);
            let decoded = read_varint(&mut cursor).await.unwrap();
            assert_eq!(decoded, val, "VarInt mismatch for value {}", val);
        }
    }

    #[tokio::test]
    async fn test_check_server_status_live_minecraft() {
        let status = check_server_status("gek0.duckdns.org".to_string(), Some(25565)).await;
        println!("Live status returned: {:?}", status);
        assert!(status.online);
        assert!(status.ping_ms.is_some());
        assert_eq!(status.players_online, Some(0));
        assert_eq!(status.players_max, Some(20));
    }
}
