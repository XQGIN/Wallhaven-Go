import { create } from 'zustand';
import { DownloadSettings } from '@shared/types';

const DEFAULT_SETTINGS: DownloadSettings = {
  apiKey: '',
  theme: 'light',
  imagesPerPage: 64,
  downloadTimeout: 60,
  concurrentDownloads: 10,
  previewSize: 'medium',
  downloadDir: '',
  downloadMethod: 'latest',
  categories: {
    general: true,
    anime: false,
    people: false,
  },
  purity: {
    sfw: true,
    sketchy: false,
    nsfw: false,
  },
  searchQuery: '',
  pageCount: 1,
  wallpaperRatio: 'all',
  startPage: 1,
  showFilename: false,
  logLevel: 'INFO',
  language: 'zh_CN',
  highPerformanceMode: false,
};

interface SettingsState {
  settings: DownloadSettings;
  isLoading: boolean;
  loadSettings: () => Promise<void>;
  updateSettings: (settings: Partial<DownloadSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;
  exportSettings: (path: string) => Promise<boolean>;
  importSettings: (path: string) => Promise<boolean>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: { ...DEFAULT_SETTINGS },
  isLoading: false,

  loadSettings: async () => {
    set({ isLoading: true });
    try {
      const settings = await window.electronAPI.settings.get();
      set({ settings, isLoading: false });
    } catch (error) {
      console.error('Failed to load settings:', error);
      set({ isLoading: false });
    }
  },

  updateSettings: async (newSettings) => {
    try {
      await window.electronAPI.settings.set(newSettings);
      set((state) => ({
        settings: { ...state.settings, ...newSettings },
      }));
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
  },

  resetSettings: async () => {
    try {
      await window.electronAPI.settings.reset();
      const settings = await window.electronAPI.settings.get();
      set({ settings });
    } catch (error) {
      console.error('Failed to reset settings:', error);
    }
  },

  exportSettings: async (path: string) => {
    try {
      return await window.electronAPI.settings.export(path);
    } catch (error) {
      console.error('Failed to export settings:', error);
      return false;
    }
  },

  importSettings: async (path: string) => {
    try {
      const result = await window.electronAPI.settings.import(path);
      if (result) {
        const settings = await window.electronAPI.settings.get();
        set({ settings });
      }
      return result;
    } catch (error) {
      console.error('Failed to import settings:', error);
      return false;
    }
  },
}));
