# Live Logs Console and Crash Diagnostic Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a real-time Minecraft process log streaming console with an automated crash diagnosis engine and a sanitized Discord report generator for MonoEvents launcher.

**Architecture:** Rust backend spawns Java with piped stdout/stderr, streams log lines via Tauri events (`game-log`), retains a circular memory buffer, and runs a diagnostic parser upon exit failure to emit `game-crash`. React frontend consumes events via a Zustand store (`logsStore`), provides a glassmorphic terminal modal (`LogsModal`), auto-opens on crashes, and generates anonymized Discord markdown reports (`crashReporter`).

**Tech Stack:** Rust (Tauri v2, Tokio, std::process), React 18, TypeScript, Zustand, Tailwind CSS, Lucide icons.

**Spec:** `docs/superpowers/specs/2026-10-13-live-logs-and-crash-reporter-design.md`

## Global Constraints
- Target Minecraft: 1.20.1 Forge 47.4.22
- Log buffer ceiling: 1000 entries max in frontend Zustand store to prevent DOM bloat
- Memory buffer ceiling in Rust: 200 lines ring buffer for crash evaluation
- Anonymization: All absolute paths containing `C:\Users\<username>` must replace the username with `***` before outputting Discord reports
- Design theme: Dark glassmorphism (`bg-slate-950/95`) consistent with *Noche de Sangre* palette

## Review Focus
1. High-frequency logging during game startup must not lock the UI thread or cause memory leaks.
2. Graceful exit with code 0 must not trigger crash notifications or open the modal unprompted.
3. Windows user profile directories must never be leaked in Discord markdown exports.
4. Process termination when launcher is closed or backgrounded must cleanly join threads.
5. Missing or empty logs on instant crash must still report the OS exit code and basic system specs.

---

### Task 1: Backend Data Models & Log Streaming Engine

**Files:**
- Create: `src-tauri/src/game/diagnostics.rs`
- Modify: `src-tauri/src/game/mod.rs`
- Modify: `src-tauri/src/game/process_spawner.rs`

**Interfaces:**
- Produces:
  - `pub enum LogLevel { Info, Warn, Error }`
  - `pub struct LogEntry { level: LogLevel, message: String, timestamp_ms: u64 }`
  - `pub struct CrashDiagnostic { title: String, description: String, solution: String }`
  - `pub struct CrashReportEvent { exit_code: i32, diagnostic: Option<CrashDiagnostic>, tail_logs: Vec<String> }`

- [ ] **Step 1: Define models in `src-tauri/src/game/diagnostics.rs` and write unit test for log level parser**

```rust
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, PartialEq)]
pub enum LogLevel {
    Info,
    Warn,
    Error,
}

pub fn parse_log_level(line: &str) -> LogLevel {
    let upper = line.to_uppercase();
    if upper.contains("/ERROR") || upper.contains("FATAL") || upper.contains("EXCEPTION") {
        LogLevel::Error
    } else if upper.contains("/WARN") {
        LogLevel::Warn
    } else {
        LogLevel::Info
    }
}
```

- [ ] **Step 2: Run test to verify it compiles and passes**

Run: `cargo test parse_log_level -- --nocapture` inside `src-tauri`  
Expected: PASS

- [ ] **Step 3: Modify `process_spawner.rs` to pipe stdout and stderr**

In `spawn_minecraft_process`:
- Change `.stdout(Stdio::inherit())` and `.stderr(Stdio::inherit())` to `.stdout(Stdio::piped())` and `.stderr(Stdio::piped())`.
- Spawn reader threads for stdout and stderr using `BufReader::lines()`.
- Emit `"game-log"` event for each line with `LogEntry`.
- Keep a circular buffer of the last 200 lines.

- [ ] **Step 4: Run backend tests to verify no regressions**

