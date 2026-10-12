# Plan de Implementación: Fase 2 del Launcher de Minecraft (Motor Nativo Rust & IPC)

> **Para ejecutores y agentes:** HABILIDAD REQUERIDA: Usar `superpowers:executing-plans` (ejecución nativa) para implementar este plan tarea por tarea. Cada paso utiliza la sintaxis de casillas (`- [ ]`) para seguimiento de progreso. Se integra el seguimiento nativo de metas mediante la herramienta de gestión `orca goal`.

**Goal:** Implementar de forma completa y funcional el motor nativo en Rust dentro de `src-tauri/src/` (descargador concurrente con streaming, verificador delta de manifiestos con SHA-1, detección de Java 17, persistencia de configuración y comandos IPC para Tauri 2.0).

**Architecture:** Rust desacoplado con Tokio y Reqwest para I/O asíncrono, cálculo de hashes SHA-1 para caché delta, detección de runtimes de Java en Windows, y puente IPC bidireccional mediante comandos de Tauri 2.0 y eventos de progreso en tiempo real.

**Tech Stack:** Rust (edition 2021), Tauri 2.0, Tokio, Reqwest (stream), Sha1, Serde / Serde JSON, Temurin Java 17, Orca CLI.

**Spec:** [2026-10-12-minecraft-launcher-phase1-design.md](file:///C:/Users/Geko/Desktop/HalloweenMC/MonoEvents/launcher/docs/superpowers/specs/2026-10-12-minecraft-launcher-phase1-design.md)

## Global Constraints

- Todos los módulos de Rust deben compilar sin advertencias y contar con pruebas unitarias (`cargo test`).
- La verificación de archivos debe usar sumas de comprobación SHA-1 de 40 caracteres hexadecimales.
- Los archivos huérfanos en `mods/` que no figuren en el manifiesto entrante deben ser eliminados de forma segura al sincronizar.
- El avance de cada tarea debe reflejarse en los objetivos de Orca ejecutando `orca goal complete <índice>`.

## Review Focus

1. **Gestión de Streams en Descargas**: Asegurar que las descargas pesadas escriban en disco en bloques de 8 KB y calculen la velocidad en MB/s sin saturar la memoria RAM.
2. **Resiliencia en Rutas de Windows**: Manejar correctamente las barras invertidas (`\`) y normalizarlas a relativas para la comparación de manifiestos.
3. **Persistencia Segura de Configuración**: Crear directorios intermedios en `%APPDATA%/MonoEventsLauncher/` si no existen antes de escribir `settings.json`.
4. **Detección Confiable de Java**: Validar que la versión detectada sea efectivamente Java 17 ejecutando un chequeo o comprobando el path canónico.
5. **Serialización IPC**: Garantizar que las estructuras compartidas con el frontend coincidan con los tipos de TypeScript en `src/types/launcher.ts`.

---

### Task 1: Metas en Orca y Rama de Desarrollo (`feat/phase2-rust-core`)

**Files:**
- Modify: `.orca/goals.json`
- Modify: `.orca/CURRENT_GOAL.md`

- [ ] **Paso 1: Configurar el objetivo de la Fase 2 en Orca**
  ```powershell
  orca goal set "Fase 2: Motor Nativo Rust (Downloader, Updater, Config, Java & IPC)"
  ```

- [ ] **Paso 2: Registrar las subtareas en Orca**
  ```powershell
  orca goal add-task "Implementar motor de descargas asíncronas y verificación SHA-1"
  orca goal add-task "Implementar comparador delta de manifiestos y limpieza de huérfanos"
  orca goal add-task "Implementar persistencia de settings.json y validación de RAM"
  orca goal add-task "Implementar detector de Java 17 y constructor JVM de Forge"
  orca goal add-task "Exponer comandos y eventos IPC en Tauri lib.rs"
  orca goal add-task "Ejecutar suite de tests unitarios y validar objetivo en Orca"
  ```

- [ ] **Paso 3: Crear rama Git para la Fase 2**
  ```powershell
  git checkout -b feat/phase2-rust-core
  ```

---

### Task 2: Motor de Validación y Descargas Asíncronas (`downloader`)

**Files:**
- Modify: `src-tauri/src/downloader/validator.rs`
- Modify: `src-tauri/src/downloader/pool.rs`
- Modify: `src-tauri/src/downloader/mod.rs`

**Interfaces:**
- Consumes: `reqwest`, `tokio`, `sha1`.
- Produces: `download_file_with_progress`, `verify_file_sha1`, `calculate_sha1`.

- [ ] **Paso 1: Escribir test unitario de cálculo de SHA-1**
  Crear prueba `test_sha1_calculation()` que verifique un archivo temporal contra un hash conocido.

- [ ] **Paso 2: Implementar streaming de descargas y emisión de progreso**
  En `src-tauri/src/downloader/pool.rs`, implementar la función asíncrona de descarga por chunks reportando bytes descargados y velocidad.

- [ ] **Paso 3: Ejecutar pruebas del módulo downloader**
  Ejecutar: `cargo test downloader`
  Salida esperada: Tests pasando (`test result: ok`).

- [ ] **Paso 4: Marcar subtarea 1 en Orca y commit**
  ```powershell
  orca goal complete 1
  git add src-tauri/src/downloader/
  git commit -m "feat(downloader): implement async chunked downloader and sha1 verification"
  ```

---

### Task 3: Motor de Manifiestos y Sincronización Delta (`updater`)

**Files:**
- Modify: `src-tauri/src/updater/modpack_checker.rs`
- Modify: `src-tauri/src/updater/mod.rs`

**Interfaces:**
- Consumes: `ModpackManifest`, `ModpackFile`, `verify_file_sha1`.
- Produces: `evaluate_modpack_delta(remote, local_dir) -> DeltaReport`.

- [ ] **Paso 1: Escribir test unitario de evaluación delta**
  Crear prueba comparando un manifiesto simulado con una carpeta local simulada (archivo nuevo, archivo modificado, archivo idéntico, archivo huérfano).

- [ ] **Paso 2: Implementar evaluación de diferencias y limpieza de huérfanos**
  Implementar la lógica que categoriza archivos en `to_download`, `to_keep` y `to_delete`.

- [ ] **Paso 3: Ejecutar pruebas del módulo updater**
  Ejecutar: `cargo test updater`
  Salida esperada: Tests pasando.

- [ ] **Paso 4: Marcar subtarea 2 en Orca y commit**
  ```powershell
  orca goal complete 2
  git add src-tauri/src/updater/
  git commit -m "feat(updater): implement delta manifest synchronization and orphan cleanup"
  ```

---

### Task 4: Persistencia y Gestión de Configuración (`config`)

**Files:**
- Modify: `src-tauri/src/config/settings.rs`
- Modify: `src-tauri/src/config/mod.rs`

**Interfaces:**
- Consumes: `serde_json`, `dirs`/variables de entorno.
- Produces: `load_settings()`, `save_settings()`, `sanitize_settings()`.

- [ ] **Paso 1: Escribir test unitario de serialización y guardado de ajustes**
  Comprobar que los valores por defecto se generen correctamente y que un `settings.json` modificado se persista fielmente.

- [ ] **Paso 2: Implementar sanitización de RAM y rutas**
  Asegurar que la RAM asignada esté dentro de límites seguros (mínimo 2 GB, no superior al total de memoria de la máquina).

- [ ] **Paso 3: Ejecutar pruebas del módulo config**
  Ejecutar: `cargo test config`
  Salida esperada: Tests pasando.

- [ ] **Paso 4: Marcar subtarea 3 en Orca y commit**
  ```powershell
  orca goal complete 3
  git add src-tauri/src/config/
  git commit -m "feat(config): implement robust settings persistence and ram sanitization"
  ```

---

### Task 5: Detección de Java 17 y Constructor JVM de Forge (`game`)

**Files:**
- Modify: `src-tauri/src/game/java_finder.rs`
- Modify: `src-tauri/src/game/forge_launcher.rs`
- Modify: `src-tauri/src/game/mod.rs`

**Interfaces:**
- Consumes: Rutas de sistema de Windows y `ForgeLaunchConfig`.
- Produces: `find_system_java_17()`, `build_jvm_arguments()`.

- [ ] **Paso 1: Escribir test unitario para construcción de flags JVM**
  Verificar que los argumentos incluyan `-Xms2G`, `-Xmx<RAM>G`, `-XX:+UseG1GC` y los parámetros de Forge.

- [ ] **Paso 2: Implementar escaneo exhaustivo de Java 17 en Windows**
  Buscar en `JAVA_HOME`, `PATH`, y rutas comunes de Eclipse Temurin / Oracle / Microsoft.

- [ ] **Paso 3: Ejecutar pruebas del módulo game**
  Ejecutar: `cargo test game`
  Salida esperada: Tests pasando.

- [ ] **Paso 4: Marcar subtarea 4 en Orca y commit**
  ```powershell
  orca goal complete 4
  git add src-tauri/src/game/
  git commit -m "feat(game): implement java 17 detection and forge 1.20.1 argument builder"
  ```

---

### Task 6: Exposición de Comandos y Eventos IPC en Tauri (`lib.rs`)

**Files:**
- Modify: `src-tauri/src/lib.rs`

**Interfaces:**
- Consumes: Módulos `auth`, `config`, `downloader`, `game`, `updater`.
- Produces: Comandos IPC `get_settings`, `save_user_settings`, `check_modpack`, `sync_modpack_files`, `detect_java`.

- [ ] **Paso 1: Registrar handlers IPC completos en `lib.rs`**
  Conectar los módulos con Tauri mediante macros `#[tauri::command]`.

- [ ] **Paso 2: Validar compilación completa con `cargo check`**
  Ejecutar: `cargo check --manifest-path src-tauri/Cargo.toml`
  Salida esperada: Compilación limpia sin errores.

- [ ] **Paso 3: Marcar subtarea 5 en Orca y commit**
  ```powershell
  orca goal complete 5
  git add src-tauri/src/lib.rs
  git commit -m "feat(ipc): register all Tauri 2.0 IPC command handlers and event emitters"
  ```

---

### Task 7: Verificación Integral de la Fase 2 y Cierre de Metas en Orca

**Files:**
- Modify: `.orca/goals.json`
- Modify: `.orca/CURRENT_GOAL.md`

- [ ] **Paso 1: Ejecutar toda la suite de pruebas unitarias de Rust**
  Ejecutar: `cargo test --manifest-path src-tauri/Cargo.toml`
  Salida esperada: Todos los tests pasando.

- [ ] **Paso 2: Marcar subtarea 6 y validar objetivo en Orca**
  ```powershell
  orca goal complete 6
  orca goal status
  ```

- [ ] **Paso 3: Commit de cierre de Fase 2**
  ```powershell
  git commit --allow-empty -m "chore: complete Phase 2 native rust core engine"
  ```
