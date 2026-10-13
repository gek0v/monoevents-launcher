import { create } from 'zustand';
import type { UserSettings, UserAccount, SystemMemoryInfo } from '../types/launcher';

interface SettingsState {
  settings: UserSettings;
  systemMemory: SystemMemoryInfo | null;
  setRam: (allocated_ram_gb: number) => void;
  setGameDirectory: (game_directory: string) => void;
  setSelectedModpackId: (selected_modpack_id: string) => void;
  setActiveAccount: (active_account: UserAccount | undefined) => void;
  setCloseLauncherOnStart: (close_launcher_on_start: boolean) => void;
  setEnableDiscordRpc: (enable_discord_rpc: boolean) => void;
  setSettings: (settings: UserSettings) => void;
  setSystemMemory: (systemMemory: SystemMemoryInfo) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: {
    selected_modpack_id: 'monoevents-forge-1.20.1',
    allocated_ram_gb: 6,
    game_directory: 'C:\\Users\\Usuario\\.monoevents',
    active_account: {
      session_type: 'offline',
      username: 'GekoPlayer',
      uuid: 'offline-uuid-geko',
    },
    close_launcher_on_start: true,
    enable_discord_rpc: true,
  },
  systemMemory: null,
  setRam: (allocated_ram_gb) =>
    set((state) => ({ settings: { ...state.settings, allocated_ram_gb } })),
  setGameDirectory: (game_directory) =>
    set((state) => ({ settings: { ...state.settings, game_directory } })),
  setSelectedModpackId: (selected_modpack_id) =>
    set((state) => ({ settings: { ...state.settings, selected_modpack_id } })),
  setActiveAccount: (active_account) =>
    set((state) => ({ settings: { ...state.settings, active_account } })),
  setCloseLauncherOnStart: (close_launcher_on_start) =>
    set((state) => ({ settings: { ...state.settings, close_launcher_on_start } })),
  setEnableDiscordRpc: (enable_discord_rpc) =>
    set((state) => ({ settings: { ...state.settings, enable_discord_rpc } })),
  setSettings: (settings) => set({ settings }),
  setSystemMemory: (systemMemory) => set({ systemMemory }),
}));
