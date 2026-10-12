export type ModpackFileType = 'custom' | 'modrinth' | 'config';

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

export interface UserAccount {
  session_type: AuthType;
  username: string;
  uuid: string;
  access_token?: string;
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
