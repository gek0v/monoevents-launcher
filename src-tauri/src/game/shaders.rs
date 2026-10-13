use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs;
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ShaderpackInfo {
    pub name: String,
    pub filename: String,
    pub is_active: bool,
    pub size_mb: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct GraphicsState {
    pub active_preset: Option<String>,
    pub active_shader: Option<String>,
    pub shaders_enabled: bool,
    pub render_distance: u32,
    pub particles: u32,
    pub graphics_mode: u32,
    pub available_shaders: Vec<ShaderpackInfo>,
}

/// Parses Oculus `optionsshaders.txt` content to retrieve the active shaderpack name.
/// Returns None if shaders are set to OFF or file is empty.
pub fn parse_active_shader(content: &str) -> Option<String> {
    for line in content.lines() {
        let trimmed = line.trim();
        if let Some(val) = trimmed.strip_prefix("shaderPack=") {
            let clean = val.trim();
            if clean.is_empty() || clean.eq_ignore_ascii_case("OFF") {
                return None;
            }
            return Some(clean.to_string());
        }
    }
    None
}

/// Serializes shaderpack name into Oculus `optionsshaders.txt` format.
pub fn serialize_active_shader(shader: Option<&str>) -> String {
    match shader {
        Some(name) if !name.trim().is_empty() && !name.trim().eq_ignore_ascii_case("OFF") => {
            format!("shaderPack={}\n", name.trim())
        }
        _ => "shaderPack=OFF\n".to_string(),
    }
}

/// Non-destructively updates `options.txt` keys while strictly preserving all other player settings.
pub fn update_options_txt(
    original: &str,
    render_dist: u32,
    sim_dist: u32,
    particles: u32,
    graphics_mode: u32,
    max_fps: u32,
) -> String {
    let mut updated_lines = Vec::new();
    let mut handled_keys = HashSet::new();

    for line in original.lines() {
        let trimmed = line.trim();
        if let Some(pos) = trimmed.find(':') {
            let key = &trimmed[..pos];
            match key {
                "renderDistance" => {
                    updated_lines.push(format!("renderDistance:{}", render_dist));
                    handled_keys.insert("renderDistance");
                }
                "simulationDistance" => {
                    updated_lines.push(format!("simulationDistance:{}", sim_dist));
                    handled_keys.insert("simulationDistance");
                }
                "particles" => {
                    updated_lines.push(format!("particles:{}", particles));
                    handled_keys.insert("particles");
                }
                "graphicsMode" => {
                    updated_lines.push(format!("graphicsMode:{}", graphics_mode));
                    handled_keys.insert("graphicsMode");
                }
                "maxFps" => {
                    updated_lines.push(format!("maxFps:{}", max_fps));
                    handled_keys.insert("maxFps");
                }
                _ => {
                    updated_lines.push(line.to_string());
                }
            }
        } else {
            updated_lines.push(line.to_string());
        }
    }

    // Append any keys that did not exist in the original file
    if !handled_keys.contains("renderDistance") {
        updated_lines.push(format!("renderDistance:{}", render_dist));
    }
    if !handled_keys.contains("simulationDistance") {
        updated_lines.push(format!("simulationDistance:{}", sim_dist));
    }
    if !handled_keys.contains("particles") {
        updated_lines.push(format!("particles:{}", particles));
    }
    if !handled_keys.contains("graphicsMode") {
        updated_lines.push(format!("graphicsMode:{}", graphics_mode));
    }
    if !handled_keys.contains("maxFps") {
        updated_lines.push(format!("maxFps:{}", max_fps));
    }

    let mut result = updated_lines.join("\n");
    result.push('\n');
    result
}

/// Scans the `shaderpacks/` directory for `.zip` files or shader folders.
pub fn scan_shaderpacks_dir(dir: &Path, active_shader: Option<&str>) -> Vec<ShaderpackInfo> {
    let mut shaders = Vec::new();
    if !dir.exists() {
        return shaders;
    }

    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            let is_zip = path
                .extension()
                .map(|ext| ext.eq_ignore_ascii_case("zip"))
                .unwrap_or(false);
            let is_dir = path.is_dir();

            if is_zip || is_dir {
                if let Some(filename_os) = path.file_name() {
                    let filename = filename_os.to_string_lossy().to_string();
                    let name = if is_zip {
                        filename.strip_suffix(".zip").unwrap_or(&filename).to_string()
                    } else {
                        filename.clone()
                    };

                    let size_mb = if is_zip {
                        let bytes = entry.metadata().map(|m| m.len()).unwrap_or(0);
                        ((bytes as f64 / (1024.0 * 1024.0)) * 100.0).round() / 100.0
                    } else {
                        0.0
                    };

                    let is_active = active_shader
                        .map(|act| act.eq_ignore_ascii_case(&filename))
                        .unwrap_or(false);

                    shaders.push(ShaderpackInfo {
                        name,
                        filename,
                        is_active,
                        size_mb,
                    });
                }
            }
        }
    }

    shaders.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    shaders
}

