import React from 'react';
import { motion } from 'framer-motion';
import { useSettingsStore } from '../../stores/settingsStore';
import { useI18n } from '../../hooks/useI18n';
import Card from '../../components/UI/Card';
import './AboutPage.css';

const AboutPage: React.FC = () => {
  const { settings } = useSettingsStore();
  const { t } = useI18n(settings.language);

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  };

  return (
    <motion.div
      className="about-page"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.3 }}
    >
      <h1 className="page-title">{t('about.title')}</h1>

      <div className="about-grid">
        <Card title={t('about.appInfo')} delay={0}>
          <div className="about-app-header">
            <img className="about-app-icon" src="./icon/logo.svg" alt="Logo" />
            <div className="about-app-info">
              <h2 className="about-app-name">{t('app.name')}</h2>
              <p className="about-app-version">{t('app.version')}</p>
            </div>
          </div>
          <p className="about-description">{t('about.description')}</p>
        </Card>

        <Card title={t('about.developer')} delay={0.1}>
          <div className="about-info-item">
            <span className="about-label">{t('about.author')}</span>
            <span className="about-value">XQGIN</span>
          </div>
          <div className="about-info-item">
            <span className="about-label">{t('about.license')}</span>
            <span className="about-value">MIT</span>
          </div>
        </Card>

        <Card title={t('about.links')} delay={0.2}>
          <div className="about-links">
            <a
              className="about-link"
              href="https://wallhaven-website.pages.dev/"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('about.officialWebsite')}
            </a>
            <a
              className="about-link"
              href="https://github.com/XQGIN/Wallhaven-Go"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('about.github')}
            </a>
          </div>
        </Card>

        <Card title={t('about.acknowledgments')} delay={0.3}>
          <p className="about-acknowledgments">
            {t('about.acknowledgmentsPrefix')}
            <a
              className="about-link-inline"
              href="https://wallhaven.cc/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Wallhaven.cc
            </a>
            {t('about.acknowledgmentsSuffix')}
          </p>
        </Card>
      </div>
    </motion.div>
  );
};

export default AboutPage;
