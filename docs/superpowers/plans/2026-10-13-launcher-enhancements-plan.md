# Plan de Implementación: Mejoras y Conexiones del Launcher MonoEvents

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar selector nativo de directorio, apertura en el explorador, cierre automático al iniciar el juego, soporte de descarga de resourcepacks, publicación y manifiesto de mods reales en GitHub Releases y autenticación oficial con Microsoft OAuth2 mediante Device Code Flow.

**Architecture:** Módulos modulares en Rust para diálogo nativo de OS (`rfd` / Tauri Dialog), gestión de procesos, extensión del evaluador delta de manifiestos para resourcepacks, cliente asíncrono `reqwest` para la cadena de autenticación OAuth2 de Mojang/Xbox Live y componentes reactivos en TypeScript/Tailwind con Zustand.

**Tech Stack:** Tauri 2.0, Rust (tokio, reqwest, serde), React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons, GitHub CLI (`gh`).

**Spec:** `docs/superpowers/specs/2026-10-13-launcher-enhancements-design.md`

## Global Constraints
- Mantener en verde los tests unitarios (`cargo test`) y compilación limpia de frontend (`npm run build`).
- Compatibilidad estricta con Windows 10/11 y Forge 47.4.22 (Java 17).
- No romper la persistencia de configuraciones en `%APPDATA%\MonoEventsLauncher\settings.json`.
- Cumplir el estándar RFC 4122 v3 para cuentas offline y OAuth2/XSTS para cuentas Microsoft.

## Review Focus
1. Selector de carpeta cancelado: si el usuario cancela el diálogo nativo, mantener la ruta actual sin lanzar excepciones.
2. Cierre del launcher: esperar a que el subproceso de Java esté verificado para evitar huérfanos antes de llamar a `app.exit(0)`.
3. Errores de red en Microsoft OAuth2: expiración de `device_code` o declinación del usuario en `devicelogin`.
4. Fallos 404 en release de mods: verificar que cada JAR subido a GitHub Releases devuelva status 200 antes de fijar en manifiesto.
5. Limpieza de resourcepacks huérfanos: el delta sync debe eliminar resourcepacks obsoletos de la instancia si son retirados del manifiesto.

---

### Task 1: Selector Nativo de Carpeta y Apertura en Explorador de Windows

**Files:**
- Create: `src-tauri/src/system/mod.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src/hooks/useTauriIpc.ts`
- Modify: `src/components/settings/SettingsModal.tsx`

**Interfaces:**
- Produces: `pick_game_directory() -> Result<Option<String>, String>`
- Produces: `open_directory_in_explorer(path: String) -> Result<(), String>`

- [ ] **Step 1: Crear módulo `system` en Rust con selector nativo y apertura en Windows Explorer**
- [ ] **Step 2: Registrar comandos en `lib.rs` y verificar con `cargo test`**
- [ ] **Step 3: Conectar `useTauriIpc.ts` y añadir botón «Examinar» nativo y «Abrir en Explorador» en `SettingsModal.tsx`**
- [ ] **Step 4: Verificar compilación en Vite con `npm run build`**
- [ ] **Step 5: Commit:** `git commit -m "feat: add native folder picker and explorer launcher"`

---

### Task 2: Cierre Automático del Launcher al Iniciar Minecraft

**Files:**
- Modify: `src-tauri/src/game/process_spawner.rs`
- Modify: `src-tauri/src/lib.rs`

**Interfaces:**
- Consumes: `settings.close_launcher_on_start: bool`
- Produces: Desvinculación de proceso hijo y llamada a `app.exit(0)` tras retardo de 1.5s

- [ ] **Step 1: Escribir test unitario de configuración para cierre automático**
- [ ] **Step 2: Implementar la finalización limpia de la app en `launch_game` tras `spawn_minecraft_process`**
- [ ] **Step 3: Ejecutar `cargo test` para verificar que no afecta a los tests existentes**
- [ ] **Step 4: Commit:** `git commit -m "feat: close launcher automatically on minecraft launch"`

---

### Task 3: Soporte para Descarga y Sincronización de Resourcepacks

**Files:**
- Modify: `src/types/launcher.ts`
- Modify: `src-tauri/src/game/environment.rs`
- Modify: `src-tauri/src/updater/modpack_checker.rs`

**Interfaces:**
- ModpackFileType: `'custom' | 'modrinth' | 'config' | 'resourcepack'`
- Subcarpeta: `instances/<id>/resourcepacks/` garantizada en `ensure_instance_structure`

- [ ] **Step 1: Escribir test en `environment.rs` que verifique la creación de la carpeta `resourcepacks`**
- [ ] **Step 2: Actualizar `ensure_instance_structure` para crear `resourcepacks/`**
- [ ] **Step 3: Extender tipos en TypeScript y lógica en `modpack_checker.rs` para resourcepacks**
- [ ] **Step 4: Ejecutar `cargo test` y `npm run build`**
- [ ] **Step 5: Commit:** `git commit -m "feat: add resourcepacks support to instance structure and sync"`

---

### Task 4: Empaquetado y Subida de Mods Reales a GitHub Releases

**Files:**
- Create: `scripts/publish_modpack_release.ps1`
- Modify: `src/data/defaultModpack.ts`

**Interfaces:**
- GitHub Repo: `gek0v/monoevents-modpack`
- Release Tag: `v1.0.0`
- Manifest: Lista de ~75 archivos JAR con hashes SHA-1 calculados y URLs públicas

- [ ] **Step 1: Crear script PowerShell para crear el repositorio GitHub `gek0v/monoevents-modpack` si no existe**
- [ ] **Step 2: Calcular hashes SHA-1 y tamaños de los ~75 mods clientes en la instancia local de Prism**
- [ ] **Step 3: Subir los archivos JAR a la release `v1.0.0` usando `gh release create`**
- [ ] **Step 4: Actualizar `src/data/defaultModpack.ts` con todas las entradas de mods reales**
- [ ] **Step 5: Verificar descarga exitosa de al menos un mod con `reqwest` / `curl`**
- [ ] **Step 6: Commit:** `git commit -m "feat: publish real modpack to github releases and update manifest"`

---

### Task 5: Autenticación Microsoft OAuth2 con Device Code Flow

**Files:**
- Modify: `src-tauri/src/auth/microsoft.rs`
- Modify: `src-tauri/src/auth/mod.rs`
- Modify: `src-tauri/src/game/forge_launcher.rs`
- Modify: `src-tauri/src/lib.rs`
- Create: `src/components/settings/MicrosoftDeviceCodeModal.tsx`
- Modify: `src/components/settings/SettingsModal.tsx`

**Interfaces:**
- `start_microsoft_login() -> Result<DeviceCodeResponse, String>`
- `poll_microsoft_login(device_code: String) -> Result<AuthSession, String>`
- Forge Launcher args: `--username <name> --uuid <uuid> --accessToken <token> --userType msa`

- [ ] **Step 1: Implementar en `microsoft.rs` las llamadas a DeviceCode, Xbox Live, XSTS y Minecraft Services**
- [ ] **Step 2: Escribir tests unitarios en Rust para el parsing de respuestas y generación de argumentos Forge con MSA**
- [ ] **Step 3: Exponer comandos Tauri `start_microsoft_login` y `poll_microsoft_login`**
- [ ] **Step 4: Crear componente frontend `MicrosoftDeviceCodeModal.tsx` con código y botón de enlace directo**
- [ ] **Step 5: Conectar el flujo en `SettingsModal.tsx` y probar compilación `npm run build`**
- [ ] **Step 6: Commit:** `git commit -m "feat: implement full microsoft oauth2 device code flow"`