/// Reads the current GraphicsState from the given instance directory.
pub fn get_graphics_state_internal(instance_dir: &Path) -> Result<GraphicsState, String> {
    let options_shaders_path = instance_dir.join("optionsshaders.txt");
    let active_shader = if options_shaders_path.exists() {
        let content = fs::read_to_string(&options_shaders_path)
            .map_err(|e| format!("Error al leer optionsshaders.txt: {}", e))?;
        parse_active_shader(&content)
    } else {
        None
    };

    let shaders_dir = instance_dir.join("shaderpacks");
    let available_shaders = scan_shaderpacks_dir(&shaders_dir, active_shader.as_deref());
    let shaders_enabled = active_shader.is_some();

    let options_txt_path = instance_dir.join("options.txt");
    let mut render_distance = 12;
    let mut particles = 1;
    let mut graphics_mode = 1;

    if options_txt_path.exists() {
        if let Ok(content) = fs::read_to_string(&options_txt_path) {
            for line in content.lines() {
                let trimmed = line.trim();
                if let Some(pos) = trimmed.find(':') {
                    let key = &trimmed[..pos];
                    let val = &trimmed[pos + 1..];
                    match key {
                        "renderDistance" => {
                            if let Ok(num) = val.parse::<u32>() {
                                render_distance = num;
                            }
                        }
                        "particles" => {
                            if let Ok(num) = val.parse::<u32>() {
                                particles = num;
                            }
                        }
                        "graphicsMode" => {
                            if let Ok(num) = val.parse::<u32>() {
                                graphics_mode = num;
                            }
                        }
                        _ => {}
                    }
                }
            }
        }
    }

    let active_preset = if !shaders_enabled && render_distance <= 8 && particles == 2 {
        Some("pvp".to_string())
    } else if shaders_enabled && render_distance == 12 && particles == 1 {
        Some("balanced".to_string())
    } else if shaders_enabled && render_distance >= 16 && particles == 0 {
        Some("ultra".to_string())
    } else {
        None
    };

    Ok(GraphicsState {
        active_preset,
        active_shader,
        shaders_enabled,
        render_distance,
        particles,
        graphics_mode,
        available_shaders,
    })
}

/// Applies a graphics preset ("pvp", "balanced", "ultra") to the instance.
pub fn apply_preset_internal(instance_dir: &Path, preset_id: &str) -> Result<GraphicsState, String> {
    if !instance_dir.exists() {
        fs::create_dir_all(instance_dir)
            .map_err(|e| format!("Error al crear carpeta de instancia: {}", e))?;
    }

    let (render_dist, sim_dist, particles, graphics_mode, max_fps, enable_shader) = match preset_id {
        "pvp" => (8, 6, 2, 0, 144, false),
        "balanced" => (12, 8, 1, 1, 120, true),
        "ultra" => (16, 10, 0, 1, 260, true),
        other => return Err(format!("Preset desconocido: {}", other)),
    };

    // 1. Update options.txt
    let options_txt_path = instance_dir.join("options.txt");
    let original_options = if options_txt_path.exists() {
        fs::read_to_string(&options_txt_path).unwrap_or_default()
    } else {
        String::new()
    };

    let updated_options = update_options_txt(
        &original_options,
        render_dist,
        sim_dist,
        particles,
        graphics_mode,
        max_fps,
    );
    fs::write(&options_txt_path, updated_options)
        .map_err(|e| format!("Error al guardar options.txt: {}", e))?;

    // 2. Update optionsshaders.txt
    let shaders_dir = instance_dir.join("shaderpacks");
    let available_shaders = scan_shaderpacks_dir(&shaders_dir, None);

    let target_shader = if enable_shader {
        let current_shader = if instance_dir.join("optionsshaders.txt").exists() {
            let c = fs::read_to_string(instance_dir.join("optionsshaders.txt")).unwrap_or_default();
            parse_active_shader(&c)
        } else {
            None
        };

        current_shader.or_else(|| available_shaders.first().map(|s| s.filename.clone()))
    } else {
        None
    };

    let options_shaders_path = instance_dir.join("optionsshaders.txt");
    let serialized_shader = serialize_active_shader(target_shader.as_deref());
    fs::write(&options_shaders_path, serialized_shader)
        .map_err(|e| format!("Error al guardar optionsshaders.txt: {}", e))?;

    get_graphics_state_internal(instance_dir)
}

