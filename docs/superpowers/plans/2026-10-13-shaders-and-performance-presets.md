# Shaders Manager and Performance Presets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a native Shader & Performance Presets Manager for Minecraft 1.20.1 (Oculus/Embeddium) allowing 1-click preset switching (PVP Competitivo, Equilibrado, Cinemático Ultra), shaderpack toggling, and filesystem integration.

**Architecture:** Rust backend parses and safely mutates Minecraft's `options.txt` and Oculus's `optionsshaders.txt` without corrupting user keybindings or audio settings, scans `shaderpacks/*.zip`, and exposes Tauri commands. React frontend manages state with Zustand (`useShadersStore`), renders a glassmorphic multi-tab modal (`ShadersModal`), and integrates an action button in `App.tsx`.

**Tech Stack:** Rust (std::fs, std::io, serde, tauri v2), React 18, TypeScript, Zustand, Tailwind CSS, Lucide icons.

**Spec:** `docs/superpowers/specs/2026-10-13-shaders-and-performance-presets-design.md`

## Global Constraints
- Target Minecraft: 1.20.1 Forge 47.4.22
- Oculus config file: `optionsshaders.txt` (`shaderPack=<name>` or `shaderPack=OFF`)
- Minecraft/Embeddium config file: `options.txt` (`renderDistance`, `particles`, `graphicsMode`, `maxFps`, `simulationDistance`)
- Non-destructive parser: All unrelated lines (e.g. `key_key.*`, `soundCategory_*`, `mouseSensitivity`) MUST be strictly preserved.
- Missing files: If `options.txt` or `optionsshaders.txt` do not exist yet in a fresh instance, backend must initialize them with safe defaults.
- Safe scanning: Only `.zip` files and valid directories in `shaderpacks/` are listed.

## Review Focus
1. Modifying `options.txt` must never overwrite, delete, or re-order unrelated player keybindings (`key_key.*`) or sound settings.
2. Toggling shaders to `OFF` must update `optionsshaders.txt` without deleting the active pack name reference or crashing if no shader is installed.
3. If the user has no shaders installed, selecting the "Equilibrado" or "Cinemático" preset must gracefully set graphics settings and notify about shaders without panicking.
4. Calling `open_shaderpacks_folder` must create `shaderpacks/` directory if missing before attempting to open it in Explorer.
5. If `options.txt` is missing on a fresh instance, applying a preset must create the file with required keys without failing.

---

### Task 1: Rust Shader & Options Parser with Non-Destructive Update

**Files:**
- Create: `src-tauri/src/game/shaders.rs`
- Modify: `src-tauri/src/game/mod.rs`
- Modify: `src-tauri/src/game/environment.rs`

**Interfaces:**
- Produces:
  - `pub struct ShaderpackInfo { pub name: String, pub filename: String, pub is_active: bool, pub size_mb: f64 }`
  - `pub struct GraphicsState { pub active_preset: Option<String>, pub active_shader: Option<String>, pub shaders_enabled: bool, pub render_distance: u32, pub particles: u32, pub graphics_mode: u32, pub available_shaders: Vec<ShaderpackInfo> }`
  - `pub fn parse_active_shader(content: &str) -> Option<String>`
  - `pub fn serialize_active_shader(shader: Option<&str>) -> String`
  - `pub fn update_options_txt(original: &str, render_dist: u32, sim_dist: u32, particles: u32, graphics_mode: u32, max_fps: u32) -> String`
  - `pub fn scan_shaderpacks_dir(dir: &std::path::Path, active_shader: Option<&str>) -> Vec<ShaderpackInfo>`

- [ ] **Step 1: Write unit tests in `src-tauri/src/game/shaders.rs` for parsing and non-destructive update**

