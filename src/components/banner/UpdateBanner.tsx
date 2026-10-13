import React from 'react';
import { AlertTriangle, Sparkles } from 'lucide-react';
import { useLauncherStore } from '../../stores/launcherStore';

export const UpdateBanner: React.FC = () => {
  const { status, deltaReport } = useLauncherStore();

  if (status !== 'UPDATE_MODPACK_REQUIRED' && status !== 'UPDATE_LAUNCHER_REQUIRED') {
    return null;
  }

  const isLauncherUpdate = status === 'UPDATE_LAUNCHER_REQUIRED';
  const targetVersion = deltaReport?.target_version || '1.0.0';
  const changelog = deltaReport?.changelog || 'Actualización requerida con sincronización delta de archivos.';

  return (
    <div className="w-full rounded-2xl border border-orange-500/40 bg-slate-950/80 backdrop-blur-xl p-4 shadow-2xl text-orange-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-fade-in">
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-xl bg-orange-500/20 text-orange-400 flex-shrink-0 mt-0.5 border border-orange-500/30">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white tracking-wide">
              {isLauncherUpdate ? 'Nueva Versión del Launcher Requerida' : 'Actualización de Mods Requerida'}
            </h3>
            <span className="text-[11px] font-mono bg-orange-500/20 text-orange-300 border border-orange-500/40 px-2.5 py-0.5 rounded-full font-bold">
              v{targetVersion}
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-1 flex items-center gap-1.5 leading-relaxed">
            <Sparkles className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
            {changelog}
          </p>
          <p className="text-[11px] text-orange-400/90 font-medium mt-1">
            Se requiere sincronizar antes de iniciar partida para garantizar compatibilidad con el servidor.
          </p>
        </div>
      </div>
    </div>
  );
};
