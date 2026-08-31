/**
 * FlowPOS Topbar Component - iOS 26 Liquid Glass Premium Edition
 * Fully responsive with mobile hamburger toggle, dynamic search, currency switcher, and clean vector theme toggles
 */

import { renderIcon } from '../utils/icons.js';
import { themeManager } from '../store/theme.js';
import { sessionManager } from '../store/session.js';
import { registerService } from '../services/registers.js';
import { settingsService } from '../services/settings.js';
import { SUPPORTED_CURRENCIES, getCurrencyConfig } from '../utils/currency.js';
import { globalStore } from '../store/state.js';
import { toast } from './Toast.js';
import { promptPinAuth } from './PinAuthModal.js';
import { sanitizeHtml } from '../utils/security.js';

export class Topbar {
  constructor(container) {
    this.container = container;
    this.render();
    this.attachEvents();
    this.subscribeStores();
  }

  subscribeStores() {
    globalStore.subscribe('connectivity', () => this.updateConnectivity());
    globalStore.subscribe('currentUser', () => {
      this.render();
      this.attachEvents();
    });
    globalStore.subscribe('cart', () => this.updateMobileCartBadge());
    globalStore.subscribe('registerSession', () => {
      this.render();
      this.attachEvents();
    });

    window.addEventListener('flowpos:user-switched', () => {
      this.render();
      this.attachEvents();
    });
    window.addEventListener('flowpos:user-updated', () => {
      this.render();
      this.attachEvents();
    });
    window.addEventListener('flowpos:rates-updated', () => {
      this.render();
      this.attachEvents();
    });
    window.addEventListener('flowpos:theme-changed', () => {
      this.render();
      this.attachEvents();
    });
    window.addEventListener('flowpos:settings-updated', () => {
      this.render();
      this.attachEvents();
    });
  }

  updateConnectivity() {
    const connState = globalStore.get('connectivity', { isOnline: navigator.onLine, isSyncing: false, pendingSyncCount: 0 });
    const pill = this.container.querySelector('#connectivity-pill');
    if (!pill) return;

    if (connState.isSyncing) {
      pill.className = 'badge badge-blue shadow-xs hidden lg:flex';
      pill.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-ping"></span><span>Syncing…</span>`;
    } else if (connState.isOnline) {
      if (connState.pendingSyncCount > 0) {
        pill.className = 'badge badge-amber shadow-xs hidden lg:flex';
        pill.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span><span>Online (${connState.pendingSyncCount})</span>`;
      } else {
        pill.className = 'badge badge-online shadow-xs hidden lg:flex';
        pill.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400"></span><span>Online</span>`;
      }
    } else {
      pill.className = 'badge badge-danger shadow-xs hidden lg:flex';
      pill.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-red-500"></span><span>Offline</span>`;
    }
  }

  updateMobileCartBadge() {
    const cartData = globalStore.get('cart', { totals: { itemCount: 0 } });
    const badge = this.container.querySelector('#mobile-cart-badge');
    if (badge) {
      badge.textContent = cartData.totals.itemCount || 0;
    }
  }

  updateUserDisplay() {
    const user = sessionManager.getUser() || { name: 'admin', role: 'OWNER' };
    const userBtn = this.container.querySelector('#staff-switch-btn');
    if (userBtn) {
      userBtn.innerHTML = `
        ${user.avatar ? `
          <img src="${user.avatar}" alt="${user.name}" class="w-7 h-7 rounded-full object-cover ring-1 ring-[var(--line)] flex-shrink-0 shadow-xs" onerror="this.style.display='none'; this.nextElementSibling.style.display='grid';" />
          <div class="avatar w-7 h-7 rounded-full bg-gradient-to-tr from-[#0066CC] to-[#7E22CE] text-white font-bold text-[11px] hidden place-items-center flex-shrink-0 shadow-xs">
            ${user.name.substring(0, 2).toUpperCase()}
          </div>
        ` : `
          <div class="avatar w-7 h-7 rounded-full bg-gradient-to-tr from-[#0066CC] to-[#7E22CE] text-white font-bold text-[11px] grid place-items-center flex-shrink-0 shadow-xs">
            ${user.name.substring(0, 2).toUpperCase()}
          </div>
        `}
        <div class="hidden md:flex flex-col text-left">
          <span class="text-xs font-bold text-[var(--text)] leading-tight">${user.name}</span>
          <span class="text-[9px] text-[var(--accent)] font-bold uppercase tracking-wider leading-none">${user.role}</span>
        </div>
        <span class="text-[var(--muted)] text-[9px] hidden md:inline font-bold">▼</span>
      `;
    }
  }

