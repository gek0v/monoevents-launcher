# Especificación de Diseño: Launcher Propio de Minecraft (Fase 1: Estructuración y Fundamentos)

- **Fecha:** 2026-10-12
- **Proyecto:** MonoEvents Launcher (`monoevents-launcher`)
- **Estado:** En Revisión (Aprobación de Diseño)
- **Autor / Equipo:** Equipo de Desarrollo de MonoEvents

---

## 1. Resumen Ejecutivo y Objetivos

### 1.1. Propósito
Desarrollar un launcher de escritorio para Minecraft moderno, ligero y sin fricción técnica para los jugadores de la comunidad MonoEvents. El launcher distribuye y mantiene actualizados automáticamente los modpacks del servidor (Minecraft 1.20.1 con Forge 47.4.22), incluyendo mods desarrollados internamente (`mono_events.jar`), dependencias públicas de Modrinth y archivos de configuración del cliente.

### 1.2. Objetivos Principales
1. **Cero configuración manual**: Los jugadores no necesitan descargar Forge, instalar Java manualmente ni manipular carpetas `.minecraft` o carpetas de mods.
2. **Actualizaciones obligatorias y bloqueantes**: Al iniciar el launcher, se valida la versión tanto de la aplicación como del modpack seleccionado. Si existe una actualización pendiente, se muestra un aviso visible y **se bloquea la opción de jugar** hasta que se complete la actualización.
3. **Auto-actualización del Launcher sin reinstalación**: El launcher se actualiza a sí mismo con un solo clic mediante `tauri-plugin-updater` utilizando GitHub Releases y firmas criptográficas.
4. **Distribución 100% gratuita y escalable**: Infraestructura basada en GitHub Releases y GitHub Actions, sin costes de ancho de banda ni servidores propietarios.
5. **Alcance de la Fase 1**: Estructuración del repositorio Git independiente, árbol de directorios, especificación de manifiestos, infraestructura de CI/CD y estándares de documentación.

---

## 2. Pila Tecnológica (Tech Stack)

| Capa | Tecnología | Justificación |
|---|---|---|
| **Núcleo de Escritorio (Backend Nativo)** | **Tauri 2.0 (Rust)** | Binarios compactos (~15 MB), arranque instantáneo, bajo consumo de RAM, I/O asíncrono ultrarrápido (`tokio`, `reqwest`) y ejecución nativa de procesos Java. |
| **Interfaz de Usuario (Frontend)** | **React 18/19 + Vite + TypeScript** | Ecosistema reactivo estándar, integración nativa con Tauri IPC, alto rendimiento y soporte para tipado estricto. |
| **Estilos y Componentes** | **Tailwind CSS + Lucide React** | Diseño moderno, temas oscuros limpios, animaciones suaves y controles estilizados (sliders de RAM, selectores). |
| **Gestor de Estado del Frontend** | **Zustand** | Estado global ligero sin boilerplate para manejar la máquina de estados de juego, descargas y ajustes de usuario. |
| **Auto-actualizador de la App** | **`tauri-plugin-updater` + Minisign** | Descarga e instalación in-place de nuevas versiones del launcher con verificación de firma digital. |
| **Alojamiento y CI/CD** | **GitHub Releases + GitHub Actions** | Almacenamiento gratuito de binarios, instaladores de Windows (NSIS), manifiestos y paquetes de mods. |

---

## 3. Estructura del Repositorio y Árbol de Directorios

El launcher se estructura como un repositorio Git independiente dentro de `launcher/` (`monoevents-launcher`):

