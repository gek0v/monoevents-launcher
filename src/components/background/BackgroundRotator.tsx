import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import {
  SERVER_WALLPAPERS,
  WallpaperInfo,
  fetchServerWallpapers,
  WALLPAPERS_CACHE_KEY,
} from '../../data/wallpapers';

interface BackgroundRotatorProps {
  children?: React.ReactNode;
}

const getInitialWallpapers = (): WallpaperInfo[] => {
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
};

export const BackgroundRotator: React.FC<BackgroundRotatorProps> = ({ children }) => {
  const [wallpapers, setWallpapers] = useState<WallpaperInfo[]>(getInitialWallpapers);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  // Fetch fresh community wallpapers on mount
  useEffect(() => {
    let isMounted = true;
    fetchServerWallpapers().then((list) => {
      if (isMounted && list && list.length > 0) {
        setWallpapers(list);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Pick next index on cycle boot or when wallpapers list loads
  useEffect(() => {
    try {
      const total = wallpapers.length;
      if (total === 0) return;

      const stored = localStorage.getItem('monoevents_last_wallpaper_idx');
      let nextIdx = 0;
      if (stored !== null) {
        const lastIdx = parseInt(stored, 10);
        if (!isNaN(lastIdx)) {
          nextIdx = (lastIdx + 1) % total;
        }
      } else {
        nextIdx = Math.floor(Math.random() * total);
      }
      localStorage.setItem('monoevents_last_wallpaper_idx', nextIdx.toString());
      setCurrentIndex(nextIdx);
    } catch {
      setCurrentIndex(0);
    }
  }, [wallpapers.length]);

  const total = wallpapers.length;
  const safeIndex = total > 0 ? (currentIndex % total + total) % total : 0;
  const currentWallpaper: WallpaperInfo = wallpapers[safeIndex] || SERVER_WALLPAPERS[0];

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (total === 0) return;
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (total === 0) return;
    setCurrentIndex((prev) => (prev + 1) % total);
  };

  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-slate-950">
      {/* Background Images with smooth Crossfade */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {wallpapers.map((wp, idx) => {
          const isActive = idx === safeIndex;
          return (
            <div
              key={wp.id}
              className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out transform scale-105 ${
                isActive ? 'opacity-100' : 'opacity-0'
              }`}
              style={{
                backgroundImage: `url(${wp.url})`,
              }}
            />
          );
        })}
      </div>

      {/* Layer 1: Cinematic Radial Vignette */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 45%, rgba(2, 6, 23, 0.25) 0%, rgba(2, 6, 23, 0.75) 70%, rgba(2, 6, 23, 0.95) 100%)',
        }}
      />

      {/* Layer 2: Vertical Darkening for Header & Playbar Readability */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background:
            'linear-gradient(to bottom, rgba(2, 6, 23, 0.85) 0%, rgba(2, 6, 23, 0.2) 25%, rgba(2, 6, 23, 0.3) 70%, rgba(2, 6, 23, 0.92) 100%)',
        }}
      />

      {/* Layer 3: Subtle Amber / Orange Ambient Glow */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-600/10 rounded-full blur-[120px] pointer-events-none z-[1]" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-amber-600/10 rounded-full blur-[120px] pointer-events-none z-[1]" />

      {/* Main UI Children on Top */}
      <div className="relative z-10 w-full h-full flex flex-col justify-between">
        {children}

        {/* Minimalist Wallpaper Badge & Switcher */}
        <div className="absolute bottom-24 right-6 z-20 flex items-center gap-2 bg-slate-950/70 backdrop-blur-md border border-white/10 rounded-full px-3 py-1 shadow-lg shadow-black/40 text-slate-300 transition-all hover:bg-slate-900/80 hover:border-orange-500/30">
          <ImageIcon className="w-3.5 h-3.5 text-orange-400" />
          <span className="text-[11px] font-semibold text-slate-200 tracking-wide">
            {currentWallpaper.title}
          </span>
          {currentWallpaper.author && (
            <span className="text-[10px] text-amber-400/90 font-medium pl-1 border-l border-white/10 flex items-center gap-1">
              <span>{currentWallpaper.category === 'Dibujo / Fanart' ? '🎨' : '📸'}</span>
              <span>@{currentWallpaper.author}</span>
            </span>
          )}
          <div className="flex items-center gap-1 pl-1 border-l border-white/10">
            <button
              type="button"
              onClick={handlePrev}
              title="Fondo anterior"
              className="p-0.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono text-slate-400 px-0.5">
              {safeIndex + 1}/{total}
            </span>
            <button
              type="button"
              onClick={handleNext}
              title="Siguiente fondo"
              className="p-0.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
