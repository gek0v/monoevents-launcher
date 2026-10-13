use std::path::{Path, PathBuf};
use std::sync::Mutex;
use serde::{Deserialize, Serialize};
use sysinfo::System;
use tauri::Emitter;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum GameState {
    Idle,
    Launching,
    Running,
    Crashed,
    Exited,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessEvent {
    pub state: GameState,
    pub exit_code: Option<i32>,
    pub crash_report: Option<String>,
}

static ACTIVE_WATCHER_PID: Mutex<Option<u32>> = Mutex::new(None);

#[cfg(target_os = "windows")]
pub fn is_pid_alive(pid: u32) -> bool {
    extern "system" {
        fn OpenProcess(dwDesiredAccess: u32, bInheritHandle: i32, dwProcessId: u32) -> *mut std::ffi::c_void;
        fn CloseHandle(hObject: *mut std::ffi::c_void) -> i32;
        fn GetExitCodeProcess(hProcess: *mut std::ffi::c_void, lpExitCode: *mut u32) -> i32;
    }
    const PROCESS_QUERY_LIMITED_INFORMATION: u32 = 0x1000;
    const STILL_ACTIVE: u32 = 259;

    unsafe {
        let handle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid);
        if handle.is_null() {
            return false;
        }
        let mut exit_code: u32 = 0;
        let res = GetExitCodeProcess(handle, &mut exit_code);
        CloseHandle(handle);
        res != 0 && exit_code == STILL_ACTIVE
    }
}

#[cfg(not(target_os = "windows"))]
pub fn is_pid_alive(pid: u32) -> bool {
    let mut sys = sysinfo::System::new();
    let sys_pid = sysinfo::Pid::from_u32(pid);
    sys.refresh_processes(sysinfo::ProcessesToUpdate::Some(&[sys_pid]), true);
    sys.process(sys_pid).is_some()
}

pub fn find_running_game_process(instance_dir: &Path) -> Option<u32> {
    // 1. Fast path: check cached PID file in instance_dir
    let pid_file = instance_dir.join(".game.pid");
    if pid_file.exists() {
        if let Ok(content) = std::fs::read_to_string(&pid_file) {
            if let Ok(pid) = content.trim().parse::<u32>() {
                if is_pid_alive(pid) {
                    return Some(pid);
                } else {
                    let _ = std::fs::remove_file(&pid_file);
                }
            }
        }
    }

    // 2. Fallback: scan active processes for java instances matching the modpack instance
    let mut sys = System::new_all();
    sys.refresh_all();

    let instance_dir_str = instance_dir
        .to_string_lossy()
        .to_lowercase()
        .replace('/', "\\");
    let instance_name = instance_dir
        .file_name()
        .map(|n| n.to_string_lossy().to_lowercase())
        .unwrap_or_default();

    for (pid, process) in sys.processes() {
        let name = process.name();
        let is_java = name.eq_ignore_ascii_case("javaw.exe")
            || name.eq_ignore_ascii_case("java.exe")
            || name.eq_ignore_ascii_case("javaw")
            || name.eq_ignore_ascii_case("java");

        if is_java {
            let cmd_args: Vec<String> = process
                .cmd()
                .iter()
                .map(|s| s.to_string_lossy().to_lowercase().replace('/', "\\"))
                .collect();
            let cmd_full = cmd_args.join(" ");

            let matches = (!instance_dir_str.is_empty() && cmd_full.contains(&instance_dir_str))
                || (!instance_name.is_empty()
                    && cmd_full.contains(&instance_name)
                    && (cmd_full.contains("bootstraplauncher") || cmd_full.contains("forge") || cmd_full.contains("minecraft")));

            if matches {
                let pid_u32 = pid.as_u32();
                // Cache PID for instantaneous checks
                let _ = std::fs::write(&pid_file, pid_u32.to_string());
                return Some(pid_u32);
            }
        }
    }

    None
}

pub fn watch_existing_game_process(app: tauri::AppHandle, pid: u32, instance_dir: PathBuf) {
    {
        if let Ok(mut watcher) = ACTIVE_WATCHER_PID.lock() {
            if watcher.as_ref() == Some(&pid) {
                // Watcher is already actively monitoring this PID
                return;
            }
            *watcher = Some(pid);
        }
    }

    std::thread::spawn(move || {
        while is_pid_alive(pid) {
            std::thread::sleep(std::time::Duration::from_millis(1500));
        }

        // Process exited - clean up PID file
        let pid_file = instance_dir.join(".game.pid");
        let _ = std::fs::remove_file(&pid_file);

        if let Ok(mut watcher) = ACTIVE_WATCHER_PID.lock() {
            *watcher = None;
        }

        // Restore launcher window if it was hidden
        use tauri::Manager;
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.show();
            let _ = window.set_focus();
        }

        let _ = app.emit(
            "game-status",
            ProcessEvent {
                state: GameState::Exited,
                exit_code: Some(0),
                crash_report: None,
            },
        );
        let _ = app.emit("game-stopped", 0);

        // Revert Discord activity back to launcher state if enabled
        let settings = crate::config::load_settings();
        if settings.enable_discord_rpc {
            let _ = crate::discord::set_activity(crate::discord::DiscordActivityState::InLauncher);
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_pid_alive() {
        let fake_dead = is_pid_alive(999999);
        assert!(!fake_dead);
    }

    #[test]
    fn test_find_running_game_process_with_pid_file() {
        let temp_dir = std::env::temp_dir().join("monoevents_test_pid_monitor");
        let _ = std::fs::create_dir_all(&temp_dir);
        let pid_file = temp_dir.join(".game.pid");

        // Write invalid/dead PID
        let _ = std::fs::write(&pid_file, "999999");
        let found = find_running_game_process(&temp_dir);
        assert!(found.is_none());
        assert!(!pid_file.exists()); // Dead pid file should be removed

        let _ = std::fs::remove_dir_all(temp_dir);
    }

    #[test]
    fn test_find_running_game_process_live() {
        let instance = std::path::PathBuf::from(r"C:\Users\Geko\AppData\Roaming\.monoevents\instances\monocraft-halloween-1.20.1");
        if instance.exists() {
            let pid = find_running_game_process(&instance);
            println!("LIVE DETECTION FOR MONOCRAFT INSTANCE: {:?}", pid);
        }
    }
}