```
launcher/
├── .github/
│   └── workflows/
│       ├── build-launcher.yml       # Compilación de Tauri, firma con Minisign y publicación de Release
│       └── package-modpack.yml      # Empaquetado automático de mods, cálculo de SHA-1 y publicación de manifiesto
├── docs/
│   ├── ARCHITECTURE.md              # Documentación de arquitectura técnica, IPC y ciclo de vida
│   ├── MANIFEST_SPEC.md             # Especificación técnica del formato JSON de modpacks
│   └── SETUP.md                     # Guía de configuración del entorno de desarrollo local
├── manifests/
│   └── monoevents-forge.json        # Manifiesto de ejemplo / local del modpack
├── scripts/
│   └── generate-manifest.ts         # Herramienta CLI para indexar mods, calcular hashes y generar el JSON
├── src-tauri/                       # Backend nativo en Rust
│   ├── src/
│   │   ├── auth/                    # Módulo de autenticación (Microsoft OAuth2 Device Flow y Offline)
│   │   │   ├── mod.rs
│   │   │   ├── microsoft.rs
│   │   │   └── offline.rs
│   │   ├── config/                  # Gestión de configuración de usuario (RAM, rutas, perfiles)
│   │   │   ├── mod.rs
│   │   │   └── settings.rs
│   │   ├── downloader/              # Descargas concurrentes con verificación hash SHA-1/SHA-256
│   │   │   ├── mod.rs
│   │   │   ├── pool.rs
│   │   │   └── validator.rs
│   │   ├── game/                    # Detección de Java, resolución de Forge 1.20.1 y ejecución de JVM
│   │   │   ├── mod.rs
│   │   │   ├── java_finder.rs
│   │   │   ├── forge_launcher.rs
│   │   │   └── process_monitor.rs
│   │   ├── updater/                 # Comparador de versiones remotas vs locales y bloqueo de lanzamiento
│   │   │   ├── mod.rs
│   │   │   └── modpack_checker.rs
│   │   ├── lib.rs                   # Registro de comandos Tauri IPC
│   │   └── main.rs                  # Punto de entrada de la aplicación
│   ├── Cargo.toml                   # Dependencias de Rust
│   └── tauri.conf.json              # Configuración de Tauri 2.0 y plugin updater
├── src/                             # Frontend en React
│   ├── assets/                      # Logos, iconos temáticos y fondos
│   ├── components/
│   │   ├── common/                  # Modal, Button, ProgressBar, Badge
│   │   ├── layout/                  # Ventana principal, barra de título personalizada
│   │   ├── playbar/                 # Botón dinámico (Jugar / Actualizar / Descargando), estado del juego
│   │   ├── selector/                # Desplegable de modpacks disponibles
│   │   └── settings/                # Slider de RAM, selector nativo de carpeta de instalación
│   ├── hooks/                       # Hooks para invocar comandos de Tauri y suscripción a eventos
│   ├── stores/                      # Zustand store: useLauncherStore, useSettingsStore, useAuthStore
│   ├── types/                       # Definiciones TypeScript de manifiestos, eventos y configuraciones
│   ├── App.tsx                      # Componente raíz
│   └── main.tsx                     # Montaje de React
├── .gitignore                       # Ignorados: target/, node_modules/, builds, secrets, runtimes
├── package.json                     # Scripts y dependencias npm
├── tsconfig.json                    # Configuración estricta de TypeScript
└── README.md                        # Documentación principal del repositorio
```

---

## 4. Infraestructura de Distribución y Manifiestos

### 4.1. Esquema del Manifiesto de Modpack (`manifest.json`)
Cada modpack alojado en GitHub se describe mediante un archivo JSON estructurado:

```json
{
  "schemaVersion": 1,
  "id": "monoevents-forge-1.20.1",
  "name": "MonoEvents Evento Principal",
  "version": "1.2.0",
  "minecraft": {
    "version": "1.20.1",
    "modloader": "forge",
    "modloaderVersion": "47.4.22",
    "javaVersion": 17
  },
  "changelog": "Añadidos nuevos mobs de Halloween y sincronización de ruleta.",
  "files": [
    {
      "path": "mods/mono_events-1.20.1.jar",
      "url": "https://github.com/tu-usuario/monoevents-launcher/releases/download/modpack-v1.2.0/mono_events-1.20.1.jar",
      "sha1": "e2a1b94d50c7657989345c26b5278912ef6c41b8",
      "size": 6543210,
      "type": "custom"
    },
    {
      "path": "mods/jei-1.20.1-15.3.0.4.jar",
      "url": "https://cdn.modrinth.com/data/u6dvdO8v/versions/qK6H023B/jei-1.20.1-forge-15.3.0.4.jar",
      "sha1": "7c8b1a3d90f2357989345c26b5278912ef6c41c9",
      "size": 1048576,
      "type": "modrinth"
    },
    {
      "path": "config/mono_events.toml",
      "url": "https://raw.githubusercontent.com/tu-usuario/monoevents-launcher/main/configs/mono_events.toml",
      "sha1": "3d9a1b4e50c7657989345c26b5278912ef6c41d0",
      "size": 4096,
      "type": "config"
    }
  ]
}
```

### 4.2. Algoritmo de Sincronización Delta
Para actualizar un modpack sin descargar archivos redundantes:
1. Rust lee el `manifest.json` remoto y el archivo local `installed_manifest.json`.
2. Para cada archivo en la lista:
   - Si no existe en la carpeta local: se encola para descarga.
   - Si existe localmente pero su hash SHA-1 difiere: se marca para sobreescritura y se encola para descarga.
   - Si existe y el hash SHA-1 coincide: se omite (0 bytes de descarga).
