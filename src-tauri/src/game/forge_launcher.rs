use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};
use serde::Deserialize;
use crate::auth::AuthSession;

pub struct ForgeLaunchConfig<'a> {
    pub java_binary: &'a Path,
    pub ram_gb: u32,
    pub instance_dir: &'a Path,
    pub account: &'a AuthSession,
    pub forge_version: &'a str,
}

#[derive(Deserialize)]
struct VersionLibraryArtifact {
    path: Option<String>,
}

#[derive(Deserialize)]
struct VersionLibraryDownloads {
    artifact: Option<VersionLibraryArtifact>,
}

#[derive(Deserialize)]
struct VersionLibrary {
    name: Option<String>,
    downloads: Option<VersionLibraryDownloads>,
}

#[derive(Deserialize)]
struct VersionManifest {
    libraries: Vec<VersionLibrary>,
}

fn maven_coord_to_path(name: &str) -> Option<String> {
    let parts: Vec<&str> = name.split(':').collect();
    if parts.len() < 3 {
        return None;
    }
    let group = parts[0].replace('.', "/");
    let artifact = parts[1];
    let version = parts[2];
    let classifier = if parts.len() >= 4 {
        format!("-{}", parts[3])
    } else {
        String::new()
    };
    Some(format!(
        "{}/{}/{}/{}-{}{}.jar",
        group, artifact, version, artifact, version, classifier
    ))
}

fn resolve_artifact_jar(
    lib_dir: &Path,
    rel_group: &str,
    artifact_id: &str,
    preferred_version: &str,
) -> PathBuf {
    let base_dir = lib_dir.join(rel_group).join(artifact_id);
    let preferred = base_dir
        .join(preferred_version)
        .join(format!("{}-{}.jar", artifact_id, preferred_version));
    if preferred.exists() {
        return preferred;
    }
    if let Ok(entries) = fs::read_dir(&base_dir) {
        let mut dirs: Vec<PathBuf> = entries
            .flatten()
            .map(|e| e.path())
            .filter(|p| p.is_dir())
            .collect();
        dirs.sort_by(|a, b| b.cmp(a));
        for d in dirs {
            if let Some(v) = d.file_name().and_then(|n| n.to_str()) {
                let candidate = d.join(format!("{}-{}.jar", artifact_id, v));
                if candidate.exists() {
                    return candidate;
                }
            }
        }
    }
    preferred
}

fn detect_forge_version(lib_dir: &Path, requested: &str) -> String {
    let forge_dir = lib_dir.join("net").join("minecraftforge").join("forge");
    let requested_dir = forge_dir.join(format!("1.20.1-{}", requested));
    if requested_dir.exists() {
        return requested.to_string();
    }
    if let Ok(entries) = fs::read_dir(&forge_dir) {
        let mut candidates: Vec<String> = entries
            .flatten()
            .filter_map(|e| {
                let name = e.file_name().to_string_lossy().to_string();
                if name.starts_with("1.20.1-") {
                    Some(name.trim_start_matches("1.20.1-").to_string())
                } else {
                    None
                }
            })
            .collect();
        candidates.sort_by(|a, b| b.cmp(a));
        if let Some(best) = candidates.first() {
            return best.clone();
        }
    }
    requested.to_string()
}

fn find_libraries_dir(instance_dir: &Path) -> Option<PathBuf> {
    // 1. Check parent game directory (e.g. .monoevents/libraries)
    if let Some(parent) = instance_dir.parent() {
        if let Some(game_dir) = parent.parent() {
            let lib = game_dir.join("libraries");
            if lib.exists() {
                return Some(lib);
            }
        }
    }

    // 2. Check directly inside instance_dir
    let instance_lib = instance_dir.join("libraries");
    if instance_lib.exists() {
        return Some(instance_lib);
    }

    // 3. Fallback to PrismLauncher / .minecraft libraries if available
    if let Ok(appdata) = std::env::var("APPDATA") {
        let prism_lib = PathBuf::from(&appdata).join("PrismLauncher").join("libraries");
        if prism_lib.exists() {
            return Some(prism_lib);
        }
        let mc_lib = PathBuf::from(&appdata).join(".minecraft").join("libraries");
        if mc_lib.exists() {
            return Some(mc_lib);
        }
    }

    None
}

