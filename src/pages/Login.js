/**
 * FlowPOS Secure Touch Authentication & Cashier PIN Pad Login View
 * Fully responsive for Mobile, Tablet, and Desktop POS Terminals with Operator Dropdown & Smart PIN Matching
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

    this.handleCloudPulled = () => {
      sessionManager.loadUsers();
      const users = sessionManager.getAllUsers();
      if (!this.selectedUserId && users.length > 0) {
        this.selectedUserId = users[0].id;
      }
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
    window.addEventListener('flowpos:cloud-pulled', this.handleCloudPulled);
    window.addEventListener('flowpos:user-updated', this.handleCloudPulled);

    this.render();
    this.attachEvents();
  }

  destroy() {
    window.removeEventListener('flowpos:settings-updated', this.handleSettingsUpdated);
    window.removeEventListener('flowpos:theme-changed', this.handleThemeChanged);
    window.removeEventListener('flowpos:cloud-pulled', this.handleCloudPulled);
    window.removeEventListener('flowpos:user-updated', this.handleCloudPulled);
    if (this.handleKeyDown) {
      window.removeEventListener('keydown', this.handleKeyDown);
    }
  }

  render() {
    const users = sessionManager.getAllUsers();
    const selectedUser = users.find(u => u.id === this.selectedUserId) || users[0] || { id: 'usr-admin', name: 'Admin', role: 'OWNER' };
    if (!this.selectedUserId && selectedUser) {
      this.selectedUserId = selectedUser.id;
    }

    const settings = settingsService.getSettings();
    const store = settings?.store || {};
    const storeName = store.name || 'FlowPOS Store';
    const storeTagline = store.tagline || 'Retail Operating Station';
    const storeLogo = store.logo || '';
    const currentTheme = themeManager.getTheme();

    const lockInfo = loginRateLimiter.isLocked();

    // Staff Quick Selection for Desktop (Vertical List)
    const staffQuickCardsHtml = users.map(u => {
      const isSelected = u.id === selectedUser.id;
      return `
        <button
          type="button"
          data-select-user-id="${u.id}"
          class="w-full flex items-center justify-between p-3 rounded-[18px] glass-card transition-all duration-150 text-left active:scale-98 select-none ${isSelected ? 'ring-2 ring-[var(--accent)] bg-white dark:bg-slate-800 shadow-md' : 'hover:bg-white/80 dark:hover:bg-slate-800/80'}"
        >
          <div class="flex items-center space-x-3 min-w-0">
            <div class="avatar w-10 h-10 rounded-[12px] bg-gradient-to-tr from-[#0066CC] to-[#7E22CE] text-white font-bold text-xs grid place-items-center flex-shrink-0 shadow-xs">
              ${sanitizeHtml(u.name.substring(0, 2).toUpperCase())}
            </div>
            <div class="truncate">
              <h4 class="text-xs font-bold text-[var(--text)] truncate">${sanitizeHtml(u.name)}</h4>
              <p class="text-[10px] text-[var(--muted)] font-medium mt-0.5 truncate">${sanitizeHtml(u.title || u.role)}</p>
            </div>
          </div>
          <div class="text-right flex-shrink-0 pl-2">
            <span class="badge ${u.role === 'OWNER' ? 'badge-platinum' : u.role === 'MANAGER' ? 'badge-blue' : u.role === 'INVENTORY' ? 'badge-amber' : 'badge-emerald'} text-[9px]">
              ${sanitizeHtml(u.role)}
            </span>
          </div>
        </button>
      `;
    }).join('');

    const pinDotsHtml = [0, 1, 2, 3].map(idx => `
      <div class="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-2 border-[var(--accent)] flex items-center justify-center transition-all duration-150 ${this.pinBuffer.length > idx ? 'bg-[var(--accent)] scale-125 shadow-md shadow-[var(--accent)]/40' : 'bg-[var(--glass-bg-clear)]'}"></div>
    `).join('');

    const lockoutBannerHtml = lockInfo.locked ? `
      <div class="p-3 rounded-[16px] bg-red-500/15 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center justify-between animate-pulse mb-3">
        <span>⚠️ Terminal locked for ${lockInfo.remainingSeconds}s.</span>
        <button type="button" id="reset-lockout-btn" class="px-2 py-1 rounded-[8px] bg-red-600 text-white font-bold text-[10px] hover:bg-red-700 active:scale-95 transition">
          Unlock Now
        </button>
      </div>
    ` : '';

    this.container.innerHTML = `
      <div class="w-full min-h-[100dvh] flex flex-col items-center justify-start sm:justify-center p-3 sm:p-6 py-6 sm:py-10 overflow-y-auto overscroll-contain">
        
        <!-- Top Theme Switcher Bar -->
        <div class="w-full max-w-4xl flex items-center justify-between mb-3 px-2 z-20 flex-shrink-0">
          <div class="flex items-center space-x-2 text-xs font-semibold text-[var(--muted)]">
            <span class="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Terminal Station Ready</span>
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

        <!-- Main Login Card -->
        <div class="relative w-full max-w-4xl glass2 rounded-[28px] sm:rounded-[32px] border border-[var(--line)] shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 z-10 my-auto">
          
          <!-- Left Column / Top Section: Branding & Touch Staff Selector -->
          <div class="lg:col-span-5 p-4 sm:p-6 lg:p-7 glass border-b lg:border-b-0 lg:border-r border-[var(--line)] flex flex-col justify-between space-y-4">
            <div>
              <!-- Store Logo & Name -->
              <div class="flex items-center space-x-3">
                <div class="logo w-11 h-11 sm:w-12 sm:h-12 rounded-[16px] bg-gradient-to-tr from-[#0066CC] to-[#7E22CE] text-white font-bold text-xl sm:text-2xl flex items-center justify-center shadow-md flex-shrink-0 overflow-hidden border border-[var(--line)]">
                  ${storeLogo ? `
                    <img
                      src="${storeLogo}"
                      alt="${storeName}"
                      class="w-full h-full object-cover"
                      onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                    />
                    <div class="w-full h-full hidden items-center justify-center font-bold text-xl">
                      ${storeName.substring(0, 1).toUpperCase()}
                    </div>
                  ` : `
                    <span>${storeName.substring(0, 1).toUpperCase()}</span>
                  `}
                </div>
                <div class="min-w-0">
                  <h1 class="font-heading font-black text-lg sm:text-xl tracking-tight text-[var(--text)] truncate">${storeName}</h1>
                  <p class="text-[9.5px] uppercase tracking-wider font-bold text-[var(--accent)] truncate">${storeTagline}</p>
                </div>
              </div>

              <!-- Desktop Touch Staff List -->
              <div class="mt-5 space-y-1">
                <h2 class="text-sm font-bold font-heading text-[var(--text)]">Select Operator</h2>
                <p class="text-[11px] text-[var(--muted)] font-medium">Pick your profile or type your 4-digit PIN.</p>
                
                <div class="mt-3 space-y-2 max-h-72 overflow-y-auto pr-1 scrollbar-none">
                  ${staffQuickCardsHtml}
                </div>
              </div>
            </div>

            <!-- Terminal Security Notice -->
            <div class="p-3 rounded-[16px] glass-card flex items-center space-x-2.5 text-xs text-[var(--muted)]">
              <span class="text-[var(--accent)] text-base flex-shrink-0">🔒</span>
              <p class="text-[10.5px] leading-tight">Enterprise Encrypted Session &bull; Fast PIN Verification</p>
            </div>
          </div>

          <!-- Right Column: Touch PIN Numpad or Credentials Form -->
          <div class="lg:col-span-7 p-4 sm:p-6 lg:p-7 flex flex-col justify-center space-y-4 sm:space-y-5">
            ${lockoutBannerHtml}

            <!-- Mode Switcher Tabs -->
            <div class="flex items-center p-1 rounded-[14px] bg-[var(--glass-bg-clear)] border border-[var(--line)] shadow-xs">
              <button id="tab-pin-mode" class="flex-1 py-2 sm:py-2.5 rounded-[11px] text-xs font-bold transition-all ${this.mode === 'pin' ? 'bg-[var(--accent)] text-white shadow-sm' : 'text-[var(--muted)] hover:text-[var(--text)]'}">
                Touch PIN Pad
              </button>
              <button id="tab-email-mode" class="flex-1 py-2 sm:py-2.5 rounded-[11px] text-xs font-bold transition-all ${this.mode === 'email' ? 'bg-[var(--accent)] text-white shadow-sm' : 'text-[var(--muted)] hover:text-[var(--text)]'}">
                Username / Password
              </button>
            </div>

            <!-- PIN Numpad Mode -->
            ${this.mode === 'pin' ? `
              <div class="space-y-3 sm:space-y-4">
                <!-- Operator Dropdown Picker (Available on All Screen Sizes) -->
                <div class="space-y-1.5">
                  <label class="block text-[11px] font-black text-[var(--muted)] uppercase tracking-wider text-center">Active Operator</label>
                  <div class="relative flex items-center max-w-[320px] mx-auto">
                    <select id="operator-select-dropdown" class="w-full h-11 pl-3.5 pr-10 rounded-[14px] glass-input text-xs font-bold text-[var(--text)] bg-[var(--card-bg)] border border-[var(--line)] shadow-xs appearance-none cursor-pointer">
                      ${users.map(u => `
                        <option value="${u.id}" ${u.id === selectedUser.id ? 'selected' : ''}>
                          ${sanitizeHtml(u.name)} — ${u.role} ${u.role === 'OWNER' ? '★ (Admin)' : ''}
                        </option>
                      `).join('')}
                    </select>
                    <span class="absolute right-3.5 pointer-events-none text-xs text-[var(--muted)] font-bold">▼</span>
                  </div>
                </div>

                <div class="text-center space-y-1">
                  <p class="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Enter 4-Digit Security PIN</p>
                  <div class="flex items-center justify-center space-x-3.5 py-1">
                    ${pinDotsHtml}
                  </div>
                </div>

                <!-- Touch-Optimized Numpad Grid -->
                <div class="grid grid-cols-3 gap-2 sm:gap-2.5 max-w-[280px] sm:max-w-[300px] mx-auto">
                  ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => `
                    <button type="button" data-pin-num="${num}" class="h-12 sm:h-14 lg:h-15 rounded-[16px] sm:rounded-[18px] text-xl sm:text-2xl font-black font-mono glass-btn-secondary text-[var(--text)] flex items-center justify-center shadow-xs hover:border-[var(--accent)] active:scale-92 transition-all select-none">
                      ${num}
                    </button>
                  `).join('')}
                  <button type="button" id="pin-clear-btn" class="h-12 sm:h-14 lg:h-15 rounded-[16px] sm:rounded-[18px] text-[11px] font-black glass-btn-secondary text-[var(--red)] flex items-center justify-center shadow-xs active:scale-92 transition-all select-none">
                    CLEAR
                  </button>
                  <button type="button" data-pin-num="0" class="h-12 sm:h-14 lg:h-15 rounded-[16px] sm:rounded-[18px] text-xl sm:text-2xl font-black font-mono glass-btn-secondary text-[var(--text)] flex items-center justify-center shadow-xs hover:border-[var(--accent)] active:scale-92 transition-all select-none">
                    0
                  </button>
                  <button type="button" id="pin-backspace-btn" class="h-12 sm:h-14 lg:h-15 rounded-[16px] sm:rounded-[18px] text-xs font-bold glass-btn-secondary text-[var(--accent)] flex items-center justify-center shadow-xs active:scale-92 transition-all select-none">
                    ${renderIcon('trash-2', 'w-4 h-4')}
                  </button>
                </div>

                <div class="text-center pt-1">
                  <p class="text-[10px] text-[var(--muted)] font-mono">
                    Admin: <strong class="text-[var(--accent)]">1234</strong> &bull; Marcus: <strong class="text-[var(--text)]">2345</strong> &bull; Sophia: <strong class="text-[var(--text)]">3456</strong>
                  </p>
                </div>
              </div>
            ` : `
              <!-- Email / Password Form Mode -->
              <form id="email-login-form" class="space-y-3.5 max-w-sm mx-auto w-full" autocomplete="on">
                <div>
                  <label class="block text-xs font-bold text-[var(--text)] mb-1">Username or Email</label>
                  <input
                    id="login-username-input"
                    name="email"
                    type="text"
                    required
                    value="${selectedUser.email || selectedUser.name || 'admin'}"
                    placeholder="Enter username (e.g. admin)"
                    autocomplete="username"
                    class="w-full h-11 px-3.5 rounded-[12px] glass-input text-xs font-bold text-[var(--text)] placeholder:text-[var(--muted)]/60"
                  />
                </div>

                <div>
                  <label class="block text-xs font-bold text-[var(--text)] mb-1">Security Password</label>
                  <div class="relative flex items-center">
                    <input
                      id="login-password-input"
                      name="password"
                      type="${this.showPassword ? 'text' : 'password'}"
                      required
                      value=""
                      placeholder="Enter password (e.g. admin)"
                      autocomplete="current-password"
                      class="w-full h-11 pl-3.5 pr-11 rounded-[12px] glass-input text-xs font-bold text-[var(--text)] placeholder:text-[var(--muted)]/60"
                    />
                    <button
                      type="button"
                      id="toggle-login-password-btn"
                      aria-label="Toggle password visibility"
                      class="absolute right-1.5 p-1.5 rounded-[8px] text-[var(--muted)] hover:text-[var(--text)] transition active:scale-90"
                      title="${this.showPassword ? 'Hide password' : 'Show password'}"
                    >
                      ${renderIcon(this.showPassword ? 'eye-off' : 'eye', 'w-4 h-4')}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  class="w-full h-11 mt-2 rounded-[14px] glass-btn-primary text-xs font-black shadow-md flex items-center justify-center space-x-2 active:scale-98 transition-all"
                >
                  <span>Unlock Terminal</span>
                  <span>→</span>
                </button>

                <div class="text-center pt-1">
                  <p class="text-[10px] text-[var(--muted)] font-mono">
                    Default: Username <strong class="text-[var(--accent)]">admin</strong> &bull; Password <strong class="text-[var(--accent)]">admin</strong>
                  </p>
                </div>
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

    // Reset Lockout button
    const resetLockBtn = this.container.querySelector('#reset-lockout-btn');
    if (resetLockBtn) {
      resetLockBtn.addEventListener('click', () => {
        loginRateLimiter.reset();
        toast.success('Terminal lockout reset');
        this.render();
        this.attachEvents();
      });
    }

    // Operator Dropdown Select (All Viewports)
    const operatorSelect = this.container.querySelector('#operator-select-dropdown');
    if (operatorSelect) {
      operatorSelect.addEventListener('change', (e) => {
        this.selectedUserId = e.target.value;
        this.pinBuffer = '';
        this.render();
        this.attachEvents();
      });
    }

    // Staff selector buttons (Desktop Cards)
    this.container.querySelectorAll('[data-select-user-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectedUserId = btn.getAttribute('data-select-user-id');
        this.pinBuffer = '';
        this.render();
        this.attachEvents();
      });
    });

    // Mode Toggle Tabs
    const pinTab = this.container.querySelector('#tab-pin-mode');
    const emailTab = this.container.querySelector('#tab-email-mode');
    if (pinTab) {
      pinTab.addEventListener('click', () => {
        this.mode = 'pin';
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

    // PIN Numpad buttons
    this.container.querySelectorAll('[data-pin-num]').forEach(btn => {
      btn.addEventListener('click', () => {
        const num = btn.getAttribute('data-pin-num');
        this.handlePinInput(num);
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

    // Backspace PIN
    const backspaceBtn = this.container.querySelector('#pin-backspace-btn');
    if (backspaceBtn) {
      backspaceBtn.addEventListener('click', () => {
        if (this.pinBuffer.length > 0) {
          this.pinBuffer = this.pinBuffer.slice(0, -1);
          this.render();
          this.attachEvents();
        }
      });
    }

    // Keyboard support for PIN entry
    this.handleKeyDown = (e) => {
      if (this.mode !== 'pin') return;
      if (e.key >= '0' && e.key <= '9') {
        this.handlePinInput(e.key);
      } else if (e.key === 'Backspace') {
        if (this.pinBuffer.length > 0) {
          this.pinBuffer = this.pinBuffer.slice(0, -1);
          this.render();
          this.attachEvents();
        }
      } else if (e.key === 'Escape') {
        this.pinBuffer = '';
        this.render();
        this.attachEvents();
      }
    };
    window.removeEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keydown', this.handleKeyDown);

    // Password Toggle
    const togglePassBtn = this.container.querySelector('#toggle-login-password-btn');
    if (togglePassBtn) {
      togglePassBtn.addEventListener('click', () => {
        this.showPassword = !this.showPassword;
        this.render();
        this.attachEvents();
      });
    }

    // Password Form Submit
    const form = this.container.querySelector('#email-login-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const identifier = fd.get('email');
        const password = fd.get('password');

        try {
          const res = await sessionManager.loginWithPassword(identifier, password);
          if (res.success) {
            loginRateLimiter.reset();
            toast.success(`Welcome, ${res.user.name}`);
            window.removeEventListener('keydown', this.handleKeyDown);
            if (this.onLoginSuccess) this.onLoginSuccess();
          } else {
            loginRateLimiter.recordFailedAttempt();
            toast.error(res.message || 'Invalid credentials');
            this.render();
            this.attachEvents();
          }
        } catch (err) {
          toast.error(err.message || 'Login error');
        }
      });
    }
  }

  async handlePinInput(digit) {
    const lockInfo = loginRateLimiter.isLocked();
    if (lockInfo.locked) {
      toast.error(`Terminal is locked. Please wait ${lockInfo.remainingSeconds}s.`);
      return;
    }

    if (this.pinBuffer.length < 4) {
      this.pinBuffer += digit;
      this.render();
      this.attachEvents();

      if (this.pinBuffer.length === 4) {
        const users = sessionManager.getAllUsers();
        const user = users.find(u => u.id === this.selectedUserId) || users[0];

        try {
          const res = await sessionManager.loginWithPin(this.pinBuffer, user.id);
          if (res.success) {
            loginRateLimiter.reset();
            toast.success(`Unlocked by ${res.user.name}`);
            window.removeEventListener('keydown', this.handleKeyDown);
            if (this.onLoginSuccess) this.onLoginSuccess();
          } else {
            loginRateLimiter.recordFailedAttempt();
            toast.error('Incorrect PIN. Please try again.');
            this.pinBuffer = '';
            setTimeout(() => {
              this.render();
              this.attachEvents();
            }, 300);
          }
        } catch (err) {
          toast.error(err.message || 'PIN verification failed');
          this.pinBuffer = '';
          this.render();
          this.attachEvents();
        }
      }
    }
  }
}
