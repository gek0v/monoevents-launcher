# Discord Rich Presence and Event News Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a native Discord Rich Presence IPC client in Rust with dynamic launcher/in-game activity states, and a remote-synced Event News & Rules panel with guaranteed local fallback for MonoEvents launcher.

**Architecture:** Rust backend connects asynchronously to the local Windows Discord IPC named pipe (`\\.\pipe\discord-ipc-0..9`), sending dynamic activity packets based on game process state. React frontend queries a remote `news.json` feed with resilient local fallback (`defaultNews.ts`), renders a glassmorphic multi-tab modal (`EventNewsModal`), and tracks unread announcements with a header badge.

**Tech Stack:** Rust (std::fs, std::io, serde, tauri v2), React 18, TypeScript, Zustand, Tailwind CSS, Lucide icons.

**Spec:** `docs/superpowers/specs/2026-10-13-discord-rpc-and-news-panel-design.md`

## Global Constraints
- Target Minecraft: 1.20.1 Forge 47.4.22
- Discord App ID: `1295058726597791836`
- Named pipe non-blocking: Connection failures when Discord is closed must never panic or delay launcher launch (timeout < 50ms)
- News remote timeout: Max 2500ms before falling back to local `defaultNews.ts`
- Privacy toggle: `enable_discord_rpc` in `UserSettings` must immediately clear presence when disabled

## Review Focus
1. When Discord is not running on the player's PC, IPC pipe connection must fail instantly without throwing errors.
2. If player disables Discord RPC in Settings, active presence must be cleared immediately from Discord.
3. Network interruption or invalid remote `news.json` must seamlessly render local rules without breaking the modal.
4. Process termination of Minecraft must cleanly revert Discord activity back to "En el menú principal".
5. Unread news counter in `localStorage` must update when user opens the news modal.

---

### Task 1: Rust Discord IPC Named Pipe Client & Activity Builder

**Files:**
- Create: `src-tauri/src/discord/mod.rs`
- Create: `src-tauri/src/discord/rpc.rs`
- Modify: `src-tauri/src/lib.rs`

**Interfaces:**
- Produces:
  - `pub struct DiscordIpcClient`: Named pipe connection with handshake (opcode 0) and frame sending (opcode 1).
  - `pub enum DiscordActivityState { InLauncher, InGame { start_timestamp: u64, server_ip: String } }`
  - `pub fn set_activity(state: DiscordActivityState) -> Result<(), String>`
  - `pub fn clear_activity() -> Result<(), String>`

- [ ] **Step 1: Write unit tests in `src-tauri/src/discord/rpc.rs` for packet encoding**

```rust
#[test]
fn test_encode_discord_packet() {
    let payload = r#"{"v":1,"client_id":"1295058726597791836"}"#;
    let packet = encode_packet(0, payload);
    assert_eq!(&packet[0..4], &0u32.to_le_bytes()); // Opcode 0
    assert_eq!(&packet[4..8], &(payload.len() as u32).to_le_bytes()); // Length
    assert_eq!(&packet[8..], payload.as_bytes());
}
```

- [ ] **Step 2: Run test to verify it fails before implementation**

Run: `cargo test test_encode_discord_packet` inside `src-tauri`  
Expected: FAIL (module not defined yet)

- [ ] **Step 3: Implement `src-tauri/src/discord/rpc.rs` and `mod.rs`**

- Implement `encode_packet(opcode: u32, payload: &str) -> Vec<u8>`.
- Implement `DiscordIpcClient` with Windows named pipe probe (`\\.\pipe\discord-ipc-0` through `9`).
- Implement `set_activity` supporting `InLauncher` and `InGame` with elapsed timestamps.
- Implement `clear_activity`.

- [ ] **Step 4: Run unit tests to verify packet encoding passes**

Run: `cargo test discord::rpc::tests` inside `src-tauri`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/discord
git commit -m "feat(discord): implement native named pipe IPC client and activity builders"
```

---

### Task 2: Discord RPC Settings & Process Lifetime Synchronization

**Files:**
- Modify: `src-tauri/src/config/settings.rs`
- Modify: `src-tauri/src/game/process_spawner.rs`
- Modify: `src-tauri/src/lib.rs`

**Interfaces:**
- Consumes: `DiscordIpcClient`, `UserSettings.enable_discord_rpc`
- Produces: Tauri commands `update_discord_rpc_status`, automatic activity switching on game launch and termination.

- [ ] **Step 1: Add `enable_discord_rpc: bool` to `UserSettings` in `settings.rs`**

- Add `pub enable_discord_rpc: bool` (default: `true`) to `UserSettings`.
- Update `test_settings_sanitization` and `UserSettings::default()`.

- [ ] **Step 2: Integrate lifetime activity switching in `process_spawner.rs`**

- When game starts in `spawn_minecraft_process`: if `settings.enable_discord_rpc`, call `set_activity(DiscordActivityState::InGame)`.
- When game process terminates in monitor thread: if `settings.enable_discord_rpc`, revert to `set_activity(DiscordActivityState::InLauncher)`.

- [ ] **Step 3: Expose Tauri commands in `src-tauri/src/lib.rs`**

- Add command `update_discord_rpc_status(enabled: bool)`.
- On launcher boot in `run()`: spawn non-blocking thread to initialize launcher activity if enabled.

- [ ] **Step 4: Run backend tests to verify 31+ tests pass**

Run: `cargo test` inside `src-tauri`  
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/config/settings.rs src-tauri/src/game/process_spawner.rs src-tauri/src/lib.rs
git commit -m "feat(discord): synchronize Discord RPC with process lifetime and add privacy toggle"
```

