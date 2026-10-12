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

import { DEFAULT_MODPACK } from '../data/defaultModpack';

export const useLauncherStore = create<LauncherState>((set) => ({
  status: 'UPDATE_MODPACK_REQUIRED',
  isSettingsOpen: false,
  deltaReport: {
    action: 'UPDATE_REQUIRED',
    target_version: '1.2.0',
    current_version: '1.1.0',
    changelog: 'Nuevos mobs de Halloween, eventos climáticos y ruleta global sincronizada.',
    files_to_download: DEFAULT_MODPACK.files,
    files_to_delete: [],
    total_download_bytes: DEFAULT_MODPACK.files.reduce((acc, f) => acc + f.size, 0),
  },
  downloadProgress: null,
  availableModpacks: [DEFAULT_MODPACK],
  activeManifest: DEFAULT_MODPACK,
  setStatus: (status) => set({ status }),
  setSettingsOpen: (isSettingsOpen) => set({ isSettingsOpen }),
  setDeltaReport: (deltaReport) => set({ deltaReport }),
  setDownloadProgress: (downloadProgress) => set({ downloadProgress }),
  setAvailableModpacks: (availableModpacks) => set({ availableModpacks }),
  setActiveManifest: (activeManifest) => set({ activeManifest }),
}));
