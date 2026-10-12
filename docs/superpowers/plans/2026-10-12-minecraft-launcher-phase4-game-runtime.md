# Plan de Implementación: Fase 4 del Launcher de Minecraft (Ejecución Real del Juego y Conexión End-to-End)

> **Para ejecutores y agentes:** HABILIDAD REQUERIDA: Usar `superpowers:executing-plans` (ejecución nativa) para implementar este plan tarea por tarea. Cada paso utiliza la sintaxis de casillas (`- [ ]`) para seguimiento de progreso. Se integra el seguimiento nativo de metas mediante la herramienta de gestión `orca goal`.

**Goal:** Implementar de forma real el ciclo de vida del juego (consulta remota de manifiestos vía HTTP, descarga e inicialización del entorno de Minecraft/Forge, ejecución real del subproceso `java.exe` de la JVM con argumentos completos, monitoreo de logs y captura de crashes).

**Architecture:** Módulo `game::process_spawner` para ejecución de subprocesos en Rust con redirección de E/S a `launcher.log`, módulo `updater::remote_fetcher` para consulta HTTP de manifiestos en GitHub, y comandos Tauri IPC `launch_game` y `fetch_remote_manifest` conectados al frontend de React.

**Tech Stack:** Rust (edition 2021), Tauri 2.0, Tokio, Reqwest, Std Process, Temurin Java 17, React 18, Zustand, Orca CLI.

