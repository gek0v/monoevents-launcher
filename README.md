# MonoEvents Launcher

[![Tauri 2.0](https://img.shields.io/badge/Tauri-2.0-blue.svg)](https://tauri.app/)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Tailwind-orange.svg)](https://react.dev/)
[![Minecraft](https://img.shields.io/badge/Minecraft-1.20.1%20Forge%2047.4.22-green.svg)](https://minecraftforge.net/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Launcher oficial y automatizado de Minecraft para la comunidad y eventos de **MonoEvents**. Diseñado para distribuir modpacks de Forge 1.20.1 con mods propios y de Modrinth sin requerir instalación manual por parte de los jugadores.

---

## Características Principales

- **Experiencia Zero-Friction**: Los jugadores no necesitan instalar Java ni manipular carpetas de mods manualmente.
- **Sincronización Delta por SHA-1**: Solo se descargan los archivos nuevos o actualizados, ahorrando tiempo y ancho de banda.
- **Bloqueo Obligatorio de Juego**: Si existe una actualización pendiente del modpack o del launcher, se muestra una alerta visual y **se bloquea el botón de jugar** para garantizar compatibilidad con el servidor.
- **Auto-actualización en 1 Clic**: El propio launcher se actualiza sin reinstalaciones mediante `tauri-plugin-updater` y verificación de firmas criptográficas Minisign.
- **Ajustes Esenciales**:
  - Selector de modpack activo.
  - Asignación interactiva de memoria RAM.
  - Selector nativo de carpeta de instalación del juego.
- **Autenticación Híbrida**: Soporta inicio de sesión oficial con Microsoft OAuth2 (Device Flow) y modo offline para pruebas.

---

## Estructura del Repositorio

```
launcher/
├── .github/workflows/       # CI/CD: Compilación en Windows y empaquetado de modpacks
├── docs/                    # Documentación técnica de arquitectura, manifiestos y setup
├── manifests/               # Manifiestos JSON de los modpacks distribuidos
├── scripts/                 # Herramientas CLI (generación y hash de manifiestos)
├── src-tauri/               # Backend nativo en Rust (Tauri 2.0)
│   └── src/
│       ├── auth/            # Microsoft OAuth2 y sesiones offline
│       ├── config/          # Persistencia de settings.json (RAM, rutas, cuentas)
│       ├── downloader/      # Descargas concurrentes con validación SHA-1
│       ├── game/            # Detección de Java 17 y ejecución de Forge 1.20.1
│       └── updater/         # Comprobación de versiones y bloqueo de juego
└── src/                     # Frontend moderno en React + Vite + Tailwind CSS
```

---

## Documentación Técnica

- 📘 [Arquitectura del Sistema](docs/ARCHITECTURE.md): Diagrama de componentes, protocolos IPC y ciclo de vida de la JVM.
- 📋 [Especificación de Manifiestos](docs/MANIFEST_SPEC.md): Estructura detallada del JSON y algoritmo de sincronización delta.
- 🛠️ [Guía de Configuración Local](docs/SETUP.md): Instrucciones de instalación de herramientas y compilación.

---

## Inicio Rápido (Desarrollo)

### Requisitos
- Node.js 20+ y Rust toolchain instalado.
- Visual Studio C++ Build Tools (en Windows).

### Comandos
```powershell
# Instalar dependencias
npm install

# Iniciar aplicación en modo desarrollo
npm run tauri dev

# Compilar ejecutable de producción
npm run tauri build
```
