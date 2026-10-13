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
  RefreshCw,
  Info,
  Search,
  Download,
  Loader2,
  Gauge,
  Globe,
} from 'lucide-react';
import { useShadersStore } from '../../stores/shadersStore';
import { useTauriIpc } from '../../hooks/useTauriIpc';
import type { GraphicsPresetType, ShaderpackInfo, ModrinthShaderCard } from '../../types/launcher';

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
  const {
    graphicsState,
    setGraphicsState,
    isLoading,
    setIsLoading,
    onlineShaders,
    setOnlineShaders,
    isSearchingOnline,
    setIsSearchingOnline,
    downloadingProjects,
    setDownloadingProject,
    markShaderInstalled,
    searchQuery,
    setSearchQuery,
    selectedTierFilter,
    setSelectedTierFilter,
  } = useShadersStore();
  const {
    getGraphicsState,
    setActiveShaderpack,
    applyGraphicsPreset,
    openShaderpacksFolder,
    searchModrinthShaders,
    downloadModrinthShader,
  } = useTauriIpc();

  const [activeTab, setActiveTab] = useState<TabType>('presets');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [onlineSortBy, setOnlineSortBy] = useState<'downloads' | 'follows' | 'newest'>('downloads');

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

  // Debounced search for Modrinth shaders
  useEffect(() => {
    if (isOpen && instancePath && activeTab === 'shaders') {
      let isMounted = true;
      setIsSearchingOnline(true);
      const timer = setTimeout(() => {
        searchModrinthShaders(instancePath, searchQuery, onlineSortBy, 0, 16, '1.20.1').then((results) => {
          if (isMounted) {
            setOnlineShaders(results);
            setIsSearchingOnline(false);
          }
        });
      }, searchQuery ? 350 : 0);

      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    }
  }, [isOpen, instancePath, activeTab, searchQuery, onlineSortBy, searchModrinthShaders, setOnlineShaders, setIsSearchingOnline]);

  if (!isOpen) return null;

  const PRESET_NAMES: Record<GraphicsPresetType, string> = {
    pvp: 'PVP Competitivo',
    balanced: 'Equilibrado',
    ultra: 'Cinemático Ultra',
    custom: 'Personalizado',
  };

  const showFeedback = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 3000);
  };

  const handleApplyPreset = async (preset: GraphicsPresetType) => {
    setIsLoading(true);
    const updated = await applyGraphicsPreset(instancePath, preset);
    if (updated) {
      setGraphicsState(updated);
      const name = PRESET_NAMES[preset] || preset;
      if (preset !== 'pvp' && updated.available_shaders.length === 0) {
        showFeedback(`Perfil "${name}" aplicado (sin shaders instalados)`);
      } else {
        showFeedback(`Perfil "${name}" aplicado correctamente`);
      }
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

  const handleRefresh = async () => {
    setIsLoading(true);
    const updated = await getGraphicsState(instancePath);
    if (updated) {
      setGraphicsState(updated);
      showFeedback('Lista de shaders sincronizada con disco');
    }
    setIsLoading(false);
  };

  const handleDownloadOnlineShader = async (shader: ModrinthShaderCard) => {
    setDownloadingProject(shader.project_id, true);
    try {
      const downloaded = await downloadModrinthShader(instancePath, shader.project_id, '1.20.1');
      if (downloaded) {
        const updated = await getGraphicsState(instancePath);
        if (updated) {
          setGraphicsState(updated);
        }
        markShaderInstalled(shader.project_id);
        const sizeText = downloaded.size_mb > 0
          ? (downloaded.size_mb < 1 ? `${downloaded.size_mb} MB (${Math.round(downloaded.size_mb * 1024)} KB)` : `${downloaded.size_mb} MB`)
          : '';
        showFeedback(`Shader "${downloaded.filename}" (${sizeText || 'completado'}) descargado en shaderpacks. ¡Listo para activar!`);
      } else {
        showFeedback('Error al descargar el shaderpack de Modrinth');
      }
    } catch {
      showFeedback('Error inesperado durante la descarga');
    } finally {
      setDownloadingProject(shader.project_id, false);
    }
  };

  const isShaderAlreadyInstalled = (onlineShader: ModrinthShaderCard) => {
    if (onlineShader.is_installed) return true;
    const available = graphicsState?.available_shaders ?? [];
    const slugClean = onlineShader.slug.toLowerCase().replace(/[-_]/g, '');
    const titleClean = onlineShader.title.toLowerCase().replace(/[-_\s]/g, '');
    return available.some((s) => {
      const sClean = s.filename.toLowerCase().replace(/[-_\s]/g, '');
      return sClean.includes(slugClean) || sClean.includes(titleClean);
    });
  };

  const formatDownloads = (count: number) => {
    if (count >= 1_000_000) {
      return `${(count / 1_000_000).toFixed(1)}M`;
    }
    if (count >= 1_000) {
      return `${(count / 1_000).toFixed(0)}k`;
    }
    return count.toString();
  };

  const renderTierBadge = (tier: string) => {
    switch (tier) {
      case 'low':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <Gauge className="w-3 h-3" />
            🟢 Bajo Consumo (90+ FPS)
          </span>
        );
      case 'high':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <Flame className="w-3 h-3" />
            🔴 Alto Consumo (Cinemático)
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Zap className="w-3 h-3" />
            🟡 Equilibrado (60-90 FPS)
          </span>
        );
    }
  };

  const filteredOnlineShaders = onlineShaders.filter((shader) => {
    if (selectedTierFilter === 'all') return true;
    return shader.performance_tier === selectedTierFilter;
  });

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
          {!graphicsState && isLoading ? (
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

                <div className="flex items-center gap-2.5">
                  {graphicsState?.shaders_enabled ? (
                    <button
                      onClick={() => handleToggleShader(null)}
                      disabled={isLoading}
                      className="px-4 py-2 rounded-xl text-xs font-bold transition-all bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 disabled:opacity-50"
                    >
                      Desactivar Shaders
                    </button>
                  ) : (graphicsState?.available_shaders?.length ?? 0) > 0 ? (
                    <button
                      onClick={() => handleToggleShader(graphicsState?.available_shaders[0]?.filename ?? null)}
                      disabled={isLoading}
                      className="px-4 py-2 rounded-xl text-xs font-bold transition-all bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 disabled:opacity-50"
                    >
                      Activar Shaders
                    </button>
                  ) : (
                    <button
                      disabled
                      title="Descarga o coloca un archivo .zip en shaderpacks para activarlo"
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-white/[0.04] text-slate-500 border border-white/5 cursor-not-allowed"
                    >
                      Sin shaders instalados
                    </button>
                  )}

                  <button
                    onClick={handleRefresh}
                    disabled={isLoading}
                    title="Recargar lista de shaders desde el disco"
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 text-slate-300 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
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
                              {shader.filename} • {shader.size_mb > 0 ? (shader.size_mb < 1 ? `${shader.size_mb} MB (${Math.round(shader.size_mb * 1024)} KB)` : `${shader.size_mb} MB`) : 'Carpeta'}
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

              {/* Online Modrinth Catalog & Downloader */}
              <div className="space-y-3.5 pt-4 border-t border-white/5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                      <Globe className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Explorar & Descargar Nuevos Shaders
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Catálogo de Modrinth filtrado para Minecraft 1.20.1 Forge (Oculus / Iris)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      API v2 • Modrinth
                    </span>
                  </div>
                </div>

                {/* Search Bar & Sort */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar shaders (ej. Complementary, BSL, MakeUp, Solas, Photon)..."
                      className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-900/90 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition-colors shadow-inner"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        title="Limpiar búsqueda"
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <select
                      value={onlineSortBy}
                      onChange={(e) => setOnlineSortBy(e.target.value as any)}
                      className="px-3 py-2 rounded-xl bg-slate-900/90 border border-white/10 text-xs text-slate-300 focus:outline-none focus:border-amber-500/50 cursor-pointer"
                    >
                      <option value="downloads">Más Descargados</option>
                      <option value="follows">Más Populares</option>
                      <option value="newest">Más Recientes</option>
                    </select>
                  </div>
                </div>

                {/* Performance Tier Quick Filters */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                  <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider pr-1">
                    Consumo:
                  </span>
                  <button
                    onClick={() => setSelectedTierFilter('all')}
                    className={`px-2.5 py-1 rounded-xl transition-all font-semibold ${
                      selectedTierFilter === 'all'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                        : 'bg-white/[0.03] text-slate-400 hover:text-white border border-white/5'
                    }`}
                  >
                    Todos ({onlineShaders.length})
                  </button>
                  <button
                    onClick={() => setSelectedTierFilter('low')}
                    className={`px-2.5 py-1 rounded-xl transition-all font-semibold ${
                      selectedTierFilter === 'low'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                        : 'bg-white/[0.03] text-slate-400 hover:text-white border border-white/5'
                    }`}
                  >
                    🟢 Bajo (90+ FPS)
                  </button>
                  <button
                    onClick={() => setSelectedTierFilter('medium')}
                    className={`px-2.5 py-1 rounded-xl transition-all font-semibold ${
                      selectedTierFilter === 'medium'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                        : 'bg-white/[0.03] text-slate-400 hover:text-white border border-white/5'
                    }`}
                  >
                    🟡 Equilibrado (60-90 FPS)
                  </button>
                  <button
                    onClick={() => setSelectedTierFilter('high')}
                    className={`px-2.5 py-1 rounded-xl transition-all font-semibold ${
                      selectedTierFilter === 'high'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                        : 'bg-white/[0.03] text-slate-400 hover:text-white border border-white/5'
                    }`}
                  >
                    🔴 Alto (Cinemático)
                  </button>
                </div>

                {/* Online Cards List */}
                {isSearchingOnline ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-2.5 bg-white/[0.01] rounded-2xl border border-white/5">
                    <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
                    <span className="text-xs">Buscando shaders en Modrinth API...</span>
                  </div>
                ) : filteredOnlineShaders.length === 0 ? (
                  <div className="p-8 text-center bg-white/[0.01] rounded-2xl border border-white/5 space-y-2">
                    <p className="text-xs text-slate-400">
                      No se encontraron shaders con los filtros seleccionados.
                    </p>
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedTierFilter('all');
                      }}
                      className="text-xs text-amber-400 hover:underline font-semibold"
                    >
                      Restablecer filtros
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredOnlineShaders.map((shader) => {
                      const installed = isShaderAlreadyInstalled(shader);
                      const isDownloading = !!downloadingProjects[shader.project_id];

                      return (
                        <div
                          key={shader.project_id}
                          className="flex flex-col justify-between p-3.5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-white/10 transition-all space-y-3 group"
                        >
                          <div className="flex gap-3">
                            {/* Image Thumbnail */}
                            <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-900 border border-white/10 flex-shrink-0 relative shadow-inner flex items-center justify-center">
                              {shader.featured_gallery || shader.icon_url ? (
                                <>
                                  <img
                                    src={shader.featured_gallery || shader.icon_url || ''}
                                    alt={shader.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 absolute inset-0"
                                    loading="lazy"
                                    onError={(e) => {
                                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                                    }}
                                  />
                                  <Layers className="w-6 h-6 text-slate-600" />
                                </>
                              ) : (
                                <Layers className="w-6 h-6 text-slate-600" />
                              )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-1.5">
                                <h5 className="text-xs font-bold text-white truncate group-hover:text-amber-300 transition-colors">
                                  {shader.title}
                                </h5>
                                <span
                                  className="text-[10px] text-slate-400 font-mono flex items-center gap-1 flex-shrink-0"
                                  title={`${shader.downloads.toLocaleString()} descargas totales en Modrinth`}
                                >
                                  <Download className="w-3 h-3 text-slate-500" />
                                  {formatDownloads(shader.downloads)} descargas
                                </span>
                              </div>

                              <p className="text-[10px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                                {shader.description}
                              </p>
                            </div>
                          </div>

                          {/* Footer with Badges and Download Button */}
                          <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {renderTierBadge(shader.performance_tier)}
                            </div>

                            <div>
                              {installed ? (
                                <span className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold">
                                  <Check className="w-3 h-3 stroke-[3]" />
                                  Instalado
                                </span>
                              ) : isDownloading ? (
                                <button
                                  disabled
                                  className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-semibold"
                                >
                                  <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                                  <span>Descargando...</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleDownloadOnlineShader(shader)}
                                  className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-[11px] font-black transition-all shadow-md shadow-amber-500/20 hover:scale-105 active:scale-95 cursor-pointer"
                                >
                                  <Download className="w-3 h-3 stroke-[2.5]" />
                                  <span>Descargar (.zip)</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
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

              {/* In-Game Hotkey & Shader Size Info Banner */}
              <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/15 text-[11px] text-amber-200/80 leading-relaxed">
                <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p>
                    <strong className="text-white">Sobre el tamaño de los shaders:</strong> A diferencia de los texture packs (que contienen imágenes pesadas de 50 a 300 MB), los shaders son paquetes ultraligeros de scripts y algoritmos matemáticos GLSL (ocupan habitualmente entre 500 KB y 4 MB comprimidos en <code className="text-amber-400 font-mono">.zip</code>). Cada descarga es verificada al 100% mediante hash criptográfico SHA-1 contra la CDN oficial de Modrinth.
                  </p>
                  <p className="text-slate-400">
                    Los cambios se aplican automáticamente antes de iniciar el juego. Si Minecraft ya está abierto, recarga los shaders pulsando <strong className="text-white">R</strong> (tecla rápida de Oculus) o recarga recursos con <strong className="text-white">F3 + T</strong>.
                  </p>
                </div>
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
