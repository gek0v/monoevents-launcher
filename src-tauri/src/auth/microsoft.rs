use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceCodeResponse {
    pub user_code: String,
    pub device_code: String,
    pub verification_uri: String,
    pub expires_in: u64,
    pub interval: u64,
}

pub async fn request_device_code() -> Result<DeviceCodeResponse, String> {
    // Implementación del Device Code Flow de Microsoft OAuth2
    Ok(DeviceCodeResponse {
        user_code: "DEMO1234".to_string(),
        device_code: "sample_device_code".to_string(),
        verification_uri: "https://microsoft.com/devicelogin".to_string(),
        expires_in: 900,
        interval: 5,
    })
}
