import React from 'react';
import { Settings, Sparkles, Flame } from 'lucide-react';
import { useLauncherStore } from './stores/launcherStore';
import { useSettingsStore } from './stores/settingsStore';
import { useTauriIpc } from './hooks/useTauriIpc';
import { ModpackSelector } from './components/selector/ModpackSelector';
import { UpdateBanner } from './components/banner/UpdateBanner';
import { PlayBar } from './components/playbar/PlayBar';
import { SettingsModal } from './components/settings/SettingsModal';

export default function App() {
  const { isSettingsOpen, setSettingsOpen, availableModpacks, setStatus } = useLauncherStore();
  const { settings } = useSettingsStore();
  const { persistSettings, startModpackSync, launchMinecraftGame } = useTauriIpc();

  const currentModpack =
    availableModpacks.find((m) => m.id === settings.selected_modpack_id) || availableModpacks[0];

  const handleUpdate = () => {
    if (currentModpack) {
      startModpackSync(currentModpack, settings.game_directory);
    }
  };

  const handlePlay = () => {
    if (currentModpack) {
      launchMinecraftGame(currentModpack.id);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 select-none overflow-hidden font-sans">
      {/* Top Header */}
      <header className="flex items-center justify-between px-6 py-3.5 border-b border-slate-800/80 bg-slate-900/70 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center font-black text-white text-base shadow-lg shadow-orange-600/30">
            M
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wide text-white flex items-center gap-1.5">
              MonoEvents Launcher
              <span className="text-[10px] uppercase font-bold tracking-widest text-orange-400 bg-orange-950/60 border border-orange-500/30 px-1.5 py-0.2 rounded">
                Oficial
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">Minecraft 1.20.1 • Forge 47.4.22</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ModpackSelector />

          <button
            type="button"
            title="Ajustes"
            onClick={() => setSettingsOpen(true)}
            className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white transition-all hover:scale-105 active:scale-95 shadow-sm"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Showcase Hero */}
      <main className="flex-1 px-8 py-6 flex flex-col justify-between relative overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-950/20 via-slate-950 to-slate-950">
        {/* Subtle decorative glow */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Update Notification Banner */}
        <UpdateBanner />

        {/* Hero Information */}
        <div className="my-auto max-w-xl z-0 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-orange-500/15 text-orange-400 border border-orange-500/30 shadow-sm">
            <Flame className="w-3.5 h-3.5 fill-current animate-pulse" />
            <span>Edición Especial de Halloween</span>
          </div>

          <h2 className="text-4xl font-black text-white tracking-tight leading-tight">
            Noche de Brujas, Ruleta & Airdrops
          </h2>

          <p className="text-sm text-slate-300/90 leading-relaxed max-w-lg">
            Explora un mundo con eventos climáticos automatizados, ruletas dinámicas con items exclusivos, y tus propios acompañantes Pikmins elementales para supervivencia.
          </p>

          <div className="flex items-center gap-4 pt-2 text-xs text-slate-400 font-medium">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Sparkles className="w-3.5 h-3.5 text-orange-400" />
              Sincronización delta sin fricción
            </span>
            <span className="text-slate-600">•</span>
            <span>Instalación 100% automatizada</span>
          </div>
        </div>

        {/* Spacer */}
        <div />
      </main>

      {/* Persistent Play / Update Action Bar */}
      <PlayBar onPlay={handlePlay} onUpdate={handleUpdate} />

      {/* Interactive Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSave={() => persistSettings(settings)}
      />
    </div>
  );
}
