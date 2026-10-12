import { useEffect, useCallback } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import { useLauncherStore } from '../stores/launcherStore';
import type {
  UserSettings,
  DownloadProgressEvent,
  DeltaReport,
  ModpackManifest,
} from '../types/launcher';

interface ProcessEvent {
  state: 'IDLE' | 'LAUNCHING' | 'RUNNING' | 'CRASHED' | 'EXITED';
  exit_code?: number;
  crash_report?: string;
}

// Safe dynamic invoke wrapper that falls back gracefully if running in a standard web browser
async function safeInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T | null> {
  try {
    const tauri = await import('@tauri-apps/api/core');
    return await tauri.invoke<T>(cmd, args);
  } catch (err) {
    console.warn(`[Tauri IPC] ${cmd} failed or running in browser:`, err);
    return null;
  }
}

export function useTauriIpc() {
  const { settings, setSettings } = useSettingsStore();
  const { setStatus, setDownloadProgress, setDeltaReport } = useLauncherStore();

  // 1. Initial settings loading from Rust
  useEffect(() => {
    let isMounted = true;

    async function init() {
      const remoteSettings = await safeInvoke<UserSettings>('get_settings');
      if (remoteSettings && isMounted) {
        setSettings(remoteSettings);
      }
    }

    init();
    return () => {
      isMounted = false;
    };
  }, [setSettings]);

  // 2. Listen to real-time download-progress and game-status events
  useEffect(() => {
    let unlistenDownload: (() => void) | null = null;
    let unlistenGame: (() => void) | null = null;

    async function setupListeners() {
      try {
        const { listen } = await import('@tauri-apps/api/event');
        unlistenDownload = await listen<DownloadProgressEvent>('download-progress', (event) => {
          setDownloadProgress(event.payload);
        });

        unlistenGame = await listen<ProcessEvent>('game-status', (event) => {
          const { state, exit_code } = event.payload;
          if (state === 'RUNNING') {
            setStatus('RUNNING');
          } else if (state === 'EXITED') {
            setStatus('READY');
          } else if (state === 'CRASHED') {
            setStatus('READY');
            alert(`Minecraft se cerró inesperadamente (Código de salida: ${exit_code ?? 'desconocido'}). Revisa launcher.log para más detalles.`);
          }
        });
      } catch (err) {
        console.warn('[Tauri Event] Could not setup event listeners:', err);
      }
    }

    setupListeners();

    return () => {
      if (unlistenDownload) unlistenDownload();
      if (unlistenGame) unlistenGame();
    };
  }, [setDownloadProgress, setStatus]);

  // 3. Save settings to Rust
  const persistSettings = useCallback(
    async (updated: UserSettings) => {
      await safeInvoke('save_user_settings', { settings: updated });
    },
    []
  );

  // 4. Fetch remote manifest
  const fetchRemoteModpack = useCallback(
    async (url: string): Promise<ModpackManifest | null> => {
      return await safeInvoke<ModpackManifest>('fetch_remote_manifest', { url });
    },
    []
  );

  // 5. Check for modpack updates
  const checkForUpdates = useCallback(
    async (manifest: ModpackManifest, instancePath: string) => {
      const manifestStr = JSON.stringify(manifest);
      const report = await safeInvoke<DeltaReport>('check_modpack_delta', {
        manifestJson: manifestStr,
        instancePath,
        installedVersion: null,
      });

      if (report) {
        setDeltaReport(report);
        if (report.action === 'UPDATE_REQUIRED') {
          setStatus('UPDATE_MODPACK_REQUIRED');
        } else {
          setStatus('READY');
        }
      }
    },
    [setDeltaReport, setStatus]
  );

  // 6. Trigger full sync
  const startModpackSync = useCallback(
    async (manifest: ModpackManifest, instancePath: string) => {
      setStatus('DOWNLOADING');
      const manifestStr = JSON.stringify(manifest);

      const result = await safeInvoke('sync_modpack', {
        manifestJson: manifestStr,
        instancePath,
      });

      if (result !== null) {
        setStatus('READY');
        setDownloadProgress(null);
      } else {
        // Mock fallback simulation for dev browser preview
        let progress = 0;
        const interval = setInterval(() => {
          progress += 10;
          setDownloadProgress({
            current_file: 'mods/mono_events-1.20.1.jar',
            downloaded_bytes: progress * 654321,
            total_bytes: 6543210,
            percentage: progress,
            speed_mbps: 4.85,
          });

          if (progress >= 100) {
            clearInterval(interval);
            setStatus('READY');
            setDownloadProgress(null);
          }
        }, 150);
      }
    },
    [setStatus, setDownloadProgress]
  );

  // 7. Launch game process
  const launchMinecraftGame = useCallback(
    async (modpackId: string) => {
      setStatus('LAUNCHING');
      const pid = await safeInvoke<number>('launch_game', { modpackId });
      if (pid) {
        setStatus('RUNNING');
      } else {
        // Fallback for browser preview
        setTimeout(() => {
          setStatus('RUNNING');
          setTimeout(() => setStatus('READY'), 3000);
        }, 1000);
      }
    },
    [setStatus]
  );

  return {
    persistSettings,
    fetchRemoteModpack,
    checkForUpdates,
    startModpackSync,
    launchMinecraftGame,
  };
}
