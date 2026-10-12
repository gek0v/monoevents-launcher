import React, { useState } from 'react';
import { Settings, Play, RefreshCw, AlertTriangle, ShieldCheck, HardDrive } from 'lucide-react';
import type { LauncherStatus } from './types/launcher';

export default function App() {
  const [status, setStatus] = useState<LauncherStatus>('UPDATE_MODPACK_REQUIRED');
  const [selectedModpack] = useState('monoevents-forge-1.20.1');
  const [ramGb] = useState(6);

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 select-none">
      {/* Header bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-orange-600/30">
            M
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-wide text-slate-200">MonoEvents Launcher</h1>
            <p className="text-xs text-orange-400 font-medium">Halloween Edition • 1.20.1 Forge</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/50 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-slate-300 font-medium">Modpack v1.2.0</span>
          </div>

          <button
            title="Ajustes"
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 hover:text-white transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-8 flex flex-col justify-between relative overflow-hidden bg-gradient-to-b from-slate-900/40 to-slate-950">
        {/* Update Notification Banner */}
        {status === 'UPDATE_MODPACK_REQUIRED' && (
          <div className="p-4 rounded-xl border border-orange-500/40 bg-orange-950/30 text-orange-200 flex items-center justify-between shadow-xl">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm">Actualización obligatoria disponible</p>
                <p className="text-xs text-orange-300/80">
                  Hay nuevos mods y ajustes de red. Debes actualizar antes de poder jugar.
                </p>
              </div>
            </div>
            <span className="text-xs font-mono bg-orange-900/50 px-2 py-1 rounded text-orange-300 border border-orange-500/30">
              v1.2.0 Requerida
            </span>
          </div>
        )}

        {/* Hero Section */}
        <div className="my-auto max-w-xl">
          <span className="inline-block px-3 py-1 rounded-md text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20 mb-3">
            Servidor Oficial
          </span>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            Noche de Brujas & Ruleta Global
          </h2>
          <p className="text-sm text-slate-400 mt-2 leading-relaxed">
            Descubre los nuevos Pikmins elementales, airdrops en combate y la economía de caramelos de temporada.
          </p>
        </div>

        {/* Bottom Play/Update Bar */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-800/80 bg-slate-950/80">
          <div className="flex items-center gap-6 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-slate-500" />
              <span>RAM Asignada: <strong className="text-slate-200">{ramGb} GB</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Forge 47.4.22</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {status === 'UPDATE_MODPACK_REQUIRED' ? (
              <button
                onClick={() => setStatus('READY')}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-orange-600/30 transition-all hover:scale-105 active:scale-95"
              >
                <RefreshCw className="w-4 h-4 animate-spin-reverse" />
                Actualizar Modpack
              </button>
            ) : (
              <button
                className="flex items-center gap-2 px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-emerald-600/30 transition-all hover:scale-105 active:scale-95"
              >
                <Play className="w-4 h-4 fill-current" />
                JUGAR
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
