/**
 * FlowPOS Theme Manager
 * Supports: 'light', 'dark', 'system' + Dynamic Accent Color Themes & Font scaling
 */

const STORAGE_KEY = 'flowpos_theme_mode';
const ACCENT_KEY = 'flowpos_accent_color';
const FONT_KEY = 'flowpos_font_family';

export const ACCENT_PRESETS = [
  { id: 'blue', label: 'Electric Blue (iOS 26)', color: '#0066CC', hover: '#0052A3' },
  { id: 'emerald', label: 'Emerald Mint', color: '#059669', hover: '#047857' },
  { id: 'violet', label: 'Royal Violet', color: '#7c3aed', hover: '#6d28d9' },
  { id: 'rose', label: 'Rose Pink', color: '#e11d48', hover: '#be123c' },
  { id: 'amber', label: 'Sunset Amber', color: '#d97706', hover: '#b45309' },
  { id: 'teal', label: 'Cyber Teal', color: '#0891b2', hover: '#0e7490' }
];

class ThemeManager {
  constructor() {
    this.mode = typeof localStorage !== 'undefined' ? (localStorage.getItem(STORAGE_KEY) || 'light') : 'light';
    this.accent = typeof localStorage !== 'undefined' ? (localStorage.getItem(ACCENT_KEY) || '#0066CC') : '#0066CC';
    this.font = typeof localStorage !== 'undefined' ? (localStorage.getItem(FONT_KEY) || 'Outfit') : 'Outfit';
    this.mediaQuery = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    this.init();
  }

  init() {
    this.applyTheme();
    this.applyAccent();
    this.applyFont();
    if (this.mediaQuery && this.mediaQuery.addEventListener) {
      this.mediaQuery.addEventListener('change', () => {
        if (this.mode === 'system') {
          this.applyTheme();
        }
      });
    }
  }

  setTheme(mode) {
    if (!['light', 'dark', 'system'].includes(mode)) return;
    this.mode = mode;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, mode);
    }
    this.applyTheme();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('flowpos:theme-changed', { detail: { mode, isDark: this.isDark() } }));
    }
  }

  setAccent(color) {
    this.accent = color;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(ACCENT_KEY, color);
    }
    this.applyAccent();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('flowpos:accent-changed', { detail: { color } }));
    }
  }

  setFont(font) {
    this.font = font;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(FONT_KEY, font);
    }
    this.applyFont();
  }

  getTheme() {
    return this.mode;
  }

  getAccent() {
    return this.accent;
  }

  getFont() {
    return this.font;
  }

  isDark() {
    if (this.mode === 'dark') return true;
    if (this.mode === 'light') return false;
    return this.mediaQuery ? Boolean(this.mediaQuery.matches) : false;
  }

  applyTheme() {
    if (typeof document === 'undefined') return;
    const isDark = this.isDark();
    const html = document.documentElement;
    const body = document.body;

    if (isDark) {
      html.classList.add('dark');
      if (body) body.classList.add('dark');
    } else {
      html.classList.remove('dark');
      if (body) body.classList.remove('dark');
    }
  }

  applyAccent() {
    if (typeof document === 'undefined') return;
    document.documentElement.style.setProperty('--accent', this.accent);
  }

  applyFont() {
    if (typeof document === 'undefined') return;
    if (this.font === 'Inter') {
      document.documentElement.style.setProperty('--font-sans', "'Inter', sans-serif");
    } else if (this.font === 'Mono') {
      document.documentElement.style.setProperty('--font-sans', "'JetBrains Mono', monospace");
    } else {
      document.documentElement.style.setProperty('--font-sans', "'Outfit', sans-serif");
    }
  }
}

export const themeManager = new ThemeManager();