  render() {
    const user = sessionManager.getUser() || { name: 'admin', role: 'OWNER' };
    const users = sessionManager.getAllUsers();
    const currentTheme = themeManager.getTheme();
    const activeSession = registerService.getActiveSession();
    const currency = getCurrencyConfig();
    const cartData = globalStore.get('cart', { totals: { itemCount: 0 } });

    this.container.innerHTML = `
      <header class="h-14 sm:h-16 w-full glass border-b border-[var(--line)] px-2.5 sm:px-5 flex items-center justify-between z-20 gap-1.5 sm:gap-3">
        <!-- Left: Hamburger Toggle & Search -->
        <div class="flex items-center space-x-1.5 sm:space-x-2.5 min-w-0 flex-shrink-0">
          <!-- Mobile Hamburger Button -->
          <button id="mobile-menu-btn" class="lg:hidden p-2 rounded-[12px] glass-btn-secondary text-[var(--text)] hover:text-[var(--accent)] active:scale-95 transition flex-shrink-0" title="Open Navigation Menu">
            ${renderIcon('menu', 'w-4.5 h-4.5')}
          </button>

          <!-- Search Pill -->
          <button id="global-search-trigger" class="flex items-center space-x-2 px-2.5 sm:px-3.5 py-1.8 sm:py-2 rounded-[12px] sm:rounded-[14px] glass-btn-secondary text-xs font-bold transition group shadow-xs active:scale-96 flex-shrink-0">
            <span class="text-[var(--accent)] text-sm flex-shrink-0">${renderIcon('search', 'w-4 h-4')}</span>
            <span class="hidden md:inline text-[var(--text)] font-semibold truncate max-w-[120px] lg:max-w-xs">Search anything…</span>
            <kbd class="kbd-shortcut hidden lg:inline-flex ml-1">⌘K</kbd>
          </button>

          <!-- Register Status (Desktop Only) -->
          <a href="#/registers" class="hidden xl:flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-black badge-active shadow-xs active:scale-96 transition flex-shrink-0">
            <span class="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400"></span>
            <span>Register #01 Active</span>
          </a>
        </div>

        <!-- Right: Currency, Mobile Cart, Theme, Staff Profile -->
        <div class="flex items-center space-x-1.5 sm:space-x-2 flex-shrink-0">
          <!-- Currency Selector Pill -->
          <div class="relative">
            <button id="currency-selector-btn" class="flex items-center space-x-1 px-2 sm:px-2.5 py-1.2 rounded-[10px] sm:rounded-[12px] glass-btn-secondary text-xs font-mono font-bold transition shadow-xs active:scale-95" title="Change Currency">
              <span class="text-[var(--accent)] font-black">${currency.symbol}</span>
              <span class="font-extrabold text-[10px] sm:text-[11px] text-[var(--text)]">${currency.code}</span>
              <span class="text-[8px] text-[var(--muted)]">▼</span>
            </button>

            <!-- Currency Dropdown Menu -->
            <div id="currency-dropdown" class="hidden absolute right-0 mt-2 w-64 glass2 rounded-[20px] p-2 border border-[var(--line)] shadow-2xl z-[70] animate-scale-in">
              <div class="flex items-center justify-between px-2 py-1 border-b border-[var(--line)]/50 mb-1">
                <p class="text-[9.5px] uppercase font-black text-[var(--muted)] tracking-wider">Live Currency (LKR Base)</p>
                <span class="inline-flex items-center gap-1 text-[8.5px] font-bold text-emerald-600 dark:text-emerald-400">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Live Rates
                </span>
              </div>

              <div class="space-y-1 max-h-64 overflow-y-auto scrollbar-none pr-0.5">
                ${SUPPORTED_CURRENCIES.map(c => {
                  const isSelected = c.code === currency.code;
                  return `
                    <button data-currency-code="${c.code}" class="w-full flex items-center justify-between px-2.5 py-2 rounded-[12px] text-xs hover:bg-[var(--accent)]/15 transition ${isSelected ? 'bg-[var(--accent)]/20 text-[var(--accent)] font-black border border-[var(--accent)]/30' : 'text-[var(--text)] font-semibold'}">
                      <div class="text-left truncate min-w-0 pr-2">
                        <div class="truncate text-xs font-black">${c.name}</div>
                      </div>
                      <span class="font-mono text-xs font-bold text-[var(--accent)] flex-shrink-0">${c.symbol}${c.code}</span>
                    </button>
                  `;
                }).join('')}
              </div>
            </div>
          </div>

          <!-- Mobile Cart Slide-Over Toggle Button (Tablet/Mobile only) -->
          <button id="mobile-cart-toggle-btn" class="xl:hidden relative flex items-center space-x-1 px-2.5 py-1.5 rounded-[10px] sm:rounded-[12px] glass-btn-primary shadow-sm active:scale-95 transition flex-shrink-0" title="Open Active Cart">
            ${renderIcon('shopping-bag', 'w-4 h-4 text-white')}
            <span id="mobile-cart-badge" class="bg-white text-[var(--accent)] text-[10px] font-black px-1.5 py-0.2 rounded-full leading-none">
              ${cartData.totals.itemCount || 0}
            </span>
          </button>

          <!-- Connectivity Status Beacon (Desktop only) -->
          <div id="connectivity-pill" class="badge badge-online shadow-xs hidden lg:flex">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Online</span>
          </div>

          <!-- Theme Toggle Control -->
          <div class="flex items-center p-0.5 rounded-[10px] sm:rounded-[12px] glass border border-[var(--line)] shadow-xs flex-shrink-0">
            <button data-theme-btn="light" aria-label="Light mode" class="p-1 sm:px-2 py-0.8 rounded-[8px] sm:rounded-[10px] ${currentTheme === 'light' ? 'bg-white text-amber-500 shadow-xs font-bold' : 'text-[var(--muted)] hover:text-[var(--text)]'} transition-all text-xs active:scale-90 flex items-center" title="Switch to Light Theme">
              ${renderIcon('sun', 'w-3.5 h-3.5')}
            </button>
            <button data-theme-btn="dark" aria-label="Dark mode" class="p-1 sm:px-2 py-0.8 rounded-[8px] sm:rounded-[10px] ${currentTheme === 'dark' ? 'bg-slate-800 text-indigo-400 shadow-sm font-bold' : 'text-[var(--muted)] hover:text-[var(--text)]'} transition-all text-xs active:scale-90 flex items-center" title="Switch to Dark Theme">
              ${renderIcon('moon', 'w-3.5 h-3.5')}
            </button>
          </div>

          <!-- Staff Switcher Dropdown Button -->
          <div class="relative flex-shrink-0">
            <button id="staff-switch-btn" class="flex items-center space-x-1.5 p-1 sm:p-1.2 sm:pr-2.5 rounded-[12px] sm:rounded-[14px] glass-btn-secondary transition shadow-xs active:scale-96">
              ${user.avatar ? `
                <img src="${user.avatar}" alt="${user.name}" class="w-7 h-7 rounded-full object-cover ring-1 ring-[var(--line)] flex-shrink-0 shadow-xs" onerror="this.style.display='none'; this.nextElementSibling.style.display='grid';" />
                <div class="avatar w-7 h-7 rounded-full bg-gradient-to-tr from-[#0066CC] to-[#7E22CE] text-white font-bold text-xs hidden place-items-center flex-shrink-0 shadow-xs">
                  ${user.name.substring(0, 2).toUpperCase()}
                </div>
              ` : `
                <div class="avatar w-7 h-7 rounded-full bg-gradient-to-tr from-[#0066CC] to-[#7E22CE] text-white font-bold text-xs grid place-items-center flex-shrink-0 shadow-xs">
                  ${user.name.substring(0, 2).toUpperCase()}
                </div>
              `}
              <div class="hidden md:flex flex-col text-left">
                <span class="text-xs font-bold text-[var(--text)] leading-tight">${user.name}</span>
                <span class="text-[9px] text-[var(--accent)] font-bold uppercase tracking-wider leading-none">${user.role}</span>
              </div>
              <span class="text-[var(--muted)] text-[9px] hidden md:inline font-bold">▼</span>
            </button>

            <!-- Dropdown Menu -->
            <div id="staff-dropdown-menu" class="hidden absolute right-0 mt-2 w-64 glass2 rounded-[22px] p-3 border border-[var(--line)] shadow-2xl z-[70] animate-scale-in">
              <div class="flex items-center space-x-3 px-2 pb-2.5 border-b border-[var(--line)] mb-2">
                <img src="${user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}" alt="${user.name}" class="w-9 h-9 rounded-full object-cover ring-1 ring-[var(--line)] flex-shrink-0 shadow-xs" />
                <div class="truncate">
                  <p class="text-xs font-black text-[var(--text)] truncate">${user.name}</p>
                  <p class="text-[10px] text-[var(--muted)] font-mono font-bold truncate">${user.email || 'user@flowpos.store'}</p>
                </div>
              </div>

              <div class="space-y-1 max-h-52 overflow-y-auto pr-0.5 scrollbar-none">
                <p class="text-[9px] font-black uppercase text-[var(--muted)] px-2 py-0.5 tracking-wider">Switch Active Operator</p>
                ${users.map(u => `
                  <button data-switch-user="${u.id}" class="w-full flex items-center justify-between px-2.5 py-1.8 rounded-[12px] text-xs font-bold hover:bg-[var(--accent)]/15 transition ${u.id === user.id ? 'bg-[var(--accent)]/20 text-[var(--accent)] font-black' : 'text-[var(--text)]'}">
                    <div class="flex items-center space-x-2 truncate">
                      <img src="${u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}" alt="${u.name}" class="w-5 h-5 rounded-full object-cover flex-shrink-0" />
                      <span class="truncate">${u.name}</span>
                    </div>
                    <span class="badge ${u.role === 'OWNER' ? 'badge-platinum' : u.role === 'MANAGER' ? 'badge-blue' : 'badge-emerald'} text-[9px]">${u.role}</span>
                  </button>
                `).join('')}
              </div>

              <div class="pt-2 mt-2 border-t border-[var(--line)] flex justify-between">
                <a href="#/employees" class="text-[11px] font-black text-[var(--accent)] hover:underline p-1">Manage Staff & Photos</a>
                <button id="topbar-logout-btn" class="text-[11px] font-black text-[var(--red)] hover:underline p-1 flex items-center space-x-1">
                  ${renderIcon('log-out', 'w-3 h-3')}
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>
    `;

    this.updateConnectivity();
  }

