export interface DownloadSettings {
    apiKey: string;
    theme: 'light' | 'dark' | 'auto';
    imagesPerPage: number;
    downloadTimeout: number;
    concurrentDownloads: number;
    previewSize: 'small' | 'medium' | 'large';
    downloadDir: string;
    downloadMethod: 'latest' | 'category' | 'search';
    categories: {
        general: boolean;
        anime: boolean;
        people: boolean;
    };
    purity: {
        sfw: boolean;
        sketchy: boolean;
        nsfw: boolean;
    };
    searchQuery: string;
    pageCount: number;
    wallpaperRatio: 'all' | 'landscape' | 'portrait' | 'square' | 'custom';
    startPage: number;
    showFilename: boolean;
    logLevel: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
    language: 'zh_CN' | 'en_US';
}
export interface DownloadProgress {
    total: number;
    success: number;
    failed: number;
    skipped: number;
    currentFile: string;
    percent: number;
}
export interface DownloadTask {
    id: string;
    url: string;
    filename: string;
    status: 'pending' | 'downloading' | 'completed' | 'failed' | 'skipped';
    progress: number;
    error?: string;
}
export interface WallpaperItem {
    id: string;
    url: string;
    path: string;
    filename: string;
    thumbnail: string;
    resolution: string;
    fileSize: number;
    category: string;
    purity: string;
}
export interface ApiResponse {
    data: WallpaperItem[];
    meta: {
        currentPage: number;
        lastPage: number;
        perPage: number;
        total: number;
    };
}
export declare const DEFAULT_SETTINGS: DownloadSettings;
export interface IpcChannels {
    'settings:get': () => DownloadSettings;
    'settings:set': (settings: Partial<DownloadSettings>) => void;
    'settings:reset': () => void;
    'settings:export': (path: string) => boolean;
    'settings:import': (path: string) => boolean;
    'download:start': (params: DownloadStartParams) => void;
    'download:stop': () => void;
    'download:pause': () => void;
    'download:resume': () => void;
    'download:progress': (progress: DownloadProgress) => void;
    'download:completed': () => void;
    'download:failed': (error: string) => void;
    'download:image-downloaded': (item: WallpaperItem) => void;
    'app:version': () => string;
    'app:platform': () => NodeJS.Platform;
    'dialog:select-folder': () => string | null;
    'shell:open-path': (path: string) => void;
    'shell:open-external': (url: string) => void;
}
export interface DownloadStartParams {
    baseUrl: string;
    startPage: number;
    pageCount: number;
    downloadDir: string;
    concurrentDownloads: number;
    downloadTimeout: number;
}
export type IpcChannel = keyof IpcChannels;
//# sourceMappingURL=types.d.ts.map