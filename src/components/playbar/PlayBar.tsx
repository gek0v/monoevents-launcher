import React from 'react';
import {
  Play,
  RefreshCw,
  HardDrive,
  ShieldCheck,
  User,
  Download,
  Loader2,
} from 'lucide-react';
import { useLauncherStore } from '../../stores/launcherStore';
import { useSettingsStore } from '../../stores/settingsStore';

interface PlayBarProps {
  onPlay: () => void;
  onUpdate: () => void;
}

export const PlayBar: React.FC<PlayBarProps> = ({ onPlay, onUpdate }) => {
  const { status, downloadProgress } = useLauncherStore();
  const { settings } = useSettingsStore();

  const isDownloading = status === 'DOWNLOADING';
  const isUpdateRequired = status === 'UPDATE_MODPACK_REQUIRED' || status === 'UPDATE_LAUNCHER_REQUIRED';
  const isReady = status === 'READY';
  const isRunning = status === 'RUNNING';
  const isLaunching = status === 'LAUNCHING';

  return (
    <footer className="w-full bg-slate-950/90 border-t border-slate-800/80 px-8 py-5 flex items-center justify-between backdrop-blur-md relative">
      {/* Information badges on the left */}
      <div className="flex items-center gap-5 text-xs text-slate-400">
        <div className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-lg">
          <User className="w-3.5 h-3.5 text-orange-400" />
          <span className="text-slate-300 font-semibold">
            {settings.active_account?.username || 'Sin cuenta'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-lg">
          <HardDrive className="w-3.5 h-3.5 text-slate-400" />
          <span>RAM: <strong className="text-slate-200">{settings.allocated_ram_gb} GB</strong></span>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-lg">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Forge 47.4.22</span>
        </div>
      </div>

      {/* Center download progress bar if active */}
      {isDownloading && downloadProgress && (
        <div className="flex-1 max-w-md mx-6 flex flex-col gap-1.5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between text-[11px] text-slate-300">
            <span className="truncate max-w-[220px] font-mono text-slate-400">
              {downloadProgress.current_file}
            </span>
            <span className="font-mono text-orange-400 font-bold">
              {downloadProgress.percentage.toFixed(1)}% ({downloadProgress.speed_mbps.toFixed(2)} MB/s)
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-850 rounded-full overflow-hidden border border-slate-700/60 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-orange-600 to-amber-500 rounded-full transition-all duration-150 shadow-lg shadow-orange-500/50"
              style={{ width: `${Math.min(100, Math.max(0, downloadProgress.percentage))}%` }}
            />
          </div>
        </div>
      )}

      {/* Main Action Button on the right */}
      <div className="flex items-center gap-3">
        {isDownloading ? (
          <button
            disabled
            className="flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-slate-800 border border-orange-500/40 text-orange-300 font-bold text-sm tracking-wide cursor-not-allowed shadow-lg"
          >
            <Loader2 className="w-5 h-5 animate-spin text-orange-400" />
            Descargando Mods...
          </button>
        ) : isUpdateRequired ? (
          <button
            onClick={onUpdate}
            className="group flex items-center gap-2.5 px-8 py-3.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-extrabold text-sm tracking-wide shadow-xl shadow-orange-600/30 transition-all hover:scale-105 active:scale-95 border border-orange-400/30"
          >
            <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
            ACTUALIZAR MODPACK
          </button>
        ) : isLaunching ? (
          <button
            disabled
            className="flex items-center gap-2.5 px-8 py-3.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-sm cursor-not-allowed"
          >
            <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
            Iniciando Minecraft...
          </button>
        ) : isRunning ? (
          <button
            disabled
            className="flex items-center gap-2.5 px-8 py-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-bold text-sm cursor-not-allowed"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            En Juego
          </button>
        ) : isReady ? (
          <button
            onClick={onPlay}
            className="group flex items-center gap-3 px-10 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm tracking-widest shadow-xl shadow-emerald-600/40 transition-all hover:scale-105 active:scale-95 border border-emerald-400/30"
          >
            <Play className="w-4 h-4 fill-current group-hover:translate-x-0.5 transition-transform" />
            JUGAR
          </button>
        ) : null}
      </div>
    </footer>
  );
};
