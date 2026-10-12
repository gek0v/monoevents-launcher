use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum GameState {
    Idle,
    Launching,
    Running,
    Crashed,
    Exited,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessEvent {
    pub state: GameState,
    pub exit_code: Option<i32>,
    pub crash_report: Option<String>,
}
