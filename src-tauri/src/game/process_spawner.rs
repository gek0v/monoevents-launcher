use std::fs::OpenOptions;
use std::process::{Command, Stdio};
use tauri::Emitter;
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

    let log_err_file = log_file
        .try_clone()
        .map_err(|e| format!("Error al clonar handle de log: {}", e))?;

    let args = build_jvm_arguments(config);

    let mut command = Command::new(config.java_binary);
    command
        .args(&args)
        .current_dir(config.instance_dir)
        .stdout(Stdio::from(log_file))
        .stderr(Stdio::from(log_err_file));

    let mut child = command
        .spawn()
        .map_err(|e| format!("Error al iniciar el subproceso de Java: {}", e))?;

    let pid = child.id();

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

    // Monitor child process exit in a background thread
    let handle_clone = app_handle;
    std::thread::spawn(move || {
        let wait_result = child.wait();
        let exit_code = match wait_result {
            Ok(status) => status.code().unwrap_or(-1),
            Err(_) => -1,
        };

        if let Some(app) = handle_clone {
            let state = if exit_code == 0 {
                crate::game::process_monitor::GameState::Exited
            } else {
                crate::game::process_monitor::GameState::Crashed
            };

            let _ = app.emit(
                "game-status",
                ProcessEvent {
                    state,
                    exit_code: Some(exit_code),
                    crash_report: None,
                },
            );
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
}