Run: `cargo test` inside `src-tauri`  
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/game/diagnostics.rs src-tauri/src/game/mod.rs src-tauri/src/game/process_spawner.rs
git commit -m "feat(game): implement stdout/stderr log piping and LogEntry models in process spawner"
```

---

### Task 2: Crash Diagnosis Engine in Rust

**Files:**
- Modify: `src-tauri/src/game/diagnostics.rs`
- Test: `src-tauri/src/game/diagnostics.rs`

**Interfaces:**
- Consumes: `tail_logs: &[String], exit_code: i32`
- Produces: `pub fn analyze_crash(tail_logs: &[String], exit_code: i32) -> Option<CrashDiagnostic>`

- [ ] **Step 1: Write unit tests for `analyze_crash` covering known failure patterns**

Write tests in `diagnostics.rs`:
- `test_detect_out_of_memory`: recognizes `java.lang.OutOfMemoryError` -> suggests increasing RAM in settings.
- `test_detect_opengl_error`: recognizes `GLFW error 65542` -> suggests GPU driver update.
- `test_detect_java_mismatch`: recognizes `UnsupportedClassVersionError` -> suggests Java 17.
- `test_detect_duplicate_mods`: recognizes `DuplicateModsFoundException` -> suggests deleting duplicate jar.

- [ ] **Step 2: Run test to verify tests fail before implementation**

Run: `cargo test test_detect_out_of_memory` inside `src-tauri`  
Expected: FAIL (function not yet implemented)

- [ ] **Step 3: Implement `analyze_crash` in `src-tauri/src/game/diagnostics.rs`**

Evaluate log text patterns using substring matching against the tail log buffer and return the corresponding `CrashDiagnostic`.

- [ ] **Step 4: Run tests to verify all diagnostic rules pass**

Run: `cargo test diagnostics::tests` inside `src-tauri`  
Expected: All 4 diagnostic tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/game/diagnostics.rs
git commit -m "feat(game): implement automated Minecraft crash diagnostics engine"
```

---

### Task 3: Backend Exit Monitoring & Crash Event Dispatch

**Files:**
- Modify: `src-tauri/src/game/process_spawner.rs`
- Modify: `src-tauri/src/lib.rs`

**Interfaces:**
- Consumes: `analyze_crash` from `diagnostics.rs`
- Produces: Tauri event `"game-crash"` with `CrashReportEvent` and `"game-stopped"` with status code.

- [ ] **Step 1: Connect process exit handler to emit `"game-crash"`**

In the background monitoring thread of `process_spawner.rs`:
- When child process exits, check `exit_status.code()`.
- If code is `Some(0)`: emit `"game-stopped"`.
- If code is `Some(code)` where `code != 0`:
  - Run `analyze_crash(&tail_buffer, code)`.
  - Emit `"game-crash"` with `CrashReportEvent { exit_code: code, diagnostic, tail_logs }`.

- [ ] **Step 2: Run backend tests to verify compilation and safety**

