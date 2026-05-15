import React from 'react';
import { motion } from 'framer-motion';
import Sidebar from './Sidebar';
import TitleBar from './TitleBar';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="layout">
      <TitleBar />
      <div className="layout-container">
        <Sidebar />
        <motion.main
          className="main-content"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
};

export default Layout;
