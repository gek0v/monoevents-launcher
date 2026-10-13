import { EventFeed } from '../types/launcher';

export const DEFAULT_EVENT_FEED: EventFeed = {
  version: '1.0.0',
  updatedAt: '2026-10-13T12:00:00Z',
  articles: [
    {
      id: 'news-001',
      title: 'Airdrops Competitivos & Suministros Bélicos',
      date: '13 Octubre 2026',
      author: 'Staff MonoEvents',
      category: 'EVENTO',
      important: true,
      summary: 'Llegan las cajas de botín táctico en coordenadas aleatorias cada 3 horas.',
      content:
        'Durante la Noche de Sangre, bengalas rojas iluminarán el cielo marcando la caída inminente de un airdrop militar. Contienen armas forjadas, pociones prohibidas, manzanas doradas y fragmentos de netherite. La zona alrededor del humo rojo activa PVP forzado sin penalización de karma.',
    },
    {
      id: 'news-002',
      title: 'Reglamento Oficial: Noche de Sangre',
      date: '12 Octubre 2026',
      author: 'Comité de Árbitros',
      category: 'REGLAS',
      important: true,
      summary: 'Normativa de convivencia, alianzas máximas y prohibición absoluta de ventajas injustas.',
      content:
        '1. Máximo 3 jugadores por clan/alianza en cualquier combate o asedio.\n2. Uso estrictamente prohibido de X-Ray, Freecam, Baritone o clientes modificados. El anti-cheat expulsará instantáneamente de forma permanente.\n3. El grifeo está permitido exclusivamente en zonas no protegidas durante el toque de queda.\n4. Mantén el respeto en el chat de proximidad; el rol tóxico no está permitido.',
    },
    {
      id: 'news-003',
      title: 'Voice Chat de Proximidad Obligatorio',
      date: '10 Octubre 2026',
      author: 'Equipo Técnico',
      category: 'ACTUALIZACIÓN',
      important: false,
      summary: 'Configura tu micrófono y el mod Simple Voice Chat antes de entrar al servidor.',
      content:
        'El modpack incluye Simple Voice Chat preinstalado y configurado en el puerto del servidor. Presiona la tecla "V" en el juego para calibrar tu volumen, sensibilidad de micrófono y probar el efecto 3D acústico en cuevas.',
    },
  ],
  schedule: [
    {
      id: 'sched-1',
      time: '18:00 CEST',
      title: 'Apertura de Puertas & Reagrupamiento',
      description: 'Acceso anticipado para exploración inicial y recolección de madera/hierro sin PVP.',
      type: 'special',
    },
    {
      id: 'sched-2',
      time: '20:00 CEST',
      title: 'Activación de la Noche de Sangre',
      description: 'Comienza el PVP global en todo el mundo abierto. Cae la primera oleada de airdrops.',
      type: 'pvp',
    },
    {
      id: 'sched-3',
      time: '22:30 CEST',
      title: 'Ruleta de la Fortuna Sangrienta',
      description: 'Evento comunitario en el coliseo central: sacrificios, duelos y recompensas legendarias.',
      type: 'roulette',
    },
    {
      id: 'sched-4',
      time: '00:00 CEST',
      title: 'Cierre de la Luna Llena & Airdrop Final',
      description: 'Último botín supremo con equipamiento mítico y recuento de bajas.',
      type: 'airdrop',
    },
  ],
  rules: [
    {
      category: 'Combate y Alianzas',
      items: [
        'Tamaño de escuadrón limitado a 3 jugadores simultáneos en combate.',
        'Prohibido el spawnkill en el punto de reaparición inicial (radio de 100 bloques pacífico).',
        'El combate logger matará automáticamente a quien desconecte en medio de un golpe durante 15 segundos.',
      ],
    },
    {
      category: 'Uso de Mods & Clientes',
      items: [
        'Solo se permite el modpack oficial descargado a través de este Launcher.',
        'Shaders y paquetes de texturas cosméticos están permitidos (Oculus / Embeddium).',
        'Cualquier intento de inyectar dlls o modificar el classpath de Forge resultará en baneo de hardware.',
      ],
    },
    {
      category: 'Eventos y Botín',
      items: [
        'El botín de los Airdrops pertenece al primer escuadrón que rompa el precinto.',
        'La Ruleta es de participación voluntaria con entrada pagada en lingotes de oro o hierro.',
      ],
    },
  ],
};
