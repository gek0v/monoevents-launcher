import { useEffect, useCallback } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import { useLauncherStore } from '../stores/launcherStore';
import type {
  UserSettings,
  UserAccount,
  SystemMemoryInfo,
  DownloadProgressEvent,
  DeltaReport,
  ModpackManifest,
  DeviceCodeResponse,
} from '../types/launcher';

interface ProcessEvent {
  state: 'IDLE' | 'LAUNCHING' | 'RUNNING' | 'CRASHED' | 'EXITED';
  exit_code?: number;
  crash_report?: string;
}

export function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export async function showErrorMessage(title: string, msg: string) {
  try {
    const dialog = await import('@tauri-apps/plugin-dialog');
    await dialog.message(msg, { title, kind: 'error' });
  } catch {
    alert(`${title}: ${msg}`);
  }
}

// Safe dynamic invoke wrapper with native error propagation in Tauri and mock fallback in browser
async function safeInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T | null> {
  try {
    const tauri = await import('@tauri-apps/api/core');
    return await tauri.invoke<T>(cmd, args);
  } catch (err) {
    if (isTauriEnvironment()) {
      console.error(`[Tauri IPC Error] ${cmd}:`, err);
      throw err;
    }
    console.warn(`[Browser Mock Fallback] ${cmd}:`, err);
    return null;
  }
}

