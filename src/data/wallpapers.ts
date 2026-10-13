export interface WallpaperInfo {
  id: string;
  url: string;
  title: string;
  description: string;
}

export const SERVER_WALLPAPERS: WallpaperInfo[] = [
  {
    id: 'wp-1',
    url: '/wallpapers/wallpaper-1.png',
    title: 'Noche de Brujas',
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
