use std::path::{Path, PathBuf};

pub fn find_system_java_17() -> Option<PathBuf> {
    // 1. Check JAVA_HOME
    if let Ok(java_home) = std::env::var("JAVA_HOME") {
        let bin_java = Path::new(&java_home).join("bin").join("java.exe");
        if bin_java.exists() {
            return Some(bin_java);
        }
    }

    // 2. Check standard Windows Program Files directories
    let candidates = [
        r"C:\Program Files\Eclipse Adoptium\jdk-17",
        r"C:\Program Files\Java\jdk-17",
        r"C:\Program Files\Microsoft\jdk-17",
    ];

    for candidate in candidates {
        let java_exe = Path::new(candidate).join("bin").join("java.exe");
        if java_exe.exists() {
            return Some(java_exe);
        }
    }

    None
}
