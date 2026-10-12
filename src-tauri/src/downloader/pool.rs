use serde::{Deserialize, Serialize};

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
    pub destination_path: String,
    pub expected_sha1: String,
    pub size_bytes: u64,
}