  attachEvents() {
    // Mobile hamburger menu drawer trigger
    const mobileMenuBtn = this.container.querySelector('#mobile-menu-btn');
    if (mobileMenuBtn) {
      mobileMenuBtn.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('flowpos:toggle-mobile-sidebar'));
      });
    }

    // Mobile cart slide-over toggle trigger
    const mobileCartBtn = this.container.querySelector('#mobile-cart-toggle-btn');
    if (mobileCartBtn) {
      mobileCartBtn.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('flowpos:toggle-mobile-cart'));
      });
    }

    // Global search command palette trigger
    const searchTrigger = this.container.querySelector('#global-search-trigger');
    if (searchTrigger) {
      searchTrigger.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('flowpos:open-global-search'));
      });
    }

    // Theme toggles
    this.container.querySelectorAll('[data-theme-btn]').forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = btn.getAttribute('data-theme-btn');
        themeManager.setTheme(theme);
        this.render();
        this.attachEvents();
        toast.info(`Switched to ${theme} theme`);
      });
    });

    // Currency Switcher Dropdown Toggle & Selection
    const currBtn = this.container.querySelector('#currency-selector-btn');
    const currMenu = this.container.querySelector('#currency-dropdown');

    if (currBtn && currMenu) {
      currBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        currMenu.classList.toggle('hidden');
      });

      this.container.querySelectorAll('[data-currency-code]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const code = btn.getAttribute('data-currency-code');
          const matched = SUPPORTED_CURRENCIES.find(c => c.code === code) || {
            code,
            symbol: code === 'LKR' ? 'Rs. ' : '$',
            position: 'prefix',
            decimals: code === 'JPY' ? 0 : 2
          };

          settingsService.save({
            currency: {
              code: matched.code,
              symbol: matched.symbol,
              position: matched.position || 'prefix',
              decimals: matched.decimals ?? 2
            }
          });

          currMenu.classList.add('hidden');
          toast.success(`Store currency changed to ${matched.name || code}`);
          setTimeout(() => window.location.reload(), 250);
        });
      });
    }

    // Staff Switcher Dropdown
    const staffBtn = this.container.querySelector('#staff-switch-btn');
    const staffMenu = this.container.querySelector('#staff-dropdown-menu');

    if (staffBtn && staffMenu) {
      staffBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        staffMenu.classList.toggle('hidden');
      });

      this.container.querySelectorAll('[data-switch-user]').forEach(btn => {
        btn.addEventListener('click', () => {
          const userId = btn.getAttribute('data-switch-user');
          const targetUser = sessionManager.getAllUsers().find(u => u.id === userId);
          staffMenu.classList.add('hidden');
          if (!targetUser) return;

          const currentUser = sessionManager.getUser();
          if (currentUser && currentUser.id === targetUser.id) {
            return;
          }

          promptPinAuth({
            targetUser,
            title: `Switch Operator: ${targetUser.name}`,
            description: `Enter 4-digit PIN for ${targetUser.name}`,
            onSuccess: () => {
              window.location.reload();
            }
          });
        });
      });

      const logoutBtn = this.container.querySelector('#topbar-logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
          sessionManager.logout();
        });
      }
    }

    // Close dropdowns on outside click
    document.addEventListener('click', (e) => {
      if (currMenu && !currMenu.contains(e.target) && e.target !== currBtn) {
        currMenu.classList.add('hidden');
      }
      if (staffMenu && !staffMenu.contains(e.target) && e.target !== staffBtn) {
        staffMenu.classList.add('hidden');
      }
    });
  }
}