fn find_assets_dir(instance_dir: &Path) -> PathBuf {
    if let Some(parent) = instance_dir.parent() {
        if let Some(game_dir) = parent.parent() {
            let assets = game_dir.join("assets");
            if assets.exists() {
                return assets;
            }
        }
    }

    if let Ok(appdata) = std::env::var("APPDATA") {
        let prism_assets = PathBuf::from(&appdata).join("PrismLauncher").join("assets");
        if prism_assets.exists() {
            return prism_assets;
        }
        let mc_assets = PathBuf::from(&appdata).join(".minecraft").join("assets");
        if mc_assets.exists() {
            return mc_assets;
        }
    }

    instance_dir.join("assets")
}

pub fn build_jvm_arguments(config: &ForgeLaunchConfig) -> Vec<String> {
    let mut args = Vec::new();

    // 1. Memory allocation
    args.push("-Xms2G".to_string());
    args.push(format!("-Xmx{}G", config.ram_gb));

    // 2. Modern G1GC performance flags
    args.push("-XX:+UnlockExperimentalVMOptions".to_string());
    args.push("-XX:+UseG1GC".to_string());
    args.push("-XX:G1NewSizePercent=20".to_string());
    args.push("-XX:G1ReservePercent=20".to_string());
    args.push("-XX:MaxGCPauseMillis=50".to_string());
    args.push("-XX:G1HeapRegionSize=32M".to_string());

    // 3. System properties and directories
    let lib_dir = find_libraries_dir(config.instance_dir)
        .unwrap_or_else(|| config.instance_dir.join("libraries"));
    let forge_version = detect_forge_version(&lib_dir, config.forge_version);

    args.push("-Djava.net.preferIPv6Addresses=system".to_string());
    args.push(format!(
        "-DignoreList=bootstraplauncher,securejarhandler,asm-commons,asm-util,asm-analysis,asm-tree,asm,JarJarFileSystems,client-extra,fmlcore,javafmllanguage,lowcodelanguage,mclanguage,forge-,1.20.1-forge-{}.jar,minecraft-1.20.1-client.jar,client.jar",
        forge_version
    ));
    args.push("-DmergeModules=jna-5.10.0.jar,jna-platform-5.10.0.jar".to_string());

    let natives_dir = config.instance_dir.join("natives");
    args.push(format!("-Djava.library.path={}", natives_dir.display()));
    args.push(format!("-DlibraryDirectory={}", lib_dir.display()));

    // 4. Module Path (-p) for Java 9+ bootstrap launcher
    let module_specs = [
        ("cpw/mods", "bootstraplauncher", "1.1.2"),
        ("cpw/mods", "securejarhandler", "2.1.10"),
        ("org/ow2/asm", "asm-commons", "9.8"),
        ("org/ow2/asm", "asm-util", "9.8"),
        ("org/ow2/asm", "asm-analysis", "9.8"),
        ("org/ow2/asm", "asm-tree", "9.8"),
        ("org/ow2/asm", "asm", "9.8"),
        ("net/minecraftforge", "JarJarFileSystems", "0.3.19"),
    ];

    let mut module_jar_paths: Vec<PathBuf> = Vec::new();
    let mut module_set: HashSet<PathBuf> = HashSet::new();

    for (group, artifact, preferred_ver) in &module_specs {
        let path = resolve_artifact_jar(&lib_dir, group, artifact, preferred_ver);
        module_jar_paths.push(path.clone());
        module_set.insert(path);
    }

    let module_path_arg = module_jar_paths
        .iter()
        .map(|p| p.to_string_lossy().to_string())
        .collect::<Vec<String>>()
        .join(";");

    args.push("-p".to_string());
    args.push(module_path_arg);

    // 5. Classpath (-cp)
    let mut classpath_jars: Vec<String> = Vec::new();
    let mut cp_visited: HashSet<PathBuf> = HashSet::new();

    let mut manifest_paths = Vec::new();
    if let Some(parent) = config.instance_dir.parent() {
        if let Some(game_dir) = parent.parent() {
            manifest_paths.push(
                game_dir
                    .join("versions")
                    .join(format!("1.20.1-forge-{}", forge_version))
                    .join(format!("1.20.1-forge-{}.json", forge_version)),
            );
            manifest_paths.push(
                game_dir
                    .join("versions")
                    .join("1.20.1")
                    .join("1.20.1.json"),
            );
        }
    }

    if let Ok(appdata) = std::env::var("APPDATA") {
        let appdata_p = PathBuf::from(&appdata);
        // PrismLauncher meta
        manifest_paths.push(
            appdata_p
                .join("PrismLauncher")
                .join("meta")
                .join("net.minecraftforge")
                .join(format!("{}.json", forge_version)),
        );
        manifest_paths.push(
            appdata_p
                .join("PrismLauncher")
                .join("meta")
                .join("net.minecraft")
                .join("1.20.1.json"),
        );
        manifest_paths.push(
            appdata_p
                .join("PrismLauncher")
                .join("meta")
                .join("org.lwjgl3")
                .join("3.3.1.json"),
        );
        // .minecraft versions
        manifest_paths.push(
            appdata_p
                .join(".minecraft")
                .join("versions")
                .join(format!("1.20.1-forge-{}", forge_version))
                .join(format!("1.20.1-forge-{}.json", forge_version)),
        );
        manifest_paths.push(
            appdata_p
                .join(".minecraft")
                .join("versions")
                .join("1.20.1")
                .join("1.20.1.json"),
        );
    }

    for manifest_p in manifest_paths {
        if manifest_p.exists() {
            if let Ok(content) = fs::read_to_string(&manifest_p) {
                if let Ok(manifest) = serde_json::from_str::<VersionManifest>(&content) {
                    for lib in manifest.libraries {
                        let rel_path = lib
                            .downloads
                            .as_ref()
                            .and_then(|d| d.artifact.as_ref())
                            .and_then(|a| a.path.clone())
                            .or_else(|| lib.name.as_deref().and_then(maven_coord_to_path));

                        if let Some(rel) = rel_path {
                            let clean = rel.replace('/', std::path::MAIN_SEPARATOR_STR);
                            let full = lib_dir.join(clean);
                            if !module_set.contains(&full) && full.exists() && cp_visited.insert(full.clone()) {
                                classpath_jars.push(full.to_string_lossy().to_string());
                            }
                        }
                    }
                }
            }
        }
    }

    // Ensure minecraft client jar is present in classpath
    let client_jar_candidates = [
        lib_dir.join("com").join("mojang").join("minecraft").join("1.20.1").join("minecraft-1.20.1-client.jar"),
        lib_dir.join("client-extra.jar"),
    ];
    for client_jar in &client_jar_candidates {
        if client_jar.exists() && cp_visited.insert(client_jar.clone()) {
            classpath_jars.push(client_jar.to_string_lossy().to_string());
        }
    }

    if !classpath_jars.is_empty() {
        args.push("-cp".to_string());
        args.push(classpath_jars.join(";"));
    }

    // 6. Java 9+ Module System flags
    args.push("--add-modules".to_string());
    args.push("ALL-MODULE-PATH".to_string());
    args.push("--add-opens".to_string());
    args.push("java.base/java.util.jar=cpw.mods.securejarhandler".to_string());
    args.push("--add-opens".to_string());
    args.push("java.base/java.lang.invoke=cpw.mods.securejarhandler".to_string());
    args.push("--add-exports".to_string());
    args.push("java.base/sun.security.util=cpw.mods.securejarhandler".to_string());
    args.push("--add-exports".to_string());
    args.push("jdk.naming.dns/com.sun.jndi.dns=java.naming".to_string());

    // 7. Main Class
    args.push("cpw.mods.bootstraplauncher.BootstrapLauncher".to_string());

    // 8. Forge Client Bootstrap Arguments
    args.push("--launchTarget".to_string());
    args.push("forgeclient".to_string());
    args.push("--fml.forgeVersion".to_string());
    args.push(forge_version);
    args.push("--fml.mcVersion".to_string());
    args.push("1.20.1".to_string());
    args.push("--fml.forgeGroup".to_string());
    args.push("net.minecraftforge".to_string());
    args.push("--fml.mcpVersion".to_string());
    args.push("20230612.114412".to_string());

    // 9. Minecraft Game Arguments
    args.push("--version".to_string());
    args.push("1.20.1".to_string());
    args.push("--gameDir".to_string());
    args.push(config.instance_dir.display().to_string());

    let assets_dir = find_assets_dir(config.instance_dir);
    args.push("--assetsDir".to_string());
    args.push(assets_dir.display().to_string());
    args.push("--assetIndex".to_string());
    args.push("5".to_string());

    args.push("--username".to_string());
    args.push(config.account.username.clone());
    args.push("--uuid".to_string());
    args.push(config.account.uuid.clone());
    args.push("--accessToken".to_string());
    args.push(config.account.access_token.clone().unwrap_or_else(|| "0".to_string()));
    args.push("--userType".to_string());
    let user_type = match config.account.session_type {
        crate::auth::SessionType::Microsoft => "msa",
        crate::auth::SessionType::Offline => "legacy",
    };
    args.push(user_type.to_string());
    args.push("--versionType".to_string());
    args.push("Forge".to_string());

    args
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn test_build_jvm_arguments_structure() {
        let session = AuthSession::new_offline("GekoPlayer");
        let java_path = PathBuf::from(r"C:\Program Files\Java\bin\java.exe");
        let instance = PathBuf::from(r"C:\test\instances\monoevents-forge-1.20.1");

        let config = ForgeLaunchConfig {
            java_binary: &java_path,
            ram_gb: 8,
            instance_dir: &instance,
            account: &session,
            forge_version: "47.4.22",
        };

        let args = build_jvm_arguments(&config);

        assert!(args.contains(&"-Xms2G".to_string()));
        assert!(args.contains(&"-Xmx8G".to_string()));
        assert!(args.contains(&"--username".to_string()));
        assert!(args.contains(&"GekoPlayer".to_string()));
        assert!(args.contains(&"1.20.1".to_string()));
        assert!(args.contains(&"--uuid".to_string()));
        assert!(args.contains(&"--userType".to_string()));
        assert!(args.contains(&"legacy".to_string()));
        assert!(args.contains(&"-p".to_string()));
        assert!(args.contains(&"--launchTarget".to_string()));
        assert!(args.contains(&"forgeclient".to_string()));
        assert_eq!(session.username, "GekoPlayer");
    }

    #[test]
    fn test_build_jvm_arguments_microsoft_account() {
        let session = AuthSession {
            session_type: crate::auth::SessionType::Microsoft,
            username: "OfficialPlayer".to_string(),
            uuid: "c06f8906-4c8a-4911-9c29-ea1dbd1aab82".to_string(),
            access_token: Some("mc_valid_access_token_123".to_string()),
        };
        let java_path = PathBuf::from(r"C:\Program Files\Java\bin\java.exe");
        let instance = PathBuf::from(r"C:\test\instances\monoevents-forge-1.20.1");

        let config = ForgeLaunchConfig {
            java_binary: &java_path,
            ram_gb: 8,
            instance_dir: &instance,
            account: &session,
            forge_version: "47.4.22",
        };

        let args = build_jvm_arguments(&config);

        assert!(args.contains(&"--username".to_string()));
        assert!(args.contains(&"OfficialPlayer".to_string()));
        assert!(args.contains(&"--uuid".to_string()));
        assert!(args.contains(&"c06f8906-4c8a-4911-9c29-ea1dbd1aab82".to_string()));
        assert!(args.contains(&"--accessToken".to_string()));
        assert!(args.contains(&"mc_valid_access_token_123".to_string()));
        assert!(args.contains(&"--userType".to_string()));
        assert!(args.contains(&"msa".to_string()));
    }
}
