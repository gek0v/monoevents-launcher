import type { CrashDiagnostic } from '../types/launcher';

/**
 * Anonymizes local filesystem paths containing user profile directories.
 * Example: C:\Users\Geko\AppData\... -> C:\Users\***\AppData\...
 */
export function sanitizeLogPaths(text: string): string {
  if (!text) return '';
  return text
    // Replace Windows backslash user paths: C:\Users\Username\
    .replace(/([a-zA-Z]:\\Users\\)[^\\]+(\\)/gi, '$1***$2')
    // Replace forward slash user paths: C:/Users/Username/
    .replace(/([a-zA-Z]:\/Users\/)[^\/]+(\/)/gi, '$1***$2')
    // Replace file URLs
    .replace(/(file:\/\/\/[a-zA-Z]:\/Users\/)[^\/]+(\/)/gi, '$1***$2');
}

export interface CrashReportPayload {
  exitCode: number;
  diagnostic?: CrashDiagnostic | null;
  tailLogs: string[];
  allocatedRamGb?: number;
  launcherVersion?: string;
}

/**
 * Assembles a clean, sanitized Discord-formatted Markdown crash report.
 */
export function formatDiscordCrashReport(payload: CrashReportPayload): string {
  const {
    exitCode,
    diagnostic,
    tailLogs,
    allocatedRamGb = 6,
    launcherVersion = 'v0.1.0',
  } = payload;

  const now = new Date();
  const dateStr = now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';

  const diagTitle = diagnostic?.title || `Cierre anómalo (Código ${exitCode})`;
  const diagSolution =
    diagnostic?.solution || 'Comparte este reporte en #soporte-tecnico para investigar el log.';

  // Take the last 35 lines and sanitize each
  const sanitizedLines = tailLogs
    .slice(-35)
    .map((line) => sanitizeLogPaths(line))
    .join('\n');

  return [
    '**🚨 Reporte de Error - MonoEvents: Noche de Sangre**',
    `• **Launcher:** MonoEvents ${launcherVersion} (Windows)`,
    `• **Fecha:** \`${dateStr}\``,
    `• **RAM Asignada:** ${allocatedRamGb} GB (Forge 1.20.1)`,
    `• **Código de Salida:** \`${exitCode}\``,
    `• **Diagnóstico:** ⚠️ **${diagTitle}**`,
    `• **Solución Recomendada:** ${diagSolution}`,
    '',
    '**Últimas líneas del registro:**',
    '```yaml',
    sanitizedLines || '[No se registraron líneas de salida en el búfer]',
    '```',
  ].join('\n');
}