```rust
#[test]
fn test_options_shaders_parse_and_serialize() {
    assert_eq!(parse_active_shader("shaderPack=OFF\n"), None);
    assert_eq!(parse_active_shader("shaderPack=Complementary.zip\n"), Some("Complementary.zip".to_string()));
    assert_eq!(serialize_active_shader(None), "shaderPack=OFF\n");
    assert_eq!(serialize_active_shader(Some("Complementary.zip")), "shaderPack=Complementary.zip\n");
}

#[test]
fn test_update_options_txt_preserves_keys() {
    let original = "key_key.forward:17\nsoundCategory_master:0.8\nrenderDistance:16\nparticles:0\n";
    let updated = update_options_txt(original, 8, 6, 2, 0, 144);
    assert!(updated.contains("key_key.forward:17"));
    assert!(updated.contains("soundCategory_master:0.8"));
    assert!(updated.contains("renderDistance:8"));
    assert!(updated.contains("particles:2"));
}
```

- [ ] **Step 2: Run test to verify it fails before implementation (RED)**

Run: `cargo test test_options_shaders_parse_and_serialize` inside `src-tauri`  
Expected: FAIL (module not defined yet)

- [ ] **Step 3: Implement `shaders.rs` logic and update `environment.rs`**

- Add `"shaderpacks"` to `subdirs` in `ensure_instance_structure` in `environment.rs`.
- Implement `parse_active_shader`, `serialize_active_shader`, `update_options_txt`, `scan_shaderpacks_dir`.
- Expose `pub mod shaders;` in `game/mod.rs`.

- [ ] **Step 4: Run unit tests to verify parser passes (GREEN)**

Run: `cargo test game::shaders::tests` inside `src-tauri`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/game/shaders.rs src-tauri/src/game/mod.rs src-tauri/src/game/environment.rs
git commit -m "feat(shaders): implement non-destructive options parser and shaderpack scanner"
```

---

### Task 2: Tauri Commands for Graphics & Shaders Management

**Files:**
- Modify: `src-tauri/src/game/shaders.rs`
- Modify: `src-tauri/src/lib.rs`

**Interfaces:**
- Produces:
  - Tauri command `get_graphics_state(instance_path: String) -> Result<GraphicsState, String>`
  - Tauri command `set_active_shaderpack(instance_path: String, shader_filename: Option<String>) -> Result<(), String>`
  - Tauri command `apply_graphics_preset(instance_path: String, preset_id: String) -> Result<GraphicsState, String>`
  - Tauri command `open_shaderpacks_folder(instance_path: String) -> Result<(), String>`

- [ ] **Step 1: Write integration tests in `src-tauri/src/game/shaders.rs` for presets**

```rust
#[test]
fn test_apply_graphics_presets_pvp_balanced_ultra() {
    let temp_dir = std::env::temp_dir().join("monoevents_test_presets");
    let _ = std::fs::remove_dir_all(&temp_dir);
    let _ = std::fs::create_dir_all(&temp_dir);
    let state_pvp = apply_preset_internal(&temp_dir, "pvp").unwrap();
    assert_eq!(state_pvp.render_distance, 8);
    assert_eq!(state_pvp.shaders_enabled, false);
    let _ = std::fs::remove_dir_all(&temp_dir);
}
```

- [ ] **Step 2: Run test to verify it fails (RED)**

Run: `cargo test test_apply_graphics_presets_pvp_balanced_ultra` inside `src-tauri`  
Expected: FAIL

- [ ] **Step 3: Implement presets application and Tauri commands**

- Define preset constants:
  - `pvp`: render 8, sim 6, particles 2 (minimal), graphics 0 (fast), fps 144, shaders OFF.
  - `balanced`: render 12, sim 8, particles 1 (decreased), graphics 1 (fancy), fps 120, shaders enabled (if pack exists).
  - `ultra`: render 16, sim 10, particles 0 (all), graphics 1 (fancy), fps 260, shaders enabled.
- Implement Tauri commands in `shaders.rs` and register them in `lib.rs` `invoke_handler!`.

- [ ] **Step 4: Run unit tests to verify all backend tests pass (GREEN)**

Run: `cargo test` inside `src-tauri`  
Expected: 34+ passed

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/game/shaders.rs src-tauri/src/lib.rs
git commit -m "feat(shaders): expose Tauri commands for graphics presets and shader management"
```

