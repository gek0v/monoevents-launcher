# Especificación de Diseño: Gestor de Shaders y Perfiles de Rendimiento (Fase 3)

**Proyecto:** MonoEvents Launcher (Minecraft 1.20.1 Forge 47.4.22)  
**Fecha:** 13 de Octubre de 2026  
**Autor:** Antigravity & Geko  
**Estado:** Aprobado para Planificación  

---

## 1. Visión y Objetivos

Durante el evento *MonoEvents: Noche de Sangre*, los jugadores experimentan escenarios de combate PVP intenso (Airdrops, Ruleta) y momentos de exploración atmosférica de terror.  
Dado que el modpack oficial utiliza **Oculus** (port de Iris para Forge) y **Embeddium** (port de Sodium para Forge), muchos usuarios sufren caídas de FPS o se sienten intimidados por los complejos menús internos de vídeo de Minecraft.

### Objetivos Principales:
1. **Perfiles de Rendimiento de 1-Clic:** Permitir a los jugadores alternar al instante entre tres configuraciones optimizadas (*PVP Competitivo*, *Equilibrado* y *Cinemático Ultra*) antes de lanzar el juego.
2. **Gestión Nativa de Shaders:** Detectar, listar, activar y desactivar paquetes de shaders (`shaderpacks/*.zip`) directamente desde el Launcher.
3. **Preservación Total de Ajustes del Usuario:** Al modificar los ajustes gráficos en `options.txt`, el sistema **debe garantizar** que ninguna tecla personalizada (`key_key.*`), sensibilidad del ratón, volumen de sonido ni ajuste de chat sea alterado o reseteado.
4. **Acceso Rápido al Sistema de Archivos:** Botón nativo para abrir la carpeta `shaderpacks/` en el Explorador de Windows y arrastrar nuevos shaders fácilmente.
5. **Estética Cinemática Integrada:** Modal `ShadersModal.tsx` con diseño glassmorphic, tarjetas interactivas de presets y selector de shaders con badges visuales.

---

## 2. Arquitectura de Archivos y Formatos de Minecraft

El Launcher interactúa con la carpeta de instancia activa:  
`settings.game_directory/instances/monoevents-forge-1.20.1/`

```
instances/monoevents-forge-1.20.1/
├── options.txt              <-- Ajustes generales de Minecraft / Embeddium
├── optionsshaders.txt       <-- Estado de Oculus / Iris
└── shaderpacks/             <-- Carpeta con archivos .zip de shaders
    ├── ComplementaryReimagined_r5.1.1.zip
    └── MakeUp-UltraFast-8.9.zip
```

### 2.1. Formato de `optionsshaders.txt` (Oculus)
- Cuando los shaders están **desactivados**:
  ```text
  shaderPack=OFF
  ```
- Cuando un shader está **activado**:
  ```text
  shaderPack=ComplementaryReimagined_r5.1.1.zip
  ```

### 2.2. Formato de `options.txt` (Minecraft & Embeddium)
El archivo `options.txt` contiene pares clave-valor separados por dos puntos (`clave:valor`):
- `renderDistance:8` (Rango de 2 a 32 chunks)
- `simulationDistance:6` (Rango de 4 a 16 chunks)
- `graphicsMode:0` (`0` = Fast, `1` = Fancy, `2` = Fabulous)
- `particles:2` (`0` = All, `1` = Decreased, `2` = Minimal)
- `maxFps:144` (Tasa máxima de refresco o `260` ilimitado)
- `enableVsync:false`

> [!CRITICAL]
> **Regla de Preservación de Claves:**  
> El parser en Rust debe leer todas las líneas existentes, reemplazar únicamente las claves gráficas afectadas por el preset seleccionado, y reescribir el archivo manteniendo todas las demás líneas exactamente iguales y en su orden respectivo.

---

## 3. Especificación de Perfiles de Rendimiento (Presets)

| Perfil | Shader Activo | Render Distance | Simulación | Gráficos | Partículas | FPS Límite | Propósito |
|---|---|---|---|---|---|---|---|
| **PVP Competitivo** | `OFF` | 8 chunks | 6 chunks | Fast (`0`) | Mínimas (`2`) | 144 FPS / Max | Máxima fluidez y visibilidad para combates sin caídas de frames. |
| **Equilibrado** (Recomendado) | `Complementary` (o primer shader disponible) | 12 chunks | 8 chunks | Fancy (`1`) | Reducidas (`1`) | 120 FPS | Equilibrio ideal entre atmósfera de terror y rendimiento fluido (60-90 FPS). |
| **Cinemático Ultra** | `Complementary` / Shader Activo | 16 chunks | 10 chunks | Fancy (`1`) | Todas (`0`) | 60 FPS / Max | Máxima calidad visual, iluminación y reflejos para captura de contenido. |

