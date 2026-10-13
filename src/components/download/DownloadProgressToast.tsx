import React from 'react';
import { Loader2 } from 'lucide-react';
import { useLauncherStore } from '../../stores/launcherStore';

export const DownloadProgressToast: React.FC = () => {
  const { status, downloadProgress } = useLauncherStore();

  const isDownloading = status === 'DOWNLOADING';

  if (!isDownloading || !downloadProgress) {
    return null;
  }

  // Clean filename without leading folders for clean readability
  const cleanFilename = downloadProgress.current_file.replace(/^mods[/\\]/, '');

  return (
    <div
      role="status"
      aria-live="polite"
      className="absolute bottom-[136px] right-6 z-30 w-80 max-w-[calc(100vw-3rem)] bg-slate-950/90 backdrop-blur-2xl border border-orange-500/40 rounded-2xl p-3.5 shadow-2xl shadow-black/90 animate-fade-in transition-all duration-300"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 shrink-0">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          </div>
          <span className="text-xs font-bold text-white tracking-wide truncate">
            Descargando Modpack...
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] font-mono font-bold text-orange-400 bg-orange-950/70 border border-orange-500/40 px-2 py-0.5 rounded-lg">
            {downloadProgress.percentage.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Current File and Speed */}
      <div className="flex items-center justify-between gap-2 text-[11px] mb-2 font-mono">
        <span
          className="text-slate-300 truncate max-w-[190px]"
          title={downloadProgress.current_file}
        >
          {cleanFilename}
        </span>
        <span className="text-amber-400/90 font-semibold shrink-0">
          {downloadProgress.speed_mbps.toFixed(2)} MB/s
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-black/60 rounded-full overflow-hidden border border-white/10 shadow-inner">
        <div
          className="h-full bg-gradient-to-r from-orange-600 via-amber-500 to-orange-400 rounded-full transition-all duration-150 shadow-md shadow-orange-500/50"
          style={{ width: `${Math.min(100, Math.max(0, downloadProgress.percentage))}%` }}
        />
      </div>
    </div>
  );
};
