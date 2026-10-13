import { create } from 'zustand';
import type { GraphicsState, ModrinthShaderCard, ShaderPerformanceTier } from '../types/launcher';

interface ShadersState {
  graphicsState: GraphicsState | null;
  isLoading: boolean;
  isModalOpen: boolean;
  onlineShaders: ModrinthShaderCard[];
  isSearchingOnline: boolean;
  downloadingProjects: Record<string, boolean>;
  searchQuery: string;
  selectedTierFilter: 'all' | ShaderPerformanceTier;
  openModal: () => void;
  closeModal: () => void;
  setGraphicsState: (state: GraphicsState | null) => void;
  setIsLoading: (loading: boolean) => void;
  setOnlineShaders: (shaders: ModrinthShaderCard[]) => void;
  setIsSearchingOnline: (isSearching: boolean) => void;
  setDownloadingProject: (projectId: string, isDownloading: boolean) => void;
  markShaderInstalled: (projectId: string) => void;
  setSearchQuery: (query: string) => void;
  setSelectedTierFilter: (filter: 'all' | ShaderPerformanceTier) => void;
}

export const useShadersStore = create<ShadersState>((set) => ({
  graphicsState: null,
  isLoading: false,
  isModalOpen: false,
  onlineShaders: [],
  isSearchingOnline: false,
  downloadingProjects: {},
  searchQuery: '',
  selectedTierFilter: 'all',
  openModal: () => set({ isModalOpen: true }),
  closeModal: () => set({ isModalOpen: false }),
  setGraphicsState: (graphicsState) => set({ graphicsState }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setOnlineShaders: (onlineShaders) => set({ onlineShaders }),
  setIsSearchingOnline: (isSearchingOnline) => set({ isSearchingOnline }),
  setDownloadingProject: (projectId, isDownloading) =>
    set((state) => ({
      downloadingProjects: {
        ...state.downloadingProjects,
        [projectId]: isDownloading,
      },
    })),
  markShaderInstalled: (projectId) =>
    set((state) => ({
      onlineShaders: state.onlineShaders.map((s) =>
        s.project_id === projectId ? { ...s, is_installed: true } : s
      ),
    })),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSelectedTierFilter: (selectedTierFilter) => set({ selectedTierFilter }),
}));

