import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import axios, { AxiosInstance } from 'axios';
import { DownloadStartParams, DownloadProgress, WallpaperItem } from '../shared/types';

interface DownloadState {
  isRunning: boolean;
  isPaused: boolean;
  currentPage: number;
  totalPages: number;
  processedUrls: Set<string>;
  downloadedFiles: Set<string>;
  existingFilesCache: Set<string>;
}

interface WallhavenApiItem {
  id: string;
  url: string;
  short_url: string;
  views: number;
  favorites: number;
  source: string;
  purity: string;
  category: string;
  dimension_x: number;
  dimension_y: number;
  resolution: string;
  ratio: string;
  file_size: number;
  file_type: string;
  created_at: string;
  colors: string[];
  path: string;
  thumbs: {
    large: string;
    original: string;
    small: string;
  };
  tags: Array<{
    id: number;
    name: string;
    alias: string;
    category_id: number;
    category: string;
    purity: string;
    created_at: string;
  }>;
}

// 简单的 Set 缓存已足够，不需要 LRU
export class DownloadManager extends EventEmitter {
  private state: DownloadState;
  private axiosInstance: AxiosInstance;
  private abortController: AbortController | null = null;
  private stats = {
    total: 0,
    success: 0,
    failed: 0,
    skipped: 0,
  };