export function useTauriIpc() {
  const { settings, setSettings, setSystemMemory } = useSettingsStore();
  const { setStatus, setDownloadProgress, setDeltaReport } = useLauncherStore();

  // 1. Initial settings and system memory loading from Rust
  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        const [remoteSettings, sysMem] = await Promise.all([
          safeInvoke<UserSettings>('get_settings'),
          safeInvoke<SystemMemoryInfo>('get_system_memory_info'),
        ]);

        if (remoteSettings && isMounted) {
          setSettings(remoteSettings);
        }
        if (sysMem && isMounted) {
          setSystemMemory(sysMem);
        }
      } catch (err) {
        console.warn('Error loading settings or memory from native backend:', err);
      }
    }

    init();
    return () => {
      isMounted = false;
    };
  }, [setSettings, setSystemMemory]);

  // 2. Listen to real-time download-progress and game-status events
  useEffect(() => {
    let unlistenDownload: (() => void) | null = null;
    let unlistenGame: (() => void) | null = null;

    async function setupListeners() {
      if (!isTauriEnvironment()) return;

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
            showErrorMessage(
              'Minecraft Cerrado Inesperadamente',
              `El juego se cerró (Código: ${exit_code ?? 'desconocido'}). Revisa launcher.log en la carpeta de la instancia.`
            );
          }
        });
      } catch (err) {
        console.warn('[Tauri Event] No se pudieron registrar los listeners:', err);
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
      try {
        await safeInvoke('save_user_settings', { settings: updated });
      } catch (err) {
        console.error('Error al guardar ajustes:', err);
      }
    },
    []
  );

  // 4. Fetch remote manifest
  const fetchRemoteModpack = useCallback(
    async (url: string): Promise<ModpackManifest | null> => {
      try {
        return await safeInvoke<ModpackManifest>('fetch_remote_manifest', { url });
      } catch (err) {
        console.error('Error al consultar manifiesto remoto:', err);
        return null;
      }
    },
    []
  );

  // 5. Check for modpack updates
  const checkForUpdates = useCallback(
    async (manifest: ModpackManifest, instancePath: string) => {
      try {
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
          return report;
        }
      } catch (err) {
        console.warn('Error al verificar delta de modpack:', err);
      }
      return null;
    },
    [setDeltaReport, setStatus]
  );

  // 6. Trigger full sync
  const startModpackSync = useCallback(
    async (manifest: ModpackManifest, instancePath: string) => {
      setStatus('DOWNLOADING');
      const manifestStr = JSON.stringify(manifest);

      try {
        if (isTauriEnvironment()) {
          await safeInvoke('sync_modpack', {
            manifestJson: manifestStr,
            instancePath,
          });
          // Re-evaluate delta after sync
          await checkForUpdates(manifest, instancePath);
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
      } catch (err) {
        setStatus('UPDATE_MODPACK_REQUIRED');
        setDownloadProgress(null);
        showErrorMessage(
          'Error de Sincronización',
          `No se pudo completar la sincronización del modpack: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    },
    [setStatus, setDownloadProgress, checkForUpdates]
  );

  // 7. Launch game process
  const launchMinecraftGame = useCallback(
    async (modpackId: string) => {
      setStatus('LAUNCHING');
      try {
        if (isTauriEnvironment()) {
          const pid = await safeInvoke<number>('launch_game', { modpackId });
          if (pid) {
            setStatus('RUNNING');
          }
        } else {
          // Fallback simulation for browser preview
          setTimeout(() => {
            setStatus('RUNNING');
            setTimeout(() => setStatus('READY'), 3000);
          }, 1000);
        }
      } catch (err) {
        setStatus('READY');
        showErrorMessage(
          'Error al Iniciar el Juego',
          `No se pudo iniciar Minecraft: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    },
    [setStatus]
  );

  // 8. Create offline session with valid RFC 4122 v3 UUID
  const createOfflineUser = useCallback(
    async (username: string): Promise<UserAccount | null> => {
      try {
        const session = await safeInvoke<UserAccount>('create_offline_user_session', { username });
        if (session) return session;
      } catch (err) {
        console.warn('Error creating offline user in Rust:', err);
      }
      return {
        session_type: 'offline',
        username,
        uuid: 'offline-uuid-' + username.toLowerCase().replace(/[^a-z0-9]/g, ''),
      };
    },
    []
  );

  // 9. Fetch system memory info
  const getSystemMemory = useCallback(async (): Promise<SystemMemoryInfo | null> => {
    try {
      const mem = await safeInvoke<SystemMemoryInfo>('get_system_memory_info');
      if (mem) {
        setSystemMemory(mem);
        return mem;
      }
    } catch (err) {
      console.warn('Error fetching system memory info:', err);
    }
    return null;
  }, [setSystemMemory]);

  // 10. Native folder picker
  const selectGameDirectory = useCallback(async (): Promise<string | null> => {
    try {
      return await safeInvoke<string | null>('pick_game_directory');
    } catch (err) {
      console.warn('Error al seleccionar carpeta:', err);
      return null;
    }
  }, []);

  // 11. Open in Windows Explorer
  const openDirectoryInExplorer = useCallback(async (path: string): Promise<void> => {
    try {
      await safeInvoke('open_directory_in_explorer', { path });
    } catch (err) {
      console.warn('Error al abrir explorador:', err);
    }
  }, []);

  // 12. Microsoft Device Code Flow
  const startMicrosoftLogin = useCallback(async (): Promise<DeviceCodeResponse | null> => {
    try {
      if (isTauriEnvironment()) {
        return await safeInvoke<DeviceCodeResponse>('start_microsoft_device_code');
      } else {
        return {
          user_code: 'DEMO-7890',
          device_code: 'mock-device-code',
          verification_uri: 'https://microsoft.com/link',
          expires_in: 900,
          interval: 5,
          message: 'Modo navegador de prueba.',
        };
      }
    } catch (err) {
      console.error('Error al iniciar Device Code de Microsoft:', err);
      showErrorMessage(
        'Error de Autenticación',
        `No se pudo iniciar la conexión con Microsoft: ${err instanceof Error ? err.message : String(err)}`
      );
      return null;
    }
  }, []);

  const pollMicrosoftLogin = useCallback(
    async (deviceCode: string): Promise<UserAccount | null> => {
      try {
        if (isTauriEnvironment()) {
          return await safeInvoke<UserAccount>('poll_microsoft_device_code', { deviceCode });
        } else {
          await new Promise((r) => setTimeout(r, 2000));
          return {
            session_type: 'microsoft',
            username: 'AlexMsaDev',
            uuid: 'c06f8906-4c8a-4911-9c29-ea1dbd1aab82',
            access_token: 'mock-access-token',
          };
        }
      } catch (err) {
        console.error('Error al esperar autenticación de Microsoft:', err);
        showErrorMessage(
          'Error de Inicio de Sesión',
          `Fallo en la autenticación con Microsoft: ${err instanceof Error ? err.message : String(err)}`
        );
        return null;
      }
    },
    []
  );

  const openExternalUrl = useCallback(async (url: string): Promise<void> => {
    try {
      if (isTauriEnvironment()) {
        await safeInvoke('open_external_url', { url });
      } else {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      console.warn('Error al abrir URL externa:', err);
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }, []);

  return {
    persistSettings,
    fetchRemoteModpack,
    checkForUpdates,
    startModpackSync,
    launchMinecraftGame,
    createOfflineUser,
    getSystemMemory,
    selectGameDirectory,
    openDirectoryInExplorer,
    openExternalUrl,
    startMicrosoftLogin,
    pollMicrosoftLogin,
  };
}
