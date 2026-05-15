import React from 'react';
import { motion } from 'framer-motion';
import { useSettingsStore } from '../../stores/settingsStore';
import { useI18n } from '../../hooks/useI18n';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import Select from '../../components/UI/Select';
import Checkbox from '../../components/UI/Checkbox';
import './SettingsPage.css';

const SettingsPage: React.FC = () => {
  const { settings, updateSettings, resetSettings } = useSettingsStore();
  const { t } = useI18n(settings.language);

  const handleReset = async () => {
    if (window.confirm(t('message.resetConfirm'))) {
      await resetSettings();
    }
  };

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  };

  const isHighPerformance = settings.highPerformanceMode;

  const pageContent = (
    <>
      <h1 className="page-title">{t('settings.title')}</h1>

      <div className="settings-grid">
        {/* API 设置 */}
        <Card title={t('settings.apiKey')} delay={0}>
          <Input
            value={settings.apiKey}
            onChange={(value) => updateSettings({ apiKey: value })}
            placeholder={t('settings.apiKey.placeholder')}
            type="password"
          />
          <p className="setting-description">{t('settings.apiKey.description')}</p>
        </Card>

        {/* 主题设置 */}
        <Card title={t('settings.theme')} delay={0.1}>
          <Select
            value={settings.theme}
            onChange={(value) => updateSettings({ theme: value as any })}
            options={[
              { value: 'light', label: t('settings.theme.light') },
              { value: 'dark', label: t('settings.theme.dark') },
              { value: 'auto', label: t('settings.theme.auto') },
            ]}
          />
        </Card>

        {/* 语言设置 */}
        <Card title={t('settings.language')} delay={0.2}>
          <Select
            value={settings.language}
            onChange={(value) => updateSettings({ language: value as any })}
            options={[
              { value: 'zh_CN', label: t('settings.language.zhCN') },
              { value: 'en_US', label: t('settings.language.enUS') },
            ]}
          />
        </Card>

        {/* 下载参数 */}
        <Card title={t('settings.imagesPerPage')} delay={0.3}>
          <Input
            type="number"
            value={settings.imagesPerPage.toString()}
            onChange={(value) =>
              updateSettings({ imagesPerPage: Math.max(1, Math.min(100, parseInt(value) || 64)) })
            }
            min={1}
            max={100}
          />
        </Card>

        <Card title={t('settings.downloadTimeout')} delay={0.4}>
          <Input
            type="number"
            value={settings.downloadTimeout.toString()}
            onChange={(value) =>
              updateSettings({ downloadTimeout: Math.max(10, Math.min(300, parseInt(value) || 60)) })
            }
            min={10}
            max={300}
          />
        </Card>

        <Card title={t('settings.concurrentDownloads')} delay={0.5}>
          <Input
            type="number"
            value={settings.concurrentDownloads.toString()}
            onChange={(value) =>
              updateSettings({
                concurrentDownloads: Math.max(1, Math.min(50, parseInt(value) || 10)),
              })
            }
            min={1}
            max={50}
          />
        </Card>

        {/* 预览设置 */}
        <Card title={t('settings.previewSize')} delay={0.6}>
          <Select
            value={settings.previewSize}
            onChange={(value) => updateSettings({ previewSize: value as any })}
            options={[
              { value: 'small', label: t('settings.previewSize.small') },
              { value: 'medium', label: t('settings.previewSize.medium') },
              { value: 'large', label: t('settings.previewSize.large') },
            ]}
          />
        </Card>

        {/* 其他设置 */}
        <Card title={t('settings.showFilename')} delay={0.7}>
          <Checkbox
            label={t('settings.showFilename')}
            checked={settings.showFilename}
            onChange={(checked) => updateSettings({ showFilename: checked })}
          />
        </Card>

        <Card title={t('settings.logLevel')} delay={0.8}>
          <Select
            value={settings.logLevel}
            onChange={(value) => updateSettings({ logLevel: value as any })}
            options={[
              { value: 'DEBUG', label: 'DEBUG' },
              { value: 'INFO', label: 'INFO' },
              { value: 'WARN', label: 'WARN' },
              { value: 'ERROR', label: 'ERROR' },
            ]}
          />
        </Card>

        {/* 高性能模式 */}
        <Card title={t('settings.highPerformanceMode')} delay={0.9}>
          <Checkbox
            label={t('settings.highPerformanceMode.description')}
            checked={settings.highPerformanceMode}
            onChange={(checked) => updateSettings({ highPerformanceMode: checked })}
          />
        </Card>
      </div>

      {/* 控制按钮 */}
      {isHighPerformance ? (
        <div className="settings-controls">
          <Button variant="danger" onClick={handleReset}>
            {t('settings.reset')}
          </Button>
          <Button variant="secondary" onClick={() => {}}>
            {t('settings.export')}
          </Button>
          <Button variant="secondary" onClick={() => {}}>
            {t('settings.import')}
          </Button>
        </div>
      ) : (
        <motion.div
          className="settings-controls"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.3 }}
        >
          <Button variant="danger" onClick={handleReset}>
            {t('settings.reset')}
          </Button>
          <Button variant="secondary" onClick={() => {}}>
            {t('settings.export')}
          </Button>
          <Button variant="secondary" onClick={() => {}}>
            {t('settings.import')}
          </Button>
        </motion.div>
      )}
    </>
  );

  if (isHighPerformance) {
    return <div className="settings-page">{pageContent}</div>;
  }

  return (
    <motion.div
      className="settings-page"
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

export default SettingsPage;
