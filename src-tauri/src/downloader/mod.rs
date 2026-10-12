pub mod pool;
pub mod validator;

pub use pool::{DownloadProgress, DownloadTask};
pub use validator::{calculate_sha1, verify_file_sha1};