/// Sets or disables active shaderpack in optionsshaders.txt
pub fn set_active_shaderpack_internal(
    instance_dir: &Path,
    shader_filename: Option<&str>,
) -> Result<(), String> {
    if !instance_dir.exists() {
        fs::create_dir_all(instance_dir)
            .map_err(|e| format!("Error al crear carpeta de instancia: {}", e))?;
    }

    let options_shaders_path = instance_dir.join("optionsshaders.txt");
    let serialized = serialize_active_shader(shader_filename);
    fs::write(&options_shaders_path, serialized)
        .map_err(|e| format!("Error al guardar optionsshaders.txt: {}", e))
}

#[tauri::command]
pub fn get_graphics_state(instance_path: String) -> Result<GraphicsState, String> {
    let path = std::path::PathBuf::from(instance_path);
    get_graphics_state_internal(&path)
}

#[tauri::command]
pub fn set_active_shaderpack(
    instance_path: String,
    shader_filename: Option<String>,
) -> Result<(), String> {
    let path = std::path::PathBuf::from(instance_path);
    set_active_shaderpack_internal(&path, shader_filename.as_deref())
}

#[tauri::command]
pub fn apply_graphics_preset(
    instance_path: String,
    preset_id: String,
) -> Result<GraphicsState, String> {
    let path = std::path::PathBuf::from(instance_path);
    apply_preset_internal(&path, &preset_id)
}

#[tauri::command]
pub fn open_shaderpacks_folder(instance_path: String) -> Result<(), String> {
    let shaders_dir = std::path::PathBuf::from(instance_path).join("shaderpacks");
    if !shaders_dir.exists() {
        let _ = fs::create_dir_all(&shaders_dir);
    }
    crate::system::open_directory_in_explorer(shaders_dir.to_string_lossy().to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_options_shaders_parse_and_serialize() {
        assert_eq!(parse_active_shader("shaderPack=OFF\n"), None);
        assert_eq!(
            parse_active_shader("shaderPack=Complementary.zip\n"),
            Some("Complementary.zip".to_string())
        );
        assert_eq!(serialize_active_shader(None), "shaderPack=OFF\n");
        assert_eq!(
            serialize_active_shader(Some("Complementary.zip")),
            "shaderPack=Complementary.zip\n"
        );
    }

    #[test]
    fn test_update_options_txt_preserves_keys() {
        let original = "key_key.forward:17\nsoundCategory_master:0.8\nrenderDistance:16\nparticles:0\n";
        let updated = update_options_txt(original, 8, 6, 2, 0, 144);
        assert!(updated.contains("key_key.forward:17"));
        assert!(updated.contains("soundCategory_master:0.8"));
        assert!(updated.contains("renderDistance:8"));
        assert!(updated.contains("simulationDistance:6"));
        assert!(updated.contains("particles:2"));
        assert!(updated.contains("graphicsMode:0"));
        assert!(updated.contains("maxFps:144"));
    }

    #[test]
    fn test_scan_shaderpacks_detects_zips_and_folders() {
        let temp_dir = std::env::temp_dir().join("monoevents_test_shaderpacks_scan");
        let _ = fs::remove_dir_all(&temp_dir);
        let _ = fs::create_dir_all(&temp_dir);

        // Create sample zip file and shader folder
        fs::write(temp_dir.join("ComplementaryReimagined.zip"), "dummy zip content").unwrap();
        fs::create_dir_all(temp_dir.join("BSL_Shaders_Folder")).unwrap();
        fs::write(temp_dir.join("ignore_me.txt"), "not a shader").unwrap();

        let scanned = scan_shaderpacks_dir(&temp_dir, Some("ComplementaryReimagined.zip"));
        assert_eq!(scanned.len(), 2);
        assert_eq!(scanned[0].filename, "BSL_Shaders_Folder");
        assert_eq!(scanned[0].is_active, false);
        assert_eq!(scanned[1].filename, "ComplementaryReimagined.zip");
        assert_eq!(scanned[1].name, "ComplementaryReimagined");
        assert_eq!(scanned[1].is_active, true);

        let _ = fs::remove_dir_all(temp_dir);
    }

    #[test]
    fn test_apply_graphics_presets_pvp_balanced_ultra() {
        let temp_dir = std::env::temp_dir().join("monoevents_test_presets");
        let _ = fs::remove_dir_all(&temp_dir);
        let _ = fs::create_dir_all(&temp_dir);

        let state_pvp = apply_preset_internal(&temp_dir, "pvp").unwrap();
        assert_eq!(state_pvp.render_distance, 8);
        assert_eq!(state_pvp.shaders_enabled, false);
        assert_eq!(state_pvp.active_preset.as_deref(), Some("pvp"));

        let options_txt = fs::read_to_string(temp_dir.join("options.txt")).unwrap();
        assert!(options_txt.contains("renderDistance:8"));

        let options_shaders = fs::read_to_string(temp_dir.join("optionsshaders.txt")).unwrap();
        assert_eq!(options_shaders.trim(), "shaderPack=OFF");

        let _ = fs::remove_dir_all(temp_dir);
    }
}
