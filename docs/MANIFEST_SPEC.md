# Especificación Técnica del Manifiesto de Modpack: MonoEvents Launcher

## 1. Propósito

El archivo de manifiesto (`manifest.json`) es el contrato declarativo que define el estado exacto de un modpack de Minecraft distribuido por el equipo de MonoEvents. El launcher utiliza este archivo para sincronizar archivos, verificar la integridad mediante sumas de verificación (checksums) y aplicar la política de actualización obligatoria.

---

## 2. Estructura JSON y Definición de Campos

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
  "changelog": "Descripción de cambios para la interfaz de usuario.",
  "files": [
    {
      "path": "mods/mono_events-1.20.1.jar",
      "url": "https://github.com/tu-usuario/monoevents-launcher/releases/download/modpack-v1.2.0/mono_events-1.20.1.jar",
      "sha1": "e2a1b94d50c7657989345c26b5278912ef6c41b8",
      "size": 6543210,
      "type": "custom"
    }
  ]
}
```

### Campos Principales
- `schemaVersion` *(número, obligatorio)*: Versión del formato del manifiesto (actualmente `1`).
- `id` *(string, obligatorio)*: Identificador único del modpack (alfanumérico y guiones).
- `name` *(string, obligatorio)*: Nombre legible para mostrar en el selector del launcher.
- `version` *(string, obligatorio)*: Versión semántica del modpack (ej: `1.2.0`).
- `minecraft` *(objeto, obligatorio)*:
  - `version` *(string)*: Versión base de Minecraft (ej: `"1.20.1"`).
  - `modloader` *(string)*: Gestor de mods (`"forge"`, `"neoforge"`, `"fabric"`).
  - `modloaderVersion` *(string)*: Versión exacta del modloader (ej: `"47.4.22"`).
  - `javaVersion` *(número)*: Versión requerida de Java (ej: `17`).
- `changelog` *(string, opcional)*: Texto resumen de novedades y notas del parche.
- `files` *(array de objetos, obligatorio)*: Lista completa de archivos que componen el modpack.

### Campos de Cada Archivo (`files[]`)
- `path` *(string, obligatorio)*: Ruta relativa dentro del directorio de la instancia (ej: `"mods/jei.jar"`, `"config/mono_events.toml"`). Se normalizan siempre con barras diagonales (`/`).
- `url` *(string, obligatorio)*: Enlace directo HTTPS para la descarga del archivo.
- `sha1` *(string, obligatorio)*: Hash SHA-1 de 40 caracteres hexadecimales del archivo exacto.
- `size` *(número, obligatorio)*: Tamaño del archivo en bytes.
- `type` *(string, obligatorio)*:
  - `"custom"`: Mod desarrollado internamente por el equipo (alojado en GitHub Releases del proyecto).
  - `"modrinth"`: Dependencia pública obtenida de la CDN de Modrinth.
  - `"config"`: Archivo de configuración que debe mantenerse sincronizado con el servidor.

---

## 3. Algoritmo de Sincronización y Limpieza

1. **Inspección Local**: El launcher lee el `installed_manifest.json` presente en la instancia local del jugador.
2. **Evaluación de Archivos Remotos**:
   - Para cada archivo en `files[]`:
     - Si el archivo no existe en el disco ➔ **Descargar**.
     - Si el archivo existe pero su hash SHA-1 local no coincide con `file.sha1` ➔ **Descargar y sobreescribir**.
     - Si el archivo existe y el hash coincide ➔ **Conservar sin transferir datos**.
3. **Limpieza de Huérfanos**:
   - Todo archivo `.jar` en el subdirectorio `mods/` que no figure en la lista `files[]` del nuevo manifiesto es eliminado automáticamente para evitar conflictos entre versiones viejas y nuevas.
4. **Persistencia del Estado**:
   - Al finalizar con éxito todas las descargas y validaciones, el nuevo manifiesto se guarda localmente como `installed_manifest.json`.

---

## 4. Regla de Bloqueo de Lanzamiento

> Si la versión remota del modpack no coincide con la versión local, o si alguno de los archivos obligatorios no pasa la verificación SHA-1, el lanzador establece el estado **`UPDATE_MODPACK_REQUIRED`**, deshabilita y bloquea el botón "Jugar" y solo permite la acción "Actualizar Modpack".
