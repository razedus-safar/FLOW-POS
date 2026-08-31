/**
 * FlowPOS Secure Touch Authentication & Cashier PIN Pad Login View
 * Fully optimized for Touchscreen POS Terminals with dynamic branding, theme switcher & zero credential leaks
 */

import { sessionManager } from '../store/session.js';
import { settingsService } from '../services/settings.js';
import { themeManager } from '../store/theme.js';
import { toast } from '../components/Toast.js';
import { renderIcon } from '../utils/icons.js';
import { loginRateLimiter, sanitizeHtml } from '../utils/security.js';

export class LoginPage {
  constructor(container, onLoginSuccess) {
    this.container = container;
    this.onLoginSuccess = onLoginSuccess;
    this.mode = 'pin'; // 'pin' | 'email'
    this.selectedUserId = null;
    this.pinBuffer = '';
    this.showPassword = false;

    this.handleSettingsUpdated = () => {
      this.render();
      this.attachEvents();
    };

    this.handleThemeChanged = () => {
      this.render();
      this.attachEvents();
    };

    this.init();
  }

  init() {
    const users = sessionManager.getAllUsers();
    this.selectedUserId = users.length > 0 ? users[0].id : null;

    window.addEventListener('flowpos:settings-updated', this.handleSettingsUpdated);
    window.addEventListener('flowpos:theme-changed', this.handleThemeChanged);

    this.render();
    this.attachEvents();
  }

  destroy() {
    window.removeEventListener('flowpos:settings-updated', this.handleSettingsUpdated);
    window.removeEventListener('flowpos:theme-changed', this.handleThemeChanged);
  }

