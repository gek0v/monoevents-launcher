import React, { useEffect, useState } from 'react';
import {
  Settings,
  Sparkles,
  Flame,
  Wifi,
  Copy,
  Check,
  Package,
  Mic,
  Gift,
  ShieldCheck,
  User,
  Terminal,
} from 'lucide-react';
import { useLauncherStore } from './stores/launcherStore';
import { useSettingsStore } from './stores/settingsStore';
import { useLogsStore } from './stores/logsStore';
import { useTauriIpc } from './hooks/useTauriIpc';
import { ModpackSelector } from './components/selector/ModpackSelector';
import { UpdateBanner } from './components/banner/UpdateBanner';
import { PlayBar } from './components/playbar/PlayBar';
import { SettingsModal } from './components/settings/SettingsModal';
import { LogsModal } from './components/logs/LogsModal';
import { BackgroundRotator } from './components/background/BackgroundRotator';
import type { ServerStatus } from './types/launcher';

export default function App() {
  const { isSettingsOpen, setSettingsOpen, availableModpacks } = useLauncherStore();
  const { settings } = useSettingsStore();
  const {
    isModalOpen: isLogsModalOpen,
    openModal: openLogsModal,
    closeModal: closeLogsModal,
    lastCrash,
  } = useLogsStore();
  const { checkForUpdates, startModpackSync, launchMinecraftGame, checkServerStatus } = useTauriIpc();

  const [copiedIp, setCopiedIp] = useState(false);
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);

  const currentModpack =
    availableModpacks.find((m) => m.id === settings.selected_modpack_id) || availableModpacks[0];

  const getInstancePath = (baseDir: string, modpackId: string) => {
    const clean = baseDir.replace(/[/\\]+$/, '');
    const sep = clean.includes('\\') ? '\\' : '/';
    return `${clean}${sep}instances${sep}${modpackId}`;
  };

  useEffect(() => {
    if (currentModpack && settings.game_directory) {
      const instancePath = getInstancePath(settings.game_directory, currentModpack.id);
      checkForUpdates(currentModpack, instancePath);
    }
  }, [currentModpack, settings.game_directory, checkForUpdates]);

  // Real Minecraft server status ping query
  useEffect(() => {
    let isMounted = true;
    const fetchStatus = async () => {
      const res = await checkServerStatus('gek0.duckdns.org', 25565);
      if (isMounted) {
        setServerStatus(res);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 45000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [checkServerStatus]);

  const handleUpdate = () => {
    if (currentModpack) {
      const instancePath = getInstancePath(settings.game_directory, currentModpack.id);
      startModpackSync(currentModpack, instancePath);
    }
  };

  const handlePlay = () => {
    if (currentModpack) {
      launchMinecraftGame(currentModpack.id);
    }
  };

  const handleCopyIp = async () => {
    try {
      await navigator.clipboard.writeText('gek0.duckdns.org');
      setCopiedIp(true);
      setTimeout(() => setCopiedIp(false), 2000);
    } catch {
      // Fallback
    }
  };

  const isMicrosoft = settings.active_account?.session_type === 'microsoft';

  return (
    <div className="h-screen w-screen bg-slate-950 text-slate-100 select-none overflow-hidden font-sans">
      <BackgroundRotator>
        {/* Top Header */}
        <header className="flex items-center justify-between px-6 py-3.5 border-b border-white/10 bg-slate-950/60 backdrop-blur-2xl z-30 shadow-lg">
          {/* Logo & Server Identity */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600 flex items-center justify-center font-black text-white text-lg shadow-xl shadow-orange-600/40 border border-orange-300/30">
                M
              </div>
              <span
                className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-slate-950 ${
                  serverStatus?.online ? 'bg-emerald-400' : 'bg-rose-500'
                }`}
              />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-black tracking-wide text-white">
                  MonoEvents
                </h1>
                <span className="text-[10px] uppercase font-extrabold tracking-widest text-orange-400 bg-orange-950/80 border border-orange-500/40 px-2 py-0.5 rounded-md">
                  Halloween
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-300">
                {serverStatus === null ? (
                  <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                    <span className="w-2 h-2 rounded-full bg-slate-500 animate-pulse" />
                    Comprobando estado...
                  </span>
                ) : serverStatus.online ? (
                  <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>En Línea</span>
                    {typeof serverStatus.players_online === 'number' ? (
                      <span className="text-emerald-300/90 font-medium">
                        ({serverStatus.players_online}
                        {typeof serverStatus.players_max === 'number' ? `/${serverStatus.players_max}` : ''} jugadores)
                      </span>
                    ) : null}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-rose-400 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    Fuera de línea
                  </span>
                )}
                <span className="text-slate-600">•</span>
                <span className="text-slate-400 font-mono">1.20.1 Forge</span>
              </div>
            </div>
          </div>

          {/* Controls on the right */}
          <div className="flex items-center gap-2.5">
            <ModpackSelector />

            {/* Quick Account Chip */}
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              title="Ajustes de cuenta"
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs font-semibold text-slate-200 transition-all hover:border-orange-500/40 shadow-sm"
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  isMicrosoft ? 'bg-emerald-400 shadow-sm shadow-emerald-400/80' : 'bg-orange-400'
                }`}
              />
              <User className="w-3.5 h-3.5 text-slate-300" />
              <span className="max-w-[120px] truncate">
                {settings.active_account?.username || 'GekoPlayer'}
              </span>
            </button>

            {/* Terminal / Logs Console Button */}
            <button
              type="button"
              title="Consola de Registros y Diagnóstico"
              onClick={openLogsModal}
              className={`p-2 rounded-xl border transition-all hover:scale-105 active:scale-95 shadow-sm relative ${
                lastCrash
                  ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border-rose-500/40 animate-pulse'
                  : 'bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white border-white/10'
              }`}
            >
              <Terminal className="w-4 h-4" />
              {lastCrash && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 border border-slate-950 animate-ping" />
              )}
            </button>

            {/* Settings Button */}
            <button
              type="button"
              title="Ajustes del Launcher"
              onClick={() => setSettingsOpen(true)}
              className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-slate-300 hover:text-white transition-all hover:scale-105 active:scale-95 shadow-sm"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Central Content */}
        <main className="flex-1 px-8 py-6 flex flex-col justify-between relative overflow-hidden z-20">
          {/* Update Banner */}
          <UpdateBanner />

          {/* Hero Showcase Card */}
          <div className="my-auto max-w-xl z-20 space-y-4 bg-slate-950/65 backdrop-blur-2xl border border-white/10 p-7 rounded-3xl shadow-2xl shadow-black/80 animate-fade-in">
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-500/15 text-orange-400 border border-orange-500/30 shadow-sm">
                <Flame className="w-3.5 h-3.5 fill-current animate-pulse text-orange-400" />
                <span>🩸 Noche de Sangre • Evento Oficial</span>
              </div>
            </div>

            <h2 className="text-3xl font-black text-white tracking-tight leading-tight">
              Noche de Sangre, Ruletas & Airdrops
            </h2>

            <p className="text-xs text-slate-300 leading-relaxed">
              Explora el mundo de MonoEvents con ruletas de la suerte interactivas, eventos climáticos dinámicos, airdrops competitivos con cajas de suministros y acompañantes Pikmin de supervivencia.
            </p>

            {/* Feature Pills */}
            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
              <div className="flex items-center gap-2 bg-white/[0.04] border border-white/10 px-3 py-2 rounded-xl text-slate-300">
                <Package className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                <span>79 Mods optimizados</span>
              </div>
              <div className="flex items-center gap-2 bg-white/[0.04] border border-white/10 px-3 py-2 rounded-xl text-slate-300">
                <Gift className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <span>Ruleta y Botines</span>
              </div>
              <div className="flex items-center gap-2 bg-white/[0.04] border border-white/10 px-3 py-2 rounded-xl text-slate-300">
                <Mic className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span>Voice Chat Proximidad</span>
              </div>
              <div className="flex items-center gap-2 bg-white/[0.04] border border-white/10 px-3 py-2 rounded-xl text-slate-300">
                <ShieldCheck className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                <span>Delta Sync Automático</span>
              </div>
            </div>

            {/* Server IP Copy Box */}
            <div className="pt-2 flex items-center justify-between bg-black/40 border border-white/10 rounded-2xl px-4 py-2.5">
              <div className="flex items-center gap-2.5">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    serverStatus?.online ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                  }`}
                />
                <span className="text-xs font-mono font-bold text-slate-200">
                  gek0.duckdns.org
                </span>
                <span className="text-[11px] text-slate-400">
                  {serverStatus?.online
                    ? typeof serverStatus.players_online === 'number'
                      ? `(En línea • ${serverStatus.players_online}${
                          typeof serverStatus.players_max === 'number' ? `/${serverStatus.players_max}` : ''
                        } jugadores)`
                      : '(En línea)'
                    : '(Servidor apagado)'}
                </span>
              </div>

              <button
                type="button"
                onClick={handleCopyIp}
                className="flex items-center gap-1.5 text-xs text-orange-400 hover:text-orange-300 font-semibold px-2.5 py-1 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 transition-all border border-orange-500/20"
              >
                {copiedIp ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar IP</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div />
        </main>

        {/* Persistent Action Bar */}
        <PlayBar onPlay={handlePlay} onUpdate={handleUpdate} />
      </BackgroundRotator>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      {/* Logs and Diagnostic Modal */}
      <LogsModal
        isOpen={isLogsModalOpen}
        onClose={closeLogsModal}
      />
    </div>
  );
}
