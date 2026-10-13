import React, { useState } from 'react';
import { ChevronDown, Layers, Check } from 'lucide-react';
import { useSettingsStore } from '../../stores/settingsStore';
import { useLauncherStore } from '../../stores/launcherStore';

export const ModpackSelector: React.FC = () => {
  const { settings, setSelectedModpackId } = useSettingsStore();
  const { availableModpacks } = useLauncherStore();
  const [isOpen, setIsOpen] = useState(false);

  const currentModpack =
    availableModpacks.find((m) => m.id === settings.selected_modpack_id) || availableModpacks[0];

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs font-semibold text-slate-200 transition-all hover:border-orange-500/50 shadow-sm"
      >
        <Layers className="w-4 h-4 text-orange-400" />
        <span className="max-w-[200px] truncate">{currentModpack?.name || 'Seleccionar Modpack'}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 mt-2 w-72 origin-top-left rounded-2xl bg-slate-950/90 backdrop-blur-2xl border border-white/10 shadow-2xl p-2 z-50 animate-fade-in">
            <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Instancias Disponibles
            </div>
            {availableModpacks.map((pack) => {
              const isSelected = pack.id === settings.selected_modpack_id;
              return (
                <button
                  key={pack.id}
                  type="button"
                  onClick={() => {
                    setSelectedModpackId(pack.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-colors text-xs ${
                    isSelected
                      ? 'bg-orange-600/20 text-orange-300 font-semibold border border-orange-500/30'
                      : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
                  }`}
                >
                  <div>
                    <p className="font-semibold text-slate-200">{pack.name}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Minecraft {pack.minecraft.version} • Forge {pack.minecraft.modloaderVersion}
                    </p>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-orange-400 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