  render() {
    const users = sessionManager.getAllUsers();
    const selectedUser = users.find(u => u.id === this.selectedUserId) || users[0];
    const settings = settingsService.getSettings();
    const store = settings?.store || {};
    const storeName = store.name || 'FlowPOS';
    const storeTagline = store.tagline || 'Touch Retail Operating Station';
    const storeLogo = store.logo || '';
    const currentTheme = themeManager.getTheme();

      const lockInfo = loginRateLimiter.isLocked();
      const staffQuickCardsHtml = users.map(u => {
      const isSelected = u.id === this.selectedUserId;
      return `
        <button
          type="button"
          data-select-user-id="${u.id}"
          class="w-full flex items-center justify-between p-3.5 rounded-[20px] glass-card transition-all duration-150 text-left active:scale-98 select-none ${isSelected ? 'ring-2 ring-[var(--accent)] bg-white dark:bg-slate-800 shadow-md' : 'hover:bg-white/80 dark:hover:bg-slate-800/80'}"
        >
          <div class="flex items-center space-x-3.5 min-w-0">
            <div class="avatar w-11 h-11 rounded-[14px] bg-gradient-to-tr from-[#0066CC] to-[#7E22CE] text-white font-bold text-sm grid place-items-center flex-shrink-0 shadow-xs">
              ${sanitizeHtml(u.name.substring(0, 2).toUpperCase())}
            </div>
            <div class="truncate">
              <h4 class="text-sm font-bold text-[var(--text)] truncate">${sanitizeHtml(u.name)}</h4>
              <p class="text-xs text-[var(--muted)] font-medium mt-0.5 truncate">${sanitizeHtml(u.title || u.role)}</p>
            </div>
          </div>
          <div class="text-right flex-shrink-0 pl-2">
            <span class="badge ${u.role === 'OWNER' ? 'badge-platinum' : u.role === 'MANAGER' ? 'badge-blue' : u.role === 'INVENTORY' ? 'badge-amber' : 'badge-emerald'}">
              ${sanitizeHtml(u.role)}
            </span>
          </div>
        </button>
      `;
    }).join('');

    const pinDotsHtml = [0, 1, 2, 3].map(idx => `
      <div class="w-4 h-4 rounded-full border-2 border-[var(--accent)] flex items-center justify-center transition-all duration-150 ${this.pinBuffer.length > idx ? 'bg-[var(--accent)] scale-125 shadow-md shadow-[var(--accent)]/40' : 'bg-[var(--glass-bg-clear)]'}"></div>
    `).join('');

    const lockoutBannerHtml = lockInfo.locked ? `
      <div class="p-3 rounded-[16px] bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center space-x-2 animate-pulse mb-3">
        <span>⚠️ Too many failed attempts. Terminal locked for ${lockInfo.remainingSeconds}s.</span>
      </div>
    ` : '';

    this.container.innerHTML = `
      <div class="min-h-screen w-full flex flex-col items-center justify-center p-3 sm:p-6 relative overflow-y-auto">
        
        <!-- Top Theme Switcher Bar -->
        <div class="w-full max-w-4xl flex items-center justify-between mb-3 px-2 z-20">
          <div class="flex items-center space-x-2 text-xs font-semibold text-[var(--muted)]">
            <span class="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Terminal Ready</span>
          </div>

          <!-- Theme Toggle Switcher -->
          <div class="flex items-center p-1 rounded-full bg-[var(--card-bg)] border border-[var(--line)] shadow-xs">
            <button
              type="button"
              data-login-theme="light"
              class="px-2.5 py-1 rounded-full text-xs font-bold transition-all flex items-center space-x-1.5 ${currentTheme === 'light' ? 'bg-[var(--accent)] text-white shadow-xs' : 'text-[var(--muted)] hover:text-[var(--text)]'}"
              title="Light Theme"
            >
              ${renderIcon('sun', 'w-3.5 h-3.5')}
              <span class="text-[11px] hidden sm:inline">Light</span>
            </button>
            <button
              type="button"
              data-login-theme="dark"
              class="px-2.5 py-1 rounded-full text-xs font-bold transition-all flex items-center space-x-1.5 ${currentTheme === 'dark' ? 'bg-[var(--accent)] text-white shadow-xs' : 'text-[var(--muted)] hover:text-[var(--text)]'}"
              title="Dark Theme"
            >
              ${renderIcon('moon', 'w-3.5 h-3.5')}
              <span class="text-[11px] hidden sm:inline">Dark</span>
            </button>
            <button
              type="button"
              data-login-theme="system"
              class="px-2.5 py-1 rounded-full text-xs font-bold transition-all flex items-center space-x-1.5 ${currentTheme === 'system' ? 'bg-[var(--accent)] text-white shadow-xs' : 'text-[var(--muted)] hover:text-[var(--text)]'}"
              title="System Theme"
            >
              ${renderIcon('laptop', 'w-3.5 h-3.5')}
              <span class="text-[11px] hidden sm:inline">Auto</span>
            </button>
          </div>
        </div>

        <div class="relative w-full max-w-4xl glass2 rounded-[32px] border border-[var(--line)] shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 z-10">
          
          <!-- Left Column: Branding & Touch Staff Selector -->
          <div class="lg:col-span-6 p-5 sm:p-8 glass border-b lg:border-b-0 lg:border-r border-[var(--line)] flex flex-col justify-between space-y-5">
            <div>
              <!-- Store Logo & Name -->
              <div class="flex items-center space-x-3.5">
                <div class="logo w-13 h-13 rounded-[18px] bg-gradient-to-tr from-[#0066CC] to-[#7E22CE] text-white font-bold text-2xl flex items-center justify-center shadow-lg shadow-[#0066CC]/30 flex-shrink-0 overflow-hidden border border-[var(--line)]">
                  ${storeLogo ? `
                    <img
                      src="${storeLogo}"
                      alt="${storeName}"
                      class="w-full h-full object-cover"
                      onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                    />
                    <div class="w-full h-full hidden items-center justify-center font-bold text-2xl">
                      ${storeName.substring(0, 1).toUpperCase()}
                    </div>
                  ` : `
                    <span>${storeName.substring(0, 1).toUpperCase()}</span>
                  `}
                </div>
                <div class="min-w-0">
                  <h1 class="font-heading font-black text-2xl tracking-tight text-[var(--text)] truncate">${storeName}</h1>
                  <p class="text-[10px] uppercase tracking-widest font-bold text-[var(--accent)] truncate">${storeTagline}</p>
                </div>
              </div>

              <!-- Title -->
              <div class="mt-5 space-y-1">
                <h2 class="text-lg font-bold font-heading text-[var(--text)]">Select Operator</h2>
                <p class="text-xs text-[var(--muted)] font-medium">Tap your profile to enter your secure PIN.</p>
              </div>

              <!-- Touch Staff Grid -->
              <div class="mt-4 space-y-2.5 max-h-80 overflow-y-auto pr-1 scrollbar-none">
                ${staffQuickCardsHtml}
              </div>
            </div>

            <!-- Terminal Security Notice -->
            <div class="p-3.5 rounded-[18px] glass-card flex items-center space-x-3 text-xs text-[var(--muted)]">
              <span class="text-[var(--accent)] text-lg flex-shrink-0">🔒</span>
              <p class="text-[11px] leading-snug">Enterprise Encrypted Session &bull; Fast Touch Keypad Verification</p>
            </div>
          </div>

          <!-- Right Column: Touch PIN Numpad or Credentials -->
          <div class="lg:col-span-6 p-5 sm:p-8 flex flex-col justify-center space-y-6">
            ${lockoutBannerHtml}
            <!-- Mode Switcher Tabs -->
            <div class="flex items-center p-1 rounded-[16px] bg-[var(--glass-bg-clear)] border border-[var(--line)] shadow-xs">
              <button id="tab-pin-mode" class="flex-1 py-2.5 rounded-[12px] text-xs font-bold transition-all ${this.mode === 'pin' ? 'bg-[var(--accent)] text-white shadow-sm' : 'text-[var(--muted)] hover:text-[var(--text)]'}">
                Touch PIN Pad
              </button>
              <button id="tab-email-mode" class="flex-1 py-2.5 rounded-[12px] text-xs font-bold transition-all ${this.mode === 'email' ? 'bg-[var(--accent)] text-white shadow-sm' : 'text-[var(--muted)] hover:text-[var(--text)]'}">
                Username / Password
              </button>
            </div>

            <!-- PIN Numpad Mode -->
            ${this.mode === 'pin' ? `
              <div class="space-y-5">
                <div class="text-center space-y-2">
                  <div class="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[var(--glass-bg-clear)] border border-[var(--line)]">
                    <span class="text-xs text-[var(--muted)] font-medium">Signing in as:</span>
                    <strong class="text-xs font-bold text-[var(--text)]">${selectedUser ? selectedUser.name : 'Staff'}</strong>
                  </div>
                  <p class="text-xs font-bold text-[var(--muted)] uppercase tracking-wider mt-1">Enter 4-Digit Security PIN</p>
                  <div class="flex items-center justify-center space-x-4 py-2">
                    ${pinDotsHtml}
                  </div>
                </div>

                <!-- Touch Optimized Numpad Grid -->
                <div class="grid grid-cols-3 gap-2.5 sm:gap-3 max-w-[300px] mx-auto">
                  ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => `
                    <button type="button" data-pin-num="${num}" class="h-14 sm:h-16 rounded-[20px] text-2xl font-black font-mono glass-btn-secondary text-[var(--text)] flex items-center justify-center shadow-xs hover:border-[var(--accent)] active:scale-90 transition-all select-none">
                      ${num}
                    </button>
                  `).join('')}
                  <button type="button" id="pin-clear-btn" class="h-14 sm:h-16 rounded-[20px] text-xs font-black glass-btn-secondary text-[var(--red)] flex items-center justify-center shadow-xs active:scale-90 transition-all select-none">
                    CLEAR
                  </button>
                  <button type="button" data-pin-num="0" class="h-14 sm:h-16 rounded-[20px] text-2xl font-black font-mono glass-btn-secondary text-[var(--text)] flex items-center justify-center shadow-xs hover:border-[var(--accent)] active:scale-90 transition-all select-none">
                    0
                  </button>
                  <button type="button" id="pin-backspace-btn" class="h-14 sm:h-16 rounded-[20px] text-xs font-bold glass-btn-secondary text-[var(--accent)] flex items-center justify-center shadow-xs active:scale-90 transition-all select-none">
                    ${renderIcon('trash-2', 'w-5 h-5')}
                  </button>
                </div>
              </div>
            ` : `
              <!-- Email / Password Form Mode -->
              <form id="email-login-form" class="space-y-4 max-w-sm mx-auto w-full" autocomplete="off">
                <div>
                  <label class="block text-xs font-bold text-[var(--text)] mb-1.5">Username or Email</label>
                  <input
                    id="login-username-input"
                    name="email"
                    type="text"
                    required
                    value=""
                    placeholder="Enter username or email"
                    autocomplete="username"
                    class="w-full h-12 px-4 rounded-[14px] glass-input text-sm font-semibold text-[var(--text)] placeholder:text-[var(--muted)]/60"
                  />
                </div>

                <div>
                  <label class="block text-xs font-bold text-[var(--text)] mb-1.5">Security Password</label>
                  <div class="relative flex items-center">
                    <input
                      id="login-password-input"
                      name="password"
                      type="${this.showPassword ? 'text' : 'password'}"
                      required
                      value=""
                      placeholder="Enter security password"
                      autocomplete="current-password"
                      class="w-full h-12 pl-4 pr-12 rounded-[14px] glass-input text-sm font-semibold text-[var(--text)] placeholder:text-[var(--muted)]/60"
                    />
                    <button
                      type="button"
                      id="toggle-login-password-btn"
                      aria-label="Toggle password visibility"
                      class="absolute right-2 p-2 rounded-[10px] text-[var(--muted)] hover:text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/10 transition active:scale-90"
                      title="${this.showPassword ? 'Hide password' : 'Show password'}"
                    >
                      ${renderIcon(this.showPassword ? 'eye-off' : 'eye', 'w-4 h-4')}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  class="w-full h-13 mt-2 rounded-[16px] glass-btn-primary text-sm font-bold shadow-lg flex items-center justify-center space-x-2 active:scale-98 transition-all"
                >
                  <span>Unlock Terminal</span>
                  <span class="text-base">→</span>
                </button>
              </form>
            `}
          </div>
        </div>
      </div>
    `;
  }

  attachEvents() {
    // Theme Switchers
    this.container.querySelectorAll('[data-login-theme]').forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = btn.getAttribute('data-login-theme');
        themeManager.setTheme(theme);
      });
    });

    // Tab Mode Switchers
    const pinTab = this.container.querySelector('#tab-pin-mode');
    const emailTab = this.container.querySelector('#tab-email-mode');

    if (pinTab) {
      pinTab.addEventListener('click', () => {
        this.mode = 'pin';
        this.pinBuffer = '';
        this.render();
        this.attachEvents();
      });
    }

    if (emailTab) {
      emailTab.addEventListener('click', () => {
        this.mode = 'email';
        this.render();
        this.attachEvents();
      });
    }

    // Select Staff User
    this.container.querySelectorAll('[data-select-user-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectedUserId = btn.getAttribute('data-select-user-id');
        this.pinBuffer = '';
        
        // If in username/password mode, also allow pre-populating username field with selected user's name if empty
        if (this.mode === 'email') {
          const users = sessionManager.getAllUsers();
          const selectedUser = users.find(u => u.id === this.selectedUserId);
          const userInput = this.container.querySelector('#login-username-input');
          if (userInput && selectedUser) {
            userInput.value = selectedUser.name;
          }
        }
        
        this.render();
        this.attachEvents();
      });
    });

    // Touch Numpad Digits
    this.container.querySelectorAll('[data-pin-num]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.pinBuffer.length < 4) {
          this.pinBuffer += btn.getAttribute('data-pin-num');
          this.render();
          this.attachEvents();

          if (this.pinBuffer.length === 4) {
            setTimeout(() => this.handlePinSubmit(), 120);
          }
        }
      });
    });

    // Clear PIN
    const clearBtn = this.container.querySelector('#pin-clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.pinBuffer = '';
        this.render();
        this.attachEvents();
      });
    }

    // Backspace
    const backBtn = this.container.querySelector('#pin-backspace-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        if (this.pinBuffer.length > 0) {
          this.pinBuffer = this.pinBuffer.slice(0, -1);
          this.render();
          this.attachEvents();
        }
      });
    }

    // Password Visibility Toggle
    const togglePasswordBtn = this.container.querySelector('#toggle-login-password-btn');
    const passwordInput = this.container.querySelector('#login-password-input');
    if (togglePasswordBtn && passwordInput) {
      togglePasswordBtn.addEventListener('click', () => {
        this.showPassword = !this.showPassword;
        passwordInput.type = this.showPassword ? 'text' : 'password';
        togglePasswordBtn.innerHTML = renderIcon(this.showPassword ? 'eye-off' : 'eye', 'w-4 h-4');
        togglePasswordBtn.title = this.showPassword ? 'Hide password' : 'Show password';
      });
    }

    // Email / Password Form Submit
    const form = this.container.querySelector('#email-login-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const lockInfo = loginRateLimiter.isLocked();
        if (lockInfo.locked) {
          toast.error(`Terminal temporarily locked due to failed attempts. Try again in ${lockInfo.remainingSeconds}s.`);
          this.render();
          this.attachEvents();
          return;
        }

        const emailOrName = form.email.value.trim();
        const password = form.password.value;
        const res = sessionManager.loginWithEmail(emailOrName, password);
        if (res.success) {
          loginRateLimiter.reset();
          toast.success(`Welcome back, ${res.user.name}!`);
          if (this.onLoginSuccess) this.onLoginSuccess(res.user);
        } else {
          loginRateLimiter.recordFailedAttempt();
          toast.error(res.message);
          this.render();
          this.attachEvents();
        }
      });
    }
  }

  handlePinSubmit() {
    const lockInfo = loginRateLimiter.isLocked();
    if (lockInfo.locked) {
      toast.error(`Terminal temporarily locked due to failed attempts. Try again in ${lockInfo.remainingSeconds}s.`);
      this.pinBuffer = '';
      this.render();
      this.attachEvents();
      return;
    }

    const res = sessionManager.loginWithPin(this.pinBuffer, this.selectedUserId);
    if (res.success) {
      loginRateLimiter.reset();
      toast.success(`Authenticated: ${res.user.name} (${res.user.role})`);
      if (this.onLoginSuccess) {
        this.onLoginSuccess(res.user);
      }
    } else {
      loginRateLimiter.recordFailedAttempt();
      toast.error(res.message);
      this.pinBuffer = '';
      this.render();
      this.attachEvents();
    }
  }
}
