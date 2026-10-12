# Plan de Implementación: Fase 1 del Launcher de Minecraft (MonoEvents Launcher)

> **Para ejecutores y agentes:** HABILIDAD REQUERIDA: Usar `superpowers:executing-plans` (ejecución nativa) o `superpowers:subagent-driven-development` para implementar este plan tarea por tarea. Cada paso utiliza la sintaxis de casillas (`- [ ]`) para seguimiento de progreso. Se integra el seguimiento nativo de metas mediante la herramienta de gestión `orca goal`.

**Goal:** Estructurar de forma completa y profesional el repositorio del launcher de Minecraft (`monoevents-launcher`), creando la arquitectura de directorios (Rust + React + Tauri), los esquemas de manifiestos con cálculo de hashes, los workflows de CI/CD para GitHub Releases, la documentación técnica y las metas de seguimiento en Orca.

**Architecture:** Repositorio independiente con Tauri 2.0 (Rust backend modular en `src-tauri/` y React Vite frontend en `src/`), automatización de manifiestos mediante TypeScript CLI en `scripts/`, workflows de GitHub Actions para compilación multiplataforma y publicación de releases, y documentación técnica completa en `docs/`.

**Tech Stack:** Tauri 2.0, Rust (edition 2021), React 18/19, TypeScript, Vite, Tailwind CSS, GitHub Actions, Minisign, Orca CLI.

