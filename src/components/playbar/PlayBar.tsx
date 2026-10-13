import React from 'react';
import {
  Play,
  RefreshCw,
  HardDrive,
  ShieldCheck,
  User,
  Loader2,
  Cpu,
  Globe,
  ExternalLink,
} from 'lucide-react';
import { useLauncherStore } from '../../stores/launcherStore';
import { useSettingsStore } from '../../stores/settingsStore';

interface PlayBarProps {
  onPlay: () => void;
  onUpdate: () => void;
  onOpenWeb?: () => void;
}

export const PlayBar: React.FC<PlayBarProps> = ({ onPlay, onUpdate, onOpenWeb }) => {
  const { status, setSettingsOpen } = useLauncherStore();
  const { settings } = useSettingsStore();

  const isDownloading = status === 'DOWNLOADING';
  const isUpdateRequired =
    status === 'UPDATE_MODPACK_REQUIRED' || status === 'UPDATE_LAUNCHER_REQUIRED';
  const isReady = status === 'READY';
  const isRunning = status === 'RUNNING';
  const isLaunching = status === 'LAUNCHING';

  const isMicrosoft = settings.active_account?.session_type === 'microsoft';

  return (
    <footer className="w-full bg-slate-950/80 backdrop-blur-2xl border-t border-white/10 px-8 py-4 flex items-center justify-between relative shadow-2xl shadow-black z-20 shrink-0 select-none">
      {/* Information badges on the left */}
      <div className="flex items-center gap-3 text-xs shrink-0">
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          title="Ver o cambiar cuenta"
          className="flex items-center gap-2 bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 px-3.5 py-2 rounded-xl transition-all hover:border-orange-500/40 group shadow-sm shrink-0"
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

        <div className="hidden md:flex items-center gap-2 bg-white/[0.04] border border-white/10 px-3 py-2 rounded-xl text-slate-300 shrink-0 whitespace-nowrap">
          <Cpu className="w-3.5 h-3.5 text-orange-400" />
          <span className="font-medium text-[11px]">
            RAM: <strong className="text-white font-mono">{settings.allocated_ram_gb} GB</strong>
          </span>
        </div>

        <div className="hidden lg:flex items-center gap-2 bg-white/[0.04] border border-white/10 px-3 py-2 rounded-xl text-slate-300 shrink-0 whitespace-nowrap">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-medium text-[11px]">Forge 1.20.1</span>
        </div>

        {/* Official Website Link */}
        <button
          type="button"
          onClick={() => {
            if (onOpenWeb) {
              onOpenWeb();
            } else {
              window.open('https://mc-gko.vercel.app', '_blank', 'noopener,noreferrer');
            }
          }}
          title="Visitar web oficial de MonoCraft (mc-gko.vercel.app)"
          className="hidden sm:flex items-center gap-2 bg-white/[0.04] hover:bg-orange-500/10 border border-white/10 hover:border-orange-500/30 px-3 py-2 rounded-xl text-slate-300 hover:text-orange-300 transition-all group shadow-sm active:scale-95 shrink-0 whitespace-nowrap"
        >
          <Globe className="w-3.5 h-3.5 text-orange-400 group-hover:rotate-12 transition-transform duration-300" />
          <span className="font-medium text-[11px] text-slate-300 group-hover:text-orange-200">
            mc-gko.vercel.app
          </span>
          <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-orange-400 transition-colors" />
        </button>
      </div>

      {/* Main Action Button on the right */}
      <div className="flex items-center gap-3 shrink-0">
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
            className="group relative flex items-center gap-3 px-10 py-3.5 rounded-2xl bg-gradient-to-r from-orange-600 via-amber-500 to-rose-600 hover:from-orange-500 hover:via-amber-400 hover:to-rose-500 text-white font-black text-sm tracking-widest uppercase shadow-xl shadow-orange-600/40 hover:shadow-2xl hover:shadow-orange-500/60 border border-orange-200/40 hover:border-white/60 transition-all duration-300 hover:scale-105 active:scale-95 active:translate-y-0.5 overflow-hidden"
          >
            {/* Dynamic shine sweep overlay */}
            <span
              aria-hidden="true"
              className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none"
            />
            <Play className="w-4 h-4 fill-current drop-shadow group-hover:scale-110 group-hover:translate-x-0.5 transition-transform" />
            <span className="relative z-10 drop-shadow-sm">JUGAR</span>
          </button>
        ) : null}
      </div>
    </footer>
  );
};
