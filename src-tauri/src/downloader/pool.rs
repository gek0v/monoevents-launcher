use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::time::Instant;
use tokio::fs::{self, File};
use tokio::io::AsyncWriteExt;
use crate::downloader::validator::calculate_sha1;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadProgress {
    pub current_file: String,
    pub downloaded_bytes: u64,
    pub total_bytes: u64,
    pub percentage: f32,
    pub speed_mbps: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadTask {
    pub url: String,
    pub destination_path: PathBuf,
    pub expected_sha1: String,
    pub size_bytes: u64,
}

pub async fn download_file<F>(
    client: &reqwest::Client,
    task: &DownloadTask,
    progress_callback: F,
) -> Result<(), String>
where
    F: Fn(DownloadProgress) + Send + Sync + 'static,
{
    let destination = &task.destination_path;
    if let Some(parent) = destination.parent() {
        fs::create_dir_all(parent)
            .await
            .map_err(|e| format!("Failed to create parent directory: {}", e))?;
    }

    let temp_part_path = destination.with_extension("download_part");
    let response = client
        .get(&task.url)
        .send()
        .await
        .map_err(|e| format!("HTTP request failed for {}: {}", task.url, e))?;

    if !response.status().is_success() {
        return Err(format!("Download failed with status: {}", response.status()));
    }

    let total_bytes = response
        .content_length()
        .unwrap_or(task.size_bytes);

    let mut file = File::create(&temp_part_path)
        .await
        .map_err(|e| format!("Failed to create temp download file: {}", e))?;

    let mut stream = response.bytes_stream();
    let mut downloaded_bytes: u64 = 0;
    let start_time = Instant::now();
    let file_name = destination
        .file_name()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_else(|| "archivo".to_string());

    while let Some(chunk_result) = stream.next().await {
        let chunk = chunk_result.map_err(|e| format!("Stream read error: {}", e))?;
        file.write_all(&chunk)
            .await
            .map_err(|e| format!("Failed to write chunk: {}", e))?;

        downloaded_bytes += chunk.len() as u64;
        let elapsed_secs = start_time.elapsed().as_secs_f32().max(0.001);
        let speed_mbps = (downloaded_bytes as f32 / (1024.0 * 1024.0)) / elapsed_secs;
        let percentage = if total_bytes > 0 {
            (downloaded_bytes as f32 / total_bytes as f32) * 100.0
        } else {
            0.0
        };

        progress_callback(DownloadProgress {
            current_file: file_name.clone(),
            downloaded_bytes,
            total_bytes,
            percentage,
            speed_mbps,
        });
    }

    file.flush()
        .await
        .map_err(|e| format!("Failed to flush file: {}", e))?;
    drop(file);

    // Verify SHA-1 before renaming
    let downloaded_sha1 = calculate_sha1(&temp_part_path)?;
    if !task.expected_sha1.is_empty()
        && !downloaded_sha1.eq_ignore_ascii_case(&task.expected_sha1)
    {
        let _ = fs::remove_file(&temp_part_path).await;
        return Err(format!(
            "Checksum mismatch for {}. Expected {}, got {}",
            file_name, task.expected_sha1, downloaded_sha1
        ));
    }

    // Atomic rename to final path
    if destination.exists() {
        let _ = fs::remove_file(destination).await;
    }
    fs::rename(&temp_part_path, destination)
        .await
        .map_err(|e| format!("Failed to rename temp file to destination: {}", e))?;

    Ok(())
}
