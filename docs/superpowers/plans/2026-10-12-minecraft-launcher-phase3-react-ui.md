# Plan de Implementación: Fase 3 del Launcher de Minecraft (Interfaz Gráfica React & Conexión IPC)

> **Para ejecutores y agentes:** HABILIDAD REQUERIDA: Usar `superpowers:executing-plans` (ejecución nativa) para implementar este plan tarea por tarea. Cada paso utiliza la sintaxis de casillas (`- [ ]`) para seguimiento de progreso. Se integra el seguimiento nativo de metas mediante la herramienta de gestión `orca goal`.

**Goal:** Implementar la interfaz de usuario completa, reactiva y moderna en React 18 con Vite, Tailwind CSS y Zustand, conectando los componentes visuales con los comandos nativos de Rust y eventos de streaming de Tauri 2.0.

**Architecture:** Arquitectura basada en componentes modulares (`components/settings/`, `components/playbar/`, `components/selector/`, `components/common/`), stores globales desacoplados con Zustand (`stores/settingsStore.ts`, `stores/launcherStore.ts`), hooks de integración con Tauri IPC (`hooks/useTauri.ts`) y renderizado condicional con bloqueo estricto del botón de juego.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, Lucide React, Zustand, `@tauri-apps/api`, `@tauri-apps/plugin-dialog`, Orca CLI.

