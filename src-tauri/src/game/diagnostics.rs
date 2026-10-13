use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "UPPERCASE")]
pub enum LogLevel {
    Info,
    Warn,
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct LogEntry {
    pub level: LogLevel,
    pub message: String,
    pub timestamp_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct CrashDiagnostic {
    pub title: String,
    pub description: String,
    pub solution: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct CrashReportEvent {
    pub exit_code: i32,
    pub diagnostic: Option<CrashDiagnostic>,
    pub tail_logs: Vec<String>,
}

pub fn parse_log_level(line: &str) -> LogLevel {
    let upper = line.to_uppercase();
    if upper.contains("/ERROR")
        || upper.contains("[ERROR]")
        || upper.contains("FATAL")
        || upper.contains("EXCEPTION")
        || upper.contains("CRASH")
    {
        LogLevel::Error
    } else if upper.contains("/WARN") || upper.contains("[WARN]") {
        LogLevel::Warn
    } else {
        LogLevel::Info
    }
}

pub fn create_log_entry(message: String) -> LogEntry {
    let level = parse_log_level(&message);
    let timestamp_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);

    LogEntry {
        level,
        message,
        timestamp_ms,
    }
}

pub fn analyze_crash(tail_logs: &[String], exit_code: i32) -> Option<CrashDiagnostic> {
    let joined = tail_logs.join("\n").to_lowercase();

    // 1. Out of Memory
    if joined.contains("outofmemoryerror") || joined.contains("java heap space") {
        return Some(CrashDiagnostic {
            title: "Memoria RAM insuficiente (Heap Space)".to_string(),
            description: "Minecraft se quedó sin memoria para cargar Forge y los mods.".to_string(),
            solution: "Abre Ajustes ⚙️ y aumenta la memoria RAM asignada a 6 GB u 8 GB.".to_string(),
        });
    }

    // 2. OpenGL / GPU driver crash
    if joined.contains("glfw error 65542")
        || joined.contains("pixel format not accelerated")
        || joined.contains("wgl")
        || joined.contains("opengl")
    {
        return Some(CrashDiagnostic {
            title: "Error de controlador gráfico / OpenGL".to_string(),
            description: "El sistema no pudo inicializar el contexto gráfico requerido para Minecraft.".to_string(),
            solution: "Actualiza los controladores de tu tarjeta gráfica y asegúrate de que Java use la GPU dedicada de alto rendimiento.".to_string(),
        });
    }

    // 3. Java version mismatch
    if joined.contains("unsupportedclassversionerror")
        || joined.contains("has been compiled by a more recent version")
    {
        return Some(CrashDiagnostic {
            title: "Incompatibilidad de versión de Java".to_string(),
            description: "Se detectó una versión de Java no compatible con Forge 1.20.1.".to_string(),
            solution: "Instala y selecciona OpenJDK / Temurin Java 17 en tu sistema.".to_string(),
        });
    }

    // 4. Duplicate mods
    if joined.contains("duplicatemodsfoundexception") || joined.contains("duplicate mod") {
        return Some(CrashDiagnostic {
            title: "Mods duplicados detectados".to_string(),
            description: "Se encontraron archivos .jar duplicados en la carpeta de mods.".to_string(),
            solution: "Elimina los mods duplicados o realiza una comprobación de actualizaciones para limpiar archivos huérfanos.".to_string(),
        });
    }

    // 5. Mod loading / dependencies
    if joined.contains("modloadingexception") || joined.contains("fml:modloading") {
        return Some(CrashDiagnostic {
            title: "Fallo de carga en mod".to_string(),
            description: "Un mod no pudo inicializarse correctamente durante el arranque de Forge.".to_string(),
            solution: "Copia el informe con el botón inferior y compártelo en el canal de soporte técnico de Discord.".to_string(),
        });
    }

    // 6. Generic code-based diagnostics
    if exit_code == -1073740791 || exit_code == -1073741819 {
        return Some(CrashDiagnostic {
            title: "Cierre forzado de proceso (Violación de acceso)".to_string(),
            description: "El juego se cerró abruptamente por un conflicto con overlays o drivers gráficos.".to_string(),
            solution: "Desactiva temporalmente overlays externos (Discord Overlay, GeForce Experience) y reinicia el juego.".to_string(),
        });
    }

    if exit_code != 0 {
        return Some(CrashDiagnostic {
            title: format!("Cierre inesperado (Código de salida: {})", exit_code),
            description: "El juego se detuvo de forma anómala.".to_string(),
            solution: "Copia el informe para Discord con el botón inferior para recibir ayuda técnica.".to_string(),
        });
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_log_level() {
        assert_eq!(
            parse_log_level("[16:14:02] [Render thread/INFO]: Loading Minecraft"),
            LogLevel::Info
        );
        assert_eq!(
            parse_log_level("[16:14:10] [modloading-worker-0/WARN]: Missing optional dependency"),
            LogLevel::Warn
        );
        assert_eq!(
            parse_log_level("[16:14:15] [main/ERROR]: java.lang.OutOfMemoryError: Java heap space"),
            LogLevel::Error
        );
        assert_eq!(
            parse_log_level("Caused by: java.lang.NullPointerException"),
            LogLevel::Error
        );
    }

    #[test]
    fn test_log_entry_serialization() {
        let entry = LogEntry {
            level: LogLevel::Error,
            message: "Fatal crash detected".to_string(),
            timestamp_ms: 1728830000000,
        };
        let json = serde_json::to_string(&entry).unwrap();
        assert!(json.contains("\"level\":\"ERROR\""));
        assert!(json.contains("Fatal crash detected"));
    }

    #[test]
    fn test_detect_out_of_memory() {
        let logs = vec![
            "[INFO] Loading blocks".to_string(),
            "[ERROR] Exception in thread \"main\" java.lang.OutOfMemoryError: Java heap space".to_string(),
        ];
        let diag = analyze_crash(&logs, 1).unwrap();
        assert!(diag.title.contains("Memoria RAM"));
        assert!(diag.solution.contains("Ajustes"));
    }

    #[test]
    fn test_detect_opengl_error() {
        let logs = vec![
            "[ERROR] GLFW error 65542: WGL: The driver does not appear to support OpenGL".to_string(),
        ];
        let diag = analyze_crash(&logs, 1).unwrap();
        assert!(diag.title.contains("OpenGL"));
    }

    #[test]
    fn test_detect_java_mismatch() {
        let logs = vec![
            "Exception: java.lang.UnsupportedClassVersionError: class compiled with version 61".to_string(),
        ];
        let diag = analyze_crash(&logs, 1).unwrap();
        assert!(diag.title.contains("Java"));
    }

    #[test]
    fn test_detect_duplicate_mods() {
        let logs = vec![
            "[ERROR] net.minecraftforge.fml.loading.DuplicateModsFoundException: Duplicate mods found".to_string(),
        ];
        let diag = analyze_crash(&logs, 1).unwrap();
        assert!(diag.title.contains("duplicados"));
    }

    #[test]
    fn test_detect_exit_code_fallback() {
        let logs = vec!["[INFO] Normal line".to_string()];
        let diag = analyze_crash(&logs, -1).unwrap();
        assert!(diag.title.contains("-1"));
    }
}