3. **Limpieza de archivos huérfanos**: Cualquier archivo en la carpeta `mods/` que no esté presente en el manifiesto entrante (ej. una versión antigua de un mod como `mono_events-1.1.0.jar`) es eliminado de forma segura.
4. Una vez completadas todas las descargas con hash verificado, se guarda el nuevo `installed_manifest.json` local.

### 4.3. Auto-Actualización del Launcher (`tauri-plugin-updater`)
1. **Firma Minisign**: Las compilaciones del launcher se firman mediante una clave privada protegida en GitHub Actions Secrets. La clave pública se compila dentro de `tauri.conf.json`.
2. **Descriptor `latest.json` en GitHub Releases**:
   ```json
   {
     "version": "1.1.0",
     "notes": "Soporte para selector de modpack dinámico y optimizaciones de descarga.",
     "pub_date": "2026-10-15T12:00:00Z",
     "platforms": {
       "windows-x86_64": {
         "signature": "RWR7v480q...",
         "url": "https://github.com/tu-usuario/monoevents-launcher/releases/download/v1.1.0/monoevents-launcher_1.1.0_x64-setup.nsis.zip"
       }
     }
   }
   ```
3. **Flujo de Usuario**:
   - Detección automática al abrir.
   - Si hay actualización, se muestra modal de alerta.
   - Clic en "Actualizar Launcher": descarga en segundo plano y sustitución en caliente.
   - Notificación de "Reiniciar": el launcher se reinicia automáticamente en la nueva versión manteniendo la configuración del usuario.

---

## 5. Máquina de Estados y Bloqueo de Juego

El botón principal de acción y el estado de la aplicación siguen una máquina de estados estricta:

```
                      ┌────────────────────────┐
                      │    LAUNCHER_START      │
                      └───────────┬────────────┘
                                  │
                                  ▼
                    ┌────────────────────────────┐
                    │ ¿Actualización Launcher?   │
                    └──────┬──────────────┬──────┘
                           │ SÍ           │ NO
                           ▼              ▼
         ┌───────────────────────┐   ┌────────────────────────────┐
         │ UPDATE_LAUNCHER_REQ   │   │ ¿Actualización Modpack?    │
         │ (Botón: Actualizar    │   └──────┬──────────────┬──────┘
         │  Launcher - BLOQUEADO)│          │ SÍ           │ NO
         └───────────────────────┘          ▼              ▼
                               ┌───────────────────────┐   ┌───────────────────────┐
                               │ UPDATE_MODPACK_REQ    │   │ READY                 │
                               │ (Botón: Actualizar    │   │ (Botón: JUGAR         │
                               │  Modpack - BLOQUEADO) │   │  Habilitado)          │
                               └───────────┬───────────┘   └───────────┬───────────┘
                                           │                           │
                                           ▼                           ▼
                               ┌───────────────────────┐   ┌───────────────────────┐
                               │ DOWNLOADING / SYNC    │   │ LAUNCHING / RUNNING   │
                               │ (Barra de progreso    │   │ (Proceso Java activo, │
                               │  y velocidad MB/s)    │   │  monitoreo de logs)   │
                               └───────────────────────┘   └───────────────────────┘
```

> **Regla Crítica:** En los estados `UPDATE_LAUNCHER_REQ` y `UPDATE_MODPACK_REQ`, el botón de lanzar el juego está completamente deshabilitado. No existe forma de saltarse la actualización para evitar incompatibilidades o fallos de red con el servidor.

---

## 6. Módulos Internos y Ciclo de Vida del Juego

### 6.1. Autenticación Híbrida (`src-tauri/src/auth/`)
- **Microsoft OAuth2 (Device Code Flow)**:
  - Invoca el endpoint de autenticación para dispositivos de Microsoft (`https://login.microsoftonline.com/consumers/oauth2/v2.0/devicecode`).
  - Muestra un código de 8 caracteres y abre `https://microsoft.com/devicelogin` en el navegador.
  - Canjea el token por credenciales de Xbox Live (`user.auth.xboxlive.com`), XSTS y Minecraft Services.
  - Los tokens de actualización (refresh tokens) se persisten cifrados con la API nativa de Windows (`keyring`).
- **Modo Offline**:
  - Solicita un nickname simple (3-16 caracteres alfanuméricos).
  - Genera un UUID v3 reproducible basado en el espacio de nombres offline de Minecraft (`UUID.nameUUIDFromBytes("OfflinePlayer:" + nickname)`).

### 6.2. Detección y Gestión de Java (`src-tauri/src/game/java_finder.rs`)
- Minecraft 1.20.1 y Forge 47.4.22 requieren **Java 17**.
- El módulo de Rust escanea rutas estándar de Windows (`JAVA_HOME`, registro de Windows, `Program Files/Java`, `Program Files/Eclipse Adoptium`).
- Si no se encuentra un JDK/JRE 17 válido, el launcher descarga automáticamente una copia portable de OpenJDK 17 (Eclipse Adoptium Temurin) en `<app_data>/runtime/java-17/` y la utiliza sin requerir instalación global en el sistema operativo.

