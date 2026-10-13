use serde::{Deserialize, Serialize};
use sha1::{Digest, Sha1};
use std::fs;
use std::path::Path;
use tokio::fs::File;
use tokio::io::AsyncWriteExt;

use crate::game::shaders::{scan_shaderpacks_dir, ShaderpackInfo};

const MODRINTH_API_BASE: &str = "https://api.modrinth.com/v2";
const APP_USER_AGENT: &str = "MonoEvents-Launcher/1.0.0 (contact@monoevents.es)";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModrinthSearchHit {
    pub project_id: String,
    pub slug: String,
    pub author: String,
    pub title: String,
    pub description: String,
    pub categories: Option<Vec<String>>,
    pub versions: Option<Vec<String>>,
    pub downloads: u64,
    pub follows: Option<u64>,
    pub icon_url: Option<String>,
    pub featured_gallery: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModrinthSearchResponse {
    pub hits: Vec<ModrinthSearchHit>,
    pub total_hits: u64,
    pub offset: u32,
    pub limit: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModrinthVersionFileHashes {
    pub sha1: String,
    pub sha512: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModrinthVersionFile {
    pub url: String,
    pub filename: String,
    pub primary: bool,
    pub size: u64,
    pub hashes: ModrinthVersionFileHashes,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModrinthVersion {
    pub id: String,
    pub project_id: String,
    pub name: String,
    pub version_number: String,
    pub game_versions: Vec<String>,
    pub files: Vec<ModrinthVersionFile>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ModrinthShaderCard {
    pub project_id: String,
    pub slug: String,
    pub title: String,
    pub description: String,
    pub author: String,
    pub icon_url: Option<String>,
    pub featured_gallery: Option<String>,
    pub downloads: u64,
    pub categories: Vec<String>,
    pub performance_tier: String,
    pub is_installed: bool,
}

/// Evaluates categories and descriptive keywords to classify performance impact into "low", "medium", or "high".
pub fn calculate_performance_tier(categories: &[String], title: &str, desc: &str) -> &'static str {
    let lower_categories: Vec<String> = categories.iter().map(|c| c.to_lowercase()).collect();
    let lower_title = title.to_lowercase();
    let lower_desc = desc.to_lowercase();

    // 1. Direct category matches from Modrinth taxonomy
    if lower_categories.iter().any(|c| c == "potato" || c == "low" || c == "performance" || c == "vanilla-like") {
        return "low";
    }
    if lower_categories.iter().any(|c| c == "high" || c == "extreme" || c == "pathtracing" || c == "raytracing") {
        return "high";
    }
    if lower_categories.iter().any(|c| c == "medium") {
        return "medium";
    }

    // 2. Keyword heuristics in title or description
    if lower_title.contains("fast")
        || lower_title.contains("lite")
        || lower_title.contains("potato")
        || lower_title.split_whitespace().any(|w| w == "tea")
        || lower_title.contains("tea shaders")
        || lower_desc.contains("best performance")
        || lower_desc.contains("low end")
        || lower_desc.contains("integrated gpu")
    {
        return "low";
    }

    if lower_title.contains("unbound")
        || lower_title.contains("extreme")
        || lower_title.contains("voxels")
        || lower_title.contains("ptgi")
        || lower_title.contains("pathtracing")
        || lower_title.contains("rtx")
        || lower_desc.contains("path tracing")
        || lower_desc.contains("heavy")
    {
        return "high";
    }

    "medium"
}

/// Searches Modrinth for Minecraft 1.20.1 compatible shaders.
pub async fn search_shaders_api(
    instance_dir: &Path,
    query: &str,
    sort_by: &str,
    offset: u32,
    limit: u32,
    game_version: &str,
) -> Result<Vec<ModrinthShaderCard>, String> {
    let target_version = if game_version.trim().is_empty() {
        "1.20.1"
    } else {
        game_version.trim()
    };

    let index_sort = match sort_by {
        "downloads" => "downloads",
        "follows" => "follows",
        "newest" => "newest",
        "relevance" => "relevance",
        _ => "downloads",
    };

    let safe_limit = limit.clamp(1, 30);
    let facets_json = format!(
        "[[\"project_type:shader\"],[\"versions:{}\"]]",
        target_version
    );

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| format!("Error al crear cliente HTTP: {}", e))?;

    let mut request = client
        .get(format!("{}/search", MODRINTH_API_BASE))
        .header(reqwest::header::USER_AGENT, APP_USER_AGENT)
        .query(&[
            ("facets", facets_json.as_str()),
            ("index", index_sort),
            ("offset", &offset.to_string()),
            ("limit", &safe_limit.to_string()),
        ]);

    let clean_query = query.trim();
    if !clean_query.is_empty() {
        request = request.query(&[("query", clean_query)]);
    }

    let response = request
        .send()
        .await
        .map_err(|e| format!("Error de conexión con Modrinth API: {}", e))?;

    if !response.status().is_success() {
        return Err(format!(
            "Modrinth API respondió con código de error {}",
            response.status()
        ));
    }

    let search_res: ModrinthSearchResponse = response
        .json()
        .await
        .map_err(|e| format!("Error al parsear respuesta de Modrinth: {}", e))?;

    // Determine installed shaders to mark `is_installed`
    let shaders_dir = instance_dir.join("shaderpacks");
    let installed_shaders = scan_shaderpacks_dir(&shaders_dir, None);
    let installed_names: Vec<String> = installed_shaders
        .iter()
        .map(|s| s.filename.to_lowercase())
        .collect();

    let mut results = Vec::new();
    for hit in search_res.hits {
        let categories = hit.categories.unwrap_or_default();
        let tier = calculate_performance_tier(&categories, &hit.title, &hit.description);

        let hit_slug_lower = hit.slug.to_lowercase();
        let hit_title_lower = hit.title.to_lowercase().replace(' ', "");

        let is_installed = installed_names.iter().any(|inst| {
            let inst_clean = inst.trim_end_matches(".zip").replace(['-', '_', ' '], "");
            inst_clean.contains(&hit_slug_lower.replace('-', ""))
                || inst_clean.contains(&hit_title_lower)
        });

        results.push(ModrinthShaderCard {
            project_id: hit.project_id,
            slug: hit.slug,
            title: hit.title,
            description: hit.description,
            author: hit.author,
            icon_url: hit.icon_url,
            featured_gallery: hit.featured_gallery,
            downloads: hit.downloads,
            categories,
            performance_tier: tier.to_string(),
            is_installed,
        });
    }

    Ok(results)
}

/// Downloads a shaderpack `.zip` file from Modrinth, verifies its SHA1, and places it in `shaderpacks/`.
pub async fn download_shader_file(
    instance_dir: &Path,
    project_id: &str,
    game_version: &str,
) -> Result<ShaderpackInfo, String> {
    let clean_project_id = project_id.trim();
    if clean_project_id.is_empty()
        || clean_project_id.contains('/')
        || clean_project_id.contains('\\')
        || clean_project_id.contains("..")
    {
        return Err("Identificador de proyecto de Modrinth inválido".to_string());
    }

    let target_version = if game_version.trim().is_empty() {
        "1.20.1"
    } else {
        game_version.trim()
    };

    let client = reqwest::Client::builder()
        .connect_timeout(std::time::Duration::from_secs(10))
        .timeout(std::time::Duration::from_secs(300))
        .build()
        .map_err(|e| format!("Error al crear cliente HTTP: {}", e))?;

    let version_url = format!(
        "{}/project/{}/version?game_versions=%5B%22{}%22%5D",
        MODRINTH_API_BASE, clean_project_id, target_version
    );

    let version_resp = client
        .get(&version_url)
        .header(reqwest::header::USER_AGENT, APP_USER_AGENT)
        .send()
        .await
        .map_err(|e| format!("Error al consultar versiones en Modrinth: {}", e))?;

    if !version_resp.status().is_success() {
        return Err(format!(
            "No se encontraron versiones para el shader (código {})",
            version_resp.status()
        ));
    }

    let versions: Vec<ModrinthVersion> = version_resp
        .json()
        .await
        .map_err(|e| format!("Error al deserializar versiones de Modrinth: {}", e))?;

    if versions.is_empty() {
        return Err(format!(
            "No hay versiones compatibles con Minecraft {} para este shader",
            target_version
        ));
    }

    // Pick the latest version with valid files
    let version_to_download = versions
        .iter()
        .find(|v| !v.files.is_empty())
        .ok_or_else(|| "El shader no contiene archivos descargables".to_string())?;

    // Strictly pick only .zip shader files
    let file_info = version_to_download
        .files
        .iter()
        .find(|f| f.primary && f.filename.to_lowercase().ends_with(".zip"))
        .or_else(|| {
            version_to_download
                .files
                .iter()
                .find(|f| f.filename.to_lowercase().ends_with(".zip"))
        })
        .ok_or_else(|| "No se encontró ningún archivo .zip en la versión seleccionada".to_string())?;

    // Security sanitization on filename
    let clean_filename = file_info.filename.trim();
    if clean_filename.is_empty()
        || !clean_filename.to_lowercase().ends_with(".zip")
        || clean_filename.contains('/')
        || clean_filename.contains('\\')
        || clean_filename.contains("..")
        || clean_filename.contains('\n')
        || clean_filename.contains('\r')
    {
        return Err("Nombre de archivo devuelto por Modrinth es inválido, no seguro o no es un .zip".to_string());
    }

    let shaders_dir = instance_dir.join("shaderpacks");
    if !shaders_dir.exists() {
        fs::create_dir_all(&shaders_dir)
            .map_err(|e| format!("Error al crear carpeta shaderpacks: {}", e))?;
    }

    let final_dest = shaders_dir.join(clean_filename);
    let tmp_dest = shaders_dir.join(format!("{}.tmp", clean_filename));

    // Stream download to temporary file with in-flight SHA1 calculation
    let mut file_resp = client
        .get(&file_info.url)
        .header(reqwest::header::USER_AGENT, APP_USER_AGENT)
        .send()
        .await
        .map_err(|e| format!("Error al iniciar descarga del shader: {}", e))?;

    if !file_resp.status().is_success() {
        return Err(format!(
            "El servidor CDN de Modrinth devolvió código de error {}",
            file_resp.status()
        ));
    }

    let mut tmp_file = match File::create(&tmp_dest).await {
        Ok(f) => f,
        Err(e) => return Err(format!("Error al crear archivo temporal de descarga: {}", e)),
    };

    let mut hasher = Sha1::new();
    let mut stream_error = None;

    while let Some(chunk_res) = file_resp.chunk().await.transpose() {
        match chunk_res {
            Ok(chunk) => {
                hasher.update(&chunk);
                if let Err(e) = tmp_file.write_all(&chunk).await {
                    stream_error = Some(format!("Error al escribir datos en disco: {}", e));
                    break;
                }
            }
            Err(e) => {
                stream_error = Some(format!("Error de conexión durante descarga: {}", e));
                break;
            }
        }
    }

    if let Some(err) = stream_error {
        let _ = fs::remove_file(&tmp_dest);
        return Err(err);
    }

    let _ = tmp_file.flush().await;
    drop(tmp_file);

    // Verify in-flight computed SHA1 hash
    let actual_sha1 = format!("{:x}", hasher.finalize());
    let expected_sha1 = &file_info.hashes.sha1;

    if !actual_sha1.eq_ignore_ascii_case(expected_sha1) {
        let _ = fs::remove_file(&tmp_dest);
        return Err(format!(
            "Comprobación de integridad SHA1 fallida (esperado {}, obtenido {})",
            expected_sha1, actual_sha1
        ));
    }

    // Atomic rename to final path
    fs::rename(&tmp_dest, &final_dest)
        .map_err(|e| format!("Error al renombrar archivo temporal: {}", e))?;

    let size_bytes = fs::metadata(&final_dest).map(|m| m.len()).unwrap_or(file_info.size);
    let size_mb = ((size_bytes as f64 / (1024.0 * 1024.0)) * 100.0).round() / 100.0;
    let name = clean_filename
        .strip_suffix(".zip")
        .unwrap_or(clean_filename)
        .to_string();

    Ok(ShaderpackInfo {
        name,
        filename: clean_filename.to_string(),
        is_active: false,
        size_mb,
    })
}

#[tauri::command]
pub async fn search_modrinth_shaders(
    instance_path: String,
    query: String,
    sort_by: String,
    offset: u32,
    limit: u32,
    game_version: String,
) -> Result<Vec<ModrinthShaderCard>, String> {
    let path = std::path::PathBuf::from(instance_path);
    search_shaders_api(&path, &query, &sort_by, offset, limit, &game_version).await
}

#[tauri::command]
pub async fn download_modrinth_shader(
    instance_path: String,
    project_id: String,
    game_version: String,
) -> Result<ShaderpackInfo, String> {
    let path = std::path::PathBuf::from(instance_path);
    download_shader_file(&path, &project_id, &game_version).await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_performance_tier() {
        // Potato / Low
        assert_eq!(
            calculate_performance_tier(&["potato".to_string(), "iris".to_string()], "Some Shader", ""),
            "low"
        );
        assert_eq!(
            calculate_performance_tier(&[], "MakeUp - Ultra Fast", "Best performance for potato PC"),
            "low"
        );
        assert_eq!(
            calculate_performance_tier(&["performance".to_string()], "Tea Shaders", "Lightweight"),
            "low"
        );

        // High / Cinematic
        assert_eq!(
            calculate_performance_tier(&["high".to_string()], "Heavy Shader", ""),
            "high"
        );
        assert_eq!(
            calculate_performance_tier(&[], "Complementary Unbound", "Extreme visual fidelity"),
            "high"
        );
        assert_eq!(
            calculate_performance_tier(&["pathtracing".to_string()], "Rethinking Voxels", ""),
            "high"
        );

        // Medium / Balanced default
        assert_eq!(
            calculate_performance_tier(&["medium".to_string()], "BSL Shaders", "Customizable"),
            "medium"
        );
        assert_eq!(
            calculate_performance_tier(&[], "Complementary Reimagined", "Balanced experience"),
            "medium"
        );
    }

    #[test]
    fn test_deserialize_modrinth_search_response() {
        let json_sample = r#"{
            "hits": [
                {
                    "project_id": "izsIPI7a",
                    "slug": "makeup-ultra-fast-shaders",
                    "author": "KDXavier",
                    "title": "MakeUp - Ultra Fast",
                    "description": "MakeUp aims to provide the best quality / performance ratio.",
                    "categories": ["low", "potato", "iris"],
                    "versions": ["1.20.1"],
                    "downloads": 13590000,
                    "follows": 2386,
                    "icon_url": "https://cdn.modrinth.com/icon.webp",
                    "featured_gallery": "https://cdn.modrinth.com/featured.webp"
                }
            ],
            "total_hits": 1,
            "offset": 0,
            "limit": 1
        }"#;

        let res: Result<ModrinthSearchResponse, _> = serde_json::from_str(json_sample);
        assert!(res.is_ok());
        let parsed = res.unwrap();
        assert_eq!(parsed.hits.len(), 1);
        assert_eq!(parsed.hits[0].title, "MakeUp - Ultra Fast");
        assert_eq!(parsed.hits[0].downloads, 13590000);
        let tier = calculate_performance_tier(
            parsed.hits[0].categories.as_ref().unwrap(),
            &parsed.hits[0].title,
            &parsed.hits[0].description,
        );
        assert_eq!(tier, "low");
    }

    #[test]
    fn test_download_filename_security() {
        let temp_dir = std::env::temp_dir().join("monoevents_modrinth_security");
        let _ = fs::remove_dir_all(&temp_dir);
        let _ = fs::create_dir_all(&temp_dir);

        // Path traversal should fail
        let rt = tokio::runtime::Runtime::new().unwrap();
        let res = rt.block_on(download_shader_file(&temp_dir, "../malicious", "1.20.1"));
        assert!(res.is_err());
        assert!(res.unwrap_err().contains("inválido"));

        let _ = fs::remove_dir_all(temp_dir);
    }
}
