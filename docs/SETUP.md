# Guía de Configuración del Entorno de Desarrollo (Setup)

## 1. Requisitos Previos (Windows)

Para compilar y desarrollar el launcher de MonoEvents en entornos Windows, se requiere tener instaladas las siguientes herramientas:

1. **Visual Studio C++ Build Tools**:
   - Descargar desde [Visual Studio Installer](https://visualstudio.microsoft.com/visual-cpp-build-tools/).
   - Asegurarse de marcar la carga de trabajo: **"Desarrollo para el escritorio con C++"** (incluye MSVC v143 y Windows 10/11 SDK).
2. **Rust Toolchain**:
   - Instalar mediante `rustup`: [https://rustup.rs](https://rustup.rs).
   - Verificar en consola:
     ```powershell
     rustc --version
     cargo --version
     ```
3. **Node.js**:
   - Versión 20 LTS o superior: [https://nodejs.org](https://nodejs.org).
   - Gestor de paquetes `npm` (incluido).
4. **Java JDK 17**:
   - Requerido para probar el entorno de Minecraft 1.20.1 y Forge: [Eclipse Adoptium Temurin 17](https://adoptium.net/temurin/releases/?version=17).

---

## 2. Instalación y Primeros Pasos

Desde el directorio raíz `launcher/`:

### 1. Instalar dependencias de Node
```powershell
npm install
```

### 2. Verificar dependencias de Rust
```powershell
cargo check --manifest-path src-tauri/Cargo.toml
```

### 3. Iniciar el entorno de desarrollo con recarga en vivo (Live Reload)
```powershell
npm run tauri dev
```
Este comando compilará el frontend en Vite y abrirá la ventana de escritorio de Tauri conectada al servidor local.

---

## 3. Generación de Manifiestos de Modpacks

Para empaquetar una carpeta de mods locales y calcular automáticamente todos los hashes SHA-1:

```powershell
npx ts-node scripts/generate-manifest.ts ./ruta/a/mods ./manifests/monoevents-forge.json
```

---

## 4. Configuración del Actualizador (`tauri-plugin-updater`)

Para generar un nuevo par de claves criptográficas Minisign para firmar las actualizaciones:

```powershell
npx @tauri-apps/cli signer generate -w src-tauri/tauri.conf.json
```
- La clave pública se añadirá automáticamente a `src-tauri/tauri.conf.json`.
- La clave privada (`TAURI_SIGNING_PRIVATE_KEY`) y la contraseña deben configurarse como secretos en el repositorio de GitHub para los workflows de CI/CD.
