use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum UpdateAction {
    UpToDate,
    UpdateRequired,
    LauncherUpdateRequired,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateCheckResult {
    pub action: UpdateAction,
    pub current_version: String,
    pub target_version: String,
    pub changelog: Option<String>,
    pub files_to_download: usize,
    pub files_to_remove: usize,
}
