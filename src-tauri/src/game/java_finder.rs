use std::path::{Path, PathBuf};
use std::process::Command;

pub fn find_system_java_17() -> Option<PathBuf> {
    // 1. Check JAVA_HOME environment variable
    if let Ok(java_home) = std::env::var("JAVA_HOME") {
        let bin_java = Path::new(&java_home).join("bin").join("java.exe");
        if bin_java.exists() && is_java_version_17(&bin_java) {
            return Some(bin_java);
        }
    }

    // 2. Check PATH by running 'where java.exe' on Windows
    #[cfg(target_os = "windows")]
    {
        if let Ok(output) = Command::new("where").arg("java.exe").output() {
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                for line in stdout.lines() {
                    let path = PathBuf::from(line.trim());
                    if path.exists() && is_java_version_17(&path) {
                        return Some(path);
                    }
                }
            }
        }
    }

    // 3. Scan common standard installation directories
    let program_files = std::env::var("ProgramFiles").unwrap_or_else(|_| r"C:\Program Files".to_string());
    let search_roots = [
        PathBuf::from(&program_files).join("Eclipse Adoptium"),
        PathBuf::from(&program_files).join("Java"),
        PathBuf::from(&program_files).join("Microsoft"),
    ];

    for root in &search_roots {
        if root.exists() {
            if let Ok(entries) = std::fs::read_dir(root) {
                for entry in entries.flatten() {
                    let candidate = entry.path().join("bin").join("java.exe");
                    if candidate.exists() && is_java_version_17(&candidate) {
                        return Some(candidate);
                    }
                }
            }
        }
    }

    None
}

fn is_java_version_17(java_path: &Path) -> bool {
    let output = Command::new(java_path).arg("-version").output();
    match output {
        Ok(out) => {
            // java -version prints to stderr
            let version_str = String::from_utf8_lossy(&out.stderr);
            version_str.contains("\"17.") || version_str.contains(" 17.")
        }
        Err(_) => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_java_detection_finds_runtime() {
        // On this machine Temurin-17 is installed
        let java = find_system_java_17();
        assert!(java.is_some(), "Java 17 should be detected on the system");
        let path = java.unwrap();
        assert!(path.exists());
        assert!(is_java_version_17(&path));
    }
}
