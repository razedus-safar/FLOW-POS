/**
 * FlowPOS Universal Accessible Modal Component - Apple iOS 26 Liquid Glass Edition
 * Features 32px squircle sheets, heavy frosted refraction, and spring physics
 */

import { renderIcon } from '../utils/icons.js';

export class Modal {
  constructor({ id = `modal-${Date.now()}`, title = '', size = 'md', content = '', onOpen = null, onClose = null }) {
    this.id = id;
    this.title = title;
    this.size = size; // 'sm' | 'md' | 'lg' | 'xl' | 'full'
    this.content = content;
    this.onOpen = onOpen;
    this.onClose = onClose;
    this.isOpen = false;
    this.elem = null;
    this.element = null;
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  get element() {
    return this.elem;
  }

  set element(el) {
    this.elem = el;
  }

  getSizeClass() {
    switch (this.size) {
      case 'sm': return 'max-w-sm';
      case 'lg': return 'max-w-2xl';
      case 'xl': return 'max-w-4xl';
      case 'full': return 'max-w-6xl';
      default: return 'max-w-lg';
    }
  }

  render() {
    const existing = document.getElementById(this.id);
    if (existing) existing.remove();

    const modalEl = document.createElement('div');
    modalEl.id = this.id;
    modalEl.className = 'fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-xl transition-all duration-300 opacity-0 pointer-events-none';
    modalEl.setAttribute('role', 'dialog');
    modalEl.setAttribute('aria-modal', 'true');

    modalEl.innerHTML = `
      <div class="modal-dialog w-full ${this.getSizeClass()} glass2 rounded-[32px] border border-[var(--glass-border)] shadow-2xl overflow-hidden transform scale-95 transition-all duration-300 flex flex-col max-h-[90vh]">
        <!-- Header -->
        <div class="px-6 py-4 border-b border-[var(--line)] flex items-center justify-between flex-shrink-0 bg-white/40 dark:bg-white/[0.05]">
          <h3 class="font-extrabold font-heading text-base text-[var(--text)] tracking-tight">${this.title}</h3>
          <button data-modal-close class="p-2 rounded-[12px] text-[var(--muted)] hover:text-[var(--text)] hover:bg-white/60 dark:hover:bg-white/10 transition active:scale-90" title="Close (Esc)">
            ${renderIcon('x', 'w-4 h-4')}
          </button>
        </div>

        <!-- Body -->
        <div class="modal-body p-6 overflow-y-auto flex-1 scrollbar-none">
          ${this.content}
        </div>
      </div>
    `;

    document.body.appendChild(modalEl);
    this.elem = modalEl;
    this.attachEvents();
  }

  attachEvents() {
    if (!this.elem) return;

    // Close buttons
    this.elem.querySelectorAll('[data-modal-close]').forEach(btn => {
      btn.addEventListener('click', () => this.close());
    });

    // Backdrop click
    this.elem.addEventListener('click', (e) => {
      if (e.target === this.elem) {
        this.close();
      }
    });
  }

  handleKeyDown(e) {
    if (e.key === 'Escape' && this.isOpen) {
      this.close();
    }
  }

  open() {
    this.render();
    this.isOpen = true;
    window.addEventListener('keydown', this.handleKeyDown);

    requestAnimationFrame(() => {
      if (this.elem) {
        this.elem.classList.remove('opacity-0', 'pointer-events-none');
        this.elem.classList.add('opacity-100');
        const dialog = this.elem.querySelector('.modal-dialog');
        if (dialog) {
          dialog.classList.remove('scale-95');
          dialog.classList.add('scale-100');
        }
      }
    });

    if (this.onOpen) this.onOpen(this.elem);
  }

  close() {
    if (!this.isOpen || !this.elem) return;
    this.isOpen = false;
    window.removeEventListener('keydown', this.handleKeyDown);

    this.elem.classList.remove('opacity-100');
    this.elem.classList.add('opacity-0', 'pointer-events-none');
    const dialog = this.elem.querySelector('.modal-dialog');
    if (dialog) {
      dialog.classList.remove('scale-100');
      dialog.classList.add('scale-95');
    }

    setTimeout(() => {
      if (this.elem) this.elem.remove();
      if (this.onClose) this.onClose();
    }, 300);
  }

  setContent(html) {
    this.content = html;
    if (this.elem) {
      const body = this.elem.querySelector('.modal-body');
      if (body) body.innerHTML = html;
    }
  }
}
