import { create } from 'zustand';
import { EventFeed } from '../types/launcher';
import { DEFAULT_EVENT_FEED } from '../data/defaultNews';

const STORAGE_LAST_READ_KEY = 'monoevents_last_read_article_id';
const DEFAULT_NEWS_ENDPOINT = 'https://raw.githubusercontent.com/MonoEvents/manifests/main/news.json';

interface NewsState {
  feed: EventFeed;
  isLoading: boolean;
  unreadCount: number;
  fetchRemoteNews: (customUrl?: string) => Promise<void>;
  markAllAsRead: () => void;
}

export const useNewsStore = create<NewsState>((set, get) => ({
  feed: DEFAULT_EVENT_FEED,
  isLoading: false,
  unreadCount: 0,

  fetchRemoteNews: async (customUrl) => {
    set({ isLoading: true });

    let activeFeed = DEFAULT_EVENT_FEED;
    const targetUrl = customUrl || DEFAULT_NEWS_ENDPOINT;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    try {
      const response = await fetch(targetUrl, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });

      if (response.ok) {
        const remoteData = (await response.json()) as Partial<EventFeed>;
        if (remoteData) {
          activeFeed = {
            version: remoteData.version || DEFAULT_EVENT_FEED.version,
            updatedAt: remoteData.updatedAt || DEFAULT_EVENT_FEED.updatedAt,
            articles: Array.isArray(remoteData.articles)
              ? remoteData.articles
              : DEFAULT_EVENT_FEED.articles,
            schedule: Array.isArray(remoteData.schedule)
              ? remoteData.schedule
              : DEFAULT_EVENT_FEED.schedule,
            rules: Array.isArray(remoteData.rules)
              ? remoteData.rules
              : DEFAULT_EVENT_FEED.rules,
          };
        }
      }
    } catch {
      // Graceful fallback to DEFAULT_EVENT_FEED if offline, blocked, or timed out
      activeFeed = DEFAULT_EVENT_FEED;
    } finally {
      clearTimeout(timeoutId);
    }

    // Calculate unread count
    const lastReadId = localStorage.getItem(STORAGE_LAST_READ_KEY);
    let unread = 0;

    if (!lastReadId) {
      unread = activeFeed.articles.length;
    } else {
      const lastIndex = activeFeed.articles.findIndex((a) => a.id === lastReadId);
      if (lastIndex === -1) {
        unread = activeFeed.articles.length;
      } else {
        unread = lastIndex; // Articles before this index in descending date order are newer
      }
    }

    set({
      feed: activeFeed,
      isLoading: false,
      unreadCount: unread,
    });
  },

  markAllAsRead: () => {
    const { feed } = get();
    const latestArticle = feed.articles[0];
    if (latestArticle) {
      localStorage.setItem(STORAGE_LAST_READ_KEY, latestArticle.id);
    }
    set({ unreadCount: 0 });
  },
}));