### 6.3. Lanzamiento de la JVM (`src-tauri/src/game/forge_launcher.rs`)
- Compone los argumentos de la máquina virtual:
  - Asignación de memoria dinámica según el ajuste del usuario (`-Xms2G -Xmx<RAM_SELECCIONADA>G`).
  - Rutas de bibliotecas nativas de Forge (`-Djava.library.path=...`).
  - Classpath completo de librerías de Minecraft y Forge.
  - Clase principal de Forge (`cpw.mods.bootstraplauncher.BootstrapLauncher` o `net.minecraftforge.bootstrap.ForgeBootstrap`).
  - Argumentos de cliente: `--username`, `--version`, `--gameDir`, `--assetsDir`, `--uuid`, `--accessToken`.
- Inicia el proceso en segundo plano y redirige la salida estándar y de errores a `launcher.log`.

---

## 7. Configuración de Usuario (`settings.json`)

Se almacena en `%APPDATA%/MonoEventsLauncher/settings.json`:

```json
{
  "selectedModpackId": "monoevents-forge-1.20.1",
  "allocatedRamGb": 6,
  "gameDirectory": "C:\\Users\\Usuario\\AppData\\Roaming\\.monoevents",
  "activeAccount": {
    "type": "microsoft",
    "uuid": "8a7b6c5d-4e3f-2a1b-0c9d-8e7f6a5b4c3d",
    "username": "GekoDev"
  },
  "closeLauncherOnGameStart": true,
  "lastLauncherVersionChecked": "1.0.0"
}
```

---

## 8. Automatización de CI/CD

### 8.1. `build-launcher.yml`
- **Disparador**: Creación de tags con formato `v*.*.*`.
- **Acciones**:
  1. Configura Node.js 20 y Rust stable en runner `windows-latest`.
  2. Compila el frontend (`npm run build`).
  3. Ejecuta `tauri build` con firma Minisign.
  4. Genera el instalador NSIS (`.exe`) y el archivo portable.
  5. Sube los artefactos y el archivo `latest.json` al Release de GitHub correspondiente.

### 8.2. `package-modpack.yml` / `scripts/generate-manifest.ts`
- **Disparador**: Ejecución manual o al etiquetar una versión de modpack (`modpack-v*.*.*`).
- **Acciones**:
  1. Recorre la carpeta local de mods y configuraciones.
  2. Genera los hashes SHA-1 y tamaños de cada archivo.
  3. Construye el archivo `manifest.json`.
  4. Sube los archivos propios (`mono_events.jar`, configs) y el `manifest.json` como assets del release del modpack.

---

## 9. Entregables Concretos de la Fase 1

La Fase 1 concluye con la estructuración completa del proyecto y la preparación del entorno:

1. **Inicialización de Git**:
   - Repositorio independiente inicializado en `launcher/`.
   - `.gitignore` robusto configurado para Rust, Node, Tauri y archivos temporales de Minecraft.
2. **Estructura de Directorios Completa**:
   - Creación de todas las carpetas del árbol de trabajo (`src-tauri/`, `src/`, `docs/`, `manifests/`, `scripts/`, `.github/workflows/`).
3. **Documentación del Proyecto**:
   - `README.md`: Visión del launcher, guía de comandos y pasos para desarrolladores.
   - `docs/ARCHITECTURE.md`: Documento de arquitectura de sistemas, IPC y flujo de datos.
   - `docs/MANIFEST_SPEC.md`: Especificación técnica formal del manifiesto JSON de modpacks.
   - `docs/SETUP.md`: Guía de instalación de herramientas de desarrollo (Rust, Node, Visual Studio Build Tools, Java 17).
4. **Plantillas de Manifiestos e Infraestructura**:
   - Manifiesto de ejemplo en `manifests/monoevents-forge.json`.
   - Workflows base de GitHub Actions en `.github/workflows/`.
   - Configuración inicial de paquetes (`package.json`, `Cargo.toml`, `tauri.conf.json`).

---

## 10. Fases Posteriores (Fuera del Alcance de la Fase 1)

- **Fase 2**: Implementación del backend en Rust (módulos `downloader`, `auth`, `updater`, `game`).
- **Fase 3**: Implementación de la UI en React (componentes visuales, PlayBar, modal de ajustes, temas visuales).
- **Fase 4**: Pruebas de integración extremo a extremo (lanzamiento real de Minecraft 1.20.1 con Forge y conexión al servidor).
