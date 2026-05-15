import React from 'react';
import { motion } from 'framer-motion';
import { useSettingsStore } from '../../stores/settingsStore';
import { useDownloadStore } from '../../stores/downloadStore';
import { useI18n } from '../../hooks/useI18n';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import Select from '../../components/UI/Select';
import Checkbox from '../../components/UI/Checkbox';
import './DownloadPage.css';

const DownloadPage: React.FC = () => {
  const { settings, updateSettings } = useSettingsStore();
  const { isDownloading, startDownload, stopDownload } = useDownloadStore();
  const { t } = useI18n(settings.language);

  const handleBrowseDirectory = async () => {
    const path = await window.electronAPI.dialog.selectFolder();
    if (path) {
      updateSettings({ downloadDir: path });
    }
  };

  const handleStartDownload = () => {
    startDownload(settings);
  };

  const handleStopDownload = () => {
    stopDownload();
  };

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  };

  const isHighPerformance = settings.highPerformanceMode;

  const pageContent = (
    <>
      <h1 className="page-title">{t('download.title')}</h1>

      <div className="download-grid">
        {/* 下载方式 */}
        <Card title={t('download.method')} delay={0}>
          <div className="radio-group">
            <label className="radio-label">
              <input
                type="radio"
                name="downloadMethod"
                value="category"
                checked={settings.downloadMethod === 'category'}
                onChange={(e) => updateSettings({ downloadMethod: e.target.value as any })}
              />
              <span>{t('download.method.category')}</span>
            </label>
            <label className="radio-label">
              <input
                type="radio"
                name="downloadMethod"
                value="latest"
                checked={settings.downloadMethod === 'latest'}
                onChange={(e) => updateSettings({ downloadMethod: e.target.value as any })}
              />
              <span>{t('download.method.latest')}</span>
            </label>
            <label className="radio-label">
              <input
                type="radio"
                name="downloadMethod"
                value="search"
                checked={settings.downloadMethod === 'search'}
                onChange={(e) => updateSettings({ downloadMethod: e.target.value as any })}
              />
              <span>{t('download.method.search')}</span>
            </label>
          </div>
        </Card>

        {/* 类别设置 */}
        <Card title={t('download.category')} delay={0.1}>
          <div className="checkbox-group">
            <Checkbox
              label={t('download.category.general')}
              checked={settings.categories.general}
              onChange={(checked) =>
                updateSettings({
                  categories: { ...settings.categories, general: checked },
                })
              }
            />
            <Checkbox
              label={t('download.category.anime')}
              checked={settings.categories.anime}
              onChange={(checked) =>
                updateSettings({
                  categories: { ...settings.categories, anime: checked },
                })
              }
            />
            <Checkbox
              label={t('download.category.people')}
              checked={settings.categories.people}
              onChange={(checked) =>
                updateSettings({
                  categories: { ...settings.categories, people: checked },
                })
              }
            />
          </div>
        </Card>

        {/* 纯度设置 */}
        <Card title={t('download.purity')} delay={0.2}>
          <div className="checkbox-group">
            <Checkbox
              label={t('download.purity.sfw')}
              checked={settings.purity.sfw}
              onChange={(checked) =>
                updateSettings({
                  purity: { ...settings.purity, sfw: checked },
                })
              }
            />
            <Checkbox
              label={t('download.purity.sketchy')}
              checked={settings.purity.sketchy}
              onChange={(checked) =>
                updateSettings({
                  purity: { ...settings.purity, sketchy: checked },
                })
              }
            />
            <Checkbox
              label={t('download.purity.nsfw')}
              checked={settings.purity.nsfw}
              onChange={(checked) =>
                updateSettings({
                  purity: { ...settings.purity, nsfw: checked },
                })
              }
            />
          </div>
        </Card>

        {/* 壁纸比例 */}
        <Card title={t('download.ratio')} delay={0.3}>
          <Select
            value={settings.wallpaperRatio}
            onChange={(value) => updateSettings({ wallpaperRatio: value as any })}
            options={[
              { value: 'all', label: t('download.ratio.all') },
              { value: 'landscape', label: t('download.ratio.landscape') },
              { value: 'portrait', label: t('download.ratio.portrait') },
              { value: 'square', label: t('download.ratio.square') },
              { value: 'custom', label: t('download.ratio.custom') },
            ]}
          />
        </Card>

        {/* 搜索设置 */}
        {settings.downloadMethod === 'search' && (
          <Card title={t('download.search')} delay={0.4} className="search-card">
            <Input
              value={settings.searchQuery}
              onChange={(value) => updateSettings({ searchQuery: value })}
              placeholder={t('download.search.placeholder')}
            />
          </Card>
        )}

        {/* 下载参数 */}
        <Card title={t('download.directory')} delay={0.5}>
          <div className="directory-input">
            <Input
              value={settings.downloadDir}
              onChange={(value) => updateSettings({ downloadDir: value })}
              placeholder={t('download.directory')}
            />
            <Button variant="browse" onClick={handleBrowseDirectory}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
              {t('download.directory.browse')}
            </Button>
          </div>
        </Card>

        <Card title={t('download.startPage')} delay={0.6}>
          <Input
            type="number"
            value={settings.startPage.toString()}
            onChange={(value) => updateSettings({ startPage: parseInt(value) || 1 })}
            min={1}
            max={999999}
          />
        </Card>

        <Card title={t('download.pageCount')} delay={0.7}>
          <Input
            type="number"
            value={settings.pageCount.toString()}
            onChange={(value) => updateSettings({ pageCount: parseInt(value) || 1 })}
            min={1}
            max={999999}
          />
        </Card>

        <Card title={t('download.concurrent')} delay={0.8}>
          <Input
            type="number"
            value={settings.concurrentDownloads.toString()}
            onChange={(value) =>
              updateSettings({ concurrentDownloads: parseInt(value) || 1 })
            }
            min={1}
            max={50}
          />
        </Card>
      </div>

      {/* 控制按钮 */}
      {isHighPerformance ? (
        <div className="control-buttons">
          {isDownloading ? (
            <Button variant="danger" size="large" onClick={handleStopDownload}>
              {t('download.stop')}
            </Button>
          ) : (
            <Button variant="primary" size="large" onClick={handleStartDownload}>
              {t('download.start')}
            </Button>
          )}
        </div>
      ) : (
        <motion.div
          className="control-buttons"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.3 }}
        >
          {isDownloading ? (
            <Button variant="danger" size="large" onClick={handleStopDownload}>
              {t('download.stop')}
            </Button>
          ) : (
            <Button variant="primary" size="large" onClick={handleStartDownload}>
              {t('download.start')}
            </Button>
          )}
        </motion.div>
      )}
    </>
  );

  if (isHighPerformance) {
    return <div className="download-page">{pageContent}</div>;
  }

  return (
    <motion.div
      className="download-page"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.3 }}
    >
      {pageContent}
    </motion.div>
  );
};

export default DownloadPage;
