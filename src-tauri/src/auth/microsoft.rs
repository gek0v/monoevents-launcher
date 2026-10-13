use serde::{Deserialize, Serialize};
use std::time::Duration;
use crate::auth::{AuthSession, SessionType};

pub const MS_CLIENT_ID: &str = "c36a9fb6-4f2a-41ff-90bd-ae7cc92031eb";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DeviceCodeResponse {
    pub user_code: String,
    pub device_code: String,
    pub verification_uri: String,
    pub expires_in: u64,
    pub interval: u64,
    #[serde(default)]
    pub message: Option<String>,
}

#[derive(Debug, Deserialize)]
struct MsTokenSuccess {
    pub access_token: String,
    #[allow(dead_code)]
    pub refresh_token: Option<String>,
    #[allow(dead_code)]
    pub expires_in: Option<u64>,
}

#[derive(Debug, Deserialize)]
struct MsTokenError {
    pub error: String,
    pub error_description: Option<String>,
}

#[derive(Debug, Serialize)]
struct XboxLiveAuthProperties<'a> {
    #[serde(rename = "AuthMethod")]
    auth_method: &'a str,
    #[serde(rename = "SiteName")]
    site_name: &'a str,
    #[serde(rename = "RpsTicket")]
    rps_ticket: &'a str,
}

#[derive(Debug, Serialize)]
struct XboxLiveAuthRequest<'a> {
    #[serde(rename = "Properties")]
    properties: XboxLiveAuthProperties<'a>,
    #[serde(rename = "RelyingParty")]
    relying_party: &'a str,
    #[serde(rename = "TokenType")]
    token_type: &'a str,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DisplayClaimsUser {
    pub uhs: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DisplayClaims {
    pub xui: Vec<DisplayClaimsUser>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct XboxAuthResponse {
    #[serde(rename = "Token")]
    pub token: String,
    #[serde(rename = "DisplayClaims")]
    pub display_claims: DisplayClaims,
}

#[derive(Debug, Serialize)]
struct XstsProperties<'a> {
    #[serde(rename = "SandboxId")]
    sandbox_id: &'a str,
    #[serde(rename = "UserTokens")]
    user_tokens: Vec<&'a str>,
}

#[derive(Debug, Serialize)]
struct XstsRequest<'a> {
    #[serde(rename = "Properties")]
    properties: XstsProperties<'a>,
    #[serde(rename = "RelyingParty")]
    relying_party: &'a str,
    #[serde(rename = "TokenType")]
    token_type: &'a str,
}

#[derive(Debug, Serialize)]
struct MinecraftAuthRequest<'a> {
    #[serde(rename = "identityToken")]
    identity_token: &'a str,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct MinecraftAuthResponse {
    pub access_token: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct MinecraftProfileResponse {
    pub id: String,
    pub name: String,
}

pub fn format_uuid_hyphenated(raw_id: &str) -> String {
    let clean = raw_id.replace('-', "");
    if clean.len() == 32 {
        format!(
            "{}-{}-{}-{}-{}",
            &clean[0..8],
            &clean[8..12],
            &clean[12..16],
            &clean[16..20],
            &clean[20..32]
        )
    } else {
        raw_id.to_string()
    }
}

pub fn resolve_client_id(custom: Option<&str>) -> &str {
    match custom {
        Some(c) if !c.trim().is_empty() => c.trim(),
        _ => MS_CLIENT_ID,
    }
}

pub async fn request_device_code(
    client: &reqwest::Client,
    custom_client_id: Option<&str>,
) -> Result<DeviceCodeResponse, String> {
    let client_id = resolve_client_id(custom_client_id);
    let res = client
        .post("https://login.microsoftonline.com/consumers/oauth2/v2.0/devicecode")
        .form(&[
            ("client_id", client_id),
            ("scope", "XboxLive.signin offline_access"),
        ])
        .send()
        .await
        .map_err(|e| format!("Error de conexión al solicitar Device Code: {}", e))?;

    if !res.status().is_success() {
        let err_text = res.text().await.unwrap_or_default();
        return Err(format!("Error en respuesta de Microsoft Device Code: {}", err_text));
    }

    let code_resp: DeviceCodeResponse = res
        .json()
        .await
        .map_err(|e| format!("Error al deserializar Device Code: {}", e))?;

    Ok(code_resp)
}

