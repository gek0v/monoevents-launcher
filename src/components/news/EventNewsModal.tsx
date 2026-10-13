import React, { useEffect, useState } from 'react';
import {
  X,
  Newspaper,
  Scroll,
  Calendar,
  Flame,
  Shield,
  Clock,
  Sparkles,
  Swords,
  Gift,
  HelpCircle,
} from 'lucide-react';
import { useNewsStore } from '../../stores/newsStore';
import type { NewsCategory } from '../../types/launcher';

interface EventNewsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'news' | 'rules' | 'schedule';

export const EventNewsModal: React.FC<EventNewsModalProps> = ({ isOpen, onClose }) => {
  const { feed, markAllAsRead, isLoading } = useNewsStore();
  const [activeTab, setActiveTab] = useState<TabType>('news');

  useEffect(() => {
    if (isOpen) {
      markAllAsRead();
    }
  }, [isOpen, markAllAsRead]);

  if (!isOpen) return null;

  const getCategoryBadgeClass = (category: NewsCategory) => {
    switch (category) {
      case 'EVENTO':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      case 'REGLAS':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'ACTUALIZACIÓN':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'AVISO':
        return 'bg-violet-500/20 text-violet-400 border-violet-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  const getScheduleTypeBadge = (type: string) => {
    switch (type) {
      case 'airdrop':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
            <Gift className="w-3 h-3" /> Airdrop
          </span>
        );
      case 'pvp':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <Swords className="w-3 h-3" /> PVP Sangriento
          </span>
        );
      case 'roulette':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Sparkles className="w-3 h-3" /> Ruleta Mortal
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-500/15 text-purple-400 border border-purple-500/30">
            <Flame className="w-3 h-3" /> Especial
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-4xl max-h-[90vh] bg-slate-950 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-900/60 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <Flame className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-wide">
                  MonoCraft: Noche de Sangre
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  v{feed.version}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Tablón de anuncios, normativa de combate y cronograma en vivo
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
        <div className="flex items-center gap-2 px-6 py-3 border-b border-white/5 bg-slate-950/80">
          <button
            onClick={() => setActiveTab('news')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'news'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-lg shadow-rose-500/10'
                : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Newspaper className="w-4 h-4" />
            Novedades ({feed.articles?.length ?? 0})
          </button>

          <button
            onClick={() => setActiveTab('rules')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'rules'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-lg shadow-rose-500/10'
                : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Scroll className="w-4 h-4" />
            Reglamento
          </button>

          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'schedule'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-lg shadow-rose-500/10'
                : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Cronograma ({feed.schedule?.length ?? 0})
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-20 text-slate-500 text-sm">
              <span className="animate-pulse">Cargando anuncios del servidor...</span>
            </div>
          ) : activeTab === 'news' ? (
            <div className="space-y-4">
              {(feed.articles ?? []).map((article) => (
                <article
                  key={article.id}
                  className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded text-[10px] font-bold border tracking-wider ${getCategoryBadgeClass(
                          article.category
                        )}`}
                      >
                        {article.category}
                      </span>
                      {article.important && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-600/30 text-red-300 border border-red-500/40">
                          IMPORTANTE
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500">
                      {article.date} • {article.author}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-base font-bold text-white">{article.title}</h4>
                    <p className="text-xs font-medium text-rose-300/80 mt-1">
                      {article.summary}
                    </p>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line border-t border-white/5 pt-3">
                    {article.content}
                  </p>
                </article>
              ))}
            </div>
          ) : activeTab === 'rules' ? (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs flex items-start gap-3">
                <Shield className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Aviso de Juego Limpio:</span> El incumplimiento de
                  estas directrices conllevará expulsión inmediata y baneo del evento sin previo
                  aviso.
                </div>
              </div>

              {(feed.rules ?? []).map((ruleCat, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-3"
                >
                  <h4 className="text-sm font-bold text-rose-400 flex items-center gap-2">
                    <HelpCircle className="w-4 h-4" />
                    {ruleCat.category}
                  </h4>
                  <ul className="space-y-2">
                    {(ruleCat.items ?? []).map((item, itemIdx) => (
                      <li
                        key={itemIdx}
                        className="flex items-start gap-2.5 text-xs text-slate-300 leading-relaxed"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 mt-1.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {(feed.schedule ?? []).map((sched) => (
                <div
                  key={sched.id}
                  className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-colors"
                >
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-rose-400 font-mono text-xs font-bold shrink-0">
                    <Clock className="w-3.5 h-3.5 text-rose-400" />
                    {sched.time}
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-white">{sched.title}</h4>
                      {getScheduleTypeBadge(sched.type)}
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {sched.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-slate-900/40 text-xs text-slate-400">
          <span>Servidor Oficial: gek0.duckdns.org</span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