**Spec:** [2026-10-12-minecraft-launcher-phase1-design.md](file:///C:/Users/Geko/Desktop/HalloweenMC/MonoEvents/launcher/docs/superpowers/specs/2026-10-12-minecraft-launcher-phase1-design.md)

## Global Constraints

- Repositorio Git independiente dentro de `launcher/` con rama principal limpia y `.gitignore` estricto.
- Backend en Rust estructurado en módulos desacoplados: `auth`, `config`, `downloader`, `game`, `updater`.
- Especificación formal del esquema de modpacks (`manifest.json`) con verificación de integridad por SHA-1 y bloqueo estricto de juego si hay desincronización.
- Infraestructura de distribución sin costos fijos: GitHub Releases para assets y GitHub Actions para empaquetado.
- Documentación exhaustiva en `docs/` (`ARCHITECTURE.md`, `MANIFEST_SPEC.md`, `SETUP.md`) y `README.md` operativo.
- El avance de cada tarea debe reflejarse en los objetivos de Orca ejecutando `orca goal complete <índice>`.

## Review Focus

1. **Rutas y dependencias de Tauri 2.0 en Windows**: Asegurar que `tauri.conf.json` y `Cargo.toml` utilicen sintaxis y plugins compatibles con Tauri v2 (`@tauri-apps/plugin-updater`, `@tauri-apps/plugin-fs`, etc.).
2. **Compatibilidad del script de manifiestos**: Verificar que `scripts/generate-manifest.ts` calcule hashes SHA-1 correctos y respete los campos obligatorios del esquema (`schemaVersion`, `minecraft.version`, etc.).
3. **Persistencia y exclusiones de Git**: Confirmar que `.gitignore` excluya compilaciones (`target/`, `node_modules/`, `dist/`), secretos y carpetas temporales de Minecraft (`instances/`, `runtime/`).
4. **Validación de esquemas de GitHub Actions**: Comprobar que los archivos YAML en `.github/workflows/` tengan una sintaxis válida para runners de GitHub con soporte para compilación en Windows.
5. **Sincronización con Orca**: Comprobar que `.orca/CURRENT_GOAL.md` y `.orca/goals.json` reflejen exactamente el objetivo global y las subtareas antes de iniciar y al concluir.

---

### Task 1: Inicialización de Metas en Orca y Base de Git

**Files:**
- Modify: `.orca/goals.json` (mediante comandos CLI de Orca)
- Modify: `.orca/CURRENT_GOAL.md` (proyectado automáticamente por Orca)
- Modify: `.gitignore`

**Interfaces:**
- Consumes: N/A
- Produces: Objetivo activo en Orca con tareas numeradas y repositorio Git limpio con commit base.

- [ ] **Paso 1: Configurar el objetivo principal en Orca**
  Ejecutar:
  ```powershell
  orca goal set "Fase 1: Estructuración y Fundamentos del Launcher MonoEvents"
  ```
  Salida esperada: Objetivo fijado y reflejado en `.orca/CURRENT_GOAL.md`.

- [ ] **Paso 2: Registrar las subtareas de la Fase 1 en Orca**
  Ejecutar:
  ```powershell
  orca goal add-task "Configuración base de paquetes npm, TypeScript y Tauri/Cargo"
  orca goal add-task "Creación del árbol de carpetas y esqueletos modulares de Rust"
  orca goal add-task "Definición del esquema de manifiestos y script generate-manifest.ts"
  orca goal add-task "Configuración de workflows CI/CD para GitHub Actions"
  orca goal add-task "Redacción de documentación técnica (ARCHITECTURE, MANIFEST_SPEC, SETUP, README)"
  orca goal add-task "Validación general del entorno y cierre del objetivo en Orca"
  ```
  Salida esperada: Las 6 tareas registradas en `.orca/goals.json`.

- [ ] **Paso 3: Validar estado inicial de metas en Orca**
  Ejecutar: `orca goal status`
  Salida esperada: Mostrar el objetivo y las 6 subtareas pendientes (0/6 completadas).

- [ ] **Paso 4: Actualizar y verificar `.gitignore`**
  Comprobar que `.gitignore` contenga exclusiones para `target/`, `node_modules/`, `dist/`, `.orca/`, `.vscode/`, `*.log`, `instances/`, `runtime/`.
  Ejecutar: `git status`

- [ ] **Paso 5: Commit de la base del repositorio**
  ```powershell
  git add .gitignore; git commit -m "chore: setup initial gitignore and project base"
  ```

---

### Task 2: Configuración Base de Paquetes (Node, TypeScript y Rust/Tauri 2.0)

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `src-tauri/Cargo.toml`
- Create: `src-tauri/tauri.conf.json`

**Interfaces:**
- Consumes: Definiciones del spec (Tauri 2.0, React, Vite, Tailwind, plugins de Tauri).
- Produces: Manifiestos de dependencias válidos y compilables para Node y Rust.

- [ ] **Paso 1: Crear `package.json`**
  Incluir dependencias de producción (`react`, `react-dom`, `@tauri-apps/api`, `@tauri-apps/plugin-updater`, `zustand`, `lucide-react`, `clsx`, `tailwind-merge`) y de desarrollo (`vite`, `@vitejs/plugin-react`, `typescript`, `tailwindcss`, `postcss`, `autoprefixer`, `ts-node`).
  Scripts: `dev`, `build`, `tauri`, `package:manifest`.

- [ ] **Paso 2: Crear `tsconfig.json`**
  Configurar TypeScript estricto con soporte para JSX (`react-jsx`), target `ESNext`, módulo `ESNext`, resolución `bundler` y alias de importación `@/*` apuntando a `./src/*`.

- [ ] **Paso 3: Crear `src-tauri/Cargo.toml`**
  Configurar el paquete Rust `monoevents-launcher` (versión `0.1.0`, edición `2021`).
  Dependencias:
  - `tauri = { version = "2.0", features = [] }`
  - `tauri-plugin-updater = "2.0"`
  - `tauri-plugin-fs = "2.0"`
  - `tauri-plugin-dialog = "2.0"`
  - `serde = { version = "1.0", features = ["derive"] }`
  - `serde_json = "1.0"`
  - `tokio = { version = "1.0", features = ["full"] }`
  - `reqwest = { version = "0.12", features = ["json", "stream"] }`
  - `sha1 = "0.10"`
  - `sha2 = "0.10"`
  - `keyring = "3.0"`

- [ ] **Paso 4: Crear `src-tauri/tauri.conf.json`**
  Configurar identificador único de aplicación `com.geko.monoevents.launcher`, ventana principal sin bordes o moderna (`title: "MonoEvents Launcher"`, `width: 980`, `height: 640`, `resizable: false`), seguridad IPC y configuración de `plugins.updater` con URL del endpoint de GitHub Releases `https://github.com/tu-usuario/monoevents-launcher/releases/latest/download/latest.json`.

- [ ] **Paso 5: Marcar tarea 1 completada en Orca y commit**
  Ejecutar:
  ```powershell
  orca goal complete 1
  git add package.json tsconfig.json src-tauri/Cargo.toml src-tauri/tauri.conf.json
  git commit -m "build: setup package manifests for Node, TypeScript, and Tauri 2.0"
  ```

---

### Task 3: Estructura de Directorios y Esqueletos Modulares de Rust

**Files:**
- Create: `src-tauri/src/main.rs`
- Create: `src-tauri/src/lib.rs`
- Create: `src-tauri/src/auth/mod.rs`
- Create: `src-tauri/src/auth/microsoft.rs`
- Create: `src-tauri/src/auth/offline.rs`
- Create: `src-tauri/src/config/mod.rs`
- Create: `src-tauri/src/config/settings.rs`
- Create: `src-tauri/src/downloader/mod.rs`
- Create: `src-tauri/src/downloader/pool.rs`
- Create: `src-tauri/src/downloader/validator.rs`
- Create: `src-tauri/src/game/mod.rs`
- Create: `src-tauri/src/game/java_finder.rs`
- Create: `src-tauri/src/game/forge_launcher.rs`
- Create: `src-tauri/src/game/process_monitor.rs`
- Create: `src-tauri/src/updater/mod.rs`
- Create: `src-tauri/src/updater/modpack_checker.rs`
- Create: `src/types/launcher.ts`
- Create: `src/App.tsx`
- Create: `src/main.tsx`

**Interfaces:**
- Consumes: Módulos de Rust desacoplados descritos en la Sección 3 del spec.
- Produces: Esqueletos de Rust compilables con structs y firmas de funciones expuestas para IPC.

- [ ] **Paso 1: Crear esqueletos del módulo `auth` en Rust**
  Definir en `src-tauri/src/auth/`:
  - `SessionType`: enum `Microsoft` | `Offline`.
  - `AuthSession`: struct con `username`, `uuid`, `access_token`, `expires_at`.
  - Funciones base: `start_microsoft_device_flow()`, `create_offline_session(username: &str) -> AuthSession`.

- [ ] **Paso 2: Crear esqueletos del módulo `config` en Rust**
  Definir en `src-tauri/src/config/`:
  - `UserSettings`: struct serializable con `selected_modpack_id`, `allocated_ram_gb`, `game_directory`, `active_account`, `close_launcher_on_start`.
  - Funciones: `load_settings() -> UserSettings`, `save_settings(settings: UserSettings) -> Result<(), String>`.

- [ ] **Paso 3: Crear esqueletos de `downloader`, `game` y `updater` en Rust**
  - `downloader`: `DownloadItem`, `verify_sha1(file_path: &Path, expected_hash: &str) -> bool`.
  - `game`: `find_java_runtime() -> Option<PathBuf>`, `build_forge_command(...)`.
  - `updater`: `check_modpack_update(manifest_url: &str, local_manifest: &Path) -> UpdateStatus`.

- [ ] **Paso 4: Crear `src-tauri/src/lib.rs` y `src-tauri/src/main.rs`**
  Exportar la función `run()` en `lib.rs` con el builder de Tauri registrando los módulos, y el punto de entrada ejecutable en `main.rs`.

- [ ] **Paso 5: Crear definiciones de tipos en TypeScript (`src/types/launcher.ts`)**
  Declarar interfaces para `ModpackManifest`, `ModpackFile`, `UserSettings`, `DownloadProgressEvent` y `GameStatus`.

- [ ] **Paso 6: Crear punto de entrada mínimo de React (`src/main.tsx`, `src/App.tsx`)**
  Configurar componente base de React con un contenedor oscuro temático y placeholder estilizado.

- [ ] **Paso 7: Marcar tarea 2 completada en Orca y commit**
  Ejecutar:
  ```powershell
  orca goal complete 2
  git add src-tauri/src/ src/
  git commit -m "feat: establish Rust modular skeleton and React baseline structure"
  ```

---

### Task 4: Esquema de Manifiestos y Script de Empaquetado (`generate-manifest.ts`)

**Files:**
- Create: `manifests/monoevents-forge.json`
- Create: `scripts/generate-manifest.ts`

**Interfaces:**
- Consumes: Especificación del manifiesto del spec (Sección 4.1).
- Produces: Manifiesto JSON de ejemplo para MonoEvents y herramienta CLI para indexar y hashear mods automáticamente.

- [ ] **Paso 1: Crear manifiesto de modpack de referencia (`manifests/monoevents-forge.json`)**
  Estructurar el archivo con `schemaVersion: 1`, `id: "monoevents-forge-1.20.1"`, configuración de Minecraft (`version: "1.20.1"`, `modloader: "forge"`, `modloaderVersion: "47.4.22"`, `javaVersion: 17`), changelog descriptivo y lista de archivos con paths relativos, URLs directas, hashes SHA-1 y tipos (`custom`, `modrinth`, `config`).

- [ ] **Paso 2: Desarrollar script CLI `scripts/generate-manifest.ts`**
  Implementar la utilidad con Node.js / TypeScript:
  - Lee recursivamente un directorio local de mods (`./mods/`, `./config/`).
  - Calcula el hash SHA-1 y tamaño en bytes de cada archivo usando el módulo nativo `crypto`.
  - Genera o actualiza el archivo `manifest.json` con la información formateada.
  - Soporta argumentos CLI: `--modpack-id <id>`, `--name <name>`, `--version <version>`, `--mc <version>`, `--forge <version>`, `--dir <folder>`.

- [ ] **Paso 3: Probar el cálculo de hash en el script**
  Ejecutar una prueba del generador contra un archivo de muestra y verificar que el hash SHA-1 generado sea exacto.

- [ ] **Paso 4: Marcar tarea 3 completada en Orca y commit**
  Ejecutar:
  ```powershell
  orca goal complete 3
  git add manifests/ scripts/
  git commit -m "feat: create modpack manifest template and generate-manifest CLI tool"
  ```

---

### Task 5: Configuración de Workflows CI/CD para GitHub Actions

**Files:**
- Create: `.github/workflows/build-launcher.yml`
- Create: `.github/workflows/package-modpack.yml`

**Interfaces:**
- Consumes: Arquitectura de publicación en GitHub Releases (Sección 8 del spec).
- Produces: Automatización de compilación de instaladores Windows (.exe) y publicación de modpacks en GitHub Actions.

- [ ] **Paso 1: Crear `.github/workflows/build-launcher.yml`**
  - Disparador: `push` en tags `v*.*.*` o manual (`workflow_dispatch`).
  - Runner: `windows-latest`.
  - Pasos:
    1. Checkout del código.
    2. Setup de Node.js 20 con caché de npm.
    3. Setup de Rust stable con caché de cargo.
    4. Instalación de dependencias (`npm ci`).
    5. Acción oficial de Tauri (`tauri-apps/tauri-action@v0`) configurada con firma Minisign (`TAURI_SIGNING_PRIVATE_KEY` y `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`).
    6. Creación y subida automática de assets (`.exe`, `.msi`, `latest.json`) al Release de GitHub.

- [ ] **Paso 2: Crear `.github/workflows/package-modpack.yml`**
  - Disparador: `push` en tags `modpack-v*.*.*` o manual (`workflow_dispatch`).
  - Runner: `ubuntu-latest` o `windows-latest`.
  - Pasos:
    1. Checkout del código.
    2. Ejecución del script `generate-manifest.ts` para validar hashes.
    3. Creación del release de modpack y publicación de `manifest.json` y assets de mods.

- [ ] **Paso 3: Marcar tarea 4 completada en Orca y commit**
  Ejecutar:
  ```powershell
  orca goal complete 4
  git add .github/workflows/
  git commit -m "ci: configure GitHub Actions workflows for launcher builds and modpack releases"
  ```

---

### Task 6: Redacción de Documentación Técnica Completa

**Files:**
- Create: `README.md`
- Create: `docs/ARCHITECTURE.md`
- Create: `docs/MANIFEST_SPEC.md`
- Create: `docs/SETUP.md`

**Interfaces:**
- Consumes: Arquitectura, estándares de diseño y flujos definidos en el spec.
- Produces: Base de conocimiento completa y profesional para el equipo de desarrollo.

- [ ] **Paso 1: Redactar `docs/ARCHITECTURE.md`**
  Detallar:
  - Diagrama de flujo de componentes (Rust ↔ Tauri IPC ↔ React).
  - Ciclo de vida del juego (detección de Java, resolución de classpath de Forge, spawn y monitoreo de la JVM).
  - Protocolo de eventos IPC en tiempo real (`download-progress`, `game-status`).
  - Estrategia de seguridad y aislamiento de carpetas de instancias.

- [ ] **Paso 2: Redactar `docs/MANIFEST_SPEC.md`**
  Detallar:
  - Especificación campo por campo del archivo `manifest.json`.
  - Tipos de archivo (`custom`, `modrinth`, `config`).
  - Algoritmo de validación delta por SHA-1 y borrado de huérfanos.
  - Reglas de bloqueo de inicio de juego ante desincronizaciones de versión.

- [ ] **Paso 3: Redactar `docs/SETUP.md`**
  Detallar:
  - Requisitos previos en Windows: Visual Studio C++ Build Tools, Rust toolchain (`rustup`), Node.js 20+, Java 17 JDK.
  - Comandos de inicialización paso a paso para desarrolladores (`npm install`, `npm run dev`, `cargo check`).
  - Configuración de claves Minisign para pruebas locales del actualizador.

- [ ] **Paso 4: Redactar `README.md`**
  Presentar el proyecto `MonoEvents Launcher`, características principales, capturas/diagramas, estructura de carpetas y guía rápida de comandos.

- [ ] **Paso 5: Marcar tarea 5 completada en Orca y commit**
  Ejecutar:
  ```powershell
  orca goal complete 5
  git add docs/ README.md
  git commit -m "docs: write comprehensive architecture, manifest spec, and setup guides"
  ```

---

### Task 7: Verificación de Integridad de la Fase 1 y Validación en Orca

**Files:**
- Modify: `.orca/goals.json`
- Modify: `.orca/CURRENT_GOAL.md`

**Interfaces:**
- Consumes: Todos los artefactos creados en las Tareas 1 a 6.
- Produces: Repositorio completamente estructurado y validado, objetivo de Orca 100% completado.

- [ ] **Paso 1: Validar integridad de archivos y sintaxis**
  Verificar que los archivos JSON (`package.json`, `tauri.conf.json`, `manifests/monoevents-forge.json`) sean JSON válido.
  Verificar que los workflows YAML en `.github/workflows/` tengan formato correcto.
  Verificar que la estructura de carpetas cumpla exactamente con el árbol proyectado.

- [ ] **Paso 2: Validar estado del repositorio Git**
  Ejecutar: `git status` y comprobar que no existan archivos sin seguimiento ni cambios pendientes fuera de `.gitignore`.

- [ ] **Paso 3: Marcar tarea 6 y validar objetivo en Orca**
  Ejecutar:
  ```powershell
  orca goal complete 6
  orca goal validate
  orca goal status
  ```
  Salida esperada: Todas las tareas completadas (6/6), objetivo validado exitosamente.

- [ ] **Paso 4: Commit final de cierre de la Fase 1**
  ```powershell
  git commit --allow-empty -m "chore: complete Phase 1 project foundation and verify Orca goals"
  ```
