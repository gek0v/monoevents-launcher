use crate::updater::ModpackManifest;

pub async fn fetch_remote_manifest(url: &str) -> Result<ModpackManifest, String> {
    let client = reqwest::Client::builder()
        .user_agent("MonoEventsLauncher/1.0")
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let response = client
        .get(url)
        .send()
        .await
        .map_err(|e| format!("Error de conexión al consultar el manifiesto: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Servidor retornó estado HTTP: {}", response.status()));
    }

    let manifest_text = response
        .text()
        .await
        .map_err(|e| format!("Error al leer respuesta: {}", e))?;

    let manifest: ModpackManifest = serde_json::from_str(&manifest_text)
        .map_err(|e| format!("Error al deserializar manifest.json: {}", e))?;

    Ok(manifest)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_manifest_json_content() {
        let json_sample = r#"{
            "schemaVersion": 1,
            "id": "sample-pack",
            "name": "Sample Pack",
            "version": "1.0.0",
            "minecraft": {
                "version": "1.20.1",
                "modloader": "forge",
                "modloaderVersion": "47.4.22",
                "javaVersion": 17
            },
            "changelog": "Changelog test",
            "files": []
        }"#;

        let parsed: Result<ModpackManifest, _> = serde_json::from_str(json_sample);
        assert!(parsed.is_ok(), "Manifest should parse successfully");
        let manifest = parsed.unwrap();
        assert_eq!(manifest.id, "sample-pack");
        assert_eq!(manifest.minecraft.version, "1.20.1");
    }
}
