# Especificación de Diseño: Mejoras y Conexiones del Launcher MonoEvents

- **Fecha:** 2026-10-13
- **Estado:** Aprobado
- **Autor:** Antigravity & Geko

---

## 1. Visión General
Esta especificación define la implementación de cinco mejoras clave en el launcher oficial de MonoEvents:
1. **Selector e Integración con el Explorador de Archivos de Windows:** Comando nativo para selección de directorio de juego y botón directo para abrir la carpeta de instalación en el Explorador de Windows.
2. **Cierre Automático tras el Arranque de Minecraft:** Finalización limpia de la aplicación Tauri al iniciarse el proceso de Forge para optimizar el consumo de memoria RAM.
3. **Autenticación Oficial con Microsoft OAuth2 (Device Code Flow):** Flujo completo de autenticación premium (Microsoft -> Xbox Live -> XSTS -> Minecraft Services -> Perfil oficial Mojang) con UI de código de dispositivo interactiva.
4. **Empaquetado y Subida de Mods Reales a GitHub Releases:** Publicación de los ~75 mods reales (~280 MB) de la instancia cliente en un nuevo repositorio público `gek0v/monoevents-modpack` y actualización del manifiesto con hashes SHA-1 y URLs directas.
5. **Soporte y Descarga de Resourcepacks:** Incorporación de resourcepacks al esquema de manifiesto, garantizando su descarga, verificación SHA-1 y sincronización delta en `instances/<id>/resourcepacks/`.

---

## 2. Componentes y Arquitectura

### 2.1. Selector de Carpeta y Explorador de Windows (OS Integration)
- **Backend (`src-tauri/src/lib.rs`):**
  - Comando `pick_game_directory()`: Utiliza la API nativa de diálogo de carpetas de Tauri 2 (`tauri_plugin_dialog::DialogExt`), permitiendo al usuario seleccionar un directorio sin depender de APIs web del frontend.
  - Comando `open_directory_in_explorer(path: String)`: Ejecuta de forma segura `explorer.exe <path>` en Windows para abrir la carpeta especificada en una ventana del Explorador de archivos.
- **Frontend (`src/components/settings/SettingsModal.tsx`):**
  - Sustituye la llamada a `dialog.open` por `pick_game_directory()`.
  - Agrega un botón con icono de carpeta («Abrir en Explorador») junto al botón «Examinar...».

### 2.2. Cierre Automático del Launcher
- **Backend (`src-tauri/src/game/process_spawner.rs` y `src-tauri/src/lib.rs`):**
  - En `launch_game()`, tras la llamada exitosa a `spawn_minecraft_process()` (cuando el proceso de Java 17 ha sido creado con PID válido):
  - Se verifica la propiedad `settings.close_launcher_on_start` (por defecto `true`).
  - Si es `true`, tras emitir el evento `game-status` al frontend, se genera un hilo temporizador de 1.5 segundos (para asegurar la inicialización del subproceso y la persistencia de logs iniciales) y se ejecuta `app.exit(0)`.

### 2.3. Autenticación Microsoft OAuth2 (Device Code Flow)
- **Módulo Backend (`src-tauri/src/auth/microsoft.rs`):**
  - Implementación con `reqwest`:
    1. `request_device_code()`: `POST https://login.microsoftonline.com/consumers/oauth2/v2.0/devicecode`
       - Parámetros: `client_id` (oficial de Minecraft o Azure AD), `scope: "XboxLive.signin offline_access"`.
       - Devuelve: `user_code`, `device_code`, `verification_uri`, `interval`, `expires_in`.
    2. `poll_microsoft_token(device_code)`: Consulta periódica a `POST https://login.microsoftonline.com/consumers/oauth2/v2.0/token` hasta aprobación o expiración.
    3. `authenticate_xbox_live(ms_token)`: `POST https://user.auth.xboxlive.com/user/authenticate`.
    4. `obtain_xsts_token(xbl_token, uhs)`: `POST https://xsts.auth.xboxlive.com/xsts/authorize` con `RelyingParty: "rp://api.minecraftservices.com/"`.
    5. `login_minecraft(xsts_token, uhs)`: `POST https://api.minecraftservices.com/authentication/login_with_xbox`.
    6. `fetch_minecraft_profile(mc_token)`: `GET https://api.minecraftservices.com/minecraft/profile`. Obtiene UUID y nombre oficial de usuario de Minecraft.
  - Retorna una estructura `AuthSession` completa con `session_type: SessionType::Microsoft`, `username`, `uuid` y `access_token`.
- **Frontend (`SettingsModal.tsx` & `MicrosoftLoginModal.tsx`):**
  - Modal interactivo con el código `user_code` en texto destacado con botón para copiar al portapapeles y enlace a `verification_uri`.
  - Animación de carga y estado mientras se espera la confirmación en el navegador.

### 2.4. Empaquetado y Distribución de Mods Reales en la Nube
- **Repositorio:** `gek0v/monoevents-modpack` en GitHub.
- **Herramienta:** CLI `gh` autenticada con cuenta `gek0v`.
- **Colección de Mods:**
  - Extraídos de la instancia cliente real (`MonoCraft-2026-06-23_18-42-06\minecraft\mods`): ~75 mods (incluyendo `alexscaves`, `create`, `alexsmobs`, `zero_market`, `mono_events-1.0.jar`, etc.).
- **Proceso de Despliegue:**
  - Script que calcula hashes SHA-1 y pesos en bytes de cada archivo.
  - Creación de la release `v1.0.0` mediante `gh release create v1.0.0 --title "MonoEvents Modpack v1.0.0"`.
  - Generación de `src/data/defaultModpack.ts` con todas las entradas de archivos y URLs públicas de descarga (`https://github.com/gek0v/monoevents-modpack/releases/download/v1.0.0/...`).

### 2.5. Soporte para Descarga de Resourcepacks
- **Tipos y Modelo (`src/types/launcher.ts`):**
  - Añadir `'resourcepack'` a `ModpackFileType`.
  - Estructura en `files`:
    ```json
    {
      "path": "resourcepacks/MonoEvents-Textures.zip",
      "url": "https://github.com/gek0v/monoevents-modpack/releases/download/v1.0.0/MonoEvents-Textures.zip",
      "sha1": "<sha1>",
      "size": <bytes>,
      "type": "resourcepack"
    }
    ```
- **Backend:**
  - En `ensure_instance_structure()`, asegurar la creación de `instances/<id>/resourcepacks/`.
  - En `sync_modpack()`, el procesamiento de rutas relativas ya mapea `resourcepacks/` a la carpeta correspondiente con verificación estricta de hash SHA-1.

---

## 3. Estrategia de Pruebas y Verificación
- **Unitarias en Rust (`cargo test`):**
  - Test de validación de estructura de directorios incluyendo `resourcepacks/`.
  - Test de serialización/deserialización de `AuthSession` Microsoft.
  - Test de cálculo de argumentos de Forge con `--userType msa`.
- **Frontend (`npm run build`):**
  - Compilación sin errores de tipos TypeScript.
  - Verificación del selector de carpetas y apertura en el explorador.
  - Verificación de UI de Device Code.