**Spec:** [2026-10-12-minecraft-launcher-phase1-design.md](file:///C:/Users/Geko/Desktop/HalloweenMC/MonoEvents/launcher/docs/superpowers/specs/2026-10-12-minecraft-launcher-phase1-design.md)

## Global Constraints

- Interfaz visual oscura moderna ("Halloween / MonoEvents theme": fondos `slate-950`, acentos `orange-500`/`emerald-500`, tipografía nítida).
- Si el estado es `UPDATE_MODPACK_REQUIRED` o `UPDATE_LAUNCHER_REQUIRED`, el botón principal debe ser "Actualizar" y **el juego no puede iniciarse bajo ninguna circunstancia**.
- Durante la descarga (`DOWNLOADING`), la PlayBar debe mostrar el nombre del archivo actual, la velocidad en MB/s y una barra de progreso fluida.
- El modal de Ajustes debe incluir slider interactivo de RAM, selector de carpeta de instalación de Minecraft con fallback manual/nativo, y configuración de cuenta offline / Microsoft.
- El avance de cada tarea debe reflejarse en los objetivos de Orca ejecutando `orca goal complete <índice>`.

## Review Focus

1. **Sincronización de Estado con Tauri**: Garantizar que el store de Zustand mantenga coherencia si la app se ejecuta dentro de Tauri o en modo de previsualización web (`Vite dev`).
2. **Escucha de Eventos IPC**: Asegurar que la suscripción a `download-progress` limpie los listeners (unlisten) al desmontar los componentes para evitar fugas de memoria.
3. **Persistencia Automática de Ajustes**: Guardar automáticamente los cambios de RAM y directorio invocando `save_user_settings` en Rust.
4. **Validación de Tipos en TypeScript**: `npm run build` (`tsc && vite build`) debe compilar sin ningún error de tipos.
5. **Responsividad de Ventana**: La UI debe adaptarse perfectamente al tamaño fijo de 1024x640 sin barras de desplazamiento indeseadas en el contenedor principal.

---

### Task 1: Metas en Orca y Rama de Desarrollo (`feat/phase3-react-ui`)

**Files:**
- Modify: `.orca/goals.json`
- Modify: `.orca/CURRENT_GOAL.md`

- [ ] **Paso 1: Configurar el objetivo de la Fase 3 en Orca**
  ```powershell
  orca goal set "Fase 3: Interfaz Gráfica React y Conexión IPC"
  ```

- [ ] **Paso 2: Registrar las subtareas en Orca**
  ```powershell
  orca goal add-task "Configurar store global Zustand para estado y configuración"
  orca goal add-task "Crear modal de Ajustes (slider de RAM, ruta nativa y cuenta)"
  orca goal add-task "Implementar selector de modpack y banner de novedades"
  orca goal add-task "Desarrollar PlayBar reactiva con barra de progreso y bloqueo de juego"
  orca goal add-task "Conectar hooks de Tauri IPC con Rust y eventos en tiempo real"
  orca goal add-task "Verificar compilación de TypeScript/Vite y validar meta en Orca"
  ```

- [ ] **Paso 3: Crear rama Git para la Fase 3**
  ```powershell
  git checkout -b feat/phase3-react-ui
  ```

---

### Task 2: Stores Globales con Zustand (`stores/`)

**Files:**
- Create: `src/stores/settingsStore.ts`
- Create: `src/stores/launcherStore.ts`

**Interfaces:**
- Consumes: `src/types/launcher.ts`.
- Produces: `useSettingsStore`, `useLauncherStore`.

- [ ] **Paso 1: Implementar `src/stores/settingsStore.ts`**
  Gestionar `settings` (`allocated_ram_gb`, `game_directory`, `selected_modpack_id`, `active_account`, `close_launcher_on_start`) con acciones `setRam`, `setGameDir`, `setAccount`, `setSettings`.

- [ ] **Paso 2: Implementar `src/stores/launcherStore.ts`**
  Gestionar `status` (`READY`, `UPDATE_MODPACK_REQUIRED`, `DOWNLOADING`, `RUNNING`), `downloadProgress` y `deltaReport`.

- [ ] **Paso 3: Marcar subtarea 1 en Orca y commit**
  ```powershell
  orca goal complete 1
  git add src/stores/
  git commit -m "feat(stores): create Zustand stores for settings and launcher state"
  ```

---

### Task 3: Modal Interactivo de Ajustes (`components/settings/`)

**Files:**
- Create: `src/components/settings/SettingsModal.tsx`

**Interfaces:**
- Consumes: `useSettingsStore`, `@tauri-apps/plugin-dialog`.
- Produces: `<SettingsModal isOpen onClose />`.

- [ ] **Paso 1: Desarrollar `SettingsModal.tsx`**
  - Slider interactivo de RAM (2 GB a 16 GB) con etiquetas visuales y valor actual destacado.
  - Selector de carpeta de juego con botón "Examinar..." y visualización de la ruta.
  - Gestión de perfil de jugador (cambio entre apodo offline e inicio de sesión Microsoft).
  - Checkbox para cerrar o minimizar el launcher tras iniciar.

- [ ] **Paso 2: Marcar subtarea 2 en Orca y commit**
  ```powershell
  orca goal complete 2
  git add src/components/settings/
  git commit -m "feat(settings): create modern SettingsModal with RAM slider and directory picker"
  ```

---

### Task 4: Selector de Modpack y Banner Temático (`components/selector/`)

**Files:**
- Create: `src/components/selector/ModpackSelector.tsx`
- Create: `src/components/banner/UpdateBanner.tsx`

**Interfaces:**
- Consumes: `useLauncherStore`, `useSettingsStore`.
- Produces: `<ModpackSelector />`, `<UpdateBanner />`.

- [ ] **Paso 1: Crear `ModpackSelector.tsx`**
  Desplegable estilizado con iconos para seleccionar entre modpacks disponibles (por ejemplo: "MonoEvents Halloween 1.20.1 Forge").

- [ ] **Paso 2: Crear `UpdateBanner.tsx`**
  Banner visual destacado cuando el modpack requiera actualización, mostrando versión objetivo y notas de parche.

- [ ] **Paso 3: Marcar subtarea 3 en Orca y commit**
  ```powershell
  orca goal complete 3
  git add src/components/selector/ src/components/banner/
  git commit -m "feat(ui): add ModpackSelector dropdown and UpdateBanner alerts"
  ```

---

### Task 5: PlayBar Dinámica con Streaming de Progreso (`components/playbar/`)

**Files:**
- Create: `src/components/playbar/PlayBar.tsx`

**Interfaces:**
- Consumes: `useLauncherStore`, `useSettingsStore`.
- Produces: `<PlayBar onPlay onUpdate />`.

- [ ] **Paso 1: Implementar `PlayBar.tsx`**
  - Si el estado es `UPDATE_MODPACK_REQUIRED`: muestra botón grande "ACTUALIZAR MODPACK" (naranja) y el botón de juego está bloqueado.
  - Si el estado es `DOWNLOADING`: muestra barra de progreso con porcentaje, archivo actual y velocidad de descarga en MB/s.
  - Si el estado es `READY`: muestra botón grande "JUGAR" (verde esmeralda).

- [ ] **Paso 2: Marcar subtarea 4 en Orca y commit**
  ```powershell
  orca goal complete 4
  git add src/components/playbar/
  git commit -m "feat(playbar): implement PlayBar with download progress and strict game lock"
  ```

---

### Task 6: Integración de Hooks IPC con Rust y Vista Principal (`src/App.tsx`)

**Files:**
- Create: `src/hooks/useTauriIpc.ts`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `@tauri-apps/api/core`, `@tauri-apps/api/event`.
- Produces: Hook `useTauriIpc` conectado con comandos `get_settings`, `save_user_settings`, `check_modpack_delta`, `sync_modpack`.

- [ ] **Paso 1: Implementar hook `src/hooks/useTauriIpc.ts`**
  Cargar configuración inicial desde Rust al montar, escuchar eventos `download-progress` y proveer funciones para sincronizar y lanzar el juego.

- [ ] **Paso 2: Integrar todo en `src/App.tsx`**
  Conectar header, modpack selector, update banner, settings modal y playbar en una vista coherente y libre de parpadeos.

- [ ] **Paso 3: Marcar subtarea 5 en Orca y commit**
  ```powershell
  orca goal complete 5
  git add src/hooks/ src/App.tsx
  git commit -m "feat(app): connect frontend with Tauri IPC hooks and assemble full UI"
  ```

---

### Task 7: Verificación de Compilación y Validación en Orca

**Files:**
- Modify: `.orca/goals.json`
- Modify: `.orca/CURRENT_GOAL.md`

- [ ] **Paso 1: Ejecutar verificación de tipos de TypeScript y build**
  ```powershell
  npm run build
  ```
  Salida esperada: Compilación exitosa en `dist/` sin errores de tipo.

- [ ] **Paso 2: Marcar subtarea 6 y validar objetivo en Orca**
  ```powershell
  orca goal complete 6
  orca goal status
  ```

- [ ] **Paso 3: Commit de cierre de Fase 3**
  ```powershell
  git commit --allow-empty -m "chore: complete Phase 3 React UI and IPC integration"
  ```
