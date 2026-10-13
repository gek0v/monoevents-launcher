use serde_json::json;
use std::fs::{File, OpenOptions};
use std::io::{Read, Write};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

pub const DISCORD_CLIENT_ID: &str = "450485984333660181";

/// Encodes a Discord IPC packet: 4 bytes opcode (LE) + 4 bytes payload length (LE) + payload
pub fn encode_packet(opcode: u32, payload: &str) -> Vec<u8> {
    let payload_bytes = payload.as_bytes();
    let mut packet = Vec::with_capacity(8 + payload_bytes.len());
    packet.extend_from_slice(&opcode.to_le_bytes());
    packet.extend_from_slice(&(payload_bytes.len() as u32).to_le_bytes());
    packet.extend_from_slice(payload_bytes);
    packet
}

#[derive(Debug, Clone, PartialEq)]
pub enum DiscordActivityState {
    InLauncher,
    InGame {
        start_timestamp: u64,
        server_ip: String,
    },
}

pub struct DiscordIpcClient {
    pipe: File,
}

impl DiscordIpcClient {
    /// Attempts to connect to Discord's local IPC named pipe (probes 0..=9).
    /// Returns Err if Discord is not running or pipe cannot be opened.
    pub fn connect() -> Result<Self, String> {
        let mut pipe_file = None;

        for i in 0..10 {
            let pipe_path = format!(r"\\.\pipe\discord-ipc-{}", i);
            if let Ok(file) = OpenOptions::new().read(true).write(true).open(&pipe_path) {
                pipe_file = Some(file);
                break;
            }
        }

        let mut file = pipe_file.ok_or_else(|| "Discord no está en ejecución".to_string())?;

        // Handshake packet (Opcode 0)
        let handshake_payload = json!({
            "v": 1,
            "client_id": DISCORD_CLIENT_ID
        })
        .to_string();

        let packet = encode_packet(0, &handshake_payload);
        file.write_all(&packet)
            .map_err(|e| format!("Error al enviar handshake a Discord: {}", e))?;

        // Read handshake response
        let mut header = [0u8; 8];
        file.read_exact(&mut header)
            .map_err(|e| format!("Error al leer respuesta de handshake: {}", e))?;

        let length = u32::from_le_bytes(header[4..8].try_into().unwrap()) as usize;
        if length > 1_000_000 {
            return Err("Payload de handshake excede el límite de seguridad (1MB)".to_string());
        }
        let mut response_buf = vec![0u8; length];
        file.read_exact(&mut response_buf)
            .map_err(|e| format!("Error al leer cuerpo de handshake: {}", e))?;

        Ok(Self { pipe: file })
    }

    /// Builds activity JSON payload for the given state.
    pub fn build_activity_payload(state: &DiscordActivityState) -> serde_json::Value {
        let pid = std::process::id();
        match state {
            DiscordActivityState::InLauncher => json!({
                "cmd": "SET_ACTIVITY",
                "args": {
                    "pid": pid,
                    "activity": {
                        "details": "En el menú principal",
                        "state": "MonoEvents: Noche de Sangre",
                        "assets": {
                            "large_image": "halloween",
                            "large_text": "MonoEvents: Noche de Sangre"
                        }
                    }
                },
                "nonce": "monoevents-launcher"
            }),
            DiscordActivityState::InGame { start_timestamp, server_ip } => json!({
                "cmd": "SET_ACTIVITY",
                "args": {
                    "pid": pid,
                    "activity": {
                        "details": format!("Jugando en {}", server_ip),
                        "state": "MonoEvents: Noche de Sangre",
                        "timestamps": {
                            "start": start_timestamp
                        },
                        "assets": {
                            "large_image": "halloween",
                            "large_text": "MonoEvents: Noche de Sangre",
                            "small_image": "forge",
                            "small_text": "Forge 1.20.1"
                        }
                    }
                },
                "nonce": "monoevents-game"
            }),
        }
    }

