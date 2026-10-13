import React, { useState, useEffect } from 'react';
import {
  X,
  HardDrive,
  FolderOpen,
  User,
  ShieldCheck,
  CheckCircle,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
} from 'lucide-react';
import { useSettingsStore } from '../../stores/settingsStore';
import { useTauriIpc } from '../../hooks/useTauriIpc';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSave }) => {
  const {
    settings,
    systemMemory,
    setRam,
    setGameDirectory,
    setActiveAccount,
    setCloseLauncherOnStart,
    setSettings,
  } = useSettingsStore();
  const {
    createOfflineUser,
    getSystemMemory,
    persistSettings,
    selectGameDirectory,
    openDirectoryInExplorer,
  } = useTauriIpc();

  useEffect(() => {
    if (isOpen && !systemMemory) {
      getSystemMemory();
    }
  }, [isOpen, systemMemory, getSystemMemory]);

  const maxRam = systemMemory?.total_ram_gb ? Math.max(systemMemory.total_ram_gb, 4) : 16;
  const recommendedRam = systemMemory?.recommended_ram_gb ?? 8;

  const [usernameInput, setUsernameInput] = useState(
    settings.active_account?.username || 'GekoPlayer'
  );
  const [accountType, setAccountType] = useState<'offline' | 'microsoft'>(
    settings.active_account?.session_type || 'offline'
  );

  useEffect(() => {
    if (isOpen) {
      setUsernameInput(settings.active_account?.username || 'GekoPlayer');
      setAccountType(settings.active_account?.session_type || 'offline');
    }
  }, [isOpen, settings.active_account]);

  if (!isOpen) return null;

  const handleSave = async () => {
    const trimmed = usernameInput.trim() || 'GekoPlayer';
    let updatedAccount;
    if (accountType === 'offline') {
      const offlineSession = await createOfflineUser(trimmed);
      updatedAccount = offlineSession || {
        session_type: 'offline' as const,
        username: trimmed,
        uuid: 'offline-uuid-' + trimmed.toLowerCase().replace(/[^a-z0-9]/g, ''),
      };
    } else {
      updatedAccount = {
        session_type: 'microsoft' as const,
        username: trimmed,
        uuid: settings.active_account?.uuid || 'ms-pending-auth',
      };
    }

    const currentSettings = useSettingsStore.getState().settings;
    const finalSettings = {
      ...currentSettings,
      active_account: updatedAccount,
    };

    setActiveAccount(updatedAccount);
    setSettings(finalSettings);
    await persistSettings(finalSettings);

    if (onSave) onSave();
    onClose();
  };

  const handlePickFolder = async () => {
    const selected = await selectGameDirectory();
    if (selected) {
      setGameDirectory(selected);
    }
  };

  const handleOpenExplorer = async () => {
    if (settings.game_directory) {
      await openDirectoryInExplorer(settings.game_directory);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-950/50">
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-orange-400" />
            <h2 className="text-base font-bold text-white tracking-wide">Ajustes del Launcher</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          {/* RAM Slider */}
          <div className="space-y-3 bg-slate-950/40 p-4 rounded-xl border border-slate-800/60">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  Memoria RAM Asignada
                </label>
                <p className="text-xs text-slate-400 mt-0.5">
                  Memoria máxima asignada a la máquina virtual Java de Minecraft.
                </p>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-lg font-mono font-extrabold text-orange-400 px-3 py-1 bg-orange-950/40 border border-orange-500/30 rounded-lg">
                  {settings.allocated_ram_gb} GB
                </span>
                {systemMemory && (
                  <span className="text-[10px] text-slate-400 font-mono mt-1">
                    Física: {systemMemory.total_ram_gb} GB ({systemMemory.available_ram_gb} GB disp.)
                  </span>
                )}
              </div>
            </div>

            <input
              type="range"
              min={2}
              max={maxRam}
              step={1}
              value={Math.min(settings.allocated_ram_gb, maxRam)}
              onChange={(e) => setRam(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
            />

            <div className="flex justify-between text-[11px] text-slate-400 font-mono">
              <span>2 GB (Mínimo)</span>
              <span className="text-emerald-400 font-semibold">{recommendedRam} GB (Recomendado)</span>
              <span>{maxRam} GB (Máximo Sistema)</span>
            </div>
          </div>

          {/* Game Directory Picker */}
          <div className="space-y-2 bg-slate-950/40 p-4 rounded-xl border border-slate-800/60">
            <label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-orange-400" />
              Carpeta de Instalación
            </label>
            <p className="text-xs text-slate-400">
              Lugar donde se guardarán las instancias, mods y mundos locales.
            </p>
            <div className="flex items-center gap-2 mt-2">
              <input
                type="text"
                readOnly
                value={settings.game_directory}
                className="flex-1 bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-xs font-mono text-slate-300 select-all focus:outline-none"
              />
              <button
                type="button"
                onClick={handlePickFolder}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white border border-slate-700 transition-colors"
              >
                Examinar...
              </button>
              <button
                type="button"
                title="Abrir en el Explorador de Windows"
                onClick={handleOpenExplorer}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 hover:text-white border border-slate-700 transition-colors flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5 text-orange-400" />
                <span className="hidden sm:inline">Explorador</span>
              </button>
            </div>
          </div>

          {/* Account Profile */}
          <div className="space-y-3 bg-slate-950/40 p-4 rounded-xl border border-slate-800/60">
            <label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <User className="w-4 h-4 text-orange-400" />
              Perfil y Cuenta de Jugador
            </label>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAccountType('offline')}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  accountType === 'offline'
                    ? 'bg-orange-600/20 border-orange-500 text-orange-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Modo Offline (Apodo)
              </button>

              <button
                type="button"
                onClick={() => setAccountType('microsoft')}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  accountType === 'microsoft'
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Microsoft Oficial
              </button>
            </div>

            {accountType === 'offline' ? (
              <div className="space-y-1 mt-2">
                <label className="text-[11px] text-slate-400">Apodo en el servidor (Nickname):</label>
                <input
                  type="text"
                  maxLength={16}
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="Tu nombre de usuario"
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                />
              </div>
            ) : (
              <p className="text-xs text-slate-400 mt-2 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                Se iniciará sesión mediante el flujo seguro oficial de Microsoft / Xbox Live.
              </p>
            )}
          </div>

          {/* Close on Launch Toggle */}
          <div className="flex items-center justify-between px-2">
            <div>
              <p className="text-xs font-semibold text-slate-300">Cerrar launcher al iniciar</p>
              <p className="text-[11px] text-slate-400">
                Libera memoria cerrando la aplicación una vez Minecraft esté activo.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCloseLauncherOnStart(!settings.close_launcher_on_start)}
              className="text-orange-400 hover:text-orange-300 transition-colors"
            >
              {settings.close_launcher_on_start ? (
                <ToggleRight className="w-8 h-8 text-orange-500" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-slate-600" />
              )}
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800/80 bg-slate-950/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-xs font-bold text-white shadow-lg shadow-orange-600/30 transition-all"
          >
            Guardar Ajustes
          </button>
        </div>
      </div>
    </div>
  );
};
