# Plan: Catálogo, Búsqueda y Descarga de Shaders en 'Gestor de Shaders' (Modrinth API)

## Pre-flight interface scan
- Task 1 -> Task 2: Task 1 implementa `ModrinthShaderCard`, `search_shaders_api`, `download_shader_file` y expone los comandos Tauri `search_modrinth_shaders` y `download_modrinth_shader`. Task 2 define los tipos TypeScript coincidentes y los expone en `useTauriIpc.ts` y `useShadersStore.ts`.
- Task 2 -> Task 3: Task 2 expone métodos `searchModrinthShaders` y `downloadModrinthShader`. Task 3 los consume dentro de `ShadersModal.tsx` en la pestaña `Gestor de Shaders`.
- Task 3 -> Task 4: Task 4 realiza la verificación exhaustiva de tests en Rust y build de frontend.

---

### Task 1: Backend Rust — Modrinth API Client & Verified Downloader

**Files:**
- Create: `src-tauri/src/game/modrinth.rs`
- Modify: `src-tauri/src/game/mod.rs`
- Modify: `src-tauri/src/lib.rs`

**Interfaces:**
- Produces:
  - `ModrinthShaderCard`: `{ project_id, slug, title, description, author, icon_url, featured_gallery, downloads, categories, performance_tier, is_installed }`
  - `calculate_performance_tier(categories: &[String], title: &str, desc: &str) -> &'static str`
  - `search_shaders_api(instance_dir: &Path, query: &str, sort_by: &str, offset: u32, limit: u32, game_version: &str) -> Result<Vec<ModrinthShaderCard>, String>`
  - `download_shader_file(instance_dir: &Path, project_id: &str, game_version: &str) -> Result<ShaderpackInfo, String>`
  - Tauri commands: `search_modrinth_shaders`, `download_modrinth_shader`

- [ ] **Step 1: Create `src-tauri/src/game/modrinth.rs`**
  - Implement request structures and HTTP calls via `reqwest`.
  - Implement `calculate_performance_tier` logic mapping `potato`/`low`/`performance` to `"low"`, `medium` to `"medium"`, `high`/`extreme`/`voxels` to `"high"`.
  - Implement streaming download, `.tmp` file, SHA1 verification, atomic rename.
  - Implement unit tests covering parsing, performance tier heuristics and sanitization.

- [ ] **Step 2: Expose commands in `src-tauri/src/game/mod.rs` and `src-tauri/src/lib.rs`**
  - Register `pub mod modrinth;`.
  - Expose `search_modrinth_shaders` and `download_modrinth_shader` in `tauri::generate_handler!`.

- [ ] **Step 3: Run Rust unit tests**
  - Run `cargo test game::modrinth::tests`.

- [ ] **Step 4: Commit Task 1**
  - Commit: `feat(shaders): implement Modrinth API search and verified shaderpack downloader in Rust`.

---

### Task 2: Frontend IPC Bridge & Types

**Files:**
- Modify: `src/types/launcher.ts`
- Modify: `src/hooks/useTauriIpc.ts`
- Modify: `src/stores/shadersStore.ts`

**Interfaces:**
- Produces:
  - `ShaderPerformanceTier = 'low' | 'medium' | 'high'`
  - `ModrinthShaderCard`
  - `useTauriIpc`: `searchModrinthShaders`, `downloadModrinthShader`
  - `useShadersStore`: `onlineShaders`, `isSearchingOnline`, `downloadingProjects`, `searchOnlineShaders`, `downloadOnlineShader`

- [ ] **Step 1: Add types in `src/types/launcher.ts`**
- [ ] **Step 2: Add IPC methods in `src/hooks/useTauriIpc.ts`**
  - Add browser mock fallback for Vite preview testing.
- [ ] **Step 3: Add store actions in `src/stores/shadersStore.ts`**
- [ ] **Step 4: Verify build with `npm run build`**
- [ ] **Step 5: Commit Task 2**
  - Commit: `feat(shaders): add Modrinth catalog types, store actions, and IPC bridge`.

---

### Task 3: UI Integration inside 'Gestor de Shaders' Tab

**Files:**
- Modify: `src/components/shaders/ShadersModal.tsx`

**Interfaces:**
- Consumes: `useShadersStore`, `useTauriIpc`
- Produces:
  - Subsección "Explorar & Descargar Shaders" integrada en la pestaña `Gestor de Shaders`.
  - Input de búsqueda con debounce (350ms).
  - Selector de chips de consumo: `Todos`, `🟢 Bajo Consumo`, `🟡 Equilibrado`, `🔴 Alto Consumo`.
  - Selector de ordenación (`downloads`, `follows`, `newest`).
  - Grid de tarjetas de shader con imágenes, autor, badges, contador de descargas y botón `Descargar` / `Instalado`.
  - Estado de descarga reactivo con feedback al completar.

- [ ] **Step 1: Update `src/components/shaders/ShadersModal.tsx`**
- [ ] **Step 2: Verify frontend compilation with `npm run build`**
- [ ] **Step 3: Commit Task 3**
  - Commit: `feat(ui): integrate online shader search, tier badges, and download manager into ShadersModal`.

---

### Task 4: Full Verification and Polish

- [ ] **Step 1: Run comprehensive tests**
  - `cargo test` in `src-tauri` -> 38+ tests pass.
  - `npm run build` in root -> pass.
- [ ] **Step 2: Subagent Code Review**
  - Run code review on the implementation range.
- [ ] **Step 3: Commit review fixes and clean up**
