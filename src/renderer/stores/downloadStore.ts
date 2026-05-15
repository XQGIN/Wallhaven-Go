import { create } from 'zustand';
import {
  DownloadSettings,
  DownloadProgress,
  WallpaperItem,
  DownloadStartParams,
} from '@shared/types';

interface DownloadState {
  isDownloading: boolean;
  isPaused: boolean;
  progress: DownloadProgress;
  downloadedImages: WallpaperItem[];
  currentPage: number;
  totalPages: number;

  // Actions
  startDownload: (settings: DownloadSettings) => Promise<void>;
  stopDownload: () => Promise<void>;
  pauseDownload: () => Promise<void>;
  resumeDownload: () => Promise<void>;
  setupListeners: () => void;
  clearDownloadedImages: () => void;
  removeDownloadedImage: (id: string) => void;
}

const initialProgress: DownloadProgress = {
  total: 0,
  success: 0,
  failed: 0,
  skipped: 0,
  currentFile: '',
  percent: 0,
};

export const useDownloadStore = create<DownloadState>((set, get) => ({
  isDownloading: false,
  isPaused: false,
  progress: { ...initialProgress },
  downloadedImages: [],
  currentPage: 1,
  totalPages: 1,

  startDownload: async (settings: DownloadSettings) => {
    const { isDownloading } = get();
    if (isDownloading) return;

    // 构建 API URL
    const baseUrl = buildApiUrl(settings);

    // 高性能模式：提高并发数和超时时间
    const optimizedSettings = settings.highPerformanceMode
      ? {
          concurrentDownloads: Math.max(settings.concurrentDownloads, 20),
          downloadTimeout: Math.max(settings.downloadTimeout, 120),
        }
      : {
          concurrentDownloads: settings.concurrentDownloads,
          downloadTimeout: settings.downloadTimeout,
        };

    const params: DownloadStartParams = {
      baseUrl,
      startPage: settings.startPage,
      pageCount: settings.pageCount,
      downloadDir: settings.downloadDir,
      concurrentDownloads: optimizedSettings.concurrentDownloads,
      downloadTimeout: optimizedSettings.downloadTimeout,
    };

    set({
      isDownloading: true,
      isPaused: false,
      progress: { ...initialProgress },
    });

    try {
      await window.electronAPI.download.start(params);
    } catch (error) {
      console.error('Failed to start download:', error);
      set({ isDownloading: false });
    }
  },

  stopDownload: async () => {
    try {
      await window.electronAPI.download.stop();
      set({ isDownloading: false, isPaused: false });
    } catch (error) {
      console.error('Failed to stop download:', error);
    }
  },

  pauseDownload: async () => {
    try {
      await window.electronAPI.download.pause();
      set({ isPaused: true });
    } catch (error) {
      console.error('Failed to pause download:', error);
    }
  },

  resumeDownload: async () => {
    try {
      await window.electronAPI.download.resume();
      set({ isPaused: false });
    } catch (error) {
      console.error('Failed to resume download:', error);
    }
  },

  setupListeners: () => {
    // 清理旧监听器
    window.electronAPI.removeAllListeners('download:progress');
    window.electronAPI.removeAllListeners('download:completed');
    window.electronAPI.removeAllListeners('download:failed');
    window.electronAPI.removeAllListeners('download:image-downloaded');

    // 设置新监听器
    window.electronAPI.onDownloadProgress((progress) => {
      set({ progress });
    });

    window.electronAPI.onDownloadCompleted(() => {
      set({ isDownloading: false, isPaused: false });
    });

    window.electronAPI.onDownloadFailed((error) => {
      console.error('Download failed:', error);
      set({ isDownloading: false, isPaused: false });
    });

    window.electronAPI.onImageDownloaded((item) => {
      set((state) => ({
        downloadedImages: [...state.downloadedImages, item],
      }));
    });
  },

  clearDownloadedImages: () => {
    set({ downloadedImages: [] });
  },

  removeDownloadedImage: (id: string) => {
    set((state) => ({
      downloadedImages: state.downloadedImages.filter((img) => img.id !== id),
    }));
  },
}));

// 构建 API URL
function buildApiUrl(settings: DownloadSettings): string {
  const base = 'https://wallhaven.cc/api/v1/search?';
  const params: string[] = [];

  // 类别
  const categories = [
    settings.categories.general ? '1' : '0',
    settings.categories.anime ? '1' : '0',
    settings.categories.people ? '1' : '0',
  ].join('');
  params.push(`categories=${categories}`);

  // 纯度
  const purity = [
    settings.purity.sfw ? '1' : '0',
    settings.purity.sketchy ? '1' : '0',
    settings.purity.nsfw ? '1' : '0',
  ].join('');
  params.push(`purity=${purity}`);

  // 下载方式
  if (settings.downloadMethod === 'search' && settings.searchQuery) {
    params.push(`q=${encodeURIComponent(settings.searchQuery)}`);
  } else if (settings.downloadMethod === 'latest') {
    params.push('sorting=date_added');
    params.push('order=desc');
  }

  // 壁纸比例
  const ratioMap: Record<string, string> = {
    landscape: '&ratios=16x9,32x9,21x9',
    portrait: '&ratios=9x16,9x18',
    square: '&ratios=1x1',
    custom: '&ratios=16x9,9x16,21x9,9x18,1x1',
  };
  if (settings.wallpaperRatio !== 'all' && ratioMap[settings.wallpaperRatio]) {
    params.push(ratioMap[settings.wallpaperRatio]);
  }

  // API Key
  if (settings.apiKey) {
    params.push(`apikey=${settings.apiKey}`);
  }

  params.push('page=');
  return base + params.join('&');
}
