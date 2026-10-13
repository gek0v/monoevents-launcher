import React from 'react';
import {
  Play,
  RefreshCw,
  HardDrive,
  ShieldCheck,
  User,
  Loader2,
  Cpu,
} from 'lucide-react';
import { useLauncherStore } from '../../stores/launcherStore';
import { useSettingsStore } from '../../stores/settingsStore';

interface PlayBarProps {
  onPlay: () => void;
  onUpdate: () => void;
}

export const PlayBar: React.FC<PlayBarProps> = ({ onPlay, onUpdate }) => {
  const { status, downloadProgress, setSettingsOpen } = useLauncherStore();
  const { settings } = useSettingsStore();

  const isDownloading = status === 'DOWNLOADING';
  const isUpdateRequired =
    status === 'UPDATE_MODPACK_REQUIRED' || status === 'UPDATE_LAUNCHER_REQUIRED';
  const isReady = status === 'READY';
  const isRunning = status === 'RUNNING';
  const isLaunching = status === 'LAUNCHING';

  const isMicrosoft = settings.active_account?.session_type === 'microsoft';

  return (
    <footer className="w-full bg-slate-950/80 backdrop-blur-2xl border-t border-white/10 px-8 py-4 flex items-center justify-between relative shadow-2xl shadow-black z-20">
      {/* Information badges on the left */}
      <div className="flex items-center gap-3 text-xs">
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          title="Ver o cambiar cuenta"
          className="flex items-center gap-2 bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 px-3.5 py-2 rounded-xl transition-all hover:border-orange-500/40 group shadow-sm"
        >
          <div
            className={`w-2 h-2 rounded-full ${
              isMicrosoft ? 'bg-emerald-400 shadow-sm shadow-emerald-400/80' : 'bg-orange-400'
            }`}
          />
          <User className="w-3.5 h-3.5 text-slate-300 group-hover:text-white transition-colors" />
          <span className="text-slate-200 font-bold group-hover:text-white transition-colors">
            {settings.active_account?.username || 'GekoPlayer'}
          </span>
          <span className="text-[10px] uppercase font-semibold text-slate-400 font-mono">
            {isMicrosoft ? 'MSA' : 'OFFLINE'}
          </span>
        </button>

        <div className="hidden md:flex items-center gap-2 bg-white/[0.04] border border-white/10 px-3 py-2 rounded-xl text-slate-300">
          <Cpu className="w-3.5 h-3.5 text-orange-400" />
          <span className="font-medium text-[11px]">
            RAM: <strong className="text-white font-mono">{settings.allocated_ram_gb} GB</strong>
          </span>
        </div>

        <div className="hidden lg:flex items-center gap-2 bg-white/[0.04] border border-white/10 px-3 py-2 rounded-xl text-slate-300">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-medium text-[11px]">Forge 1.20.1</span>
        </div>
      </div>

      {/* Center download progress bar if active */}
      {isDownloading && downloadProgress && (
        <div className="flex-1 max-w-md mx-6 flex flex-col gap-1.5 animate-fade-in">
          <div className="flex items-center justify-between text-[11px] text-slate-200">
            <span className="truncate max-w-[220px] font-mono text-slate-300">
              {downloadProgress.current_file}
            </span>
            <span className="font-mono text-orange-400 font-bold">
              {downloadProgress.percentage.toFixed(1)}% ({downloadProgress.speed_mbps.toFixed(2)} MB/s)
            </span>
          </div>
          <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden border border-white/15 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-orange-600 via-amber-500 to-orange-400 rounded-full transition-all duration-150 shadow-md shadow-orange-500/50"
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
            className="flex items-center gap-2.5 px-8 py-3.5 rounded-2xl bg-slate-900/90 border border-orange-500/30 text-orange-300 font-bold text-sm tracking-wide cursor-not-allowed shadow-xl shadow-black/60"
          >
            <Loader2 className="w-5 h-5 animate-spin text-orange-400" />
            Descargando Modpack...
          </button>
        ) : isUpdateRequired ? (
          <button
            type="button"
            onClick={onUpdate}
            className="group flex items-center gap-3 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-extrabold text-sm tracking-wide shadow-2xl shadow-orange-600/40 transition-all hover:scale-105 active:scale-95 border border-orange-400/40"
          >
            <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
            ACTUALIZAR MODPACK
          </button>
        ) : isLaunching ? (
          <button
            disabled
            className="flex items-center gap-2.5 px-8 py-3.5 rounded-2xl bg-slate-900 border border-emerald-500/30 text-slate-200 font-bold text-sm cursor-not-allowed shadow-xl"
          >
            <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
            Iniciando Minecraft...
          </button>
        ) : isRunning ? (
          <button
            disabled
            className="flex items-center gap-2.5 px-8 py-3.5 rounded-2xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 font-bold text-sm cursor-not-allowed shadow-xl shadow-emerald-950/50"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            En Partida
          </button>
        ) : isReady ? (
          <button
            type="button"
            onClick={onPlay}
            className="group relative flex items-center gap-3 px-10 py-3.5 rounded-2xl bg-gradient-to-r from-orange-600 via-amber-500 to-orange-500 hover:from-orange-500 hover:to-amber-400 text-white font-black text-sm tracking-widest shadow-2xl shadow-orange-600/40 transition-all hover:scale-105 active:scale-95 border border-orange-300/40"
          >
            <Play className="w-4 h-4 fill-current group-hover:translate-x-0.5 transition-transform" />
            <span>JUGAR</span>
          </button>
        ) : null}
      </div>
    </footer>
  );
};
