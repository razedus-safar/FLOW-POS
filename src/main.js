/**
 * FlowPOS Application Entry Point - Ultra-Fast Performance Edition
 * GPU-accelerated styling, instant IndexedDB caching, and PWA service worker
 */

import './styles/app.css';
import { App } from './app.js';
import { themeManager } from './store/theme.js';

// Initialize Theme
themeManager.applyTheme();

// Register Service Worker for PWA
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.warn('Service worker registration failed:', err);
    });
  });
}

// Mount FlowPOS App
document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('app');
  if (root) {
    new App(root);
  }
});
