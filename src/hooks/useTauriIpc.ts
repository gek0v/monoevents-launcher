import { useEffect, useCallback } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import { useLauncherStore } from '../stores/launcherStore';
import { useLogsStore } from '../stores/logsStore';
import type {
  UserSettings,
  UserAccount,
  SystemMemoryInfo,
  DownloadProgressEvent,
  DeltaReport,
  ModpackManifest,
  DeviceCodeResponse,
  ServerStatus,
  LogEntry,
  CrashReportEvent,
  GraphicsState,
  GraphicsPresetType,
  ShaderpackInfo,
  ModrinthShaderCard,
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

          // Check if Minecraft instance is already active
          const clean = (remoteSettings.game_directory || '').replace(/[/\\]+$/, '');
          const sep = clean.includes('\\') ? '\\' : '/';
          const instancePath = `${clean}${sep}instances${sep}${remoteSettings.selected_modpack_id}`;
          safeInvoke<boolean>('check_game_running', { instanceDir: instancePath }).then((isRunning) => {
            if (isRunning && isMounted) {
              setStatus('RUNNING');
            }
          });
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

  // 2. Listen to real-time download-progress, game-status, game-log and game-crash events
  useEffect(() => {
    let unlistenDownload: (() => void) | null = null;
    let unlistenGame: (() => void) | null = null;
    let unlistenLogs: (() => void) | null = null;
    let unlistenCrash: (() => void) | null = null;

    async function setupListeners() {
      if (!isTauriEnvironment()) return;

      try {
        const { listen } = await import('@tauri-apps/api/event');
        unlistenDownload = await listen<DownloadProgressEvent>('download-progress', (event) => {
          setDownloadProgress(event.payload);
        });

        unlistenGame = await listen<ProcessEvent>('game-status', (event) => {
          const { state } = event.payload;
          if (state === 'RUNNING') {
            setStatus('RUNNING');
          } else if (state === 'EXITED') {
            setStatus('READY');
          } else if (state === 'CRASHED') {
            setStatus('READY');
          }
        });

        unlistenLogs = await listen<LogEntry>('game-log', (event) => {
          useLogsStore.getState().addLog(event.payload);
        });

        unlistenCrash = await listen<CrashReportEvent>('game-crash', (event) => {
          useLogsStore.getState().setCrash(event.payload);
          useLogsStore.getState().openModal();
        });
      } catch (err) {
        console.warn('[Tauri Event] No se pudieron registrar los listeners:', err);
      }
    }

    setupListeners();

    return () => {
      if (unlistenDownload) unlistenDownload();
      if (unlistenGame) unlistenGame();
      if (unlistenLogs) unlistenLogs();
      if (unlistenCrash) unlistenCrash();
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
    async (manifest: ModpackManifest, instancePath: string, quickCheck: boolean = true) => {
      try {
        const manifestStr = JSON.stringify(manifest);
        const report = await safeInvoke<DeltaReport>('check_modpack_delta', {
          manifestJson: manifestStr,
          instancePath,
          installedVersion: null,
          quickCheck,
        });

        if (report) {
          setDeltaReport(report);
          if (report.action === 'UPDATE_REQUIRED') {
            setStatus('UPDATE_MODPACK_REQUIRED');
          } else {
            const currentStatus = useLauncherStore.getState().status;
            if (currentStatus !== 'RUNNING' && currentStatus !== 'LAUNCHING') {
              setStatus('READY');
            }
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

  // 13. Real Minecraft Server Status Check
  const checkServerStatus = useCallback(
    async (host: string, port?: number): Promise<ServerStatus> => {
      try {
        if (isTauriEnvironment()) {
          const res = await safeInvoke<ServerStatus>('check_server_status', { host, port });
          if (res) return res;
        } else {
          // Dev mock query using mcstatus API
          const response = await fetch(
            `https://api.mcstatus.io/v2/status/java/${host}:${port ?? 25565}`
          );
          if (response.ok) {
            const data = await response.json();
            return {
              online: data.online ?? false,
              host,
              port: port ?? 25565,
              players_online: data.players?.online,
              players_max: data.players?.max,
            };
          }
        }
      } catch (err) {
        console.warn('Error checking server status:', err);
      }
      return {
        online: false,
        host,
        port: port ?? 25565,
      };
    },
    []
  );

  const updateDiscordRpcStatus = useCallback(async (enabled: boolean): Promise<void> => {
    try {
      await safeInvoke('update_discord_rpc_status', { enabled });
    } catch (err) {
      console.warn('Error updating Discord RPC status:', err);
    }
  }, []);

  const getGraphicsState = useCallback(async (instancePath: string): Promise<GraphicsState | null> => {
    try {
      if (isTauriEnvironment()) {
        return await safeInvoke<GraphicsState>('get_graphics_state', { instancePath });
      }
      return {
        active_preset: 'balanced',
        active_shader: 'ComplementaryReimagined.zip',
        shaders_enabled: true,
        render_distance: 12,
        particles: 1,
        graphics_mode: 1,
        available_shaders: [
          { name: 'Complementary Reimagined', filename: 'ComplementaryReimagined.zip', is_active: true, size_mb: 4.8 },
          { name: 'MakeUp UltraFast', filename: 'MakeUp-UltraFast.zip', is_active: false, size_mb: 2.1 },
        ],
      };
    } catch (err) {
      console.warn('Error al obtener estado gráfico:', err);
      return null;
    }
  }, []);

  const setActiveShaderpack = useCallback(
    async (instancePath: string, shaderFilename: string | null): Promise<void> => {
      try {
        await safeInvoke('set_active_shaderpack', { instancePath, shaderFilename });
      } catch (err) {
        console.warn('Error al cambiar shaderpack:', err);
      }
    },
    []
  );

  const applyGraphicsPreset = useCallback(
    async (instancePath: string, presetId: string): Promise<GraphicsState | null> => {
      try {
        if (isTauriEnvironment()) {
          return await safeInvoke<GraphicsState>('apply_graphics_preset', { instancePath, presetId });
        }
        return {
          active_preset: presetId as GraphicsPresetType,
          active_shader: presetId === 'pvp' ? null : 'ComplementaryReimagined.zip',
          shaders_enabled: presetId !== 'pvp',
          render_distance: presetId === 'pvp' ? 8 : presetId === 'balanced' ? 12 : 16,
          particles: presetId === 'pvp' ? 2 : presetId === 'balanced' ? 1 : 0,
          graphics_mode: presetId === 'pvp' ? 0 : 1,
          available_shaders: [
            { name: 'Complementary Reimagined', filename: 'ComplementaryReimagined.zip', is_active: presetId !== 'pvp', size_mb: 4.8 },
            { name: 'MakeUp UltraFast', filename: 'MakeUp-UltraFast.zip', is_active: false, size_mb: 2.1 },
          ],
        };
      } catch (err) {
        console.warn('Error al aplicar preset gráfico:', err);
        return null;
      }
    },
    []
  );

  const openShaderpacksFolder = useCallback(async (instancePath: string): Promise<void> => {
    try {
      await safeInvoke('open_shaderpacks_folder', { instancePath });
    } catch (err) {
      console.warn('Error al abrir carpeta shaderpacks:', err);
    }
  }, []);

  const searchModrinthShaders = useCallback(
    async (
      instancePath: string,
      query: string,
      sortBy: string = 'downloads',
      offset: number = 0,
      limit: number = 20,
      gameVersion: string = '1.20.1'
    ): Promise<ModrinthShaderCard[]> => {
      try {
        if (isTauriEnvironment()) {
          const res = await safeInvoke<ModrinthShaderCard[]>('search_modrinth_shaders', {
            instancePath,
            query,
            sortBy,
            offset,
            limit,
            gameVersion,
          });
          return res ?? [];
        }
        // Browser fallback mocks for dev
        return [
          {
            project_id: 'izsIPI7a',
            slug: 'makeup-ultra-fast-shaders',
            title: 'MakeUp - Ultra Fast',
            description: 'MakeUp aims to provide the best quality / performance ratio.',
            author: 'KDXavier',
            icon_url: 'https://cdn.modrinth.com/data/izsIPI7a/a08432baa86b8ffd58c08f4b3a001ef976ff764d_96.webp',
            featured_gallery: 'https://cdn.modrinth.com/data/izsIPI7a/images/97776ad4f19f734243dbb301feaf81c327bae96b_350.webp',
            downloads: 13590000,
            categories: ['potato', 'low', 'iris'],
            performance_tier: 'low',
            is_installed: false,
          },
          {
            project_id: 'R6NEzAwj',
            slug: 'complementary-reimagined',
            title: 'Complementary Reimagined',
            description: 'An exceptional shaderpack tailored for immersive gameplay and style.',
            author: 'EminGT',
            icon_url: 'https://cdn.modrinth.com/data/R6NEzAwj/icon.png',
            featured_gallery: 'https://cdn.modrinth.com/data/R6NEzAwj/images/a5a420ab1668bcfe47a76a812eede7056c45fe31_350.webp',
            downloads: 18200000,
            categories: ['medium', 'iris', 'semi-realistic'],
            performance_tier: 'medium',
            is_installed: true,
          },
          {
            project_id: 'kmwfVOoi',
            slug: 'rethinking-voxels',
            title: 'Rethinking Voxels',
            description: 'A gameplay shaderpack with coloured block light and sharp shadows.',
            author: 'gri573',
            icon_url: 'https://cdn.modrinth.com/data/kmwfVOoi/fc89eadad417dd376b14c3b31e1a2b87acaca034_96.webp',
            featured_gallery: 'https://cdn.modrinth.com/data/kmwfVOoi/images/c2de214a7981a9b0235b46209507eb9c0b225ddc_350.webp',
            downloads: 13500000,
            categories: ['high', 'iris', 'colored-lighting'],
            performance_tier: 'high',
            is_installed: false,
          },
        ];
      } catch (err) {
        console.warn('Error al buscar shaders en Modrinth:', err);
        return [];
      }
    },
    []
  );

  const downloadModrinthShader = useCallback(
    async (
      instancePath: string,
      projectId: string,
      gameVersion: string = '1.20.1'
    ): Promise<ShaderpackInfo | null> => {
      try {
        if (isTauriEnvironment()) {
          return await safeInvoke<ShaderpackInfo>('download_modrinth_shader', {
            instancePath,
            projectId,
            gameVersion,
          });
        }
        return {
          name: 'MakeUp-UltraFast-8.8f',
          filename: 'MakeUp-UltraFast-8.8f.zip',
          is_active: false,
          size_mb: 2.1,
        };
      } catch (err) {
        console.warn('Error al descargar shader desde Modrinth:', err);
        throw err;
      }
    },
    []
  );

  const deleteShaderpack = useCallback(
    async (instancePath: string, filename: string): Promise<GraphicsState | null> => {
      try {
        if (isTauriEnvironment()) {
          return await safeInvoke<GraphicsState>('delete_shaderpack', { instancePath, filename });
        }
        return {
          active_preset: 'custom',
          active_shader: null,
          shaders_enabled: false,
          render_distance: 12,
          particles: 1,
          graphics_mode: 1,
          available_shaders: [],
        };
      } catch (err) {
        console.warn('Error al eliminar shaderpack:', err);
        return null;
      }
    },
    []
  );

  const checkGameRunning = useCallback(
    async (instancePath: string): Promise<boolean> => {
      try {
        if (isTauriEnvironment()) {
          const isRunning = await safeInvoke<boolean>('check_game_running', {
            instanceDir: instancePath,
          });
          if (isRunning) {
            setStatus('RUNNING');
            return true;
          }
          return false;
        }
        return false;
      } catch (err) {
        console.warn('Error checking if game is running:', err);
        return false;
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
    checkGameRunning,
    createOfflineUser,
    getSystemMemory,
    selectGameDirectory,
    openDirectoryInExplorer,
    openExternalUrl,
    startMicrosoftLogin,
    pollMicrosoftLogin,
    checkServerStatus,
    updateDiscordRpcStatus,
    getGraphicsState,
    setActiveShaderpack,
    applyGraphicsPreset,
    openShaderpacksFolder,
    deleteShaderpack,
    searchModrinthShaders,
    downloadModrinthShader,
  };
}
