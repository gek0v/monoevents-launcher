import React, { useState } from 'react';
import {
  X,
  HardDrive,
  FolderOpen,
  User,
  ShieldCheck,
  CheckCircle,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { useSettingsStore } from '../../stores/settingsStore';
import { useTauriIpc } from '../../hooks/useTauriIpc';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSave }) => {
  const { settings, setRam, setGameDirectory, setActiveAccount, setCloseLauncherOnStart } =
    useSettingsStore();
  const { createOfflineUser } = useTauriIpc();

  const [usernameInput, setUsernameInput] = useState(
    settings.active_account?.username || 'GekoPlayer'
  );
  const [accountType, setAccountType] = useState<'offline' | 'microsoft'>(
    settings.active_account?.session_type || 'offline'
  );

  if (!isOpen) return null;

  const handleSave = async () => {
    const trimmed = usernameInput.trim() || 'Jugador';
    if (accountType === 'offline') {
      const offlineSession = await createOfflineUser(trimmed);
      if (offlineSession) {
        setActiveAccount(offlineSession);
      }
    } else {
      setActiveAccount({
        session_type: 'microsoft',
        username: trimmed,
        uuid: settings.active_account?.uuid || 'ms-pending-auth',
      });
    }
    if (onSave) onSave();
    onClose();
  };

  const handlePickFolder = async () => {
    try {
      // Dynamic import of Tauri dialog if available
      const dialog = await import('@tauri-apps/plugin-dialog');
      const selected = await dialog.open({
        directory: true,
        multiple: false,
        title: 'Selecciona la carpeta de instalación de Minecraft',
      });
      if (selected && typeof selected === 'string') {
        setGameDirectory(selected);
      }
    } catch {
      // Fallback for browser preview
      const manual = prompt('Introduce la ruta de instalación:', settings.game_directory);
      if (manual) setGameDirectory(manual);
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
              <span className="text-lg font-mono font-extrabold text-orange-400 px-3 py-1 bg-orange-950/40 border border-orange-500/30 rounded-lg">
                {settings.allocated_ram_gb} GB
              </span>
            </div>

            <input
              type="range"
              min={2}
              max={16}
              step={1}
              value={settings.allocated_ram_gb}
              onChange={(e) => setRam(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
            />

            <div className="flex justify-between text-[11px] text-slate-400 font-mono">
              <span>2 GB (Mínimo)</span>
              <span className="text-emerald-400 font-semibold">6 - 8 GB (Recomendado Forge)</span>
              <span>16 GB</span>
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
