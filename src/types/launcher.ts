export type ModpackFileType = 'custom' | 'modrinth' | 'config' | 'resourcepack';

export interface ModpackFile {
  path: string;
  url: string;
  sha1: string;
  size: number;
  type: ModpackFileType;
}

export interface MinecraftConfig {
  version: string;
  modloader: 'forge' | 'neoforge' | 'fabric';
  modloaderVersion: string;
  javaVersion: number;
}

export interface ModpackManifest {
  schemaVersion: number;
  id: string;
  name: string;
  version: string;
  minecraft: MinecraftConfig;
  changelog?: string;
  files: ModpackFile[];
}

export type AuthType = 'microsoft' | 'offline';

export interface DeviceCodeResponse {
  user_code: string;
  device_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
  message?: string;
}

export interface UserAccount {
  session_type: AuthType;
  username: string;
  uuid: string;
  access_token?: string;
}

export interface SystemMemoryInfo {
  total_ram_gb: number;
  available_ram_gb: number;
  recommended_ram_gb: number;
}

export interface ServerStatus {
  online: boolean;
  host: string;
  port: number;
  ping_ms?: number | null;
  players_online?: number | null;
  players_max?: number | null;
}

export interface UserSettings {
  selected_modpack_id: string;
  allocated_ram_gb: number;
  game_directory: string;
  active_account?: UserAccount;
  close_launcher_on_start: boolean;
}

export interface DownloadProgressEvent {
  current_file: string;
  downloaded_bytes: number;
  total_bytes: number;
  percentage: number;
  speed_mbps: number;
}

export type GameState = 'IDLE' | 'LAUNCHING' | 'RUNNING' | 'CRASHED' | 'EXITED';

export type LauncherStatus =
  | 'READY'
  | 'UPDATE_LAUNCHER_REQUIRED'
  | 'UPDATE_MODPACK_REQUIRED'
  | 'DOWNLOADING'
  | 'LAUNCHING'
  | 'RUNNING';

export type UpdateAction = 'UP_TO_DATE' | 'UPDATE_REQUIRED' | 'LAUNCHER_UPDATE_REQUIRED';

export interface DeltaReport {
  action: UpdateAction;
  current_version?: string;
  target_version: string;
  changelog?: string;
  files_to_download: ModpackFile[];
  files_to_delete: string[];
  total_download_bytes: number;
}

export type LogLevel = 'INFO' | 'WARN' | 'ERROR';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp_ms: number;
}

export interface CrashDiagnostic {
  title: string;
  description: string;
  solution: string;
}

export interface CrashReportEvent {
  exit_code: number;
  diagnostic?: CrashDiagnostic | null;
  tail_logs: string[];
}
