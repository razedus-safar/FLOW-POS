/**
 * FlowPOS Stacked Glass Toast Notifications - Apple iOS 26 Liquid Glass Edition
 * Top-floating frosted liquid glass pills with auto-dismiss and spring physics
 */

import { renderIcon } from '../utils/icons.js';

class ToastService {
  constructor() {
    this.container = null;
  }

  init() {
    if (typeof document === 'undefined') return;
    let container = document.getElementById('flowpos-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'flowpos-toast-container';
      container.className = 'fixed top-5 right-4 sm:right-6 z-[120] flex flex-col space-y-2.5 pointer-events-none max-w-sm w-full px-3';
      if (document.body) {
        document.body.appendChild(container);
      }
    }
    this.container = container;
  }

  show({ message, title = '', type = 'info', duration = 3500 }) {
    if (typeof document === 'undefined') return;
    this.init();
    if (!this.container) return;

    const toastEl = document.createElement('div');
    toastEl.className = 'pointer-events-auto flex items-start gap-3 p-3.5 rounded-[20px] glass2 border border-[var(--glass-border)] shadow-2xl transition-all duration-300 transform -translate-y-4 opacity-0';

    let iconName = 'info';
    let iconBg = 'bg-[var(--accent)]/15 text-[var(--accent)]';

    if (type === 'success') {
      iconName = 'check';
      iconBg = 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400';
    } else if (type === 'error') {
      iconName = 'alert-triangle';
      iconBg = 'bg-red-500/20 text-red-600 dark:text-red-400';
    } else if (type === 'warning') {
      iconName = 'alert-triangle';
      iconBg = 'bg-amber-500/20 text-amber-600 dark:text-amber-400';
    }

    toastEl.innerHTML = `
      <div class="p-2 rounded-[12px] ${iconBg} flex-shrink-0">
        ${renderIcon(iconName, 'w-4 h-4')}
      </div>
      <div class="flex-1 min-w-0">
        ${title ? `<h4 class="text-xs font-black text-[var(--text)] leading-tight tracking-tight">${title}</h4>` : ''}
        <p class="text-xs text-[var(--text)] mt-0.5 leading-snug font-semibold">${message}</p>
      </div>
      <button class="toast-close p-1 text-[var(--muted)] hover:text-[var(--text)] transition active:scale-90">
        ${renderIcon('x', 'w-3.5 h-3.5')}
      </button>
    `;

    this.container.appendChild(toastEl);

    requestAnimationFrame(() => {
      toastEl.classList.remove('-translate-y-4', 'opacity-0');
    });

    const dismiss = () => {
      toastEl.classList.add('opacity-0', '-translate-y-2');
      setTimeout(() => toastEl.remove(), 250);
    };

    toastEl.querySelector('.toast-close').addEventListener('click', dismiss);
    if (duration > 0) {
      setTimeout(dismiss, duration);
    }
  }

  success(message, title = 'Success') {
    this.show({ message, title, type: 'success' });
  }

  error(message, title = 'Error') {
    this.show({ message, title, type: 'error' });
  }

  warning(message, title = 'Warning') {
    this.show({ message, title, type: 'warning' });
  }

  info(message, title = 'Notice') {
    this.show({ message, title, type: 'info' });
  }
}

export const toast = new ToastService();
