import { app, BrowserWindow, ipcMain, dialog, shell, Tray, Menu, nativeImage, protocol, NativeImage, screen } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { SettingsManager } from './settings-manager';
import { DownloadManager } from './download-manager';
import { DownloadSettings, DownloadStartParams } from '../shared/types';

const isDev = process.argv.includes('--dev');

// 禁用 GPU 加速以减少资源占用（可选，根据硬件情况）
// app.disableHardwareAcceleration();

// 禁用 GPU 沙箱以提升稳定性
app.commandLine.appendSwitch('disable-gpu-sandbox');

// 限制渲染进程的内存使用
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=512');

// 禁用不必要的 Chromium 特性以节省资源
app.commandLine.appendSwitch('disable-features', 'Translate,BackForwardCache,InterestFeedContentSuggestions,MediaRouter,OptimizationHints,NetworkPrediction,OfflinePagesPrefetching');

// 禁用后台网络跟踪
app.commandLine.appendSwitch('disable-background-networking');

// 减少渲染进程的优先级（后台时）
app.commandLine.appendSwitch('enable-features', 'LowPriorityIframes,v8_low_priority_tasks');

class WallhavenApp {
  private mainWindow: BrowserWindow | null = null;
  private settingsManager: SettingsManager;
  private downloadManager: DownloadManager;
  private tray: Tray | null = null;
  private isQuitting = false;

  constructor() {
    this.settingsManager = new SettingsManager();
    this.downloadManager = new DownloadManager();
    this.setupApp();
  }

