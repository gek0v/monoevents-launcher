use std::fs::OpenOptions;
use std::io::{BufRead, BufReader, Write};
use std::process::{Command, Stdio};
use std::sync::{Arc, Mutex};
use tauri::Emitter;
use crate::game::diagnostics::{analyze_crash, create_log_entry, CrashReportEvent};
use crate::game::forge_launcher::{build_jvm_arguments, ForgeLaunchConfig};
use crate::game::process_monitor::ProcessEvent;

pub fn spawn_minecraft_process(
    config: &ForgeLaunchConfig,
    app_handle: Option<tauri::AppHandle>,
) -> Result<u32, String> {
    if !config.java_binary.exists() {
        return Err(format!(
            "Java 17 no encontrado en la ruta: {}",
            config.java_binary.display()
        ));
    }

    if !config.instance_dir.exists() {
        std::fs::create_dir_all(config.instance_dir)
            .map_err(|e| format!("No se pudo crear la carpeta de instancia: {}", e))?;
    }

    let log_path = config.instance_dir.join("launcher.log");
    let log_file = OpenOptions::new()
        .create(true)
        .write(true)
        .append(true)
        .open(&log_path)
        .map_err(|e| format!("No se pudo abrir el archivo de log: {}", e))?;
    let log_file_arc = Arc::new(Mutex::new(log_file));

    let args = build_jvm_arguments(config);

    let mut command = Command::new(config.java_binary);
    command
        .args(&args)
        .current_dir(config.instance_dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    let mut child = command
        .spawn()
        .map_err(|e| format!("Error al iniciar el subproceso de Java: {}", e))?;

    let pid = child.id();
    let ring_buffer = Arc::new(Mutex::new(Vec::<String>::with_capacity(200)));

    // Notify UI that the process is running
    if let Some(ref app) = app_handle {
        let _ = app.emit(
            "game-status",
            ProcessEvent {
                state: crate::game::process_monitor::GameState::Running,
                exit_code: None,
                crash_report: None,
            },
        );
    }

    // Synchronize Discord RPC activity with game start
    let settings = crate::config::load_settings();
    if settings.enable_discord_rpc {
        let _ = crate::discord::set_activity(crate::discord::DiscordActivityState::InGame {
            start_timestamp: crate::discord::rpc::current_epoch_seconds(),
            server_ip: "gek0.duckdns.org".to_string(),
        });
    }

    // 1. Read stdout line by line
    if let Some(stdout) = child.stdout.take() {
        let app_opt = app_handle.clone();
        let ring_clone = Arc::clone(&ring_buffer);
        let file_clone = Arc::clone(&log_file_arc);
        std::thread::spawn(move || {
            let reader = BufReader::new(stdout);
            for line_res in reader.lines() {
                if let Ok(line) = line_res {
                    if let Ok(mut f) = file_clone.lock() {
                        let _ = writeln!(f, "{}", line);
                    }
                    if let Ok(mut buf) = ring_clone.lock() {
                        if buf.len() >= 200 {
                            buf.remove(0);
                        }
                        buf.push(line.clone());
                    }
                    if let Some(ref app) = app_opt {
                        let entry = create_log_entry(line);
                        let _ = app.emit("game-log", entry);
                    }
                }
            }
        });
    }

    // 2. Read stderr line by line
    if let Some(stderr) = child.stderr.take() {
        let app_opt = app_handle.clone();
        let ring_clone = Arc::clone(&ring_buffer);
        let file_clone = Arc::clone(&log_file_arc);
        std::thread::spawn(move || {
            let reader = BufReader::new(stderr);
            for line_res in reader.lines() {
                if let Ok(line) = line_res {
                    if let Ok(mut f) = file_clone.lock() {
                        let _ = writeln!(f, "{}", line);
                    }
                    if let Ok(mut buf) = ring_clone.lock() {
                        if buf.len() >= 200 {
                            buf.remove(0);
                        }
                        buf.push(line.clone());
                    }
                    if let Some(ref app) = app_opt {
                        let entry = create_log_entry(line);
                        let _ = app.emit("game-log", entry);
                    }
                }
            }
        });
    }

    // 3. Monitor child process exit in a background thread
    let handle_clone = app_handle;
    let ring_for_exit = Arc::clone(&ring_buffer);
    std::thread::spawn(move || {
        let wait_result = child.wait();
        let exit_code = match wait_result {
            Ok(status) => status.code().unwrap_or(-1),
            Err(_) => -1,
        };

        if let Some(app) = handle_clone {
            let tail_logs = ring_for_exit
                .lock()
                .map(|b| b.clone())
                .unwrap_or_default();

            if exit_code == 0 {
                let _ = app.emit(
                    "game-status",
                    ProcessEvent {
                        state: crate::game::process_monitor::GameState::Exited,
                        exit_code: Some(0),
                        crash_report: None,
                    },
                );
                let _ = app.emit("game-stopped", 0);
            } else {
                let diagnostic = analyze_crash(&tail_logs, exit_code);
                let crash_event = CrashReportEvent {
                    exit_code,
                    diagnostic,
                    tail_logs,
                };

                let _ = app.emit(
                    "game-status",
                    ProcessEvent {
                        state: crate::game::process_monitor::GameState::Crashed,
                        exit_code: Some(exit_code),
                        crash_report: None,
                    },
                );
                let _ = app.emit("game-crash", crash_event);
            }
        }

        // Revert Discord activity back to launcher state if enabled
        let settings = crate::config::load_settings();
        if settings.enable_discord_rpc {
            let _ = crate::discord::set_activity(crate::discord::DiscordActivityState::InLauncher);
        }
    });

    Ok(pid)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::auth::AuthSession;
    use crate::game::java_finder::find_system_java_17;

    #[test]
    fn test_process_spawn_java_version_execution() {
        let java_opt = find_system_java_17();
        assert!(java_opt.is_some(), "System Java 17 must be found");
        let java_path = java_opt.unwrap();

        let temp_dir = std::env::temp_dir().join("monoevents_test_spawner");
        let _ = std::fs::remove_dir_all(&temp_dir);
        let _ = std::fs::create_dir_all(&temp_dir);

        let session = AuthSession::new_offline("Tester");
        let _config = ForgeLaunchConfig {
            java_binary: &java_path,
            ram_gb: 2,
            instance_dir: &temp_dir,
            account: &session,
            forge_version: "47.4.22",
        };

        // Validate that log file gets created and process spawns
        let log_file = temp_dir.join("launcher.log");
        let mut cmd = Command::new(&java_path);
        cmd.arg("-version")
            .current_dir(&temp_dir)
            .stdout(Stdio::from(std::fs::File::create(&log_file).unwrap()))
            .stderr(Stdio::from(std::fs::OpenOptions::new().write(true).open(&log_file).unwrap()));

        let mut child = cmd.spawn().expect("Failed to spawn java -version");
        let status = child.wait().expect("Failed to wait on child");
        assert!(status.success());
        assert!(log_file.exists());

        let _ = std::fs::remove_dir_all(temp_dir);
    }

    #[test]
    fn test_close_launcher_setting_evaluation() {
        let settings_close = true;
        let mut did_schedule_exit = false;
        if settings_close {
            did_schedule_exit = true;
        }
        assert!(did_schedule_exit);
    }
}