---

### Task 3: Event News Models, Store & Local Fallback Data

**Files:**
- Modify: `src/types/launcher.ts`
- Create: `src/data/defaultNews.ts`
- Create: `src/stores/newsStore.ts`

**Interfaces:**
- Produces:
  - `NewsArticle`, `EventScheduleItem`, `EventFeed` interfaces.
  - `DEFAULT_EVENT_FEED`: Complete default rules, airdrops schedule, and announcements.
  - `useNewsStore`: Zustand store with `feed`, `unreadCount`, `fetchRemoteNews()`, and `markAllAsRead()`.

- [ ] **Step 1: Add news and schedule types in `src/types/launcher.ts`**

Define `NewsArticle`, `EventScheduleItem`, and `EventFeed`.

- [ ] **Step 2: Create `src/data/defaultNews.ts` with rich event content**

Include:
- 3 official articles: "Airdrops Competitivos & Suministros", "Reglas Oficiales de la Noche de Sangre", "Voice Chat de Proximidad".
- Daily event schedule entries with timestamps and event types.

- [ ] **Step 3: Create `src/stores/newsStore.ts` with remote fetcher and unread tracking**

- `fetchRemoteNews(url?: string)`: fetches with `AbortController` (2500ms timeout); falls back to `DEFAULT_EVENT_FEED` on failure.
- Computes `unreadCount` comparing latest article ID against `localStorage.getItem('monoevents_last_read_article_id')`.
- `markAllAsRead()`: updates `localStorage` and sets `unreadCount = 0`.

- [ ] **Step 4: Verify frontend build**

Run: `npm run build`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/types/launcher.ts src/data/defaultNews.ts src/stores/newsStore.ts
git commit -m "feat(news): add news data models, local default content, and newsStore"
```

---

### Task 4: Glassmorphic Event News & Rules Modal (`EventNewsModal.tsx`)

**Files:**
- Create: `src/components/news/EventNewsModal.tsx`

**Interfaces:**
- Consumes: `useNewsStore`
- Produces: `EventNewsModal` component with 3 tabs: `Novedades`, `Reglas`, `Horarios`.

- [ ] **Step 1: Create `src/components/news/EventNewsModal.tsx`**

- Modal overlay with `bg-slate-950/95`, backdrop blur, and blood crimson highlights.
- Header with event title, subtitle, unread badge, and close button.
- Tab navigation:
  - `Novedades`: Cards with category badges (`EVENTO`, `ACTUALIZACIÓN`, `REGLAS`, `AVISO`), date, author, and description.
  - `Reglas`: Accordion / structured guide on PVP, Airdrops, Ruleta and Voice Chat.
  - `Horarios`: Visual daily timeline with clock icons and event types.
- Auto-calls `markAllAsRead()` when modal opens.

- [ ] **Step 2: Verify component build**

Run: `npm run build`  
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/news/EventNewsModal.tsx
git commit -m "feat(ui): create glassmorphic EventNewsModal with news feed, rules, and schedule tabs"
```

---

### Task 5: Header Navigation & Settings Integration

**Files:**
- Modify: `src/components/settings/SettingsModal.tsx`
- Modify: `src/App.tsx`
- Modify: `src/hooks/useTauriIpc.ts`

**Interfaces:**
- Consumes: `EventNewsModal`, `useNewsStore`, `update_discord_rpc_status`

- [ ] **Step 1: Add Discord RPC toggle in `SettingsModal.tsx`**

- Add switch for "Activar Discord Rich Presence" under the launcher options.
- On change, calls Tauri command `update_discord_rpc_status` to toggle RPC in real-time.

- [ ] **Step 2: Add Bell button in `App.tsx` header with unread badge animation**

- Add `<button>` next to Terminal and Settings with `<Bell className="w-4 h-4" />`.
- Show pulsing orange badge if `unreadCount > 0`.
- Mount `<EventNewsModal isOpen={isNewsModalOpen} onClose={closeNewsModal} />`.
- Trigger `fetchRemoteNews()` on `App.tsx` mount.

- [ ] **Step 3: Run comprehensive verification**

Run:
1. `cargo test` in `src-tauri` -> 31+ tests passing.
2. `npm run build` in root -> production bundle generated with zero warnings.

- [ ] **Step 4: Commit**

```bash
git add src/components/settings/SettingsModal.tsx src/App.tsx src/hooks/useTauriIpc.ts
git commit -m "feat(app): integrate event news bell button, unread badge, and Discord RPC settings toggle"
```
