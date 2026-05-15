import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useSettingsStore } from './stores/settingsStore';
import { useDownloadStore } from './stores/downloadStore';
import Layout from './components/Layout/Layout';
import DownloadPage from './pages/Download/DownloadPage';
import PreviewPage from './pages/Preview/PreviewPage';
import SettingsPage from './pages/Settings/SettingsPage';
import AboutPage from './pages/About/AboutPage';
import LiquidGlassBackground from './components/LiquidGlass/LiquidGlassBackground';
import './App.css';

interface AppProps {
  onLoaded: () => void;
}

const App: React.FC<AppProps> = ({ onLoaded }) => {
  const [isInitializing, setIsInitializing] = useState(true);
  const { settings, loadSettings } = useSettingsStore();
  const { setupListeners } = useDownloadStore();

  useEffect(() => {
    const init = async () => {
      await loadSettings();
      setupListeners();
      setIsInitializing(false);
      onLoaded();
    };

    init();

    return () => {
      if (window.electronAPI) {
        window.electronAPI.removeAllListeners('download:progress');
        window.electronAPI.removeAllListeners('download:completed');
        window.electronAPI.removeAllListeners('download:failed');
        window.electronAPI.removeAllListeners('download:image-downloaded');
      }
    };
  }, [loadSettings, setupListeners, onLoaded]);

  if (isInitializing) {
    return null;
  }

  return (
    <div className={`app ${settings.theme}`}>
      <LiquidGlassBackground />
      <Layout>
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<Navigate to="/download" replace />} />
            <Route path="/download" element={<DownloadPage />} />
            <Route path="/preview" element={<PreviewPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/about" element={<AboutPage />} />
          </Routes>
        </AnimatePresence>
      </Layout>
    </div>
  );
};

export default App;