---

### Task 3: Shaders Store, Types & IPC Hook

**Files:**
- Modify: `src/types/launcher.ts`
- Create: `src/stores/shadersStore.ts`
- Modify: `src/hooks/useTauriIpc.ts`

**Interfaces:**
- Produces:
  - `ShaderpackInfo`, `GraphicsPresetType`, `GraphicsState` in `types/launcher.ts`.
  - `useShadersStore`: Zustand store with `graphicsState`, `isModalOpen`, `isLoading`, `fetchGraphicsState`, `setActiveShader`, `applyPreset`, `openShaderFolder`.
  - `useTauriIpc`: `getGraphicsState`, `setActiveShaderpack`, `applyGraphicsPreset`, `openShaderpacksFolder`.

- [ ] **Step 1: Add types in `src/types/launcher.ts`**

Define `ShaderpackInfo`, `GraphicsPresetType`, and `GraphicsState`.

- [ ] **Step 2: Expose IPC methods in `src/hooks/useTauriIpc.ts`**

Add `getGraphicsState`, `setActiveShaderpack`, `applyGraphicsPreset`, `openShaderpacksFolder` with browser fallback mocks.

- [ ] **Step 3: Create `src/stores/shadersStore.ts`**

Implement store with optimistic UI updates and error handling.

- [ ] **Step 4: Verify frontend build**

Run: `npm run build`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/types/launcher.ts src/stores/shadersStore.ts src/hooks/useTauriIpc.ts
git commit -m "feat(shaders): add shaders data types, store, and IPC hook methods"
```

---

### Task 4: Glassmorphic Shaders & Performance Modal (`ShadersModal.tsx`)

**Files:**
- Create: `src/components/shaders/ShadersModal.tsx`

**Interfaces:**
- Consumes: `useShadersStore`, `useSettingsStore`
- Produces: `ShadersModal` component.

- [ ] **Step 1: Create `src/components/shaders/ShadersModal.tsx`**

- Header with title, subtitle, close button and preset badge.
- Tab navigation:
  - `Perfiles de Rendimiento (1-Clic)`: 3 interactive cards with badges:
    - ⚔️ **PVP Competitivo**: Máximo FPS (144+), Shaders OFF, 8 chunks, sin tirones.
    - ⚖️ **Equilibrado**: 60-90 FPS, Shaders optimizados, 12 chunks.
    - 🎬 **Cinemático Ultra**: Calidad visual máxima, sombras dinámicas y niebla de sangre, 16 chunks.
  - `Gestor de Shaders`:
    - Switch global: Activar/Desactivar Shaders.
    - Lista de shaders locales con tamaño en MB y radio de selección.
    - Botón "Abrir carpeta shaderpacks" en Windows Explorer.
    - Tarjeta de recomendados (Complementary Reimagined & MakeUp UltraFast).

- [ ] **Step 2: Verify component build**

Run: `npm run build`  
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/shaders/ShadersModal.tsx
git commit -m "feat(ui): create glassmorphic ShadersModal with 1-click presets and shader manager"
```

---

### Task 5: Integration in `App.tsx` Header and Full Verification

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `useShadersStore`, `ShadersModal`

- [ ] **Step 1: Add Sparkles button in `App.tsx` header**

- Add `<button>` next to Terminal, News, and Settings:
  - Icon: `<Sparkles className="w-4 h-4 text-amber-400" />`.
  - Title: "Ajustes de Rendimiento y Shaders".
  - Small indicator badge if shaders are enabled.
- Mount `<ShadersModal isOpen={isShadersModalOpen} onClose={...} />`.
- Auto-fetch graphics state on launcher load when instance directory is ready.

- [ ] **Step 2: Run comprehensive verification**

Run:
1. `cargo test` in `src-tauri` -> 34+ tests passing.
2. `npm run build` in root -> production bundle generated with zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat(app): integrate shaders and performance button in header and wire ShadersModal"
```
