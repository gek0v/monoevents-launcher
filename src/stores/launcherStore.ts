import { create } from 'zustand';
import type {
  LauncherStatus,
  DeltaReport,
  DownloadProgressEvent,
  ModpackManifest,
} from '../types/launcher';

interface LauncherState {
  status: LauncherStatus;
  isSettingsOpen: boolean;
  deltaReport: DeltaReport | null;
  downloadProgress: DownloadProgressEvent | null;
  availableModpacks: ModpackManifest[];
  activeManifest: ModpackManifest | null;
  setStatus: (status: LauncherStatus) => void;
  setSettingsOpen: (open: boolean) => void;
  setDeltaReport: (deltaReport: DeltaReport | null) => void;
  setDownloadProgress: (downloadProgress: DownloadProgressEvent | null) => void;
  setAvailableModpacks: (modpacks: ModpackManifest[]) => void;
  setActiveManifest: (manifest: ModpackManifest | null) => void;
}

export const useLauncherStore = create<LauncherState>((set) => ({
  status: 'UPDATE_MODPACK_REQUIRED',
  isSettingsOpen: false,
  deltaReport: {
    action: 'UPDATE_REQUIRED',
    target_version: '1.2.0',
    current_version: '1.1.0',
    changelog: 'Nuevos mobs de Halloween, eventos climáticos y ruleta global sincronizada.',
    files_to_download: [],
    files_to_delete: [],
    total_download_bytes: 48500000,
  },
  downloadProgress: null,
  availableModpacks: [
    {
      schemaVersion: 1,
      id: 'monoevents-forge-1.20.1',
      name: 'MonoEvents Halloween (1.20.1 Forge)',
      version: '1.2.0',
      minecraft: {
        version: '1.20.1',
        modloader: 'forge',
        modloaderVersion: '47.4.22',
        javaVersion: 17,
      },
      changelog: 'Actualización oficial con Pikmins de supervivencia y airdrops.',
      files: [],
    },
  ],
  activeManifest: null,
  setStatus: (status) => set({ status }),
  setSettingsOpen: (isSettingsOpen) => set({ isSettingsOpen }),
  setDeltaReport: (deltaReport) => set({ deltaReport }),
  setDownloadProgress: (downloadProgress) => set({ downloadProgress }),
  setAvailableModpacks: (availableModpacks) => set({ availableModpacks }),
  setActiveManifest: (activeManifest) => set({ activeManifest }),
}));