Run: `cargo test` inside `src-tauri`  
Expected: 24+ tests pass.

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/game/process_spawner.rs src-tauri/src/lib.rs
git commit -m "feat(game): emit game-crash and game-stopped events upon Minecraft exit"
```

---

### Task 4: Frontend Log Store & Discord Crash Formatter

**Files:**
- Create: `src/stores/logsStore.ts`
- Create: `src/utils/crashReporter.ts`
- Modify: `src/types/launcher.ts`

**Interfaces:**
- Produces:
  - `useLogsStore`: Zustand store with log retention (max 1000 lines), filters, search, and crash state.
  - `formatDiscordCrashReport(report: CrashReportData): string`: Sanitizes paths and builds formatted Discord Markdown.

- [ ] **Step 1: Add frontend TypeScript types in `src/types/launcher.ts`**

Define `LogEntry`, `LogLevel`, `CrashDiagnostic`, `CrashReportEvent`.

- [ ] **Step 2: Implement `src/utils/crashReporter.ts` with anonymization**

Function `formatDiscordCrashReport` sanitizes username from Windows paths:
- Replace `[A-Za-z]:\\Users\\[^\\]+\\` with `C:\Users\***\`
- Assemble Markdown text block containing system info, exit code, diagnostic summary, and codeblock with the last 30 log lines.

- [ ] **Step 3: Implement `src/stores/logsStore.ts` with 1000-line ceiling**

Zustand store handling:
- `logs: LogEntry[]` with `addLog` capping at 1000 elements.
- `filter: 'ALL' | 'WARN' | 'ERROR'`
- `searchTerm: string`
- `autoScroll: boolean`
- `lastCrash: CrashReportEvent | null`
- Actions: `addLog`, `clearLogs`, `setFilter`, `setSearchTerm`, `setAutoScroll`, `setCrash`.

- [ ] **Step 4: Verify frontend build**

Run: `npm run build`  
Expected: TypeScript passes with zero errors.

- [ ] **Step 5: Commit**

```bash
git add src/types/launcher.ts src/stores/logsStore.ts src/utils/crashReporter.ts
git commit -m "feat(store): add logsStore and Discord sanitized crash reporter utility"
```

---

### Task 5: Live Terminal Modal Component (`LogsModal.tsx`)

**Files:**
- Create: `src/components/logs/LogsModal.tsx`

**Interfaces:**
- Consumes: `useLogsStore`, `useSettingsStore`, `useTauriIpc`
- Produces: `LogsModal` component with interactive filter toolbar, crash diagnostic banner, and copy-to-clipboard button.

- [ ] **Step 1: Create `src/components/logs/LogsModal.tsx` structure**

- Modal overlay with `bg-slate-950/95`, backdrop blur, and border.
- Header with process status badge (`🟢 En ejecución` / `🔴 Cerrado`), filter tabs (`Todos`, `Avisos`, `Errores`), text search input, and close button.
- Diagnostic Alert Banner: Renders when `lastCrash?.diagnostic` is present with alert icon, title, cause description, and direct fix recommendation.
- Virtual/scrollable log body: Displays timestamp, colored tag (`INFO` cyan, `WARN` yellow, `ERROR` crimson), and monospace message.
- Action footer:
  - Toggle Auto-scroll button.
  - Clear logs button.
  - Copy Discord Report button (`📋 Copiar para Discord`) with click animation (`¡Copiado!`).

- [ ] **Step 2: Verify component build and styles**

Run: `npm run build`  
Expected: Passes cleanly.

- [ ] **Step 3: Commit**

```bash
git add src/components/logs/LogsModal.tsx
git commit -m "feat(ui): create glassmorphic live LogsModal component with crash diagnosis banner"
```

---

### Task 6: Integration, IPC Listeners, and Header Navigation

**Files:**
- Modify: `src/hooks/useTauriIpc.ts`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: Tauri events `"game-log"`, `"game-crash"`, `"game-stopped"`
- Connects: Header terminal toggle button in `App.tsx`

- [ ] **Step 1: Register Tauri event listeners in `useTauriIpc.ts`**

Listen for:
- `"game-log"` -> pushes entry to `useLogsStore.getState().addLog(entry)`.
- `"game-crash"` -> calls `useLogsStore.getState().setCrash(payload)` and triggers `onCrash` callback.
- `"game-stopped"` -> updates state.

- [ ] **Step 2: Add Terminal trigger button and auto-open on crash in `src/App.tsx`**

- In `App.tsx` header controls (next to Settings button): Add `<button>` with `<Terminal className="w-4 h-4" />` and tooltip `"Consola de Logs"`.
- If a crash occurs: automatically set `isLogsModalOpen = true`.
- Mount `<LogsModal isOpen={isLogsModalOpen} onClose={() => setIsLogsModalOpen(false)} />`.

- [ ] **Step 3: Run comprehensive verification**

Run:
1. `cargo test` in `src-tauri` -> 23+ tests passing.
2. `npm run build` in root -> bundle generated without warnings.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useTauriIpc.ts src/App.tsx
git commit -m "feat(app): integrate live log listeners, crash auto-modal, and header terminal button"
```
