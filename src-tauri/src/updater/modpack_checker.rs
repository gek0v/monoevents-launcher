use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use crate::downloader::verify_file_sha1;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum UpdateAction {
    UpToDate,
    UpdateRequired,
    LauncherUpdateRequired,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModpackFile {
    pub path: String,
    pub url: String,
    pub sha1: String,
    pub size: u64,
    #[serde(rename = "type")]
    pub file_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MinecraftConfig {
    pub version: String,
    pub modloader: String,
    pub modloader_version: Option<String>,
    pub java_version: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModpackManifest {
    pub schema_version: Option<u32>,
    pub id: String,
    pub name: String,
    pub version: String,
    pub minecraft: MinecraftConfig,
    pub changelog: Option<String>,
    pub files: Vec<ModpackFile>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeltaReport {
    pub action: UpdateAction,
    pub current_version: Option<String>,
    pub target_version: String,
    pub changelog: Option<String>,
    pub files_to_download: Vec<ModpackFile>,
    pub files_to_delete: Vec<PathBuf>,
    pub total_download_bytes: u64,
}

pub fn evaluate_modpack_delta(
    manifest: &ModpackManifest,
    instance_dir: &Path,
    installed_version: Option<&str>,
) -> DeltaReport {
    let mut files_to_download = Vec::new();
    let mut total_download_bytes = 0u64;

    // 1. Check which files are missing or have mismatched SHA-1
    for file in &manifest.files {
        // Normalize path for Windows / Unix
        let clean_rel_path = file.path.replace('/', std::path::MAIN_SEPARATOR_STR);
        let target_path = instance_dir.join(&clean_rel_path);

        if !verify_file_sha1(&target_path, &file.sha1) {
            files_to_download.push(file.clone());
            total_download_bytes += file.size;
        }
    }

    // 2. Orphan detection in mods/ folder
    let mut files_to_delete = Vec::new();
    let mods_dir = instance_dir.join("mods");
    if mods_dir.exists() && mods_dir.is_dir() {
        if let Ok(entries) = fs::read_dir(&mods_dir) {
            for entry in entries.flatten() {
                let entry_path = entry.path();
                if entry_path.is_file() {
                    let is_jar = entry_path
                        .extension()
                        .map(|ext| ext.eq_ignore_ascii_case("jar"))
                        .unwrap_or(false);

                    if is_jar {
                        let filename = entry_path.file_name().unwrap_or_default().to_string_lossy();
                        let rel_check = format!("mods/{}", filename);
                        let is_in_manifest = manifest.files.iter().any(|f| {
                            f.path.replace('\\', "/").eq_ignore_ascii_case(&rel_check)
                        });

                        if !is_in_manifest {
                            files_to_delete.push(entry_path);
                        }
                    }
                }
            }
        }
    }

    // Resolve installed version: from argument, or read installed_manifest.json from disk
    let resolved_installed_version: Option<String> = match installed_version {
        Some(v) => Some(v.to_string()),
        None => {
            let manifest_file = instance_dir.join("installed_manifest.json");
            if manifest_file.exists() {
                if let Ok(content) = fs::read_to_string(&manifest_file) {
                    if let Ok(installed) = serde_json::from_str::<ModpackManifest>(&content) {
                        Some(installed.version)
                    } else {
                        None
                    }
                } else {
                    None
                }
            } else {
                None
            }
        }
    };

    let files_complete = files_to_download.is_empty() && files_to_delete.is_empty();

    let version_mismatch = match &resolved_installed_version {
        Some(v) => v != &manifest.version,
        None => !files_complete,
    };

    let action = if version_mismatch || !files_complete {
        UpdateAction::UpdateRequired
    } else {
        UpdateAction::UpToDate
    };

    DeltaReport {
        action,
        current_version: resolved_installed_version,
        target_version: manifest.version.clone(),
        changelog: manifest.changelog.clone(),
        files_to_download,
        files_to_delete,
        total_download_bytes,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    #[test]
    fn test_delta_evaluation_and_orphans() {
        let temp_dir = std::env::temp_dir().join("monoevents_test_delta");
        let _ = fs::remove_dir_all(&temp_dir);
        let mods_dir = temp_dir.join("mods");
        fs::create_dir_all(&mods_dir).expect("Failed to create mods dir");

        // Create an existing orphan mod
        let orphan_file = mods_dir.join("old_obsolete_mod-1.0.jar");
        let mut f = fs::File::create(&orphan_file).expect("Failed to create orphan file");
        f.write_all(b"old mod content").unwrap();

        // Sample manifest with 1 mod
        let manifest = ModpackManifest {
            schema_version: Some(1),
            id: "test-pack".to_string(),
            name: "Test Modpack".to_string(),
            version: "1.2.0".to_string(),
            minecraft: MinecraftConfig {
                version: "1.20.1".to_string(),
                modloader: "forge".to_string(),
                modloader_version: Some("47.4.22".to_string()),
                java_version: Some(17),
            },
            changelog: Some("Test changelog".to_string()),
            files: vec![ModpackFile {
                path: "mods/new_mod-1.2.0.jar".to_string(),
                url: "https://example.com/mod.jar".to_string(),
                sha1: "abc123456789".to_string(),
                size: 1024,
                file_type: "custom".to_string(),
            }],
        };

        // 1. Initial check (needs download of new_mod and deletion of old_mod)
        let delta = evaluate_modpack_delta(&manifest, &temp_dir, Some("1.1.0"));
        assert_eq!(delta.action, UpdateAction::UpdateRequired);
        assert_eq!(delta.files_to_download.len(), 1);
        assert_eq!(delta.files_to_download[0].path, "mods/new_mod-1.2.0.jar");
        assert_eq!(delta.files_to_delete.len(), 1);
        assert_eq!(delta.files_to_delete[0], orphan_file);

        let _ = fs::remove_dir_all(temp_dir);
    }

    #[test]
    fn test_delta_evaluation_up_to_date_when_files_match() {
        let temp_dir = std::env::temp_dir().join("monoevents_test_delta_uptodate");
        let _ = fs::remove_dir_all(&temp_dir);
        let mods_dir = temp_dir.join("mods");
        fs::create_dir_all(&mods_dir).expect("Failed to create mods dir");

        // Write a test mod file with known content and sha1
        let test_mod_file = mods_dir.join("test_mod.jar");
        fs::write(&test_mod_file, b"sample jar data").unwrap();
        let expected_sha1 = crate::downloader::validator::calculate_sha1(&test_mod_file).unwrap();

        let manifest = ModpackManifest {
            schema_version: Some(1),
            id: "test-pack".to_string(),
            name: "Test Modpack".to_string(),
            version: "1.2.0".to_string(),
            minecraft: MinecraftConfig {
                version: "1.20.1".to_string(),
                modloader: "forge".to_string(),
                modloader_version: Some("47.4.22".to_string()),
                java_version: Some(17),
            },
            changelog: Some("Test changelog".to_string()),
            files: vec![ModpackFile {
                path: "mods/test_mod.jar".to_string(),
                url: "https://example.com/mod.jar".to_string(),
                sha1: expected_sha1,
                size: 15,
                file_type: "custom".to_string(),
            }],
        };

        // Write installed_manifest.json with same version
        let manifest_json = serde_json::to_string(&manifest).unwrap();
        fs::write(temp_dir.join("installed_manifest.json"), manifest_json).unwrap();

        let delta = evaluate_modpack_delta(&manifest, &temp_dir, None);
        assert_eq!(delta.action, UpdateAction::UpToDate);
        assert!(delta.files_to_download.is_empty());
        assert!(delta.files_to_delete.is_empty());

        let _ = fs::remove_dir_all(temp_dir);
    }
}