pub async fn poll_device_code(
    client: &reqwest::Client,
    device_code: &str,
    interval_secs: u64,
    max_wait_secs: u64,
    custom_client_id: Option<&str>,
) -> Result<String, String> {
    let client_id = resolve_client_id(custom_client_id);
    let start_time = std::time::Instant::now();
    let mut poll_interval = interval_secs.max(2);

    while start_time.elapsed().as_secs() < max_wait_secs {
        tokio::time::sleep(Duration::from_secs(poll_interval)).await;

        let res = client
            .post("https://login.microsoftonline.com/consumers/oauth2/v2.0/token")
            .form(&[
                ("client_id", client_id),
                ("grant_type", "urn:ietf:params:oauth:grant-type:device_code"),
                ("device_code", device_code),
            ])
            .send()
            .await
            .map_err(|e| format!("Error de conexión consultando token: {}", e))?;

        let status = res.status();
        let body = res.text().await.unwrap_or_default();

        if status.is_success() {
            let token_resp: MsTokenSuccess = serde_json::from_str(&body)
                .map_err(|e| format!("Error al procesar token de Microsoft: {}", e))?;
            return Ok(token_resp.access_token);
        } else if let Ok(err_resp) = serde_json::from_str::<MsTokenError>(&body) {
            match err_resp.error.as_str() {
                "authorization_pending" => {
                    continue;
                }
                "slow_down" => {
                    poll_interval += 2;
                    continue;
                }
                "expired_token" => {
                    return Err("El código ha caducado. Por favor, solicita uno nuevo.".to_string());
                }
                "access_denied" => {
                    return Err("El inicio de sesión fue cancelado o rechazado.".to_string());
                }
                other => {
                    return Err(format!(
                        "Error de autorización de Microsoft: {} ({})",
                        other,
                        err_resp.error_description.unwrap_or_default()
                    ));
                }
            }
        } else {
            return Err(format!("Error inesperado de Microsoft: {}", body));
        }
    }

    Err("Tiempo límite de espera agotado (15 minutos). Inténtalo de nuevo.".to_string())
}

pub async fn authenticate_xbox_live(
    client: &reqwest::Client,
    ms_token: &str,
) -> Result<XboxAuthResponse, String> {
    let payload = XboxLiveAuthRequest {
        properties: XboxLiveAuthProperties {
            auth_method: "RPS",
            site_name: "user.auth.xboxlive.com",
            rps_ticket: &format!("d={}", ms_token),
        },
        relying_party: "http://auth.xboxlive.com",
        token_type: "JWT",
    };

    let res = client
        .post("https://user.auth.xboxlive.com/user/authenticate")
        .header("Content-Type", "application/json")
        .header("Accept", "application/json")
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Error al conectar con Xbox Live: {}", e))?;

    if !res.status().is_success() {
        let err_text = res.text().await.unwrap_or_default();
        return Err(format!("Error en autenticación de Xbox Live: {}", err_text));
    }

    res.json::<XboxAuthResponse>()
        .await
        .map_err(|e| format!("Error deserializando respuesta Xbox Live: {}", e))
}

pub async fn obtain_xsts_token(
    client: &reqwest::Client,
    xbl_token: &str,
) -> Result<XboxAuthResponse, String> {
    let payload = XstsRequest {
        properties: XstsProperties {
            sandbox_id: "RETAIL",
            user_tokens: vec![xbl_token],
        },
        relying_party: "rp://api.minecraftservices.com/",
        token_type: "JWT",
    };

    let res = client
        .post("https://xsts.auth.xboxlive.com/xsts/authorize")
        .header("Content-Type", "application/json")
        .header("Accept", "application/json")
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Error al conectar con XSTS: {}", e))?;

    let status = res.status();
    let body = res.text().await.unwrap_or_default();

    if !status.is_success() {
        if let Ok(json_err) = serde_json::from_str::<serde_json::Value>(&body) {
            if let Some(xerr) = json_err.get("XErr").and_then(|v| v.as_u64()) {
                let msg = match xerr {
                    2148916233 => "Tu cuenta no tiene un perfil de Xbox. Crea uno en xbox.com.",
                    2148916235 => "Xbox Live no está disponible en tu país o la cuenta está suspendida.",
                    2148916238 => "Esta cuenta de menor requiere ser vinculada a un grupo familiar por un adulto.",
                    _ => "Error en la validación de seguridad de Xbox (XSTS).",
                };
                return Err(format!("{} (código {})", msg, xerr));
            }
        }
        return Err(format!("Error obteniendo token XSTS: {}", body));
    }

    serde_json::from_str::<XboxAuthResponse>(&body)
        .map_err(|e| format!("Error deserializando respuesta XSTS: {}", e))
}

pub async fn login_minecraft_services(
    client: &reqwest::Client,
    xsts_token: &str,
    uhs: &str,
) -> Result<String, String> {
    let identity_token = format!("XBL3.0 x={};{}", uhs, xsts_token);
    let payload = MinecraftAuthRequest {
        identity_token: &identity_token,
    };

    let res = client
        .post("https://api.minecraftservices.com/authentication/login_with_xbox")
        .header("Content-Type", "application/json")
        .header("Accept", "application/json")
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Error al conectar con Minecraft Services: {}", e))?;

    if !res.status().is_success() {
        let err_text = res.text().await.unwrap_or_default();
        return Err(format!("Error en autenticación de Minecraft: {}", err_text));
    }

    let mc_resp: MinecraftAuthResponse = res
        .json()
        .await
        .map_err(|e| format!("Error deserializando token de Minecraft: {}", e))?;

    Ok(mc_resp.access_token)
}

