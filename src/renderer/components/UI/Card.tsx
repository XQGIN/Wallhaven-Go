import React from 'react';
import { motion } from 'framer-motion';
import { useSettingsStore } from '../../stores/settingsStore';
import './Card.css';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  delay?: number;
}

const Card: React.FC<CardProps> = ({ children, title, className = '', delay = 0 }) => {
  const { settings } = useSettingsStore();
  const isHighPerformance = settings.highPerformanceMode;

  if (isHighPerformance) {
    return (
      <div className={`card ${className} card-static`}>
        {title && <h3 className="card-title">{title}</h3>}
        <div className="card-content">{children}</div>
      </div>
    );
  }

  return (
    <motion.div
      className={`card ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3, ease: 'easeOut' }}
      whileHover={{ y: -2, boxShadow: 'var(--shadow-lg)' }}
    >
      {title && <h3 className="card-title">{title}</h3>}
      <div className="card-content">{children}</div>
    </motion.div>
  );
};

export default Card;
