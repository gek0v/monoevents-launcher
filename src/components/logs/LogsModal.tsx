import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  Terminal,
  X,
  AlertTriangle,
  Copy,
  Check,
  Trash2,
  ArrowDown,
  Search,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { useLogsStore, LogFilterType } from '../../stores/logsStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useTauriIpc } from '../../hooks/useTauriIpc';
import { formatDiscordCrashReport } from '../../utils/crashReporter';
import type { LogEntry } from '../../types/launcher';

interface LogsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LogsModal: React.FC<LogsModalProps> = ({ isOpen, onClose }) => {
  const {
    logs,
    filter,
    searchTerm,
    autoScroll,
    lastCrash,
    clearLogs,
    setFilter,
    setSearchTerm,
    setAutoScroll,
  } = useLogsStore();

  const { settings } = useSettingsStore();
  const { openDirectoryInExplorer } = useTauriIpc();

  const [copiedReport, setCopiedReport] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const endOfLogsRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive if enabled
  useEffect(() => {
    if (autoScroll && isOpen && endOfLogsRef.current) {
      endOfLogsRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs.length, autoScroll, isOpen]);

  // Filter logs based on level and search keyword
  const filteredLogs = useMemo(() => {
    return logs.filter((entry: LogEntry) => {
      // Level filter
      if (filter === 'WARN' && entry.level !== 'WARN' && entry.level !== 'ERROR') {
        return false;
      }
      if (filter === 'ERROR' && entry.level !== 'ERROR') {
        return false;
      }
      // Search term filter
      if (searchTerm.trim() !== '') {
        return entry.message.toLowerCase().includes(searchTerm.toLowerCase());
      }
      return true;
    });
  }, [logs, filter, searchTerm]);

  if (!isOpen) return null;

  const handleCopyDiscordReport = async () => {
    const reportText = formatDiscordCrashReport({
      exitCode: lastCrash?.exit_code ?? 1,
      diagnostic: lastCrash?.diagnostic,
      tailLogs: lastCrash?.tail_logs?.length ? lastCrash.tail_logs : logs.map((l) => l.message),
      allocatedRamGb: settings.allocated_ram_gb,
    });

    try {
      await navigator.clipboard.writeText(reportText);
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 2500);
    } catch (err) {
      console.warn('Error al copiar al portapapeles:', err);
    }
  };

  const handleOpenLogFolder = async () => {
    if (settings.game_directory) {
      await openDirectoryInExplorer(settings.game_directory);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-4xl max-h-[90vh] bg-slate-950 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-900/60 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-wide">
                  Consola de Registro & Diagnóstico
                </h3>
                {lastCrash ? (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    <ShieldAlert className="w-3 h-3" />
                    Fallo detectado (Código {lastCrash.exit_code})
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    En vivo
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Monitoreo de Forge 1.20.1 y análisis automático de fallos
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar consola"
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors border border-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Diagnostic Banner if Crash Occurred */}
        {lastCrash?.diagnostic && (
          <div className="mx-6 mt-4 p-4 rounded-2xl bg-gradient-to-r from-rose-950/80 via-slate-900/90 to-rose-950/60 border border-rose-500/40 shadow-lg shadow-rose-950/40">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-rose-200">
                    {lastCrash.diagnostic.title}
                  </h4>
                  <span className="text-[11px] font-mono text-rose-400/80">
                    Código de salida: {lastCrash.exit_code}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {lastCrash.diagnostic.description}
                </p>
                <div className="pt-1.5 text-xs text-amber-300 font-medium flex items-center gap-1.5">
                  <span>💡 Solución recomendada:</span>
                  <span className="text-white font-normal">
                    {lastCrash.diagnostic.solution}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Toolbar (Filters & Search) */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b border-white/5 bg-slate-900/30">
          {/* Level Filter Tabs */}
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 text-xs">
            {(['ALL', 'WARN', 'ERROR'] as LogFilterType[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  filter === tab
                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab === 'ALL' ? 'Todos' : tab === 'WARN' ? 'Avisos' : 'Errores'}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="flex items-center gap-2 flex-1 max-w-xs relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar en el registro..."
              className="w-full bg-black/40 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/40"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 text-slate-500 hover:text-slate-300 text-xs"
              >
                ×
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAutoScroll(!autoScroll)}
              title={autoScroll ? 'Desactivar auto-scroll' : 'Activar auto-scroll'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                autoScroll
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-white/[0.04] text-slate-400 border-white/10 hover:text-white'
              }`}
            >
              <ArrowDown className={`w-3.5 h-3.5 ${autoScroll ? 'animate-bounce' : ''}`} />
              <span>Auto-scroll</span>
            </button>

            <button
              type="button"
              onClick={clearLogs}
              title="Limpiar consola"
              className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-rose-400 border border-white/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Terminal Body */}
        <div
          ref={logContainerRef}
          className="flex-1 p-4 overflow-y-auto font-mono text-xs leading-relaxed bg-black/60 select-text min-h-[320px] max-h-[460px] space-y-1"
        >
          {filteredLogs.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-slate-500 space-y-2 select-none">
              <Terminal className="w-8 h-8 opacity-40 text-slate-400" />
              <p>No hay mensajes de registro que coincidan con el filtro.</p>
              <span className="text-[11px] text-slate-600">
                Los registros se transmitirán aquí en vivo al iniciar Minecraft.
              </span>
            </div>
          ) : (
            filteredLogs.map((entry: LogEntry, index: number) => {
              const timeString = new Date(entry.timestamp_ms).toLocaleTimeString();
              const isError = entry.level === 'ERROR';
              const isWarn = entry.level === 'WARN';

              return (
                <div
                  key={index}
                  className={`flex items-start gap-2 py-0.5 px-1 rounded transition-colors ${
                    isError
                      ? 'bg-rose-950/30 text-rose-200'
                      : isWarn
                      ? 'bg-amber-950/20 text-amber-200'
                      : 'hover:bg-white/[0.02] text-slate-300'
                  }`}
                >
                  <span className="text-[10px] text-slate-500 flex-shrink-0 select-none">
                    [{timeString}]
                  </span>
                  <span
                    className={`text-[9px] uppercase font-bold px-1 rounded flex-shrink-0 select-none ${
                      isError
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : isWarn
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {entry.level}
                  </span>
                  <span className="break-all whitespace-pre-wrap">{entry.message}</span>
                </div>
              );
            })
          )}
          <div ref={endOfLogsRef} />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-white/10 bg-slate-900/60 backdrop-blur-xl">
          <div className="text-[11px] text-slate-400">
            <span>{filteredLogs.length} líneas visibles</span>
            {logs.length > filteredLogs.length && (
              <span className="text-slate-500"> (de {logs.length} en total)</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleOpenLogFolder}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/10 text-xs font-semibold transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-orange-400" />
              <span>Abrir launcher.log</span>
            </button>

            <button
              type="button"
              onClick={handleCopyDiscordReport}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-xs font-bold shadow-lg shadow-orange-950/50 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {copiedReport ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span className="text-emerald-100">¡Copiado para Discord!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copiar Reporte para Discord</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
