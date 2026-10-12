use std::fs;
use std::path::Path;

pub fn ensure_instance_structure(instance_dir: &Path) -> Result<(), String> {
    let subdirs = [
        "mods",
        "config",
        "logs",
        "saves",
        "resourcepacks",
        "natives",
    ];

    for sub in &subdirs {
        let dir = instance_dir.join(sub);
        if !dir.exists() {
            fs::create_dir_all(&dir)
                .map_err(|e| format!("Error al crear subdirectorio {}: {}", dir.display(), e))?;
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ensure_instance_structure_creates_subdirs() {
        let temp_dir = std::env::temp_dir().join("monoevents_test_env");
        let _ = fs::remove_dir_all(&temp_dir);

        let res = ensure_instance_structure(&temp_dir);
        assert!(res.is_ok());

        assert!(temp_dir.join("mods").exists());
        assert!(temp_dir.join("config").exists());
        assert!(temp_dir.join("logs").exists());
        assert!(temp_dir.join("natives").exists());

        let _ = fs::remove_dir_all(temp_dir);
    }
}
