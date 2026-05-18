import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const TitleBar: React.FC = () => {
  const [platform, setPlatform] = useState<NodeJS.Platform>('win32');
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    window.electronAPI?.app.platform().then(setPlatform);
    window.electronAPI?.window.isMaximized().then(setIsMaximized);

    // 监听窗口最大化状态变化
    window.electronAPI?.window.onMaximizeChange((maximized) => {
      setIsMaximized(maximized);
    });
  }, []);

  const handleMinimize = () => {
    window.electronAPI?.window.minimize();
  };

  const handleMaximize = () => {
    window.electronAPI?.window.maximize();
  };

  const handleClose = () => {
    window.electronAPI?.window.close();
  };

  // macOS 不显示自定义标题栏按钮（使用系统原生按钮）
  if (platform === 'darwin') {
    return (
      <div className="title-bar" style={{ justifyContent: 'center' }}>
        <div className="title-bar-text">WallHaven Go</div>
      </div>
    );
  }

  return (
    <div className="title-bar">
      <div className="title-bar-left">
        <img className="title-bar-icon" src="./icon/logo.svg" alt="Logo" />
        <span className="title-bar-text">WallHaven Go</span>
      </div>
      <div className="title-bar-right">
        <motion.button
          className="window-control-btn minimize"
          onClick={handleMinimize}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          title="最小化"
        >
          <svg width="12" height="12" viewBox="0 0 12 12">
            <rect x="1" y="5.5" width="10" height="1" fill="currentColor" />
          </svg>
        </motion.button>
        <motion.button
          className="window-control-btn maximize"
          onClick={handleMaximize}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          title={isMaximized ? '还原' : '最大化'}
        >
          <svg width="12" height="12" viewBox="0 0 12 12">
            {isMaximized ? (
              // 还原图标
              <>
                <rect x="2.5" y="4.5" width="6" height="6" stroke="currentColor" fill="none" strokeWidth="1" />
                <path d="M4.5 4.5 V2.5 H9.5 V7.5 H7.5" stroke="currentColor" fill="none" strokeWidth="1" />
              </>
            ) : (
              // 最大化图标
              <rect x="1.5" y="1.5" width="9" height="9" stroke="currentColor" fill="none" strokeWidth="1" />
            )}
          </svg>
        </motion.button>
        <motion.button
          className="window-control-btn close"
          onClick={handleClose}
          whileHover={{ scale: 1.1, }}
          whileTap={{ scale: 0.95 }}
          title="关闭"
        >
          <svg width="12" height="12" viewBox="0 0 12 12">
            <path
              d="M2 2 L10 10 M10 2 L2 10"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </motion.button>
      </div>
    </div>
  );
};

export default TitleBar;
