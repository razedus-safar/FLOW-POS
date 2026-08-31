/**
 * FlowPOS Application Entry Point - Apple iOS 26 Liquid Glass Edition
 * Features ambient theme management, PWA service worker, and dynamic mouse-tracked specular highlight physics
 */

import './styles/app.css';
import { App } from './app.js';
import { themeManager } from './store/theme.js';

// Initialize Theme
themeManager.applyTheme();

// Global Pointer Tracking for Apple Liquid Glass Specular Highlight Refraction
if (window.matchMedia('(pointer: fine)').matches) {
  let isThrottled = false;
  window.addEventListener('pointermove', (e) => {
    if (isThrottled) return;
    isThrottled = true;

    requestAnimationFrame(() => {
      const target = e.target.closest('.liquid-glass, .glass, .glass-panel, .glass2, .glass-card, .glass-btn-primary, .glass-btn-secondary');
      if (target) {
        const rect = target.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        target.style.setProperty('--pointer-x', `${x.toFixed(1)}%`);
        target.style.setProperty('--pointer-y', `${y.toFixed(1)}%`);
      }
      isThrottled = false;
    });
  }, { passive: true });
}

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