  constructor() {
    super();
    this.state = {
      isRunning: false,
      isPaused: false,
      currentPage: 1,
      totalPages: 1,
      processedUrls: new Set(),
      downloadedFiles: new Set(),
      existingFilesCache: new Set(),
    };

    this.axiosInstance = axios.create({
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.8,en-US;q=0.5,en;q=0.3',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Referer': 'https://wallhaven.cc/',
      },
      timeout: 30000,
    });
  }

  public async start(params: DownloadStartParams): Promise<void> {
    console.log('[DownloadManager] 开始下载任务');

    if (this.state.isRunning) {
      console.warn('[DownloadManager] 下载任务已在运行中');
      return;
    }

    this.state.isRunning = true;
    this.state.isPaused = false;
    this.abortController = new AbortController();
    this.stats = { total: 0, success: 0, failed: 0, skipped: 0 };
    this.state.existingFilesCache.clear();

    if (!fs.existsSync(params.downloadDir)) {
      fs.mkdirSync(params.downloadDir, { recursive: true });
    }

    await this.scanExistingFiles(params.downloadDir);
    await this.downloadLoop(params);
  }

  public stop(): void {
    console.log('[DownloadManager] 收到停止命令');
    this.state.isRunning = false;
    this.state.isPaused = false;
    this.abortController?.abort();
  }

  public pause(): void {
    this.state.isPaused = true;
  }

  public resume(): void {
    this.state.isPaused = false;
  }

  private async scanExistingFiles(downloadDir: string): Promise<void> {
    try {
      const files = await fs.promises.readdir(downloadDir);
      for (const file of files) {
        if (file.startsWith('wallhaven-') && (file.endsWith('.jpg') || file.endsWith('.png'))) {
          const filePath = path.join(downloadDir, file);
          try {
            const stats = await fs.promises.stat(filePath);
            if (stats.size > 1024) {
              this.state.downloadedFiles.add(file);
              this.state.existingFilesCache.add(file);
            } else {
              await fs.promises.unlink(filePath);
              console.log(`[DownloadManager] 删除不完整文件: ${file}`);
            }
          } catch (e) {
            this.state.downloadedFiles.add(file);
            this.state.existingFilesCache.add(file);
          }
        }
      }
      console.log(`[DownloadManager] 扫描完成: ${this.state.existingFilesCache.size} 个已存在文件`);
    } catch (error) {
      console.error('[DownloadManager] 扫描失败:', error);
    }
  }

  private async downloadLoop(params: DownloadStartParams): Promise<void> {
    try {
      // 串行获取页面数据，避免一次性发起过多请求
      const allItems: WallhavenApiItem[] = [];

      for (let page = params.startPage; page < params.startPage + params.pageCount; page++) {
        if (!this.state.isRunning) break;

        while (this.state.isPaused && this.state.isRunning) {
          await this.delay(500);
        }

        const items = await this.fetchPageWithRetry(`${params.baseUrl}${page}`, page);
        if (items) {
          for (const item of items) {
            const filename = path.basename(item.path);
            if (!this.state.processedUrls.has(item.path) &&
                !this.state.existingFilesCache.has(filename) &&
                !this.state.downloadedFiles.has(filename)) {
              this.state.processedUrls.add(item.path);
              allItems.push(item);
            }
          }
        }

        // 每获取一页后让出事件循环，防止阻塞
        await this.delay(100);
      }

      this.stats.total = allItems.length;
      console.log(`[DownloadManager] 总计待下载: ${allItems.length} 个文件`);
      this.emitProgress('', true);

      if (allItems.length === 0) {
        this.emit('completed');
        return;
      }

      // 使用分批处理，避免内存溢出
      await this.batchDownload(allItems, params);

      if (this.state.isRunning) {
        console.log(`[DownloadManager] 完成: success=${this.stats.success}, failed=${this.stats.failed}, skipped=${this.stats.skipped}`);
        this.emit('completed');
      }
    } catch (error) {
      console.error('[DownloadManager] 下载循环异常:', error);
      this.emit('failed', error instanceof Error ? error.message : String(error));
    } finally {
      this.state.isRunning = false;
      this.state.isPaused = false;
    }
  }

  // 分批下载，避免一次性创建过多 Promise
  private async batchDownload(items: WallhavenApiItem[], params: DownloadStartParams): Promise<void> {
    const batchSize = params.concurrentDownloads;
    let index = 0;

    while (index < items.length && this.state.isRunning) {
      while (this.state.isPaused && this.state.isRunning) {
        await this.delay(500);
      }

      // 取一批数据
      const batch = items.slice(index, index + batchSize);
      console.log(`[DownloadManager] 下载批次 ${index + 1}-${Math.min(index + batchSize, items.length)} / ${items.length}`);

      // 并发下载这一批
      const promises = batch.map(item => this.downloadItem(item, params.downloadDir));
      await Promise.all(promises);

      index += batchSize;

      // 每批完成后让出事件循环，防止阻塞主线程
      await this.delay(50);
    }
  }

  private async fetchPageWithRetry(url: string, pageNum: number): Promise<WallhavenApiItem[] | null> {
    const maxRetries = 3;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const items = await this.fetchPage(url);
        if (items) return items;
      } catch (error) {
        if (axios.isCancel(error)) return null;

        if (attempt < maxRetries - 1) {
          const waitTime = Math.min(Math.pow(2, attempt), 5);
          console.log(`[DownloadManager] 第 ${pageNum} 页重试 ${attempt + 1}/${maxRetries}, 等待 ${waitTime}s`);
          await this.delay(waitTime * 1000);
        }
      }
    }
    return null;
  }

  private async downloadItem(item: WallhavenApiItem, downloadDir: string): Promise<void> {
    const filename = path.basename(item.path);
    const filePath = path.join(downloadDir, filename);

    try {
      this.emitProgress(filename, false);
      const result = await this.downloadFile(item.path, filePath);

      if (result === 'skipped') {
        this.stats.skipped++;
      } else if (fs.existsSync(filePath)) {
        const stats = await fs.promises.stat(filePath);
        if (stats.size > 1024) {
          this.stats.success++;
          this.state.downloadedFiles.add(filename);
          this.state.existingFilesCache.add(filename);

          const wallpaperItem: WallpaperItem = {
            id: item.id,
            url: item.url,
            path: filePath,
            filename,
            thumbnail: item.thumbs.small,
            resolution: item.resolution,
            fileSize: item.file_size,
            category: item.category,
            purity: item.purity,
          };

          this.emit('image-downloaded', wallpaperItem);
        } else {
          await fs.promises.unlink(filePath);
          this.stats.failed++;
        }
      } else {
        this.stats.failed++;
      }

      this.emitProgress('', false);
    } catch (error) {
      console.error(`[DownloadManager] 下载失败 ${filename}:`, error);
      this.stats.failed++;
      this.emitProgress('', false);
    }
  }

  private async fetchPage(url: string): Promise<WallhavenApiItem[] | null> {
    try {
      const response = await this.axiosInstance.get(url, {
        signal: this.abortController?.signal,
      });

      if (response.data && response.data.data) {
        return response.data.data;
      }
    } catch (error) {
      if (axios.isCancel(error)) return null;
      console.error('[DownloadManager] API请求失败:', error);
    }
    return null;
  }

  private async downloadFile(url: string, filePath: string): Promise<'success' | 'skipped'> {
    const maxRetries = 3;
    const filename = path.basename(filePath);

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      // 清理可能存在的旧文件
      if (fs.existsSync(filePath)) {
        try {
          await fs.promises.unlink(filePath);
        } catch (e) {
          // 忽略
        }
      }

      try {
        const response = await this.axiosInstance.get(url, {
          responseType: 'stream',
          signal: this.abortController?.signal,
          timeout: 30000,
        });

        if (response.status === 403 || response.status === 404) {
          return 'skipped';
        }

        if (response.status === 429) {
          const waitTime = Math.min(Math.pow(2, attempt + 2), 15);
          await this.delay(waitTime * 1000);
          continue;
        }

        if (response.status !== 200) {
          throw new Error(`HTTP ${response.status}`);
        }

        const writer = fs.createWriteStream(filePath);

        await new Promise<void>((resolve, reject) => {
          let streamError: Error | null = null;

          response.data.on('data', () => {
            if (!this.state.isRunning && !streamError) {
              streamError = new Error('Download cancelled');
              writer.destroy();
              reject(streamError);
            }
          });

          response.data.pipe(writer);

          writer.on('finish', () => {
            if (!streamError) resolve();
          });

          writer.on('error', (err) => {
            if (!streamError) {
              streamError = err;
              reject(err);
            }
          });

          response.data.on('error', (err: Error) => {
            if (!streamError) {
              streamError = err;
              writer.destroy();
              reject(err);
            }
          });
        });

        // 验证文件大小
        const stats = await fs.promises.stat(filePath);
        if (stats.size < 1024) {
          await fs.promises.unlink(filePath);
          throw new Error('File too small');
        }

        return 'success';
      } catch (error) {
        if (axios.isCancel(error)) throw error;

        // 清理文件
        if (fs.existsSync(filePath)) {
          try {
            await fs.promises.unlink(filePath);
          } catch (e) {
            // 忽略
          }
        }

        if (attempt === maxRetries - 1) {
          throw error;
        }

        const waitTime = Math.min(Math.pow(2, attempt), 3);
        await this.delay(waitTime * 1000);
      }
    }

    throw new Error('Max retries exceeded');
  }

  private emitProgress(currentFile: string, isTotalUpdate: boolean): void {
    const progress: DownloadProgress = {
      total: this.stats.total,
      success: this.stats.success,
      failed: this.stats.failed,
      skipped: this.stats.skipped,
      currentFile,
      percent: this.stats.total > 0
        ? Math.round(((this.stats.success + this.stats.failed + this.stats.skipped) / this.stats.total) * 100)
        : 0,
    };

    this.emit('progress', progress);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
