import { create } from 'zustand';
import type { LogEntry, CrashReportEvent } from '../types/launcher';

export type LogFilterType = 'ALL' | 'WARN' | 'ERROR';

const MAX_LOG_ENTRIES = 1000;

interface LogsState {
  logs: LogEntry[];
  filter: LogFilterType;
  searchTerm: string;
  autoScroll: boolean;
  lastCrash: CrashReportEvent | null;
  addLog: (entry: LogEntry) => void;
  clearLogs: () => void;
  setFilter: (filter: LogFilterType) => void;
  setSearchTerm: (term: string) => void;
  setAutoScroll: (autoScroll: boolean) => void;
  setCrash: (crash: CrashReportEvent | null) => void;
}

export const useLogsStore = create<LogsState>((set) => ({
  logs: [],
  filter: 'ALL',
  searchTerm: '',
  autoScroll: true,
  lastCrash: null,

  addLog: (entry) =>
    set((state) => {
      const updated =
        state.logs.length >= MAX_LOG_ENTRIES
          ? [...state.logs.slice(state.logs.length - MAX_LOG_ENTRIES + 1), entry]
          : [...state.logs, entry];
      return { logs: updated };
    }),

  clearLogs: () => set({ logs: [], lastCrash: null }),

  setFilter: (filter) => set({ filter }),

  setSearchTerm: (searchTerm) => set({ searchTerm }),

  setAutoScroll: (autoScroll) => set({ autoScroll }),

  setCrash: (lastCrash) => set({ lastCrash }),
}));
