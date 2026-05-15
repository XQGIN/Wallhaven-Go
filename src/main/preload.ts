import { contextBridge, ipcRenderer } from 'electron';
import { DownloadSettings, DownloadStartParams, DownloadProgress, WallpaperItem } from '../shared/types';

export interface ElectronAPI {
  settings: {
    get: () => Promise<DownloadSettings>;
    set: (settings: Partial<DownloadSettings>) => Promise<void>;
    reset: () => Promise<void>;
    export: (path: string) => Promise<boolean>;
    import: (path: string) => Promise<boolean>;
  };
  download: {
    start: (params: DownloadStartParams) => Promise<void>;
    stop: () => Promise<void>;
    pause: () => Promise<void>;
    resume: () => Promise<void>;
  };
  onDownloadProgress: (callback: (progress: DownloadProgress) => void) => void;
  onDownloadCompleted: (callback: () => void) => void;
  onDownloadFailed: (callback: (error: string) => void) => void;
  onImageDownloaded: (callback: (item: WallpaperItem) => void) => void;
  removeAllListeners: (channel: string) => void;
  app: {
    version: () => Promise<string>;
    platform: () => Promise<NodeJS.Platform>;
  };
  dialog: {
    selectFolder: () => Promise<string | null>;
  };
  shell: {
    openPath: (path: string) => Promise<void>;
    openExternal: (url: string) => Promise<void>;
  };
  window: {
    minimize: () => Promise<void>;
    maximize: () => Promise<void>;
    close: () => Promise<void>;
    isMaximized: () => Promise<boolean>;
    onMaximizeChange: (callback: (isMaximized: boolean) => void) => void;
  };
}

// 暴露给渲染进程的 API
contextBridge.exposeInMainWorld('electronAPI', {
  // Settings
  settings: {
    get: (): Promise<DownloadSettings> => ipcRenderer.invoke('settings:get'),
    set: (settings: Partial<DownloadSettings>): Promise<void> =>
      ipcRenderer.invoke('settings:set', settings),
    reset: (): Promise<void> => ipcRenderer.invoke('settings:reset'),
    export: (path: string): Promise<boolean> =>
      ipcRenderer.invoke('settings:export', path),
    import: (path: string): Promise<boolean> =>
      ipcRenderer.invoke('settings:import', path),
  },

  // Download
  download: {
    start: (params: DownloadStartParams): Promise<void> =>
      ipcRenderer.invoke('download:start', params),
    stop: (): Promise<void> => ipcRenderer.invoke('download:stop'),
    pause: (): Promise<void> => ipcRenderer.invoke('download:pause'),
    resume: (): Promise<void> => ipcRenderer.invoke('download:resume'),
  },

  // Download events
  onDownloadProgress: (callback: (progress: DownloadProgress) => void) => {
    ipcRenderer.on('download:progress', (_, progress) => callback(progress));
  },
  onDownloadCompleted: (callback: () => void) => {
    ipcRenderer.on('download:completed', () => callback());
  },
  onDownloadFailed: (callback: (error: string) => void) => {
    ipcRenderer.on('download:failed', (_, error) => callback(error));
  },
  onImageDownloaded: (callback: (item: WallpaperItem) => void) => {
    ipcRenderer.on('download:image-downloaded', (_, item) => callback(item));
  },

  // Remove listeners
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },

  // System
  app: {
    version: (): Promise<string> => ipcRenderer.invoke('app:version'),
    platform: (): Promise<NodeJS.Platform> => ipcRenderer.invoke('app:platform'),
  },
  dialog: {
    selectFolder: (): Promise<string | null> =>
      ipcRenderer.invoke('dialog:select-folder'),
  },
  shell: {
    openPath: (path: string): Promise<void> =>
      ipcRenderer.invoke('shell:open-path', path),
    openExternal: (url: string): Promise<void> =>
      ipcRenderer.invoke('shell:open-external', url),
  },

  // Window controls
  window: {
    minimize: (): Promise<void> => ipcRenderer.invoke('window:minimize'),
    maximize: (): Promise<void> => ipcRenderer.invoke('window:maximize'),
    close: (): Promise<void> => ipcRenderer.invoke('window:close'),
    isMaximized: (): Promise<boolean> => ipcRenderer.invoke('window:is-maximized'),
    onMaximizeChange: (callback: (isMaximized: boolean) => void) => {
      ipcRenderer.on('window:maximize-change', (_, isMaximized) => callback(isMaximized));
    },
  },
});
