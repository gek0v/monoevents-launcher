export interface WallpaperInfo {
  id: string;
  url: string;
  title: string;
  description: string;
  author?: string;
  category?: 'Captura de pantalla' | 'Dibujo / Fanart' | string;
  likesCount?: number;
}

export const SERVER_WALLPAPERS: WallpaperInfo[] = [
  {
    id: 'wp-1',
    url: '/wallpapers/wallpaper-1.png',
    title: 'Noche de Sangre',
    description: 'Vistas panorámicas del evento MonoEvents Halloween',
  },
  {
    id: 'wp-2',
    url: '/wallpapers/wallpaper-2.png',
    title: 'Fortaleza & Ruleta',
    description: 'Zonas interactivas y minijuegos con airdrops',
  },
  {
    id: 'wp-3',
    url: '/wallpapers/wallpaper-3.png',
    title: 'Tierras Salvajes',
    description: 'Biomas misteriosos y expediciones nocturnas',
  },
  {
    id: 'wp-4',
    url: '/wallpapers/wallpaper-4.png',
    title: 'Santuario del Servidor',
    description: 'Monolito ceremonial y puestos de comercio de ánimas',
  },
  {
    id: 'wp-5',
    url: '/wallpapers/wallpaper-5.png',
    title: 'Campamento Base',
    description: 'Refugio de supervivencia y preparación para eventos',
  },
];

export const WALLPAPERS_CACHE_KEY = 'monoevents_cached_wallpapers';
const API_URL = (import.meta as any).env?.VITE_STATS_API_URL || 'https://stats.gek0.duckdns.org';

/**
 * Fetches dynamic wallpapers approved for the launcher from the community gallery API.
 * Combines approved remote wallpapers with default built-in wallpapers.
 * Caches successfully fetched wallpapers in localStorage for offline resiliency.
 */
export async function fetchServerWallpapers(): Promise<WallpaperInfo[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(`${API_URL}/api/gallery/wallpapers`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data: WallpaperInfo[] = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        try {
          localStorage.setItem(WALLPAPERS_CACHE_KEY, JSON.stringify(data));
        } catch {}
        return [...data, ...SERVER_WALLPAPERS];
      }
    }
  } catch {
    // Timeout or network error - continue to cached fallback
  }

  // Fallback to cached items in localStorage
  try {
    const cached = localStorage.getItem(WALLPAPERS_CACHE_KEY);
    if (cached) {
      const parsed: WallpaperInfo[] = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return [...parsed, ...SERVER_WALLPAPERS];
      }
    }
  } catch {}

  return SERVER_WALLPAPERS;
}
