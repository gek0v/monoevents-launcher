import { create } from 'zustand';
import type { GraphicsState } from '../types/launcher';

interface ShadersState {
  graphicsState: GraphicsState | null;
  isLoading: boolean;
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  setGraphicsState: (state: GraphicsState | null) => void;
  setIsLoading: (loading: boolean) => void;
}

export const useShadersStore = create<ShadersState>((set) => ({
  graphicsState: null,
  isLoading: false,
  isModalOpen: false,
  openModal: () => set({ isModalOpen: true }),
  closeModal: () => set({ isModalOpen: false }),
  setGraphicsState: (graphicsState) => set({ graphicsState }),
  setIsLoading: (isLoading) => set({ isLoading }),
}));
