import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { DownloadSettings, DEFAULT_SETTINGS } from '../shared/types';

export class SettingsManager {
  private settingsPath: string;
  private settings: DownloadSettings;

  constructor() {
    this.settingsPath = path.join(app.getPath('userData'), 'settings.json');
    this.settings = this.loadSettings();
  }

  private loadSettings(): DownloadSettings {
    try {
      if (fs.existsSync(this.settingsPath)) {
        const data = fs.readFileSync(this.settingsPath, 'utf-8');
        const loaded = JSON.parse(data);
        return { ...DEFAULT_SETTINGS, ...loaded };
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }

    // 设置默认下载目录
    const defaultSettings = { ...DEFAULT_SETTINGS };
    defaultSettings.downloadDir = path.join(app.getPath('pictures'), 'Wallhaven');

    return defaultSettings;
  }

  public saveSettings(): void {
    try {
      const dir = path.dirname(this.settingsPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.settingsPath, JSON.stringify(this.settings, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  public getSettings(): DownloadSettings {
    return { ...this.settings };
  }

  public updateSettings(newSettings: Partial<DownloadSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.validateSettings();
    this.saveSettings();
  }

  public resetToDefault(): void {
    this.settings = { ...DEFAULT_SETTINGS };
    this.settings.downloadDir = path.join(app.getPath('pictures'), 'Wallhaven');
    this.saveSettings();
  }

  public exportSettings(exportPath: string): boolean {
    try {
      fs.writeFileSync(exportPath, JSON.stringify(this.settings, null, 2), 'utf-8');
      return true;
    } catch (error) {
      console.error('Failed to export settings:', error);
      return false;
    }
  }

  public importSettings(importPath: string): boolean {
    try {
      const data = fs.readFileSync(importPath, 'utf-8');
      const imported = JSON.parse(data);
      this.settings = { ...DEFAULT_SETTINGS, ...imported };
      this.validateSettings();
      this.saveSettings();
      return true;
    } catch (error) {
      console.error('Failed to import settings:', error);
      return false;
    }
  }

  private validateSettings(): void {
    // 验证数值范围
    this.settings.imagesPerPage = Math.max(1, Math.min(100, this.settings.imagesPerPage));
    this.settings.downloadTimeout = Math.max(10, Math.min(300, this.settings.downloadTimeout));
    this.settings.concurrentDownloads = Math.max(1, Math.min(50, this.settings.concurrentDownloads));
    this.settings.pageCount = Math.max(1, Math.min(999999, this.settings.pageCount));
    this.settings.startPage = Math.max(1, Math.min(999999, this.settings.startPage));

    // 验证枚举值
    const validThemes: Array<'light' | 'dark' | 'auto'> = ['light', 'dark', 'auto'];
    if (!validThemes.includes(this.settings.theme)) {
      this.settings.theme = 'light';
    }

    const validRatios = ['all', 'landscape', 'portrait', 'square', 'custom'];
    if (!validRatios.includes(this.settings.wallpaperRatio)) {
      this.settings.wallpaperRatio = 'all';
    }

    const validMethods = ['latest', 'category', 'search'];
    if (!validMethods.includes(this.settings.downloadMethod)) {
      this.settings.downloadMethod = 'latest';
    }

    const validLanguages: Array<'zh_CN' | 'en_US'> = ['zh_CN', 'en_US'];
    if (!validLanguages.includes(this.settings.language)) {
      this.settings.language = 'zh_CN';
    }
  }
}
