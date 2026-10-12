# Arquitectura Técnica del Launcher: MonoEvents Launcher

## 1. Visión General del Sistema

MonoEvents Launcher es una aplicación de escritorio diseñada para eliminar la complejidad en la distribución y actualización de modpacks de Minecraft con Forge 1.20.1.

Está construido utilizando **Tauri 2.0**:
- **Backend nativo (Rust)**: I/O de archivos de alta velocidad, streaming de descargas concurrentes con validación de hashes SHA-1, detección de entornos Java y ejecución de la JVM de Minecraft.
- **Frontend (React + Tailwind CSS)**: Interfaz gráfica moderna, reactiva y ligera para selección de modpacks, ajuste de RAM, autenticación y visualización de progreso.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Frontend (React + Vite)                         │
│  - PlayBar (Jugar / Actualizar / Descargando)                          │
│  - Settings Modal (RAM Slider, Carpeta de instalación)                 │
│  - Modpack Selector & Perfil de Usuario                                │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Tauri IPC (Comandos & Eventos)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Backend Nativo (Rust)                           │
│  ├── auth/         -> Microsoft OAuth2 Device Flow + Sesión Offline    │
│  ├── config/       -> settings.json (Persistencia de configuración)    │
│  ├── downloader/   -> Pool asíncrono con Tokio & validación SHA-1      │
│  ├── game/         -> Detección de Java 17, Forge Runner & JVM Monitor │
│  └── updater/      -> Sincronización delta & tauri-plugin-updater      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                  ┌─────────────────┴─────────────────┐
                  ▼                                   ▼
        [GitHub Releases API]               [Subproceso JVM Java 17]
  (latest.json, manifest.json, JARs)      (Minecraft 1.20.1 + Forge 47.4.22)
```

---

## 2. Comunicación IPC entre Rust y React

### Comandos Invocables (`invoke`)
- `get_settings()`: Retorna el struct `UserSettings` con los ajustes guardados.
- `update_settings(settings)`: Actualiza y persiste la configuración en `%APPDATA%/MonoEventsLauncher/settings.json`.
- `start_game(modpack_id)`: Valida la integridad de archivos e inicia el subproceso de Minecraft.
- `sync_modpack(modpack_id)`: Descarga e instala los archivos nuevos o modificados según el manifiesto.

### Eventos en Tiempo Real (`listen`)
- `download-progress`:
  ```typescript
  {
    current_file: string;
    downloaded_bytes: number;
    total_bytes: number;
    percentage: number;
    speed_mbps: number;
  }
  ```
- `game-status`:
  ```typescript
  {
    status: "IDLE" | "LAUNCHING" | "RUNNING" | "CRASHED" | "EXITED";
    exit_code?: number;
    crash_report?: string;
  }
  ```

---

## 3. Ciclo de Vida del Juego

1. **Chequeo de Integridad y Versiones**:
   - Se consulta el `manifest.json` remoto contra `installed_manifest.json`.
   - Si no coinciden los hashes o la versión, se activa el estado `UPDATE_MODPACK_REQUIRED` y se bloquea el botón de juego.
2. **Descarga y Sincronización Delta**:
   - Solo se descargan los archivos faltantes o cuyo SHA-1 difiere del esperado.
   - Se limpian mods huérfanos que ya no pertenezcan al nuevo manifiesto.
3. **Resolución de Java 17**:
   - Rust detecta la presencia de un JRE/JDK 17 válido. Si no existe, utiliza el runtime portable empaquetado en `%APPDATA%/MonoEventsLauncher/runtime/java-17/`.
4. **Construcción de la JVM y Lanzamiento**:
   - Ensambla el classpath, flags de optimización G1GC, asignación de RAM seleccionada por el usuario (`-Xmx<N>G`) y credenciales de autenticación.
   - Spawnea el proceso `java.exe` como un subproceso hijo independiente.
5. **Monitoreo y Diagnóstico**:
   - Si el proceso termina con un código de salida diferente de 0, Rust lee las últimas líneas de `logs/latest.log` o el último reporte en `crash-reports/` y lo expone a la UI para facilitar el reporte al soporte técnico.

---

## 4. Aislamiento de Instancias y Seguridad

- Cada modpack se ejecuta en su propia carpeta aislada: `<game_directory>/instances/<modpack_id>/`.
- Esto garantiza que mundos, opciones y mods no interfieran entre diferentes eventos de la comunidad.
- Los tokens sensibles de Microsoft se almacenan usando el gestor seguro de credenciales del sistema operativo mediante el crate `keyring`.