pub async fn fetch_minecraft_profile(
    client: &reqwest::Client,
    mc_token: &str,
) -> Result<MinecraftProfileResponse, String> {
    let res = client
        .get("https://api.minecraftservices.com/minecraft/profile")
        .bearer_auth(mc_token)
        .send()
        .await
        .map_err(|e| format!("Error al obtener perfil de Minecraft: {}", e))?;

    if res.status() == reqwest::StatusCode::NOT_FOUND {
        return Err("Esta cuenta de Microsoft no posee Minecraft Java Edition comprado ni activo con Game Pass.".to_string());
    }

    if !res.status().is_success() {
        let err_text = res.text().await.unwrap_or_default();
        return Err(format!("Error obteniendo perfil de Minecraft: {}", err_text));
    }

    res.json::<MinecraftProfileResponse>()
        .await
        .map_err(|e| format!("Error deserializando perfil de Minecraft: {}", e))
}

pub async fn complete_device_code_flow(
    client: &reqwest::Client,
    device_code: &str,
    interval_secs: u64,
    custom_client_id: Option<&str>,
) -> Result<AuthSession, String> {
    let ms_token = poll_device_code(client, device_code, interval_secs, 900, custom_client_id).await?;

    let xbl_resp = authenticate_xbox_live(client, &ms_token).await?;
    let uhs = xbl_resp
        .display_claims
        .xui
        .first()
        .ok_or_else(|| "No se encontró UHS en la respuesta de Xbox Live".to_string())?
        .uhs
        .clone();

    let xsts_resp = obtain_xsts_token(client, &xbl_resp.token).await?;
    let xsts_uhs = xsts_resp
        .display_claims
        .xui
        .first()
        .map(|x| x.uhs.clone())
        .unwrap_or(uhs);

    let mc_token = login_minecraft_services(client, &xsts_resp.token, &xsts_uhs).await?;
    let profile = fetch_minecraft_profile(client, &mc_token).await?;
    let formatted_uuid = format_uuid_hyphenated(&profile.id);

    Ok(AuthSession {
        session_type: SessionType::Microsoft,
        username: profile.name,
        uuid: formatted_uuid,
        access_token: Some(mc_token),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_resolve_client_id() {
        assert_eq!(resolve_client_id(None), MS_CLIENT_ID);
        assert_eq!(resolve_client_id(Some("   ")), MS_CLIENT_ID);
        assert_eq!(resolve_client_id(Some("custom-guid-123")), "custom-guid-123");
    }

    #[test]
    fn test_format_uuid_hyphenated() {
        let hex_uuid = "12345678123412341234123456789abc";
        let formatted = format_uuid_hyphenated(hex_uuid);
        assert_eq!(formatted, "12345678-1234-1234-1234-123456789abc");

        let already_hyphenated = "12345678-1234-1234-1234-123456789abc";
        assert_eq!(format_uuid_hyphenated(already_hyphenated), already_hyphenated);

        let invalid = "short";
        assert_eq!(format_uuid_hyphenated(invalid), "short");
    }

    #[test]
    fn test_parse_device_code_json() {
        let sample = r#"{
            "user_code": "ZAHMBXS7",
            "device_code": "abc123device",
            "verification_uri": "https://www.microsoft.com/link",
            "expires_in": 900,
            "interval": 5,
            "message": "Enter code"
        }"#;

        let parsed: DeviceCodeResponse = serde_json::from_str(sample).unwrap();
        assert_eq!(parsed.user_code, "ZAHMBXS7");
        assert_eq!(parsed.device_code, "abc123device");
        assert_eq!(parsed.verification_uri, "https://www.microsoft.com/link");
        assert_eq!(parsed.expires_in, 900);
        assert_eq!(parsed.interval, 5);
    }

    #[test]
    fn test_parse_xbox_live_response() {
        let sample = r#"{
            "IssueInstant": "2026-10-13T10:00:00Z",
            "NotAfter": "2026-10-14T10:00:00Z",
            "Token": "xbl_jwt_token_sample",
            "DisplayClaims": {
                "xui": [
                    { "uhs": "1234567890" }
                ]
            }
        }"#;

        let parsed: XboxAuthResponse = serde_json::from_str(sample).unwrap();
        assert_eq!(parsed.token, "xbl_jwt_token_sample");
        assert_eq!(parsed.display_claims.xui.len(), 1);
        assert_eq!(parsed.display_claims.xui[0].uhs, "1234567890");
    }

    #[test]
    fn test_parse_minecraft_profile_response() {
        let sample = r#"{
            "id": "c06f89064c8a49119c29ea1dbd1aab82",
            "name": "AlexPlayer",
            "skins": [],
            "capes": []
        }"#;

        let parsed: MinecraftProfileResponse = serde_json::from_str(sample).unwrap();
        assert_eq!(parsed.name, "AlexPlayer");
        assert_eq!(
            format_uuid_hyphenated(&parsed.id),
            "c06f8906-4c8a-4911-9c29-ea1dbd1aab82"
        );
    }
}