    /// Sends a SET_ACTIVITY frame (Opcode 1)
    pub fn set_activity(&mut self, state: &DiscordActivityState) -> Result<(), String> {
        let payload = Self::build_activity_payload(state).to_string();
        let packet = encode_packet(1, &payload);
        self.pipe
            .write_all(&packet)
            .map_err(|e| format!("Error enviando actividad a Discord: {}", e))?;
        self.pipe
            .flush()
            .map_err(|e| format!("Error al vaciar búfer de pipe: {}", e))?;
        Ok(())
    }

    /// Clears the activity (sets activity to null)
    pub fn clear_activity(&mut self) -> Result<(), String> {
        let pid = std::process::id();
        let payload = json!({
            "cmd": "SET_ACTIVITY",
            "args": {
                "pid": pid,
                "activity": null
            },
            "nonce": "monoevents-clear"
        })
        .to_string();

        let packet = encode_packet(1, &payload);
        self.pipe
            .write_all(&packet)
            .map_err(|e| format!("Error limpiando actividad en Discord: {}", e))?;
        self.pipe
            .flush()
            .map_err(|e| format!("Error al vaciar búfer de pipe: {}", e))?;
        Ok(())
    }
}

// Global thread-safe client cache
static GLOBAL_DISCORD_CLIENT: Mutex<Option<DiscordIpcClient>> = Mutex::new(None);

/// Global helper to set Discord activity. Automatically connects if disconnected.
pub fn set_activity(state: DiscordActivityState) -> Result<(), String> {
    let mut lock = GLOBAL_DISCORD_CLIENT
        .lock()
        .map_err(|_| "Error adquiriendo bloqueo de Discord RPC".to_string())?;

    if lock.is_none() {
        match DiscordIpcClient::connect() {
            Ok(client) => *lock = Some(client),
            Err(e) => return Err(e),
        }
    }

    if let Some(client) = lock.as_mut() {
        if let Err(e) = client.set_activity(&state) {
            // Drop broken client so subsequent calls retry fresh connection
            *lock = None;
            return Err(e);
        }
    }

    Ok(())
}

/// Global helper to clear Discord activity.
pub fn clear_activity() -> Result<(), String> {
    let mut lock = GLOBAL_DISCORD_CLIENT
        .lock()
        .map_err(|_| "Error adquiriendo bloqueo de Discord RPC".to_string())?;

    if let Some(client) = lock.as_mut() {
        let res = client.clear_activity();
        *lock = None; // Reset client on clear
        return res;
    }

    Ok(())
}

/// Helper to get current epoch timestamp in seconds
pub fn current_epoch_seconds() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encode_discord_packet() {
        let payload = r#"{"v":1,"client_id":"450485984333660181"}"#;
        let packet = encode_packet(0, payload);
        assert_eq!(&packet[0..4], &0u32.to_le_bytes()); // Opcode 0
        assert_eq!(&packet[4..8], &(payload.len() as u32).to_le_bytes()); // Length
        assert_eq!(&packet[8..], payload.as_bytes());
    }

    #[test]
    fn test_build_activity_payloads() {
        let launcher_payload = DiscordIpcClient::build_activity_payload(&DiscordActivityState::InLauncher);
        assert_eq!(
            launcher_payload["args"]["activity"]["details"],
            "En el menú principal"
        );
        assert_eq!(
            launcher_payload["args"]["activity"]["state"],
            "MonoEvents: Noche de Sangre"
        );

        let game_payload = DiscordIpcClient::build_activity_payload(&DiscordActivityState::InGame {
            start_timestamp: 1728830000,
            server_ip: "gek0.duckdns.org".to_string(),
        });
        assert_eq!(
            game_payload["args"]["activity"]["details"],
            "Jugando en gek0.duckdns.org"
        );
        assert_eq!(
            game_payload["args"]["activity"]["timestamps"]["start"],
            1728830000
        );
        assert_eq!(
            game_payload["args"]["activity"]["assets"]["small_image"],
            "forge"
        );
        assert_eq!(
            game_payload["args"]["activity"]["assets"]["small_text"],
            "Forge 1.20.1"
        );
    }
}