  private setupApp(): void {
    // 注册 local-image 协议，用于安全地访问本地图片
    protocol.registerSchemesAsPrivileged([
      { scheme: 'local-image', privileges: { secure: true, standard: true, supportFetchAPI: true } }
    ]);

    app.whenReady().then(() => {
      // 注册本地文件协议处理程序
      protocol.handle('local-image', (request) => {
        const filePath = decodeURIComponent(request.url.replace('local-image://', ''));
        try {
          if (fs.existsSync(filePath)) {
            return new Response(fs.readFileSync(filePath), {
              headers: { 'Content-Type': 'image/jpeg' }
            });
          }
        } catch (error) {
          console.error('[Protocol] 读取文件失败:', filePath, error);
        }
        return new Response('Not Found', { status: 404 });
      });

      this.createWindow();
      this.createTray();
      this.setupIpcHandlers();
      this.setupDownloadEvents();
      this.setupDisplayChangeHandler();

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          this.createWindow();
        } else {
          this.mainWindow?.show();
        }
      });
    });

    app.on('window-all-closed', () => {
      this.downloadManager.stop();
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('before-quit', () => {
      this.isQuitting = true;
      this.downloadManager.stop();
    });


  }

  private createWindow(): void {
    // 获取窗口图标（任务栏图标）
    const windowIcon = this.createWindowIcon();
    
    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1000,
      minHeight: 700,
      title: 'WallHaven Go',
      titleBarStyle: 'hidden',
      frame: false,
      backgroundColor: '#f5f5f5',
      show: false,
      icon: windowIcon,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
        // 性能优化：限制 WebGL 和动画帧率
        offscreen: false,
        // 禁用不必要的 Web 特性
        webgl: true, // 保持启用以支持 Three.js，但会在渲染层优化
        experimentalFeatures: false,
        // 启用硬件加速但限制资源使用
        allowRunningInsecureContent: false,
        // 预加载策略
        spellcheck: false,
      },
    });

    // 窗口隐藏时降低帧率以节省资源
    this.mainWindow.on('hide', () => {
      this.mainWindow?.webContents.setFrameRate(5);
    });

    this.mainWindow.on('show', () => {
      this.mainWindow?.webContents.setFrameRate(60);
    });

    // 窗口最小化时降低帧率
    this.mainWindow.on('minimize', () => {
      this.mainWindow?.webContents.setFrameRate(10);
    });

    this.mainWindow.on('restore', () => {
      this.mainWindow?.webContents.setFrameRate(60);
    });

    // 移除默认菜单栏
    this.mainWindow.setMenu(null);

    // 加载页面
    if (isDev) {
      this.mainWindow.loadURL('http://localhost:5173');
      // 延迟打开 DevTools 避免内部错误
      this.mainWindow.webContents.once('did-finish-load', () => {
        this.mainWindow?.webContents.openDevTools();
      });
    } else {
      this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
    });

    // 处理窗口关闭事件 - 最小化到托盘而不是退出
    this.mainWindow.on('close', (event) => {
      if (!this.isQuitting) {
        event.preventDefault();
        this.mainWindow?.hide();
      }
    });

    // 处理最小化事件
    this.mainWindow.on('minimize', () => {
      // 可选：最小化时也隐藏到托盘
      // this.mainWindow?.hide();
    });
  }

  private getIconDir(): string {
    // 统一使用 public/icon 目录
    if (isDev) {
      return path.join(__dirname, '..', '..', 'public', 'icon');
    }

    // 生产环境优先查找 asar 解压目录
    let iconDir = path.join(process.resourcesPath, 'app.asar.unpacked', 'public', 'icon');
    if (!fs.existsSync(iconDir)) {
      iconDir = path.join(process.resourcesPath, 'app', 'public', 'icon');
    }
    if (!fs.existsSync(iconDir)) {
      iconDir = path.join(__dirname, '..', '..', 'public', 'icon');
    }
    return iconDir;
  }

  private getIconPath(): string {
    const iconDir = this.getIconDir();
    // 使用 SVG 作为图标源，Electron 会自动处理缩放
    return path.join(iconDir, 'logo.svg');
  }

  private createWindowIcon(): NativeImage {
    const iconDir = this.getIconDir();
    const iconPath = path.join(iconDir, 'logo-512.png');
    console.log('[Window] Loading PNG icon from:', iconPath);

    try {
      if (!fs.existsSync(iconPath)) {
        console.error('[Window] PNG icon not found at:', iconPath);
        return nativeImage.createEmpty();
      }

      const icon = nativeImage.createFromPath(iconPath);

      if (icon.isEmpty()) {
        console.error('[Window] Failed to load PNG icon');
        return nativeImage.createEmpty();
      }

      // Windows 任务栏预览图标推荐 32x32 或 48x48，避免锯齿
      if (process.platform === 'win32') {
        const size = icon.getSize();
        // 如果图标大于 64x64，缩放到 48x48 以获得更好的任务栏预览效果
        if (size.width > 64 || size.height > 64) {
          return icon.resize({
            width: 48,
            height: 48,
            quality: 'best',
          });
        }
      }

      return icon;
    } catch (error) {
      console.error('[Window] Failed to create window icon:', error);
      return nativeImage.createEmpty();
    }
  }

  private createTrayIcon(): NativeImage {
    const iconDir = this.getIconDir();
    const iconPath = path.join(iconDir, 'logo-512.png');
    console.log('[Tray] Loading PNG icon from:', iconPath);

    try {
      if (!fs.existsSync(iconPath)) {
        console.error('[Tray] PNG icon not found at:', iconPath);
        return nativeImage.createEmpty();
      }

      const icon = nativeImage.createFromPath(iconPath);

      if (icon.isEmpty()) {
        console.error('[Tray] Failed to load PNG icon');
        return nativeImage.createEmpty();
      }

      // 根据系统 DPI 缩放比例调整托盘图标尺寸
      const scaleFactor = this.getTrayIconScaleFactor();
      const traySize = Math.round(16 * scaleFactor);
      const size = icon.getSize();
      
      if (size.width !== traySize || size.height !== traySize) {
        return icon.resize({
          width: traySize,
          height: traySize,
          quality: 'best',
        });
      }
      
      return icon;
    } catch (error) {
      console.error('[Tray] Failed to create tray icon:', error);
      return nativeImage.createEmpty();
    }
  }

  private getTrayIconScaleFactor(): number {
    // 获取系统 DPI 缩放比例
    // Windows 标准 DPI 为 96，常见缩放比例：100%(96), 125%(120), 150%(144), 200%(192)
    try {
      const primaryDisplay = screen.getPrimaryDisplay();
      return primaryDisplay.scaleFactor || 1;
    } catch {
      // 如果 screen 模块未就绪，返回默认值
      return 1;
    }
  }

  private createTray(): void {
    try {
      const trayIcon = this.createTrayIcon();
      
      if (trayIcon.isEmpty()) {
        console.error('[Tray] Could not create valid tray icon');
        return;
      }
      
      this.tray = new Tray(trayIcon);
      this.tray.setToolTip('WallHaven Go');
      
      this.updateTrayContextMenu();

      // 点击托盘图标显示/隐藏窗口
      this.tray.on('click', () => {
        this.toggleWindow();
      });

      // 双击托盘图标显示窗口
      this.tray.on('double-click', () => {
        this.showWindow();
      });
      
      console.log('[Tray] Tray created successfully');
    } catch (error) {
      console.error('[Tray] Failed to create tray:', error);
    }
  }

  private setupDisplayChangeHandler(): void {
    // 监听显示器配置变化（包括 DPI 缩放变化）
    screen.on('display-metrics-changed', (_event, _display, changedMetrics) => {
      if (process.platform === 'win32' && changedMetrics?.includes('scaleFactor')) {
        console.log('[Display] Scale factor changed, updating tray icon...');
        // DPI 缩放变化时重新创建托盘图标
        this.recreateTrayIcon();
      }
    });

    // 监听显示器添加/移除
    screen.on('display-added', () => {
      console.log('[Display] Display added');
    });

    screen.on('display-removed', () => {
      console.log('[Display] Display removed');
    });
  }

  private recreateTrayIcon(): void {
    if (!this.tray) return;

    try {
      const newIcon = this.createTrayIcon();
      if (!newIcon.isEmpty()) {
        this.tray.setImage(newIcon);
        console.log('[Tray] Icon updated for new DPI scale');
      }
    } catch (error) {
      console.error('[Tray] Failed to recreate tray icon:', error);
    }
  }

  private updateTrayContextMenu(): void {
    if (!this.tray) return;

    const contextMenu = Menu.buildFromTemplate([
      {
        label: '显示窗口',
        click: () => this.showWindow(),
      },
      { type: 'separator' },
      {
        label: '开始下载',
        click: () => {
          this.mainWindow?.webContents.send('tray:start-download');
        },
      },
      {
        label: '停止下载',
        click: () => {
          this.downloadManager.stop();
        },
      },
      { type: 'separator' },
      {
        label: '彻底退出',
        click: () => {
          this.quitApp();
        },
      },
    ]);

    this.tray.setContextMenu(contextMenu);
  }

  private toggleWindow(): void {
    if (this.mainWindow?.isVisible()) {
      this.mainWindow.hide();
    } else {
      this.showWindow();
    }
  }

  private showWindow(): void {
    if (this.mainWindow) {
      if (this.mainWindow.isMinimized()) {
        this.mainWindow.restore();
      }
      this.mainWindow.show();
      this.mainWindow.focus();
    }
  }

  private quitApp(): void {
    this.isQuitting = true;
    this.downloadManager.stop();
    
    // 销毁托盘
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
    
    // 销毁窗口
    if (this.mainWindow) {
      this.mainWindow.destroy();
      this.mainWindow = null;
    }
    
    // 退出应用
    app.exit(0);
  }

  private setupIpcHandlers(): void {
    // Settings
    ipcMain.handle('settings:get', () => {
      return this.settingsManager.getSettings();
    });

    ipcMain.handle('settings:set', (_, settings: Partial<DownloadSettings>) => {
      this.settingsManager.updateSettings(settings);
    });

    ipcMain.handle('settings:reset', () => {
      this.settingsManager.resetToDefault();
    });

    ipcMain.handle('settings:export', async (_, filePath: string) => {
      try {
        await this.settingsManager.exportSettings(filePath);
        return true;
      } catch {
        return false;
      }
    });

    ipcMain.handle('settings:import', async (_, filePath: string) => {
      try {
        await this.settingsManager.importSettings(filePath);
        return true;
      } catch {
        return false;
      }
    });

    // Download
    ipcMain.handle('download:start', async (_, params: DownloadStartParams) => {
      await this.downloadManager.start(params);
    });

    ipcMain.handle('download:stop', () => {
      this.downloadManager.stop();
    });

    ipcMain.handle('download:pause', () => {
      this.downloadManager.pause();
    });

    ipcMain.handle('download:resume', () => {
      this.downloadManager.resume();
    });

    // App info
    ipcMain.handle('app:version', () => {
      return app.getVersion();
    });

    ipcMain.handle('app:platform', () => {
      return process.platform;
    });

    // Dialog
    ipcMain.handle('dialog:select-folder', async () => {
      const result = await dialog.showOpenDialog(this.mainWindow!, {
        properties: ['openDirectory'],
      });
      return result.canceled ? null : result.filePaths[0];
    });

    // Shell
    ipcMain.handle('shell:open-path', (_, filePath: string) => {
      shell.openPath(filePath);
    });

    ipcMain.handle('shell:open-external', (_, url: string) => {
      shell.openExternal(url);
    });

    // Window controls
    ipcMain.handle('window:minimize', () => {
      this.mainWindow?.minimize();
    });

    ipcMain.handle('window:maximize', () => {
      if (this.mainWindow?.isMaximized()) {
        this.mainWindow.unmaximize();
      } else {
        this.mainWindow?.maximize();
      }
    });

    ipcMain.handle('window:close', () => {
      // 关闭按钮只是隐藏窗口，不是退出
      this.mainWindow?.hide();
    });

    ipcMain.handle('window:is-maximized', () => {
      return this.mainWindow?.isMaximized() ?? false;
    });

    // Window state events
    this.mainWindow?.on('maximize', () => {
      this.mainWindow?.webContents.send('window:maximize-change', true);
    });

    this.mainWindow?.on('unmaximize', () => {
      this.mainWindow?.webContents.send('window:maximize-change', false);
    });

    // 彻底退出应用
    ipcMain.handle('app:quit', () => {
      this.quitApp();
    });
  }

  private setupDownloadEvents(): void {
    this.downloadManager.on('progress', (progress) => {
      this.mainWindow?.webContents.send('download:progress', progress);
      
      // 更新托盘提示显示下载进度
      if (progress.status === 'downloading') {
        this.tray?.setToolTip(`WallHaven Go - 下载中 ${progress.progress.toFixed(1)}%`);
      } else if (progress.status === 'completed') {
        this.tray?.setToolTip('WallHaven Go - 下载完成');
      }
    });

    this.downloadManager.on('completed', () => {
      this.mainWindow?.webContents.send('download:completed');
      this.tray?.setToolTip('WallHaven Go - 下载完成');
    });

    this.downloadManager.on('failed', (error) => {
      this.mainWindow?.webContents.send('download:failed', error);
    });

    this.downloadManager.on('image-downloaded', (item) => {
      this.mainWindow?.webContents.send('download:image-downloaded', item);
    });
  }
}

// 启动应用
new WallhavenApp();