---

## 4. Backend Rust (`src-tauri/src/game/shaders.rs`)

### 4.1. Estructuras de Datos
```rust
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ShaderpackInfo {
    pub name: String,
    pub filename: String,
    pub is_active: bool,
    pub size_mb: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct GraphicsState {
    pub active_preset: Option<String>,
    pub active_shader: Option<String>,
    pub shaders_enabled: bool,
    pub render_distance: u32,
    pub particles: u32,
    pub graphics_mode: u32,
    pub available_shaders: Vec<ShaderpackInfo>,
}
```

### 4.2. Comandos Tauri
1. `get_graphics_state(instance_path: String) -> Result<GraphicsState, String>`:  
   Lee `options.txt` y `optionsshaders.txt`, escanea la carpeta `shaderpacks/` y calcula el estado actual.
2. `set_active_shaderpack(instance_path: String, shader_filename: Option<String>) -> Result<(), String>`:  
   Actualiza `optionsshaders.txt` (`shaderPack=<filename>` o `shaderPack=OFF`).
3. `apply_graphics_preset(instance_path: String, preset_id: String) -> Result<GraphicsState, String>`:  
   Aplica los parámetros del preset en `options.txt` y `optionsshaders.txt` de forma atómica y devuelve el nuevo estado.
4. `open_shaderpacks_folder(instance_path: String) -> Result<(), String>`:  
   Abre la carpeta `shaderpacks/` en el Explorador de Windows mediante `system::open_directory_in_explorer`.

---

## 5. Frontend React & Zustand

### 5.1. Tipos en `src/types/launcher.ts`
```typescript
export interface ShaderpackInfo {
  name: string;
  filename: string;
  is_active: boolean;
  size_mb: number;
}

export type GraphicsPresetType = 'pvp' | 'balanced' | 'ultra' | 'custom';

export interface GraphicsState {
  active_preset?: GraphicsPresetType | null;
  active_shader?: string | null;
  shaders_enabled: boolean;
  render_distance: number;
  particles: number;
  graphics_mode: number;
  available_shaders: ShaderpackInfo[];
}
```

### 5.2. Store `src/stores/shadersStore.ts`
- `graphicsState: GraphicsState | null`
- `isLoading: boolean`
- `isModalOpen: boolean`
- `openModal()`, `closeModal()`
- `fetchGraphicsState(instancePath: string): Promise<void>`
- `setActiveShader(instancePath: string, filename: string | null): Promise<void>`
- `applyPreset(instancePath: string, presetId: GraphicsPresetType): Promise<void>`
- `openShaderFolder(instancePath: string): Promise<void>`

### 5.3. Componente `src/components/shaders/ShadersModal.tsx`
- Modal cinemático accesible desde el botón `<Sparkles />` en la cabecera de `App.tsx`.
- **Pestaña 1: Perfiles de 1-Clic:**
  - 3 tarjetas con diseño interactivo, icono distintivo, descripción de impacto en FPS e indicador de perfil activo.
- **Pestaña 2: Gestor de Shaders:**
  - Switch global: Activar/Desactivar Shaders.
  - Lista de shaders `.zip` encontrados localmente con selector radial.
  - Si no hay shaders instalados, mensaje amigable con botón para abrir la carpeta y sugerencias de descarga.
  - Botón "Abrir carpeta de shaders" para arrastrar archivos zip directamente.

---

## 6. Pruebas y Criterios de Aceptación (TDD)

1. **Test Unitario de Preservación de `options.txt`:**  
   Verificar que al actualizar `renderDistance` y `particles`, las claves de teclas (`key_key.forward:17`) y sonido (`soundCategory_master:1.0`) se conservan intactas.
2. **Test Unitario de `optionsshaders.txt`:**  
   Verificar que activar un shader escribe `shaderPack=<filename>` y desactivarlo escribe `shaderPack=OFF`.
3. **Test Unitario de Escaneo de Directorio `shaderpacks/`:**  
   Verificar que detecta archivos `.zip` y carpetas descomprimidas, ignorando archivos temporales o inválidos.
4. **Verificación Frontend:**  
   `npm run build` sin errores de TypeScript y renderizado responsivo del modal.
