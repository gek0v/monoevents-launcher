import React, { useEffect, useState } from 'react';
import {
  X,
  Sparkles,
  Zap,
  Sliders,
  Check,
  FolderOpen,
  ExternalLink,
  Shield,
  Layers,
  Flame,
  Sun,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import { useShadersStore } from '../../stores/shadersStore';
import { useTauriIpc } from '../../hooks/useTauriIpc';
import type { GraphicsPresetType, ShaderpackInfo } from '../../types/launcher';

interface ShadersModalProps {
  isOpen: boolean;
  onClose: () => void;
  instancePath: string;
}

type TabType = 'presets' | 'shaders';

export const ShadersModal: React.FC<ShadersModalProps> = ({
  isOpen,
  onClose,
  instancePath,
}) => {
  const { graphicsState, setGraphicsState, isLoading, setIsLoading } = useShadersStore();
  const {
    getGraphicsState,
    setActiveShaderpack,
    applyGraphicsPreset,
    openShaderpacksFolder,
  } = useTauriIpc();

  const [activeTab, setActiveTab] = useState<TabType>('presets');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Load current graphics state on open
  useEffect(() => {
    if (isOpen && instancePath) {
      let isMounted = true;
      setIsLoading(true);
      getGraphicsState(instancePath).then((state) => {
        if (isMounted) {
          setGraphicsState(state);
          setIsLoading(false);
        }
      });
      return () => {
        isMounted = false;
      };
    }
  }, [isOpen, instancePath, getGraphicsState, setGraphicsState, setIsLoading]);

  if (!isOpen) return null;

  const showFeedback = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 2500);
  };

  const handleApplyPreset = async (preset: GraphicsPresetType) => {
    setIsLoading(true);
    const updated = await applyGraphicsPreset(instancePath, preset);
    if (updated) {
      setGraphicsState(updated);
      showFeedback(`Perfil "${preset.toUpperCase()}" aplicado correctamente`);
    }
    setIsLoading(false);
  };

  const handleToggleShader = async (filename: string | null) => {
    setIsLoading(true);
    await setActiveShaderpack(instancePath, filename);
    const updated = await getGraphicsState(instancePath);
    if (updated) {
      setGraphicsState(updated);
      showFeedback(
        filename ? `Shader "${filename}" activado` : 'Shaders desactivados (OFF)'
      );
    }
    setIsLoading(false);
  };

  const handleOpenFolder = async () => {
    await openShaderpacksFolder(instancePath);
  };

  const isPresetActive = (preset: GraphicsPresetType) => {
    return graphicsState?.active_preset === preset;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-4xl max-h-[90vh] bg-slate-950 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-900/60 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-wide">
                  Gestor de Shaders & Rendimiento
                </h3>
                {graphicsState?.shaders_enabled ? (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <Sun className="w-3 h-3" />
                    Shaders ACTIVOS
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/20 text-slate-400 border border-slate-500/30">
                    Shaders OFF
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Optimización para Oculus & Embeddium (Minecraft 1.20.1 Forge)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-white/5 bg-slate-950/80">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('presets')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'presets'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-lg shadow-amber-500/10'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <Zap className="w-4 h-4" />
              Perfiles de 1-Clic
            </button>

            <button
              onClick={() => setActiveTab('shaders')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'shaders'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-lg shadow-amber-500/10'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <Layers className="w-4 h-4" />
              Gestor de Shaders ({graphicsState?.available_shaders?.length ?? 0})
            </button>
          </div>

          {actionFeedback && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold animate-in fade-in">
              <Check className="w-3.5 h-3.5" />
              {actionFeedback}
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-24 text-slate-500 text-sm">
              <span className="animate-pulse">Cargando estado gráfico de la instancia...</span>
            </div>
          ) : activeTab === 'presets' ? (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                Selecciona un perfil preconfigurado para adaptar el rendimiento de tu PC al evento.
                Tus teclas y controles personalizados se mantendrán intactos.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* PVP Competitivo */}
                <div
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                    isPresetActive('pvp')
                      ? 'bg-orange-500/10 border-orange-500/40 shadow-xl shadow-orange-500/10'
                      : 'bg-white/[0.03] border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="p-2 rounded-xl bg-orange-500/20 text-orange-400">
                        <Flame className="w-5 h-5" />
                      </span>
                      {isPresetActive('pvp') && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500 text-black">
                          ACTIVO
                        </span>
                      )}
                    </div>
                    <h4 className="text-base font-bold text-white">PVP Competitivo</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Máximo rendimiento y fluidez. Elimina caídas de FPS en combates masivos y
                      airdrops.
                    </p>
                  </div>

                  <div className="space-y-1.5 text-[11px] font-mono text-slate-300 border-t border-white/5 pt-3">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Shaders:</span>
                      <span className="text-rose-400 font-bold">Desactivados (OFF)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Render:</span>
                      <span>8 Chunks</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Partículas:</span>
                      <span>Mínimas</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">FPS Límite:</span>
                      <span className="text-emerald-400 font-bold">144 FPS</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleApplyPreset('pvp')}
                    disabled={isPresetActive('pvp')}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all ${
                      isPresetActive('pvp')
                        ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30 cursor-default'
                        : 'bg-orange-600 hover:bg-orange-500 text-white shadow-md'
                    }`}
                  >
                    {isPresetActive('pvp') ? 'Perfil Activo' : 'Aplicar Perfil'}
                  </button>
                </div>

                {/* Equilibrado (Recomendado) */}
                <div
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                    isPresetActive('balanced')
                      ? 'bg-amber-500/10 border-amber-500/40 shadow-xl shadow-amber-500/10'
                      : 'bg-white/[0.03] border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                        <Zap className="w-5 h-5" />
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        RECOMENDADO
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-white">Equilibrado</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      El balance perfecto entre la tenebrosa atmósfera del evento y 60-90 FPS
                      estables.
                    </p>
                  </div>

                  <div className="space-y-1.5 text-[11px] font-mono text-slate-300 border-t border-white/5 pt-3">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Shaders:</span>
                      <span className="text-emerald-400 font-bold">Activados</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Render:</span>
                      <span>12 Chunks</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Partículas:</span>
                      <span>Reducidas</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">FPS Límite:</span>
                      <span className="text-emerald-400 font-bold">120 FPS</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleApplyPreset('balanced')}
                    disabled={isPresetActive('balanced')}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all ${
                      isPresetActive('balanced')
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 cursor-default'
                        : 'bg-amber-600 hover:bg-amber-500 text-white shadow-md'
                    }`}
                  >
                    {isPresetActive('balanced') ? 'Perfil Activo' : 'Aplicar Perfil'}
                  </button>
                </div>

                {/* Cinemático Ultra */}
                <div
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                    isPresetActive('ultra')
                      ? 'bg-purple-500/10 border-purple-500/40 shadow-xl shadow-purple-500/10'
                      : 'bg-white/[0.03] border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
                        <Sun className="w-5 h-5" />
                      </span>
                      {isPresetActive('ultra') && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500 text-white">
                          ACTIVO
                        </span>
                      )}
                    </div>
                    <h4 className="text-base font-bold text-white">Cinemático Ultra</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Máxima fidelidad gráfica con niebla volumétrica y reflejos. Para capturas y
                      clips.
                    </p>
                  </div>

                  <div className="space-y-1.5 text-[11px] font-mono text-slate-300 border-t border-white/5 pt-3">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Shaders:</span>
                      <span className="text-purple-400 font-bold">Máximo Detalle</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Render:</span>
                      <span>16 Chunks</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Partículas:</span>
                      <span>Completas</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">FPS Límite:</span>
                      <span className="text-purple-400 font-bold">Ilimitado</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleApplyPreset('ultra')}
                    disabled={isPresetActive('ultra')}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all ${
                      isPresetActive('ultra')
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 cursor-default'
                        : 'bg-purple-600 hover:bg-purple-500 text-white shadow-md'
                    }`}
                  >
                    {isPresetActive('ultra') ? 'Perfil Activo' : 'Aplicar Perfil'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Shader Control Header */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                    <Eye className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Estado Global de Shaders</h4>
                    <p className="text-xs text-slate-400">
                      Activa o desactiva Oculus en bloque sin reiniciar Minecraft.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggleShader(graphicsState?.shaders_enabled ? null : graphicsState?.available_shaders[0]?.filename ?? null)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      graphicsState?.shaders_enabled
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                    }`}
                  >
                    {graphicsState?.shaders_enabled ? 'Desactivar Shaders' : 'Activar Shaders'}
                  </button>

                  <button
                    onClick={handleOpenFolder}
                    title="Abrir carpeta shaderpacks en Explorer"
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-white/10 transition-colors"
                  >
                    <FolderOpen className="w-4 h-4 text-amber-400" />
                    <span>Abrir shaderpacks</span>
                  </button>
                </div>
              </div>

              {/* Installed Shaders List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Shaders Instalados Localmente ({graphicsState?.available_shaders?.length ?? 0})
                  </h4>
                </div>

                {graphicsState?.available_shaders && graphicsState.available_shaders.length > 0 ? (
                  <div className="space-y-2">
                    {graphicsState.available_shaders.map((shader: ShaderpackInfo) => (
                      <div
                        key={shader.filename}
                        onClick={() => handleToggleShader(shader.filename)}
                        className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
                          shader.is_active
                            ? 'bg-amber-500/10 border-amber-500/40 shadow-sm'
                            : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                              shader.is_active
                                ? 'bg-amber-500 border-amber-400 text-black'
                                : 'border-slate-600 bg-slate-900'
                            }`}
                          >
                            {shader.is_active && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-white">{shader.name}</span>
                              {shader.is_active && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                  EN USO
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-mono text-slate-500">
                              {shader.filename} • {shader.size_mb > 0 ? `${shader.size_mb} MB` : 'Carpeta'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 text-center space-y-3">
                    <p className="text-xs text-slate-400">
                      No hay shaders instalados en la carpeta <code className="text-amber-400 font-mono">shaderpacks/</code>.
                    </p>
                    <button
                      onClick={handleOpenFolder}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold hover:bg-amber-500/30 transition-all"
                    >
                      <FolderOpen className="w-4 h-4" />
                      <span>Abrir carpeta para arrastrar Shaders (.zip)</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Shaders Recomendados */}
              <div className="p-4 rounded-2xl bg-slate-900/40 border border-white/5 space-y-2">
                <h5 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  Shaders Recomendados Oficiales
                </h5>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Para disfrutar al 100% de la Noche de Sangre con Oculus recomendamos:{' '}
                  <span className="text-white font-medium">Complementary Reimagined</span> (iluminación nocturna inmersiva) o{' '}
                  <span className="text-white font-medium">MakeUp - UltraFast</span> (para gráficas integradas). Solo arrastra el archivo .zip a la carpeta.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-slate-900/40 text-xs text-slate-400">
          <span>Configuración persistida en options.txt y optionsshaders.txt</span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-medium transition-colors"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};