**Spec:** [2026-10-12-minecraft-launcher-phase1-design.md](file:///C:/Users/Geko/Desktop/HalloweenMC/MonoEvents/launcher/docs/superpowers/specs/2026-10-12-minecraft-launcher-phase1-design.md)

## Global Constraints

- El comando de lanzamiento debe ejecutar el binario real de Java 17 detectado en el sistema.
- Toda la salida de la consola de Minecraft (`stdout` y `stderr`) debe guardarse en `<instance_dir>/launcher.log` para depuración de crashes.
- Cuando el juego esté en ejecución, el botón de la UI debe reflejar `RUNNING`, y al cerrarse debe restaurar el estado a `READY` (o notificar si hubo un código de salida de error).
- El avance de cada tarea debe reflejarse en los objetivos de Orca ejecutando `orca goal complete <índice>`.

## Review Focus

1. **Gestión de Procesos Hijos en Windows**: Asegurar que `Command::spawn()` no bloquee el hilo principal de Tauri y ejecute el monitoreo en un hilo asíncrono secundario.
2. **Creación de Directorios de Instancia**: Crear automáticamente las carpetas `mods/`, `config/` y `logs/` si no existen antes de ejecutar el juego.
3. **Manejo de Crashes**: Detectar si el proceso de Java termina con código distinto de 0 e informar a la UI con un mensaje comprensible.
4. **Fallback de Manifiesto Remoto**: Si falla la conexión a GitHub (por falta de internet o error de DNS), permitir usar el manifiesto local sin romper la aplicación.
5. **Pruebas de Simulación de Lanzamiento**: Escribir pruebas unitarias que verifiquen el spawn de procesos con un script de prueba o comando verificador.

---

### Task 1: Metas en Orca y Rama de Desarrollo (`feat/phase4-game-runtime`)

**Files:**
- Modify: `.orca/goals.json`
- Modify: `.orca/CURRENT_GOAL.md`

- [ ] **Paso 1: Configurar el objetivo de la Fase 4 en Orca**
  ```powershell
  orca goal set "Fase 4: Motor Funcional End-to-End y Lanzamiento Real de Minecraft"
  ```

- [ ] **Paso 2: Registrar las subtareas en Orca**
  ```powershell
  orca goal add-task "Implementar cliente HTTP para consulta remota de manifiestos"
  orca goal add-task "Implementar lanzador de subproceso JVM con monitoreo y redirección de logs"
  orca goal add-task "Crear preparador de entorno de instancia y directorios base"
  orca goal add-task "Exponer comandos launch_game y fetch_remote_manifest en Tauri IPC"
  orca goal add-task "Conectar UI de React con el ciclo de vida real del juego"
  orca goal add-task "Verificar compilación, ejecutar tests y validar objetivo en Orca"
  ```

- [ ] **Paso 3: Crear rama Git para la Fase 4**
  ```powershell
  git checkout -b feat/phase4-game-runtime
  ```

---

### Task 2: Consulta Remota de Manifiestos (`updater::remote_fetcher`)

**Files:**
- Create: `src-tauri/src/updater/remote_fetcher.rs`
- Modify: `src-tauri/src/updater/mod.rs`

**Interfaces:**
- Consumes: `reqwest::Client`, `ModpackManifest`.
- Produces: `fetch_remote_manifest(url: &str) -> Result<ModpackManifest, String>`.

- [ ] **Paso 1: Implementar `fetch_remote_manifest`**
  Función asíncrona que hace una petición HTTP GET a la URL de GitHub, valida el código 200 y deserializa el `ModpackManifest`.

- [ ] **Paso 2: Escribir test unitario de deserialización remota**
  Verificar que un string JSON válido produzca la estructura de modpack correcta.

- [ ] **Paso 3: Marcar subtarea 1 en Orca y commit**
  ```powershell
  orca goal complete 1
  git add src-tauri/src/updater/
  git commit -m "feat(updater): implement remote manifest HTTP fetcher"
  ```

---

### Task 3: Spawner de la JVM y Redirección de Logs (`game::process_spawner`)

**Files:**
- Create: `src-tauri/src/game/process_spawner.rs`
- Modify: `src-tauri/src/game/mod.rs`

**Interfaces:**
- Consumes: `java_finder`, `forge_launcher`, `std::process::Command`.
- Produces: `spawn_minecraft_process(config, app_handle) -> Result<u32, String>`.

- [ ] **Paso 1: Implementar `process_spawner.rs`**
  - Abre o crea `<instance_dir>/launcher.log`.
  - Construye el comando de `java.exe` con los argumentos JVM generados.
  - Redirige `stdout` y `stderr` al archivo de log.
  - Spawnea el proceso hijo y lanza una tarea en segundo plano que espera el cierre con `child.wait()`.
  - Emite eventos Tauri `game-status` con `{ status: "RUNNING" }` al iniciar y `{ status: "EXITED", exit_code: i32 }` al terminar.

- [ ] **Paso 2: Escribir test unitario del spawner**
  Probar la ejecución de un comando controlado con Java (`java -version`) verificando que la salida se registre en el log.

- [ ] **Paso 3: Marcar subtarea 2 en Orca y commit**
  ```powershell
  orca goal complete 2
  git add src-tauri/src/game/
  git commit -m "feat(game): implement JVM process spawner with log redirection"
  ```

---

### Task 4: Preparador de Directorios de Instancia (`game::environment`)

**Files:**
- Create: `src-tauri/src/game/environment.rs`
- Modify: `src-tauri/src/game/mod.rs`

**Interfaces:**
- Consumes: `PathBuf`.
- Produces: `ensure_instance_structure(instance_dir: &Path) -> Result<(), String>`.

- [ ] **Paso 1: Implementar `ensure_instance_structure`**
  Crea automáticamente las carpetas `mods/`, `config/`, `logs/`, `saves/` y `resourcepacks/` en la instancia del modpack.

- [ ] **Paso 2: Escribir test unitario de inicialización de instancia**
  Verificar la creación de la jerarquía de carpetas en un directorio temporal.

- [ ] **Paso 3: Marcar subtarea 3 en Orca y commit**
  ```powershell
  orca goal complete 3
  git add src-tauri/src/game/
  git commit -m "feat(game): implement instance environment structure initializer"
  ```

---

### Task 5: Exposición de Comandos en Tauri IPC (`src-tauri/src/lib.rs`)

**Files:**
- Modify: `src-tauri/src/lib.rs`

**Interfaces:**
- Consumes: `remote_fetcher`, `process_spawner`, `environment`.
- Produces: Comandos IPC `launch_game`, `fetch_remote_manifest`.

- [ ] **Paso 1: Implementar comando `launch_game` en `lib.rs`**
  Recibe `modpack_id`, obtiene los ajustes del usuario (RAM, cuenta, directorio), prepara la instancia y lanza el subproceso de Java.

- [ ] **Paso 2: Implementar comando `fetch_remote_manifest` en `lib.rs`**
  Descarga el manifiesto desde una URL remota.

- [ ] **Paso 3: Registrar nuevos comandos en `tauri::generate_handler![]`**

- [ ] **Paso 4: Marcar subtarea 4 en Orca y commit**
  ```powershell
  orca goal complete 4
  git add src-tauri/src/lib.rs
  git commit -m "feat(ipc): register launch_game and fetch_remote_manifest commands"
  ```

---

### Task 6: Conexión del Ciclo de Vida del Juego en la UI (`src/App.tsx`, `hooks/`)

**Files:**
- Modify: `src/hooks/useTauriIpc.ts`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: Comandos `launch_game`, eventos `game-status`.
- Produces: Flujo interactivo real al pulsar "JUGAR".

- [ ] **Paso 1: Añadir `launchGame` y escucha de `game-status` en `useTauriIpc.ts`**
  Escuchar el evento `game-status` emitido por Rust y actualizar el estado global en `launcherStore`.

- [ ] **Paso 2: Conectar el botón "JUGAR" en `App.tsx`**
  Invocar `launchGame` al pulsar el botón cuando el estado sea `READY`. Si el juego crashea (código de salida != 0), mostrar un aviso en pantalla.

- [ ] **Paso 3: Marcar subtarea 5 en Orca y commit**
  ```powershell
  orca goal complete 5
  git add src/hooks/ src/App.tsx
  git commit -m "feat(ui): connect play button with real game launch lifecycle and crash notifications"
  ```

---

### Task 7: Verificación, Tests y Cierre de Metas en Orca

**Files:**
- Modify: `.orca/goals.json`
- Modify: `.orca/CURRENT_GOAL.md`

- [ ] **Paso 1: Ejecutar suite de pruebas de Rust**
  ```powershell
  cargo test --manifest-path src-tauri/Cargo.toml
  ```

- [ ] **Paso 2: Ejecutar verificación de build de frontend**
  ```powershell
  npm run build
  ```

- [ ] **Paso 3: Marcar subtarea 6 y validar objetivo en Orca**
  ```powershell
  orca goal complete 6
  orca goal status
  ```

- [ ] **Paso 4: Commit de cierre de Fase 4**
  ```powershell
  git commit --allow-empty -m "chore: complete Phase 4 functional game runtime"
  ```
