import type { ModpackManifest } from '../types/launcher';

export const DEFAULT_MODPACK: ModpackManifest = {
  schemaVersion: 1,
  id: 'monoevents-forge-1.20.1',
  name: 'MonoEvents Halloween (1.20.1 Forge)',
  version: '1.2.0',
  minecraft: {
    version: '1.20.1',
    modloader: 'forge',
    modloaderVersion: '47.4.22',
    javaVersion: 17,
  },
  changelog: 'Añadidos nuevos mobs de Halloween, eventos climáticos y optimizaciones de sincronización de ruleta.',
  files: [
    {
      path: 'mods/mono_events-1.0.jar',
      url: 'https://github.com/monoevents/monoevents-launcher/releases/download/v1.0.0/mono_events-1.0.jar',
      sha1: '52a075fc3e13938633cdf33976fec032b3a3ca20',
      size: 4499189,
      type: 'custom',
    },
    {
      path: 'mods/jei-1.20.1-forge-15.0.0.12.jar',
      url: 'https://cdn.modrinth.com/data/u6dRKJwZ/versions/aVZJ3vwP/jei-1.20.1-forge-15.0.0.12.jar',
      sha1: '91aa3d030b71728ef4e4d37e520248fd9db7006b',
      size: 1104584,
      type: 'modrinth',
    },
  ],
};
