import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettingsStore } from '../../stores/settingsStore';
import { useDownloadStore } from '../../stores/downloadStore';
import { useI18n } from '../../hooks/useI18n';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import ProgressBar from '../../components/UI/ProgressBar';
import './PreviewPage.css';

// 减少每页显示数量以降低渲染压力
const ITEMS_PER_PAGE = 30;

// 使用 Intersection Observer 实现懒加载
const useIntersectionObserver = (options: IntersectionObserverInit) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [options]);

  return { ref, isIntersecting };
};

// 记忆化图片项组件
interface ImageItemProps {
  image: {
    id: string;
    filename: string;
    resolution: string;
    path: string;
  };
  index: number;
  onClick: (id: string) => void;
}

const ImageItem = memo(({ image, index, onClick }: ImageItemProps) => {
  const { ref, isIntersecting } = useIntersectionObserver({
    rootMargin: '100px', // 提前 100px 开始加载
    threshold: 0.1,
  });
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);

  const handleError = useCallback(() => {
    setHasError(true);
  }, []);

  return (
    <motion.div
      ref={ref}
      className="image-item"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: isLoaded ? 1 : 0.3, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: Math.min(index * 0.01, 0.3), duration: 0.2 }}
      layout
      onClick={() => onClick(image.id)}
      style={{
        backgroundColor: '#f0f0f0',
        minHeight: '100px',
      }}
    >
      {isIntersecting && !hasError && (
        <img
          src={`https://th.wallhaven.cc/small/${image.id.slice(0, 2)}/${image.id}.jpg`}
          alt={image.filename}
          loading="lazy"
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          style={{
            opacity: isLoaded ? 1 : 0,
            transition: 'opacity 0.2s ease',
          }}
        />
      )}
      {(hasError || !isIntersecting) && (
        <div className="image-placeholder" style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#e0e0e0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#999',
          fontSize: '12px',
        }}>
          {hasError ? '加载失败' : '...'}
        </div>
      )}
      <div className="image-overlay">
        <span className="image-resolution">{image.resolution}</span>
      </div>
    </motion.div>
  );
});

ImageItem.displayName = 'ImageItem';

const PreviewPage: React.FC = () => {
  const { settings } = useSettingsStore();
  const {
    isDownloading,
    progress,
    downloadedImages,
    clearDownloadedImages,
  } = useDownloadStore();
  const { t } = useI18n(settings.language);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const totalPages = Math.ceil(downloadedImages.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentImages = downloadedImages.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleOpenDirectory = useCallback(() => {
    window.electronAPI.shell.openPath(settings.downloadDir);
  }, [settings.downloadDir]);

  const handleClear = useCallback(() => {
    clearDownloadedImages();
    setCurrentPage(1);
  }, [clearDownloadedImages]);

  const handlePageChange = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      // 切换页面时滚动到顶部
      gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [totalPages]);

  const handleImageClick = useCallback((imageId: string) => {
    setSelectedImage(imageId);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedImage(null);
  }, []);

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  };

  const selectedImageData = selectedImage
    ? downloadedImages.find(img => img.id === selectedImage)
    : null;

  return (
    <motion.div
      className="preview-page"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.3 }}
    >
      <h1 className="page-title">{t('preview.title')}</h1>

      {/* 统计信息 */}
      <Card className="stats-card">
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-label">{t('preview.stats.total', { count: progress.total })}</span>
          </div>
          <div className="stat-item success">
            <span className="stat-label">{t('preview.stats.success', { count: progress.success })}</span>
          </div>
          <div className="stat-item error">
            <span className="stat-label">{t('preview.stats.failed', { count: progress.failed })}</span>
          </div>
          <div className="stat-item skipped">
            <span className="stat-label">{t('preview.stats.skipped', { count: progress.skipped })}</span>
          </div>
        </div>
      </Card>

      {/* 进度条 */}
      {isDownloading && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
        >
          <Card className="progress-card">
            <ProgressBar progress={progress.percent} />
            <p className="current-file">
              {progress.currentFile
                ? t('preview.currentFile', { filename: progress.currentFile })
                : t('preview.downloading')}
            </p>
          </Card>
        </motion.div>
      )}

      {/* 图片预览网格 */}
      <Card className="preview-grid-card">
        {downloadedImages.length > 0 ? (
          <>
            <div ref={gridRef} className="image-grid">
              <AnimatePresence mode="popLayout">
                {currentImages.map((image, index) => (
                  <ImageItem
                    key={image.id}
                    image={image}
                    index={index}
                    onClick={handleImageClick}
                  />
                ))}
              </AnimatePresence>
            </div>

            {/* 分页控制 */}
            {totalPages > 1 && (
              <div className="pagination">
                <Button
                  variant="secondary"
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                >
                  {t('preview.firstPage')}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  {t('preview.prevPage')}
                </Button>
                <span className="page-info">
                  {t('preview.pageInfo', { current: currentPage, total: totalPages })}
                </span>
                <Button
                  variant="secondary"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  {t('preview.nextPage')}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  {t('preview.lastPage')}
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">🖼️</div>
            <p>{t('preview.empty')}</p>
          </div>
        )}
      </Card>

      {/* 控制按钮 */}
      <div className="preview-controls">
        <Button variant="secondary" onClick={handleClear} disabled={downloadedImages.length === 0}>
          {t('preview.clear')}
        </Button>
        <Button variant="secondary" onClick={handleOpenDirectory}>
          {t('preview.openDir')}
        </Button>
      </div>

      {/* 大图预览模态框 */}
      <AnimatePresence>
        {selectedImage && selectedImageData && (
          <motion.div
            className="image-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleCloseModal}
          >
            <motion.div
              className="image-modal-content"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className="image-modal-close" onClick={handleCloseModal}>
                ×
              </button>
              <img
                src={`local-image://${selectedImageData.path}`}
                alt={selectedImageData.filename}
                className="image-modal-img"
                loading="eager"
                decoding="async"
                onError={(e) => {
                  // 如果本地文件加载失败，尝试使用在线 URL
                  const img = e.target as HTMLImageElement;
                  img.src = `https://w.wallhaven.cc/full/${selectedImageData.id.slice(0, 2)}/wallhaven-${selectedImageData.id}.jpg`;
                }}
              />
              <div className="image-modal-info">
                <span className="image-modal-resolution">{selectedImageData.resolution}</span>
                <span className="image-modal-filename">{selectedImageData.filename}</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default PreviewPage;
