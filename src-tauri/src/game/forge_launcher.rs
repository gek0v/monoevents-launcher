use std::path::Path;
use crate::auth::AuthSession;

pub struct ForgeLaunchConfig<'a> {
    pub java_binary: &'a Path,
    pub ram_gb: u32,
    pub instance_dir: &'a Path,
    pub account: &'a AuthSession,
    pub forge_version: &'a str,
}

pub fn build_jvm_arguments(config: &ForgeLaunchConfig) -> Vec<String> {
    let mut args = Vec::new();

    // Memory allocation
    args.push("-Xms2G".to_string());
    args.push(format!("-Xmx{}G", config.ram_gb));

    // Performance optimizations for modern Forge
    args.push("-XX:+UnlockExperimentalVMOptions".to_string());
    args.push("-XX:+UseG1GC".to_string());
    args.push("-XX:G1NewSizePercent=20".to_string());
    args.push("-XX:G1ReservePercent=20".to_string());
    args.push("-XX:MaxGCPauseMillis=50".to_string());
    args.push("-XX:G1HeapRegionSize=32M".to_string());

    // Game directories
    args.push(format!("-Djava.library.path={}", config.instance_dir.join("natives").display()));
    
    // Main class (Placeholder standard for Forge 1.20.1 bootstrap)
    args.push("cpw.mods.bootstraplauncher.BootstrapLauncher".to_string());

    // Minecraft Client arguments
    args.push("--username".to_string());
    args.push(config.account.username.clone());
    args.push("--version".to_string());
    args.push("1.20.1".to_string());
    args.push("--gameDir".to_string());
    args.push(config.instance_dir.display().to_string());
    args.push("--uuid".to_string());
    args.push(config.account.uuid.clone());
    args.push("--accessToken".to_string());
    args.push(config.account.access_token.clone().unwrap_or_else(|| "0".to_string()));

    args
}
