/**
 * FlowPOS Liquid Glass Settings View
 * With Appearance (Light, Dark, System previews), Store Profile, Multi-Currency Config (LKR, USD, EUR, etc.), and Data Backup
 */

import { settingsService } from '../services/settings.js';
import { sessionManager } from '../store/session.js';
import { themeManager, ACCENT_PRESETS } from '../store/theme.js';
import { SUPPORTED_CURRENCIES, getCurrencyConfig } from '../utils/currency.js';
import { supabaseClient } from '../services/supabase.js';
import { toast } from '../components/Toast.js';
import { showConfirmDialog } from '../components/ConfirmDialog.js';
import { Modal } from '../components/Modal.js';
import { renderIcon } from '../utils/icons.js';
import { soundManager } from '../utils/audio.js';
import { CameraScannerModal } from '../components/CameraScannerModal.js';
import { hardwarePrinter } from '../services/printer.js';
import { customerDisplayService } from '../services/customerDisplay.js';
import { sanitizeHtml } from '../utils/security.js';

const WORKSPACE_OPTIONS = [
  {
    key: 'showStockBadges',
    label: 'Show product stock badges on cards',
    desc: 'Display real-time in-stock badge counters on POS catalog items',
    icon: 'package',
    defaultVal: true
  },
  {
    key: 'offlineQueue',
    label: 'Offline sales queue & auto-sync',
    desc: 'Automatically queue offline sales to local IndexedDB and sync when online',
    icon: 'wifi',
    defaultVal: true
  },
  {
    key: 'pinLockSecurity',
    label: 'Cashier PIN pad lock & RBAC security',
    desc: 'Prompt for 4-digit PIN verification during cashier shifts & privileged manager actions',
    icon: 'lock',
    defaultVal: true
  },
  {
    key: 'soundEffects',
    label: 'Barcode scanner & checkout audio cues',
    desc: 'Synthesize crisp auditory chime feedback on item scan and checkout',
    icon: 'volume-2',
    defaultVal: true
  },
  {
    key: 'autoPrintReceipt',
    label: 'Auto-open thermal receipt on checkout',
    desc: 'Pop up printable 80mm thermal receipt immediately after sale',
    icon: 'printer',
    defaultVal: false
  },
  {
    key: 'allowNegativeInventory',
    label: 'Allow checkout of out-of-stock items',
    desc: 'Permit selling items with zero or negative inventory on hand',
    icon: 'shopping-bag',
    defaultVal: false
  }
];

export class SettingsPage {
  constructor(container) {
    this.container = container;
    this.activeSection = 'appearance'; // 'appearance' | 'store' | 'checkout' | 'pos_behaviors' | 'hardware' | 'cloud' | 'security' | 'data'
    this.settings = settingsService.get();
    this.init();
  }

  init() {
    this.settings = settingsService.get();
    this.render();
    this.attachEvents();
  }

  render() {
    const currentTheme = themeManager.getTheme();
    const currentAccent = themeManager.getAccent();
    const currentFont = themeManager.getFont();

    const currentUser = sessionManager.getUser();
    const isOwner = currentUser && (currentUser.role === 'OWNER' || currentUser.name?.toLowerCase() === 'admin' || currentUser.name?.toLowerCase() === 'safar');

    const tabs = [
      { id: 'appearance', label: 'Appearance & Themes', icon: 'sun' },
      { id: 'store', label: 'Store & Branding', icon: 'shopping-bag' },
      { id: 'checkout', label: 'Currency, Tax & Pricing', icon: 'receipt' },
      { id: 'pos_behaviors', label: 'POS & Register Rules', icon: 'sliders' },
      { id: 'hardware', label: 'Hardware & Devices', icon: 'scan' },
      { id: 'cloud', label: 'Cloud Multi-Store', icon: 'server' }
    ];

    if (isOwner) {
      tabs.push({ id: 'cloud_logs', label: 'Cloud Logs & Live Audit', icon: 'activity' });
    }

    tabs.push(
      { id: 'security', label: 'Admin Security & PINs', icon: 'shield' },
      { id: 'data', label: 'Data & Backup', icon: 'download' }
    );

    const tabsNavHtml = tabs.map(t => `
      <button data-settings-tab="${t.id}" class="setting-tab flex items-center space-x-2.5 px-3.5 py-2.5 rounded-[14px] text-xs font-bold transition-all duration-150 text-left ${this.activeSection === t.id ? 'bg-[var(--accent)]/15 text-[var(--accent)] font-black border border-[var(--accent)]/30' : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-white/40 dark:hover:bg-white/5'}">
        <span>${renderIcon(t.icon, 'w-4 h-4')}</span>
        <span>${t.label}</span>
      </button>
    `).join('');

    let contentHtml = '';

    if (this.activeSection === 'appearance') {
      contentHtml = `
        <div class="space-y-5">
          <div>
            <h3 class="font-black font-heading text-sm text-[var(--text)]">Appearance</h3>
            <p class="text-xs text-[var(--muted)] font-medium">Choose a calm, translucent workspace theme. Changes apply instantly.</p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <!-- Light -->
            <button data-set-theme="light" class="p-4 rounded-[20px] border ${currentTheme === 'light' ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/30 bg-white/90 shadow-lg' : 'border-[var(--line)]'} glass-card flex flex-col items-center justify-center space-y-2 text-center transition">
              <div class="w-full h-16 rounded-[12px] bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-[var(--line)] shadow-xs">
                ${renderIcon('sun', 'w-7 h-7 text-amber-500')}
              </div>
              <strong class="text-xs font-black text-[var(--text)]">Light Mode</strong>
              <small class="text-[10px] text-[var(--muted)] font-medium">Calm anti-glare theme</small>
            </button>

            <!-- Dark -->
            <button data-set-theme="dark" class="p-4 rounded-[20px] border ${currentTheme === 'dark' ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/30 bg-slate-900/90 shadow-lg' : 'border-[var(--line)]'} glass-card flex flex-col items-center justify-center space-y-2 text-center transition">
              <div class="w-full h-16 rounded-[12px] bg-slate-900 flex items-center justify-center border border-white/10 shadow-xs">
                ${renderIcon('moon', 'w-7 h-7 text-indigo-400')}
              </div>
              <strong class="text-xs font-black text-[var(--text)]">Dark Mode</strong>
              <small class="text-[10px] text-[var(--muted)] font-medium">Deep OLED obsidian</small>
            </button>

            <!-- System -->
            <button data-set-theme="system" class="p-4 rounded-[20px] border ${currentTheme === 'system' ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/30 bg-white/70 dark:bg-slate-800/70 shadow-lg' : 'border-[var(--line)]'} glass-card flex flex-col items-center justify-center space-y-2 text-center transition">
              <div class="w-full h-16 rounded-[12px] bg-gradient-to-r from-slate-200 50%, #1e293b 50% flex items-center justify-center border border-[var(--line)] shadow-xs">
                ${renderIcon('laptop', 'w-7 h-7 text-slate-700 dark:text-slate-300')}
              </div>
              <strong class="text-xs font-black text-[var(--text)]">System Default</strong>
              <small class="text-[10px] text-[var(--muted)] font-medium">Follow OS appearance</small>
            </button>
          </div>

          <!-- Brand Accent Color Palette -->
          <div class="pt-4 border-t border-[var(--line)] space-y-3">
            <div>
              <h4 class="text-xs font-black text-[var(--text)]">Brand Accent & Active Color Palette</h4>
              <p class="text-[11px] text-[var(--muted)] font-medium">Customize the glow and highlight color across interactive buttons, cards, and badges.</p>
            </div>
            <div class="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
              ${ACCENT_PRESETS.map(p => `
                <button
                  type="button"
                  data-set-accent="${p.color}"
                  class="p-2.5 rounded-[16px] glass-card border ${currentAccent === p.color ? 'border-[var(--text)] ring-2 ring-[var(--accent)]/40 shadow-md scale-105' : 'border-[var(--line)]'} flex flex-col items-center space-y-1.5 active:scale-95 transition"
                  title="${p.label}"
                >
                  <span class="w-7 h-7 rounded-full shadow-md flex items-center justify-center text-white text-[10px] font-black" style="background-color: ${p.color};">
                    ${currentAccent === p.color ? '✓' : ''}
                  </span>
                  <span class="text-[10px] font-black text-[var(--text)] truncate">${p.label.split(' ')[0]}</span>
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Typography Style -->
          <div class="pt-4 border-t border-[var(--line)] space-y-3">
            <div>
              <h4 class="text-xs font-black text-[var(--text)]">Typography & Font Styling</h4>
              <p class="text-[11px] text-[var(--muted)] font-medium">Select primary font typography across the entire POS application.</p>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button type="button" data-set-font="Outfit" class="p-3 rounded-[16px] glass-card border ${currentFont === 'Outfit' ? 'border-[var(--accent)] font-black ring-2 ring-[var(--accent)]/30' : 'border-[var(--line)] font-bold'} text-xs text-left active:scale-95 transition">
                <strong class="block text-xs font-black text-[var(--text)]">Outfit (Modern POS)</strong>
                <span class="text-[10px] text-[var(--muted)]">Default geometric rounded</span>
              </button>
              <button type="button" data-set-font="Inter" class="p-3 rounded-[16px] glass-card border ${currentFont === 'Inter' ? 'border-[var(--accent)] font-black ring-2 ring-[var(--accent)]/30' : 'border-[var(--line)] font-bold'} text-xs text-left active:scale-95 transition">
                <strong class="block text-xs font-black text-[var(--text)]">Inter (Clean UI)</strong>
                <span class="text-[10px] text-[var(--muted)]">High legibility neutral</span>
              </button>
              <button type="button" data-set-font="Mono" class="p-3 rounded-[16px] glass-card border ${currentFont === 'Mono' ? 'border-[var(--accent)] font-black ring-2 ring-[var(--accent)]/30' : 'border-[var(--line)] font-bold'} text-xs text-left font-mono active:scale-95 transition">
                <strong class="block text-xs font-black text-[var(--text)]">Monospace (Terminal)</strong>
                <span class="text-[10px] text-[var(--muted)]">Fixed-width hacker tech</span>
              </button>
            </div>
          </div>

          <!-- Workspace Options -->
          <div class="pt-4 border-t border-[var(--line)] space-y-3">
            <div>
              <h4 class="text-xs font-black text-[var(--text)]">POS Workspace Experience</h4>
              <p class="text-[11px] text-[var(--muted)] font-medium">Toggle station workflows, security locks, and catalog display options.</p>
            </div>

            <div class="space-y-2.5">
              ${this.renderWorkspaceOptionsHtml()}
            </div>
          </div>
        </div>
      `;
    } else if (this.activeSection === 'store') {
      const s = this.settings.store || {};
      const storeLogo = s.logo || '';
      contentHtml = `
        <form id="store-settings-form" class="space-y-4">
          <div>
            <h3 class="font-black font-heading text-sm text-[var(--text)]">Store Profile, Logo & Branding</h3>
            <p class="text-xs text-[var(--muted)] font-medium">Configure store name, upload custom brand logo, and customize receipts across all devices.</p>
          </div>

          <!-- Store Logo Upload Card -->
          <div class="p-4 rounded-[20px] glass-card border border-[var(--line)] space-y-3">
            <label class="block text-[11px] font-black text-[var(--text)]">Store Brand Logo</label>
            <div class="flex flex-wrap items-center gap-4">
              <div class="w-16 h-16 rounded-[18px] bg-gradient-to-tr from-[#0066CC] to-[#7E22CE] text-white font-black text-2xl grid place-items-center flex-shrink-0 shadow-md overflow-hidden border border-[var(--line)]">
                ${storeLogo ? `<img id="store-logo-preview" src="${storeLogo}" alt="Logo" class="w-full h-full object-cover" />` : `<span id="store-logo-fallback">${(s.name || 'F').substring(0, 1).toUpperCase()}</span>`}
              </div>
              <div class="space-y-2">
                <input id="store-logo-file-input" type="file" accept="image/*" class="hidden" />
                <input id="store-logo-hidden-input" name="logo" type="hidden" value="${storeLogo}" />
                <div class="flex items-center gap-2">
                  <label for="store-logo-file-input" class="px-3.5 py-2 rounded-[12px] text-xs font-bold glass-btn-secondary border border-[var(--line)] cursor-pointer flex items-center space-x-1.5 active:scale-96 transition">
                    ${renderIcon('upload', 'w-3.5 h-3.5')}
                    <span>Choose Logo Image</span>
                  </label>
                  <button type="button" id="clear-store-logo-btn" class="px-3 py-2 rounded-[12px] text-xs font-bold glass-btn-secondary text-[var(--red)] hover:bg-red-500/10 active:scale-96 transition">
                    Remove Logo
                  </button>
                </div>
                <p class="text-[10px] text-[var(--muted)]">Supports PNG, JPG, SVG. Auto-resizes and updates on sidebar, receipts & login screen.</p>
              </div>
            </div>
          </div>

          <!-- Store Name & Tagline -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-[11px] font-black text-[var(--text)] mb-1">Store / Business Name *</label>
              <input name="name" type="text" required value="${s.name || 'FlowPOS Store'}" placeholder="e.g. Safar Supermarket" class="glass-input w-full p-2.5 rounded-[12px] text-xs font-bold" />
            </div>
            <div>
              <label class="block text-[11px] font-black text-[var(--text)] mb-1">Store Slogan / Tagline</label>
              <input name="tagline" type="text" value="${s.tagline || 'Retail Operating Station'}" placeholder="e.g. Fresh Groceries & Quality Goods" class="glass-input w-full p-2.5 rounded-[12px] text-xs font-medium" />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-[11px] font-black text-[var(--text)] mb-1">Business Legal Name</label>
              <input name="legalName" type="text" value="${s.legalName || ''}" placeholder="e.g. Safar Enterprises Ltd" class="glass-input w-full p-2.5 rounded-[12px] text-xs font-medium" />
            </div>
            <div>
              <label class="block text-[11px] font-black text-[var(--text)] mb-1">Tax ID / Business Reg No</label>
              <input name="taxId" type="text" value="${s.taxId || ''}" placeholder="e.g. TAX-884920" class="glass-input w-full p-2.5 rounded-[12px] text-xs font-mono font-bold" />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-[11px] font-black text-[var(--text)] mb-1">Phone Number</label>
              <input name="phone" type="text" value="${s.phone || ''}" placeholder="+94 77 123 4567" class="glass-input w-full p-2.5 rounded-[12px] text-xs font-medium" />
            </div>
            <div>
              <label class="block text-[11px] font-black text-[var(--text)] mb-1">Email Address</label>
              <input name="email" type="email" value="${s.email || ''}" placeholder="contact@yourshop.com" class="glass-input w-full p-2.5 rounded-[12px] text-xs font-medium" />
            </div>
          </div>

          <div>
            <label class="block text-[11px] font-black text-[var(--text)] mb-1">Street Address</label>
            <input name="address" type="text" value="${s.address || ''}" placeholder="123 Main Street, City" class="glass-input w-full p-2.5 rounded-[12px] text-xs font-medium" />
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-[11px] font-black text-[var(--text)] mb-1">City</label>
              <input name="city" type="text" value="${s.city || ''}" placeholder="City" class="glass-input w-full p-2.5 rounded-[12px] text-xs font-medium" />
            </div>
            <div>
              <label class="block text-[11px] font-black text-[var(--text)] mb-1">Postal Code</label>
              <input name="zip" type="text" value="${s.zip || ''}" placeholder="00100" class="glass-input w-full p-2.5 rounded-[12px] text-xs font-mono font-medium" />
            </div>
            <div>
              <label class="block text-[11px] font-black text-[var(--text)] mb-1">Country</label>
              <input name="country" type="text" value="${s.country || ''}" placeholder="Sri Lanka" class="glass-input w-full p-2.5 rounded-[12px] text-xs font-medium" />
            </div>
          </div>

          <div>
            <label class="block text-[11px] font-black text-[var(--text)] mb-1">Thermal Receipt Footer Note</label>
            <textarea name="receiptFooter" rows="2" placeholder="Thank you for shopping with us! No returns without receipt." class="glass-input w-full p-2.5 rounded-[12px] text-xs font-mono font-medium">${s.receiptFooter || ''}</textarea>
          </div>

          <div class="pt-2">
            <button type="submit" class="px-6 py-2.5 rounded-[14px] text-xs font-black glass-btn-primary shadow-md active:scale-96 transition">
              Save Store Profile & Branding
            </button>
          </div>
        </form>
      `;
    } else if (this.activeSection === 'pos_behaviors') {
      const co = this.settings.checkout || {};
      contentHtml = `
        <form id="pos-behaviors-form" class="space-y-6">
          <div>
            <h3 class="font-black font-heading text-sm text-[var(--text)]">POS Register & Checkout Rules</h3>
            <p class="text-xs text-[var(--muted)] font-medium">Fine-tune cashier station behaviors, loyalty point conversion, quick cash buttons, and manager overrides.</p>
          </div>

          <!-- SECTION 1: Quick Cash Currency Note Presets -->
          <div class="p-4.5 rounded-[22px] glass-card border border-[var(--line)] space-y-3">
            <div class="flex items-center space-x-2.5 pb-2 border-b border-[var(--line)]">
              <div class="p-2 rounded-[10px] bg-[var(--accent)]/15 text-[var(--accent)]">
                ${renderIcon('banknote', 'w-4 h-4')}
              </div>
              <div>
                <h4 class="text-xs font-black text-[var(--text)]">Quick Cash Note Presets (Tender Modal)</h4>
                <p class="text-[10px] text-[var(--muted)] font-medium">Comma-separated currency bill presets shown on payment screen</p>
              </div>
            </div>
            <div>
              <label class="block text-[11px] font-black text-[var(--text)] mb-1">Preset Bill Denominations</label>
              <input
                name="quickCashPresets"
                type="text"
                value="${co.quickCashPresets || '500, 1000, 2000, 5000'}"
                placeholder="500, 1000, 2000, 5000"
                class="glass-input w-full p-2.5 rounded-[12px] text-xs font-mono font-bold"
              />
              <p class="text-[10px] text-[var(--muted)] mt-1">E.g. for Sri Lanka LKR: <code>500, 1000, 2000, 5000</code>. For US Dollar: <code>5, 10, 20, 50, 100</code></p>
            </div>
          </div>

          <!-- SECTION 2: Customer Loyalty Program Rules -->
          <div class="p-4.5 rounded-[22px] glass-card border border-[var(--line)] space-y-3.5">
            <div class="flex items-center space-x-2.5 pb-2 border-b border-[var(--line)]">
              <div class="p-2 rounded-[10px] bg-purple-500/15 text-purple-500">
                ${renderIcon('award', 'w-4 h-4')}
              </div>
              <div>
                <h4 class="text-xs font-black text-[var(--text)]">Customer Loyalty Rewards Conversion</h4>
                <p class="text-[10px] text-[var(--muted)] font-medium">Define point accumulation and cash redemption rates</p>
              </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label class="block text-[11px] font-black text-[var(--text)] mb-1">Earning Rate (Spend per 1 Point)</label>
                <div class="flex items-center space-x-2">
                  <input
                    name="loyaltyEarnRate"
                    type="number"
                    min="1"
                    value="${co.loyaltyEarnRate || 100}"
                    class="glass-input w-full p-2.5 rounded-[12px] text-xs font-mono font-bold"
                  />
                  <span class="text-xs font-bold text-[var(--muted)] flex-shrink-0">Spent = 1 Point</span>
                </div>
              </div>
              <div>
                <label class="block text-[11px] font-black text-[var(--text)] mb-1">Redemption Value (1 Point Worth)</label>
                <div class="flex items-center space-x-2">
                  <input
                    name="loyaltyRedeemValue"
                    type="number"
                    step="0.1"
                    min="0.1"
                    value="${co.loyaltyRedeemValue || 1.0}"
                    class="glass-input w-full p-2.5 rounded-[12px] text-xs font-mono font-bold"
                  />
                  <span class="text-xs font-bold text-[var(--muted)] flex-shrink-0">Discount Value</span>
                </div>
              </div>
            </div>
          </div>

          <!-- SECTION 3: Station Security & Manager Overrides -->
          <div class="p-4.5 rounded-[22px] glass-card border border-[var(--line)] space-y-3.5">
            <div class="flex items-center space-x-2.5 pb-2 border-b border-[var(--line)]">
              <div class="p-2 rounded-[10px] bg-amber-500/15 text-amber-500">
                ${renderIcon('shield', 'w-4 h-4')}
              </div>
              <div>
                <h4 class="text-xs font-black text-[var(--text)]">Privilege & Cashier Shift Guardrails</h4>
                <p class="text-[10px] text-[var(--muted)] font-medium">Prevent unauthorized cashier overrides and lock inactive registers</p>
              </div>
            </div>

            <div class="space-y-2.5">
              <label class="flex items-center space-x-2.5 cursor-pointer">
                <input type="checkbox" name="managerPinForDiscounts" ${co.managerPinForDiscounts !== false ? 'checked' : ''} class="rounded text-[var(--accent)]" />
                <div>
                  <strong class="text-xs text-[var(--text)] block">Require Manager PIN for Order Discounts &gt; 20%</strong>
                  <span class="text-[10px] text-[var(--muted)]">Cashiers must request manager PIN approval to discount items</span>
                </div>
              </label>

              <label class="flex items-center space-x-2.5 cursor-pointer">
                <input type="checkbox" name="managerPinForRefunds" ${co.managerPinForRefunds !== false ? 'checked' : ''} class="rounded text-[var(--accent)]" />
                <div>
                  <strong class="text-xs text-[var(--text)] block">Require Manager PIN for Order Returns & Refunds</strong>
                  <span class="text-[10px] text-[var(--muted)]">Protects cash drawer payout against fraudulent returns</span>
                </div>
              </label>

              <label class="flex items-center space-x-2.5 cursor-pointer">
                <input type="checkbox" name="enableTipping" ${co.enableTipping ? 'checked' : ''} class="rounded text-[var(--accent)]" />
                <div>
                  <strong class="text-xs text-[var(--text)] block">Prompt for Tip / Gratuity at Checkout</strong>
                  <span class="text-[10px] text-[var(--muted)]">Displays 10%, 15%, 20%, or custom tip keypad on customer screen</span>
                </div>
              </label>
            </div>
          </div>

          <div class="pt-2">
            <button type="submit" class="px-6 py-2.5 rounded-[14px] text-xs font-black glass-btn-primary shadow-md active:scale-96 transition">
              Save POS Register Rules
            </button>
          </div>
        </form>
      `;
    } else if (this.activeSection === 'hardware') {
      const hw = this.settings.hardware || {};
      contentHtml = `
        <form id="hardware-settings-form" class="space-y-6">
          <div>
            <h3 class="font-black font-heading text-sm text-[var(--text)]">Hardware Scanners & POS Peripherals</h3>
            <p class="text-xs text-[var(--muted)] font-medium">Configure phone camera barcode/QR scanning, physical HID barcode guns, thermal receipt printers, and dual customer screens.</p>
          </div>

          <!-- Hardware Live Diagnostic Quick-Test Bar -->
          <div class="p-4 rounded-[22px] glass-card border border-[var(--line)] space-y-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <h4 class="text-xs font-black text-[var(--text)]">Peripheral Diagnostics & Live Tests</h4>
              </div>
              <span class="text-[10px] text-[var(--muted)] font-bold">1-Click Test Station</span>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <!-- 1. Test Camera Scanner -->
              <button type="button" id="test-camera-scanner-btn" class="p-3 rounded-[14px] glass-btn-secondary flex flex-col items-center justify-center space-y-1 text-center hover:border-[var(--accent)] active:scale-95 transition">
                <div class="p-2 rounded-full bg-[var(--accent)]/15 text-[var(--accent)]">
                  ${renderIcon('camera', 'w-4 h-4')}
                </div>
                <span class="text-xs font-bold text-[var(--text)]">Test Camera</span>
                <small class="text-[9.5px] text-[var(--muted)]">Phone / Webcam</small>
              </button>

              <!-- 2. Test Thermal Receipt Print -->
              <button type="button" id="test-thermal-print-btn" class="p-3 rounded-[14px] glass-btn-secondary flex flex-col items-center justify-center space-y-1 text-center hover:border-[var(--accent)] active:scale-95 transition">
                <div class="p-2 rounded-full bg-indigo-500/15 text-indigo-500">
                  ${renderIcon('printer', 'w-4 h-4')}
                </div>
                <span class="text-xs font-bold text-[var(--text)]">Test Printer</span>
                <small class="text-[9.5px] text-[var(--muted)]">Sample Receipt</small>
              </button>

              <!-- 3. Test Cash Drawer Kick -->
              <button type="button" id="test-cash-drawer-btn" class="p-3 rounded-[14px] glass-btn-secondary flex flex-col items-center justify-center space-y-1 text-center hover:border-[var(--accent)] active:scale-95 transition">
                <div class="p-2 rounded-full bg-amber-500/15 text-amber-500">
                  ${renderIcon('banknote', 'w-4 h-4')}
                </div>
                <span class="text-xs font-bold text-[var(--text)]">Kick Drawer</span>
                <small class="text-[9.5px] text-[var(--muted)]">ESC/POS Pulse</small>
              </button>

              <!-- 4. Launch Customer Screen -->
              <button type="button" id="test-customer-screen-btn" class="p-3 rounded-[14px] glass-btn-secondary flex flex-col items-center justify-center space-y-1 text-center hover:border-[var(--accent)] active:scale-95 transition">
                <div class="p-2 rounded-full bg-emerald-500/15 text-emerald-500">
                  ${renderIcon('monitor', 'w-4 h-4')}
                </div>
                <span class="text-xs font-bold text-[var(--text)]">Customer Screen</span>
                <small class="text-[9.5px] text-[var(--muted)]">Dual Monitor</small>
              </button>
            </div>
          </div>

          <!-- SECTION 1: Phone / Web Camera Barcode & QR Scanner -->
          <div class="p-4.5 rounded-[22px] glass-card border border-[var(--line)] space-y-4">
            <div class="flex items-center space-x-2.5 pb-2 border-b border-[var(--line)]">
              <div class="p-2 rounded-[10px] bg-[var(--accent)]/15 text-[var(--accent)]">
                ${renderIcon('camera', 'w-4 h-4')}
              </div>
              <div>
                <h4 class="text-xs font-black text-[var(--text)]">Phone & Web Camera Barcode / QR Scanner</h4>
                <p class="text-[10px] text-[var(--muted)] font-medium">Use your smartphone camera, iPad, or desktop webcam for instant checkout scanning</p>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label class="block text-[11px] font-black text-[var(--text)] mb-1">Default Camera Facing Mode</label>
                <select name="cameraFacingMode" class="glass-input w-full p-2.5 rounded-[12px] text-xs font-bold">
                  <option value="environment" ${hw.cameraFacingMode !== 'user' ? 'selected' : ''}>Environment / Back Camera (Mobile)</option>
                  <option value="user" ${hw.cameraFacingMode === 'user' ? 'selected' : ''}>User / Front Camera (Selfie / Desktop)</option>
                </select>
                <p class="text-[10px] text-[var(--muted)] mt-0.5">Mobile phones will auto-select the high-resolution rear camera</p>
              </div>

              <div class="space-y-2 pt-1">
                <label class="flex items-center space-x-2.5 cursor-pointer">
                  <input type="checkbox" name="cameraContinuous" ${hw.cameraContinuous !== false ? 'checked' : ''} class="rounded text-[var(--accent)]" />
                  <div>
                    <strong class="text-xs text-[var(--text)] block">Continuous Scan Mode</strong>
                    <span class="text-[10px] text-[var(--muted)]">Keep viewfinder open to scan multiple items sequentially</span>
                  </div>
                </label>

                <label class="flex items-center space-x-2.5 cursor-pointer">
                  <input type="checkbox" name="cameraBeepSound" ${hw.cameraBeepSound !== false ? 'checked' : ''} class="rounded text-[var(--accent)]" />
                  <div>
                    <strong class="text-xs text-[var(--text)] block">Scan Audio Beep Feedback</strong>
                    <span class="text-[10px] text-[var(--muted)]">Synthesize sharp audible POS chime on successful scan</span>
                  </div>
                </label>

                <label class="flex items-center space-x-2.5 cursor-pointer">
                  <input type="checkbox" name="cameraVibrate" ${hw.cameraVibrate !== false ? 'checked' : ''} class="rounded text-[var(--accent)]" />
                  <div>
                    <strong class="text-xs text-[var(--text)] block">Haptic Vibration on Phone</strong>
                    <span class="text-[10px] text-[var(--muted)]">Tactile vibration pulse on mobile device</span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <!-- SECTION 2: Physical USB / Bluetooth Barcode Scanners -->
          <div class="p-4.5 rounded-[22px] glass-card border border-[var(--line)] space-y-4">
            <div class="flex items-center space-x-2.5 pb-2 border-b border-[var(--line)]">
              <div class="p-2 rounded-[10px] bg-indigo-500/15 text-indigo-500">
                ${renderIcon('scan', 'w-4 h-4')}
              </div>
              <div>
                <h4 class="text-xs font-black text-[var(--text)]">Physical Barcode Scanners (USB / Wireless / Bluetooth)</h4>
                <p class="text-[10px] text-[var(--muted)] font-medium">Automatic high-speed HID keyboard emulation & scale barcode decoder</p>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label class="block text-[11px] font-black text-[var(--text)] mb-1">Scanner Input Detection Speed</label>
                <select name="scannerThresholdMs" class="glass-input w-full p-2.5 rounded-[12px] text-xs font-mono font-bold">
                  <option value="40" ${hw.scannerThresholdMs === 40 ? 'selected' : ''}>High Speed Scanner (&lt; 40ms per char)</option>
                  <option value="50" ${!hw.scannerThresholdMs || hw.scannerThresholdMs === 50 ? 'selected' : ''}>Standard HID Scanner (&lt; 50ms per char)</option>
                  <option value="80" ${hw.scannerThresholdMs === 80 ? 'selected' : ''}>Wireless / Bluetooth Latency (&lt; 80ms per char)</option>
                </select>
                <p class="text-[10px] text-[var(--muted)] mt-0.5">Differentiates instant hardware barcode scans from human typing</p>
              </div>

              <div class="space-y-2 pt-1">
                <label class="flex items-center space-x-2.5 cursor-pointer">
                  <input type="checkbox" name="scaleBarcodeSupport" ${hw.scaleBarcodeSupport !== false ? 'checked' : ''} class="rounded text-[var(--accent)]" />
                  <div>
                    <strong class="text-xs text-[var(--text)] block">Weight & Price Scale Barcodes</strong>
                    <span class="text-[10px] text-[var(--muted)]">Auto-decode deli/grocery scale barcodes (Prefix 20, 02, 28)</span>
                  </div>
                </label>
              </div>
            </div>

            <!-- Live Scanner Input Test Box -->
            <div class="p-3 rounded-[16px] bg-[var(--glass-bg-clear)] border border-[var(--line)] space-y-1.5">
              <label class="block text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">Live Barcode Scanner Test Input</label>
              <div class="flex items-center space-x-2">
                <input
                  type="text"
                  id="scanner-diagnostic-test-input"
                  placeholder="Click here and scan any physical barcode or type fast…"
                  class="glass-input flex-1 h-9 px-3 rounded-[10px] text-xs font-mono font-bold text-[var(--text)]"
                />
                <span id="scanner-test-feedback" class="badge badge-blue text-[10px] font-mono font-bold flex-shrink-0">
                  Ready for Scan
                </span>
              </div>
            </div>
          </div>

          <!-- SECTION 3: Thermal Receipt Printer & Cash Drawer -->
          <div class="p-4.5 rounded-[22px] glass-card border border-[var(--line)] space-y-4">
            <div class="flex items-center space-x-2.5 pb-2 border-b border-[var(--line)]">
              <div class="p-2 rounded-[10px] bg-emerald-500/15 text-emerald-500">
                ${renderIcon('printer', 'w-4 h-4')}
              </div>
              <div>
                <h4 class="text-xs font-black text-[var(--text)]">Receipt Printer & Electronic Cash Drawer</h4>
                <p class="text-[10px] text-[var(--muted)] font-medium">80mm / 58mm Thermal ESC/POS, Web Bluetooth, WebUSB & Network IP</p>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label class="block text-[11px] font-black text-[var(--text)] mb-1">Receipt Paper Format</label>
                <select name="printerType" class="glass-input w-full p-2.5 rounded-[12px] text-xs font-bold">
                  <option value="thermal_80mm" ${hw.printerType !== 'thermal_58mm' && hw.printerType !== 'standard_a4' ? 'selected' : ''}>80mm High-Speed POS Thermal (Standard)</option>
                  <option value="thermal_58mm" ${hw.printerType === 'thermal_58mm' ? 'selected' : ''}>58mm Compact Mobile Thermal (Small)</option>
                  <option value="standard_a4" ${hw.printerType === 'standard_a4' ? 'selected' : ''}>Standard A4 Invoice / PDF Sheet</option>
                </select>
              </div>

              <div>
                <label class="block text-[11px] font-black text-[var(--text)] mb-1">Printer Connection Interface</label>
                <select name="printerInterface" id="printer-interface-select" class="glass-input w-full p-2.5 rounded-[12px] text-xs font-bold">
                  <option value="browser" ${hw.printerInterface === 'browser' || !hw.printerInterface ? 'selected' : ''}>System Print Dialog / USB Driver (Universal)</option>
                  <option value="bluetooth" ${hw.printerInterface === 'bluetooth' ? 'selected' : ''}>Web Bluetooth Direct ESC/POS (Mobile)</option>
                  <option value="usb" ${hw.printerInterface === 'usb' ? 'selected' : ''}>WebUSB Direct ESC/POS (Desktop)</option>
                  <option value="network" ${hw.printerInterface === 'network' ? 'selected' : ''}>Network IP Ethernet / Wi-Fi Printer</option>
                </select>
              </div>
            </div>

            <!-- Network IP Options (Conditional) -->
            <div id="network-printer-fields" class="${hw.printerInterface === 'network' ? '' : 'hidden'} grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label class="block text-[11px] font-black text-[var(--text)] mb-1">Printer IP Address</label>
                <input name="printerIp" type="text" value="${hw.printerIp || '192.168.1.100'}" placeholder="192.168.1.100" class="glass-input w-full p-2.5 rounded-[12px] text-xs font-mono font-bold" />
              </div>
              <div>
                <label class="block text-[11px] font-black text-[var(--text)] mb-1">Port (Default 9100)</label>
                <input name="printerPort" type="number" value="${hw.printerPort || 9100}" placeholder="9100" class="glass-input w-full p-2.5 rounded-[12px] text-xs font-mono font-bold" />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-[var(--line)]">
              <label class="flex items-center space-x-2.5 cursor-pointer">
                <input type="checkbox" name="autoPrintReceipt" ${hw.autoPrintReceipt ? 'checked' : ''} class="rounded text-[var(--accent)]" />
                <span class="text-xs font-bold text-[var(--text)]">Auto-Print on Checkout</span>
              </label>

              <label class="flex items-center space-x-2.5 cursor-pointer">
                <input type="checkbox" name="printStoreLogo" ${hw.printStoreLogo !== false ? 'checked' : ''} class="rounded text-[var(--accent)]" />
                <span class="text-xs font-bold text-[var(--text)]">Print Store Logo on Receipt</span>
              </label>

              <label class="flex items-center space-x-2.5 cursor-pointer">
                <input type="checkbox" name="cashDrawerKick" ${hw.cashDrawerKick !== false ? 'checked' : ''} class="rounded text-[var(--accent)]" />
                <span class="text-xs font-bold text-[var(--text)]">Kick Cash Drawer on Cash Sale</span>
              </label>
            </div>
          </div>

          <!-- SECTION 4: Dual Customer Screen (Pole Display) -->
          <div class="p-4.5 rounded-[22px] glass-card border border-[var(--line)] space-y-3.5">
            <div class="flex items-center justify-between pb-2 border-b border-[var(--line)]">
              <div class="flex items-center space-x-2.5">
                <div class="p-2 rounded-[10px] bg-cyan-500/15 text-cyan-500">
                  ${renderIcon('monitor', 'w-4 h-4')}
                </div>
                <div>
                  <h4 class="text-xs font-black text-[var(--text)]">Customer-Facing Secondary Display Screen</h4>
                  <p class="text-[10px] text-[var(--muted)] font-medium">Broadcasts real-time cart items, totals, and contactless QR payment codes</p>
                </div>
              </div>
              <button type="button" id="launch-customer-display-btn" class="px-3 py-1.5 rounded-[10px] glass-btn-primary text-xs font-bold flex items-center space-x-1 shadow-xs active:scale-95 transition">
                <span>Launch Screen</span>
                <span>↗</span>
              </button>
            </div>
            <p class="text-[11px] text-[var(--muted)] leading-relaxed">
              Position a secondary monitor or iPad/tablet facing your customer. Click <strong>Launch Screen</strong> to open the full-screen live customer display.
            </p>
          </div>

          <div class="pt-2">
            <button type="submit" class="px-6 py-2.5 rounded-[14px] text-xs font-black glass-btn-primary shadow-md active:scale-96 transition">
              Save Hardware & Device Settings
            </button>
          </div>
        </form>
      `;
    } else if (this.activeSection === 'cloud') {
      const cloudCfg = supabaseClient.getConfig();
      contentHtml = `
        <form id="cloud-settings-form" class="space-y-4">
          <div>
            <h3 class="font-black font-heading text-sm text-[var(--text)]">Multi-Store Cloud Database (Supabase)</h3>
            <p class="text-xs text-[var(--muted)] font-medium">Sync products, prices, stock, and orders across multiple shop tablets, terminals, and devices in real time.</p>
          </div>

          <div class="p-4.5 rounded-[22px] glass-card border border-[var(--line)] space-y-3.5">
            <div class="flex items-center justify-between pb-2 border-b border-[var(--line)]">
              <div class="flex items-center space-x-2.5">
                <div class="p-2 rounded-[10px] ${cloudCfg.configured ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-slate-500/15 text-slate-500'}">
                  ${renderIcon('server', 'w-4 h-4')}
                </div>
                <div>
                  <h4 class="text-xs font-black text-[var(--text)]">Cloud Synchronization Engine</h4>
                  <p class="text-[10px] text-[var(--muted)] font-medium">PostgreSQL + Real-time WebSockets</p>
                </div>
              </div>
              <span id="cloud-status-badge" class="badge ${cloudCfg.configured ? 'badge-emerald' : 'badge-amber'}">
                ${cloudCfg.configured ? '✓ Cloud Connected' : 'Local Offline Mode'}
              </span>
            </div>

            <div class="space-y-3">
              <div>
                <label class="block text-[11px] font-black text-[var(--text)] mb-1">Supabase Project URL</label>
                <input id="cloud-url-input" name="supabaseUrl" type="url" value="${cloudCfg.url}" placeholder="https://your-project-id.supabase.co" class="glass-input w-full p-2.5 rounded-[12px] text-xs font-mono font-bold" />
                <p class="text-[10px] text-[var(--muted)] mt-0.5">Found in your free Supabase Dashboard ➔ Project Settings ➔ API</p>
              </div>

              <div>
                <label class="block text-[11px] font-black text-[var(--text)] mb-1">Supabase Public Anon Key</label>
                <div class="relative flex items-center">
                  <input id="cloud-key-input" name="supabaseKey" type="password" value="${cloudCfg.key}" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." class="glass-input w-full p-2.5 pr-10 rounded-[12px] text-xs font-mono font-medium" />
                  <button type="button" id="toggle-cloud-key-btn" class="absolute right-2 p-1.5 rounded-[8px] text-[var(--muted)] hover:text-[var(--text)] transition" title="Toggle key visibility">
                    ${renderIcon('eye', 'w-3.5 h-3.5')}
                  </button>
                </div>
                <p class="text-[10px] text-[var(--muted)] mt-0.5">Safe publishable client API key</p>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-2.5 pt-2">
              <button type="submit" class="px-5 py-2.5 rounded-[12px] text-xs font-black glass-btn-primary shadow-sm active:scale-96 transition">
                Save & Connect Cloud
              </button>
              <button type="button" id="test-cloud-btn" class="px-4 py-2.5 rounded-[12px] text-xs font-bold glass-btn-secondary active:scale-96 transition">
                Test Connection
              </button>
              <button type="button" id="reset-cloud-btn" class="px-4 py-2.5 rounded-[12px] text-xs font-bold glass-btn-secondary text-[var(--accent)] active:scale-96 transition" title="Restore default verified cloud credentials">
                Reset to Default Keys
              </button>
              <button type="button" id="sync-now-cloud-btn" class="px-4 py-2.5 rounded-[12px] text-xs font-bold glass-btn-secondary text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 active:scale-96 transition">
                Sync Local Store to Cloud Now
              </button>
            </div>
            <div id="cloud-test-result" class="hidden p-3 rounded-[12px] text-xs font-mono"></div>
          </div>
        </form>
      `;
    } else if (this.activeSection === 'cloud_logs') {
      const logs = supabaseClient.getSyncLogs();
      const isCloudConfigured = supabaseClient.isConfigured();

      const defaultTables = [
        { name: 'products', label: 'Product Catalog', primaryKey: 'id' },
        { name: 'categories', label: 'Product Categories', primaryKey: 'id' },
        { name: 'users', label: 'Staff Accounts & Passwords', primaryKey: 'id' },
        { name: 'customers', label: 'Customer Profiles & Loyalty', primaryKey: 'id' },
        { name: 'suppliers', label: 'Suppliers & Vendors', primaryKey: 'id' },
        { name: 'orders', label: 'Sales Orders & Invoices', primaryKey: 'id' },
        { name: 'settings', label: 'Global Store Settings', primaryKey: 'key' },
        { name: 'promotions', label: 'Discounts & Promotions', primaryKey: 'id' },
        { name: 'gift_cards', label: 'Gift Cards & Vouchers', primaryKey: 'id' },
        { name: 'outlets', label: 'Store Locations & Warehouses', primaryKey: 'id' },
        { name: 'time_punches', label: 'Staff Time Clock Punches', primaryKey: 'id' },
        { name: 'inventory_movements', label: 'Inventory Stock Movements', primaryKey: 'id' }
      ];

      const initialTableCardsHtml = (this.lastVerificationResults?.tables || defaultTables).map(t => {
        const status = t.status || 'UNVERIFIED';
        const rows = t.rows !== undefined ? t.rows : '—';
        const latency = t.latency !== undefined ? `${t.latency}ms` : '—';
        const isHealthy = status === 'HEALTHY';
        const isErr = status === 'ERROR';

        return `
          <div class="p-3 rounded-[16px] glass-card border border-[var(--line)] flex flex-col justify-between space-y-2">
            <div class="flex items-center justify-between">
              <span class="font-mono text-xs font-black text-[var(--text)]">${t.name}</span>
              <span class="badge ${isHealthy ? 'badge-emerald' : isErr ? 'badge-amber' : 'badge-blue'} text-[9px] px-1.5 py-0.5">
                ${status}
              </span>
            </div>
            <div class="text-[10.5px] text-[var(--muted)] truncate font-medium">${t.label}</div>
            <div class="flex items-center justify-between text-[10px] font-mono pt-1 border-t border-[var(--line)]/50 text-[var(--muted)]">
              <span>Rows: <strong class="text-[var(--text)] font-bold">${rows}</strong></span>
              <span>⚡ ${latency}</span>
            </div>
          </div>
        `;
      }).join('');

      const logRowsHtml = logs.length === 0 ? `
        <div class="p-8 text-center text-xs text-[var(--muted)] font-medium">
          No cloud sync events recorded yet. Run a verification or sync action above to start logging.
        </div>
      ` : logs.map(l => {
        const dateStr = new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const isSuccess = l.status === 'SUCCESS';
        const isError = l.status === 'ERROR';

        return `
          <div class="p-3 rounded-[14px] glass-card border border-[var(--line)] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition hover:border-[var(--accent)]/40" data-log-item-type="${l.type}">
            <div class="flex items-center space-x-2.5 min-w-0">
              <span class="text-xs font-mono text-[var(--muted)] flex-shrink-0">${dateStr}</span>
              <span class="badge ${isSuccess ? 'badge-emerald' : isError ? 'badge-amber' : 'badge-blue'} text-[9px] px-2 py-0.5 flex-shrink-0 font-mono">
                ${l.type}
              </span>
              <span class="text-xs font-bold text-[var(--text)] truncate">${sanitizeHtml(l.message || l.table)}</span>
            </div>
            <div class="flex items-center space-x-3 text-xs font-mono text-[var(--muted)] flex-shrink-0 justify-between sm:justify-end">
              <span>${l.count > 0 ? `${l.count} items` : ''}</span>
              <span>⚡ ${l.latency}ms</span>
              <button type="button" data-inspect-log-id="${l.id}" class="px-2.5 py-1 rounded-[8px] text-[10px] font-bold glass-btn-secondary active:scale-95 transition">
                Inspect Payload
              </button>
            </div>
          </div>
        `;
      }).join('');

      contentHtml = `
        <div class="space-y-6">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div class="flex items-center space-x-2">
                <h3 class="font-black font-heading text-sm text-[var(--text)]">Supabase Cloud Sync & Real-Time Audit</h3>
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                  Admin Exclusive
                </span>
              </div>
              <p class="text-xs text-[var(--muted)] font-medium mt-0.5">Live database synchronization history, latency benchmarks, and full table integrity verification.</p>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <button type="button" id="reverify-cloud-tables-btn" class="px-4 py-2 rounded-[12px] text-xs font-black glass-btn-primary shadow-sm flex items-center space-x-1.5 active:scale-96 transition">
                <span>⚡</span>
                <span>Re-verify All Tables</span>
              </button>
              <button type="button" id="export-cloud-logs-btn" class="px-3 py-2 rounded-[12px] text-xs font-bold glass-btn-secondary active:scale-96 transition" title="Export logs as JSON">
                <span>📥 Export</span>
              </button>
              <button type="button" id="clear-cloud-logs-btn" class="px-3 py-2 rounded-[12px] text-xs font-bold glass-btn-secondary text-[var(--red)] active:scale-96 transition" title="Clear log history">
                <span>🗑️ Clear</span>
              </button>
            </div>
          </div>

          <!-- Re-verification Results Card -->
          <div class="p-4 sm:p-5 rounded-[22px] glass-card border border-[var(--line)] space-y-3 shadow-xs">
            <div class="flex items-center justify-between border-b border-[var(--line)] pb-2.5">
              <div class="flex items-center space-x-2">
                <span class="text-base">🛡️</span>
                <span class="text-xs font-black text-[var(--text)] uppercase tracking-wider">Cloud Database Schema Health & Row Counts</span>
              </div>
              <span id="verification-summary-pill" class="text-[11px] font-bold text-[var(--muted)] font-mono">
                ${this.lastVerificationResults ? `✓ ${this.lastVerificationResults.healthyCount}/${this.lastVerificationResults.totalTables} Healthy (${this.lastVerificationResults.totalLatency}ms)` : '12 Cloud Tables Monitored'}
              </span>
            </div>

            <div id="table-verification-grid" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
              ${initialTableCardsHtml}
            </div>
          </div>

          <!-- Real-Time Activity Log Stream -->
          <div class="p-4 sm:p-5 rounded-[22px] glass-card border border-[var(--line)] space-y-3 shadow-xs">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--line)] pb-3">
              <div class="flex items-center space-x-2">
                <span class="text-base">📜</span>
                <span class="text-xs font-black text-[var(--text)] uppercase tracking-wider">Live Sync Activity Feed</span>
                <span class="text-[10px] px-2 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] font-bold">${logs.length} logged events</span>
              </div>
              <div class="flex items-center space-x-2">
                <select id="cloud-log-filter" class="h-8 px-2.5 rounded-[10px] glass-input text-[11px] font-bold bg-[var(--card-bg)] border border-[var(--line)]">
                  <option value="ALL">All Event Types</option>
                  <option value="PUSH_ALL">Push All</option>
                  <option value="PULL_ALL">Pull All</option>
                  <option value="REALTIME">Realtime Mesh</option>
                  <option value="VERIFY_ALL_TABLES">Table Verify</option>
                  <option value="CONNECTION_TEST">Connection Test</option>
                </select>
              </div>
            </div>

            <div class="max-h-96 overflow-y-auto space-y-2 pr-1 scrollbar-none" id="cloud-logs-stream">
              ${logRowsHtml}
            </div>
          </div>
        </div>
      `;
    } else if (this.activeSection === 'checkout') {
      const cur = this.settings.currency || getCurrencyConfig();
      const tax = this.settings.tax;
      contentHtml = `
        <form id="checkout-settings-form" class="space-y-4">
          <div>
            <h3 class="font-black font-heading text-sm text-[var(--text)]">Multi-Currency & Tax Engine</h3>
            <p class="text-xs text-[var(--muted)] font-medium">Configure store currency (LKR, USD, EUR, GBP, INR, etc.) and tax rate.</p>
          </div>

          <div>
            <label class="block text-[11px] font-black text-[var(--text)] mb-1">Store Currency</label>
            <select name="currencyCode" class="glass-input w-full p-2.5 rounded-[12px] text-xs font-black">
              ${SUPPORTED_CURRENCIES.map(c => `
                <option value="${c.code}" ${c.code === cur.code ? 'selected' : ''}>
                  ${c.name} (${c.symbol}) - ${c.code}
                </option>
              `).join('')}
            </select>
          </div>

          <div class="grid grid-cols-2 gap-2.5">
            <div>
              <label class="block text-[11px] font-black text-[var(--text)] mb-1">Symbol Position</label>
              <select name="currencyPos" class="glass-input w-full p-2.5 rounded-[12px] text-xs font-bold">
                <option value="prefix" ${cur.position === 'prefix' ? 'selected' : ''}>Prefix (e.g. Rs. 1,500 / $100)</option>
                <option value="suffix" ${cur.position === 'suffix' ? 'selected' : ''}>Suffix (e.g. 1,500 LKR / 100 €)</option>
              </select>
            </div>
            <div>
              <label class="block text-[11px] font-black text-[var(--text)] mb-1">Decimal Places</label>
              <select name="currencyDecimals" class="glass-input w-full p-2.5 rounded-[12px] text-xs font-bold">
                <option value="2" ${cur.decimals === 2 ? 'selected' : ''}>2 Decimals (e.g. 1,500.00)</option>
                <option value="0" ${cur.decimals === 0 ? 'selected' : ''}>0 Decimals (e.g. 1,500)</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2.5">
            <div>
              <label class="block text-[11px] font-black text-[var(--text)] mb-1">Sales Tax Rate (%)</label>
              <input name="taxRate" type="number" step="any" min="0" value="${tax.defaultRate}" class="glass-input w-full p-2.5 rounded-[12px] text-xs font-black font-mono" />
            </div>
            <div>
              <label class="block text-[11px] font-black text-[var(--text)] mb-1">Tax Label</label>
              <input name="taxLabel" type="text" value="${tax.label}" class="glass-input w-full p-2.5 rounded-[12px] text-xs font-bold" />
            </div>
          </div>

          <div class="pt-2">
            <button type="submit" class="px-5 py-2.5 rounded-[14px] text-xs font-black glass-btn-primary shadow-md">
              Save Currency & Tax Settings
            </button>
          </div>
        </form>
      `;
    } else if (this.activeSection === 'security') {
      const allUsers = sessionManager.getAllUsers();
      const ownerUser = allUsers.find(u => u.role === 'OWNER') || sessionManager.getUser() || { name: 'admin', email: 'admin@flowpos.store', pin: '1234', password: 'admin' };
      contentHtml = `
        <form id="owner-security-form" class="space-y-4">
          <div>
            <h3 class="font-black font-heading text-sm text-[var(--text)]">Store Owner & Administrator Security</h3>
            <p class="text-xs text-[var(--muted)] font-medium">Configure your primary Administrator credentials, password, and 4-digit PIN for terminal unlock.</p>
          </div>

          <div class="p-5 rounded-[22px] glass-card border border-[var(--line)] space-y-4 shadow-xs">
            <div class="flex items-center space-x-3.5 pb-3 border-b border-[var(--line)]">
              <div class="avatar w-12 h-12 rounded-[16px] bg-gradient-to-tr from-[#0066CC] to-[#7E22CE] text-white font-black text-base grid place-items-center shadow-sm">
                ${(ownerUser.name || 'AD').substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h4 class="text-sm font-black text-[var(--text)]">${ownerUser.name}</h4>
                <div class="flex items-center space-x-2 mt-0.5">
                  <span class="badge badge-platinum">FULL SYSTEM OWNER</span>
                  <span class="text-[10px] text-[var(--muted)] font-mono">Role: Administrator (Permanent)</span>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label class="block text-[11px] font-black text-[var(--text)] mb-1">Admin Username *</label>
                <input name="adminName" type="text" required value="${ownerUser.name}" class="glass-input w-full p-2.5 rounded-[12px] text-xs font-bold" />
                <p class="text-[10px] text-[var(--muted)] mt-0.5">Primary username for owner login</p>
              </div>
              <div>
                <label class="block text-[11px] font-black text-[var(--text)] mb-1">Admin Email Address</label>
                <input name="adminEmail" type="email" required value="${ownerUser.email || 'admin@flowpos.store'}" class="glass-input w-full p-2.5 rounded-[12px] text-xs font-medium" />
                <p class="text-[10px] text-[var(--muted)] mt-0.5">Contact email for receipts & system alerts</p>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label class="block text-[11px] font-black text-[var(--text)] mb-1">Security Password *</label>
                <div class="relative flex items-center">
                  <input id="admin-password-input" name="adminPassword" type="password" required value="${ownerUser.password || 'admin'}" class="glass-input w-full p-2.5 pr-10 rounded-[12px] text-xs font-bold" />
                  <button type="button" id="toggle-admin-password-btn" class="absolute right-2 p-1.5 rounded-[8px] text-[var(--muted)] hover:text-[var(--text)] transition" title="Toggle password visibility">
                    ${renderIcon('eye', 'w-3.5 h-3.5')}
                  </button>
                </div>
                <p class="text-[10px] text-[var(--muted)] mt-0.5">Used for password login & manager overrides</p>
              </div>
              <div>
                <label class="block text-[11px] font-black text-[var(--text)] mb-1">4-Digit Security PIN *</label>
                <div class="relative flex items-center">
                  <input id="admin-pin-input" name="adminPin" type="password" maxlength="4" minlength="4" required value="${ownerUser.pin || '1234'}" class="glass-input w-full p-2.5 pr-10 rounded-[12px] text-xs font-mono font-bold" />
                  <button type="button" id="toggle-admin-pin-btn" class="absolute right-2 p-1.5 rounded-[8px] text-[var(--muted)] hover:text-[var(--text)] transition" title="Toggle PIN visibility">
                    ${renderIcon('eye', 'w-3.5 h-3.5')}
                  </button>
                </div>
                <p class="text-[10px] text-[var(--muted)] mt-0.5">Used on Touch Keypad for quick checkout login</p>
              </div>
            </div>
          </div>

          <div class="pt-1">
            <button type="submit" class="px-6 py-2.5 rounded-[14px] text-xs font-black glass-btn-primary shadow-md active:scale-96 transition">
              Save Admin Password & PIN
            </button>
          </div>
        </form>
      `;
    } else if (this.activeSection === 'data') {
      contentHtml = `
        <div class="space-y-5">
          <div>
            <h3 class="font-black font-heading text-sm text-[var(--text)]">Database Backup, Import & Shop Initialization</h3>
            <p class="text-xs text-[var(--muted)] font-medium">Export full JSON backups, import saved store databases, or wipe demo items to begin with your real shop catalog.</p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- 1. Export Complete Database -->
            <div class="glass-card p-4.5 rounded-[22px] border border-[var(--line)] space-y-3 flex flex-col justify-between shadow-xs">
              <div class="space-y-2">
                <div class="flex items-center space-x-2.5">
                  <div class="p-2.5 rounded-[12px] bg-[var(--accent)]/15 text-[var(--accent)]">
                    ${renderIcon('download', 'w-5 h-5')}
                  </div>
                  <div>
                    <h4 class="text-xs font-black text-[var(--text)]">Export Full Database</h4>
                    <p class="text-[10px] text-[var(--muted)] font-medium">Download complete backup file (.json)</p>
                  </div>
                </div>
                <p class="text-[11px] text-[var(--muted)] leading-relaxed">
                  Exports all products, categories, inventory records, customers, suppliers, staff users, and store settings into a single downloadable JSON backup.
                </p>
              </div>
              <button id="export-json-btn" class="w-full py-2.5 rounded-[12px] text-xs font-black glass-btn-primary shadow-sm active:scale-96 transition flex items-center justify-center space-x-2">
                ${renderIcon('download', 'w-3.5 h-3.5')}
                <span>Download Database Backup</span>
              </button>
            </div>

            <!-- 2. Import Database Backup -->
            <div class="glass-card p-4.5 rounded-[22px] border border-[var(--line)] space-y-3 flex flex-col justify-between shadow-xs">
              <div class="space-y-2">
                <div class="flex items-center space-x-2.5">
                  <div class="p-2.5 rounded-[12px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    ${renderIcon('upload', 'w-5 h-5')}
                  </div>
                  <div>
                    <h4 class="text-xs font-black text-[var(--text)]">Import Database Backup</h4>
                    <p class="text-[10px] text-[var(--muted)] font-medium">Restore from a previous .json backup</p>
                  </div>
                </div>
                <p class="text-[11px] text-[var(--muted)] leading-relaxed">
                  Upload a previously saved FlowPOS backup to completely restore all products, prices, stock levels, customers, and staff profiles.
                </p>
              </div>
              <div>
                <input id="import-json-file-input" type="file" accept=".json,application/json" class="hidden" />
                <label for="import-json-file-input" class="w-full py-2.5 rounded-[12px] text-xs font-black glass-btn-secondary border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer flex items-center justify-center space-x-2 active:scale-96 transition">
                  ${renderIcon('upload', 'w-3.5 h-3.5')}
                  <span>Select JSON Backup File to Restore</span>
                </label>
              </div>
            </div>

            <!-- 3. Wipe All Demo Data (Clean Shop Mode) -->
            <div class="glass-card p-4.5 rounded-[22px] border border-red-500/30 bg-red-500/5 space-y-3 flex flex-col justify-between shadow-xs">
              <div class="space-y-2">
                <div class="flex items-center space-x-2.5">
                  <div class="p-2.5 rounded-[12px] bg-red-500/20 text-red-600 dark:text-red-400">
                    ${renderIcon('trash-2', 'w-5 h-5')}
                  </div>
                  <div>
                    <h4 class="text-xs font-black text-red-600 dark:text-red-400">Wipe All Demo Data & Start Fresh</h4>
                    <p class="text-[10px] text-red-500/80 font-medium">Clean store ready for real shop products</p>
                  </div>
                </div>
                <p class="text-[11px] text-[var(--muted)] leading-relaxed">
                  Completely removes all 26 demo products, demo categories, sample sales, and extra demo staff. Configure your Administrator username, password & PIN (defaults to <strong>admin</strong> / <strong>admin</strong> / <strong>1234</strong>) with a clean catalog.
                </p>
              </div>
              <button id="wipe-clean-btn" class="w-full py-2.5 rounded-[12px] text-xs font-black bg-red-600 hover:bg-red-700 text-white shadow-md active:scale-96 transition flex items-center justify-center space-x-2">
                ${renderIcon('trash-2', 'w-3.5 h-3.5')}
                <span>Wipe Demo Data & Initialize Store</span>
              </button>
            </div>

            <!-- 4. Re-Seed Sample Demo Catalog -->
            <div class="glass-card p-4.5 rounded-[22px] border border-[var(--line)] space-y-3 flex flex-col justify-between shadow-xs">
              <div class="space-y-2">
                <div class="flex items-center space-x-2.5">
                  <div class="p-2.5 rounded-[12px] bg-amber-500/15 text-amber-600 dark:text-amber-400">
                    ${renderIcon('sparkles', 'w-5 h-5')}
                  </div>
                  <div>
                    <h4 class="text-xs font-black text-[var(--text)]">Re-Seed Sample Coffee Shop Demo</h4>
                    <p class="text-[10px] text-[var(--muted)] font-medium">Load sample products & roastery menu</p>
                  </div>
                </div>
                <p class="text-[11px] text-[var(--muted)] leading-relaxed">
                  If you want to test demo products again in the future, this button will reload the sample coffee, tea, and bakery catalog.
                </p>
              </div>
              <button id="reseed-demo-btn" class="w-full py-2.5 rounded-[12px] text-xs font-black glass-btn-secondary text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-96 transition">
                Load Sample Demo Catalog
              </button>
            </div>

          </div>
        </div>
      `;
    }

    this.container.innerHTML = `
      <div class="h-full overflow-y-auto p-4 sm:p-6 space-y-5">
        <!-- Header -->
        <div>
          <h1 class="text-xl sm:text-2xl font-black font-heading text-[var(--text)] tracking-tight">System Settings</h1>
          <p class="text-xs text-[var(--muted)] font-medium">Customize store branding, currency, tax rates, and appearance.</p>
        </div>

        <!-- Main 2-Column Settings Layout -->
        <div class="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6">
          <!-- Sidebar Tabs -->
          <div class="md:col-span-4 lg:col-span-3 glass p-2 rounded-[20px] border border-[var(--line)] flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-visible scrollbar-none h-fit">
            ${tabsNavHtml}
          </div>

          <!-- Content Panel -->
          <div class="md:col-span-8 lg:col-span-9 glass-panel-heavy p-5 sm:p-6 rounded-[24px] border border-[var(--line)] shadow-xl">
            ${contentHtml}
          </div>
        </div>
      </div>
    `;
  }

  renderWorkspaceOptionsHtml() {
    if (!this.settings.workspace) {
      this.settings.workspace = {};
    }

    return WORKSPACE_OPTIONS.map(opt => {
      const isValTrue = (opt.key === 'autoPrintReceipt' || opt.key === 'allowNegativeInventory')
        ? Boolean(this.settings.workspace[opt.key])
        : (this.settings.workspace[opt.key] !== false);

      return `
        <div class="p-3.5 rounded-[16px] bg-white/50 dark:bg-white/[0.04] border border-[var(--line)] flex items-center justify-between gap-3.5 hover:bg-white/80 dark:hover:bg-white/[0.08] transition duration-150">
          <div class="flex items-center space-x-3 min-w-0">
            <div class="p-2.5 rounded-[12px] ${isValTrue ? 'bg-[var(--accent)]/15 text-[var(--accent)]' : 'bg-slate-200/60 dark:bg-white/10 text-[var(--muted)]'} flex-shrink-0 transition-colors">
              ${renderIcon(opt.icon, 'w-4 h-4')}
            </div>
            <div class="min-w-0">
              <div class="flex items-center space-x-2">
                <h5 class="text-xs font-black text-[var(--text)] leading-tight">${opt.label}</h5>
                <span class="text-[9px] font-black px-1.5 py-0.5 rounded-[6px] ${isValTrue ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-slate-500/15 text-slate-500'}">
                  ${isValTrue ? '✓ Enabled' : 'Disabled'}
                </span>
              </div>
              <p class="text-[10px] text-[var(--muted)] font-medium leading-tight mt-0.5">${opt.desc}</p>
            </div>
          </div>

          <!-- Interactive Switch Control -->
          <button
            type="button"
            role="switch"
            aria-checked="${isValTrue}"
            data-toggle-workspace="${opt.key}"
            class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isValTrue ? 'bg-[var(--green)]' : 'bg-slate-300 dark:bg-slate-700'}"
            title="Click to toggle ${opt.label}"
          >
            <span class="sr-only">Toggle ${opt.label}</span>
            <span class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${isValTrue ? 'translate-x-5' : 'translate-x-0'} flex items-center justify-center text-[9px] font-black ${isValTrue ? 'text-[var(--green)]' : 'text-slate-400'}">
              ${isValTrue ? '✓' : ''}
            </span>
          </button>
        </div>
      `;
    }).join('');
  }

  attachEvents() {
    this.container.querySelectorAll('[data-settings-tab]').forEach(tab => {
      tab.addEventListener('click', () => {
        this.activeSection = tab.getAttribute('data-settings-tab');
        this.render();
        this.attachEvents();
      });
    });

    this.container.querySelectorAll('[data-toggle-workspace]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const key = btn.getAttribute('data-toggle-workspace');
        if (!this.settings.workspace) {
          this.settings.workspace = {};
        }
        const currentVal = (key === 'autoPrintReceipt' || key === 'allowNegativeInventory')
          ? Boolean(this.settings.workspace[key])
          : (this.settings.workspace[key] !== false);

        const newVal = !currentVal;
        this.settings.workspace[key] = newVal;
        settingsService.save(this.settings);

        if (key === 'soundEffects' && newVal) {
          soundManager.playSuccess();
        }

        const optConfig = WORKSPACE_OPTIONS.find(o => o.key === key);
        const optLabel = optConfig?.label || key;
        toast.success(`${optLabel}: ${newVal ? 'Enabled' : 'Disabled'}`);

        this.render();
        this.attachEvents();
      });
    });

    this.container.querySelectorAll('[data-set-theme]').forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = btn.getAttribute('data-set-theme');
        themeManager.setTheme(theme);
        this.render();
        this.attachEvents();
      });
    });

    this.container.querySelectorAll('[data-set-accent]').forEach(btn => {
      btn.addEventListener('click', () => {
        const color = btn.getAttribute('data-set-accent');
        themeManager.setAccent(color);
        toast.success('Accent color applied!');
        this.render();
        this.attachEvents();
      });
    });

    this.container.querySelectorAll('[data-set-font]').forEach(btn => {
      btn.addEventListener('click', () => {
        const font = btn.getAttribute('data-set-font');
        themeManager.setFont(font);
        toast.success(`Font changed to ${font}!`);
        this.render();
        this.attachEvents();
      });
    });

    // POS Behaviors Form Submit
    const posBehaviorsForm = this.container.querySelector('#pos-behaviors-form');
    if (posBehaviorsForm) {
      posBehaviorsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(posBehaviorsForm);
        this.settings.checkout = {
          ...this.settings.checkout,
          quickCashPresets: (fd.get('quickCashPresets') || '500, 1000, 2000, 5000').trim(),
          loyaltyEarnRate: Number(fd.get('loyaltyEarnRate')) || 100,
          loyaltyRedeemValue: Number(fd.get('loyaltyRedeemValue')) || 1.0,
          managerPinForDiscounts: fd.get('managerPinForDiscounts') === 'on',
          managerPinForRefunds: fd.get('managerPinForRefunds') === 'on',
          enableTipping: fd.get('enableTipping') === 'on'
        };
        settingsService.save(this.settings);
        toast.success('POS register rules updated successfully!');
        this.render();
        this.attachEvents();
      });
    }

    // Store Logo Upload & Preview
    const logoFileInput = this.container.querySelector('#store-logo-file-input');
    const logoHiddenInput = this.container.querySelector('#store-logo-hidden-input');
    const logoPreview = this.container.querySelector('#store-logo-preview');
    const logoFallback = this.container.querySelector('#store-logo-fallback');
    const clearLogoBtn = this.container.querySelector('#clear-store-logo-btn');

    if (logoFileInput) {
      logoFileInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const maxDim = 240;
              let width = img.width;
              let height = img.height;

              if (width > height) {
                if (width > maxDim) {
                  height = Math.round((height * maxDim) / width);
                  width = maxDim;
                }
              } else {
                if (height > maxDim) {
                  width = Math.round((width * maxDim) / height);
                  height = maxDim;
                }
              }

              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0, width, height);

              const compressedUrl = canvas.toDataURL('image/jpeg', 0.9);
              if (logoHiddenInput) logoHiddenInput.value = compressedUrl;

              const parent = logoPreview ? logoPreview.parentElement : (logoFallback ? logoFallback.parentElement : null);
              if (parent) {
                parent.innerHTML = `<img id="store-logo-preview" src="${compressedUrl}" alt="Logo" class="w-full h-full object-cover" />`;
              }
              toast.success(`Store logo loaded: ${file.name}`);
            };
            img.onerror = () => {
              if (logoHiddenInput) logoHiddenInput.value = event.target.result;
              toast.success('Logo loaded');
            };
            img.src = event.target.result;
          };
          reader.readAsDataURL(file);
        }
        logoFileInput.value = '';
      });
    }

    if (clearLogoBtn) {
      clearLogoBtn.addEventListener('click', () => {
        if (logoHiddenInput) logoHiddenInput.value = '';
        const storeName = this.settings.store?.name || 'FlowPOS';
        const parent = this.container.querySelector('#store-logo-preview')?.parentElement;
        if (parent) {
          parent.innerHTML = `<span id="store-logo-fallback">${storeName.substring(0, 1).toUpperCase()}</span>`;
        }
        toast.info('Logo removed');
      });
    }

    const storeForm = this.container.querySelector('#store-settings-form');
    if (storeForm) {
      storeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(storeForm);
        this.settings.store = {
          ...this.settings.store,
          name: (fd.get('name') || 'FlowPOS Store').trim(),
          tagline: (fd.get('tagline') || 'Retail Operating Station').trim(),
          logo: (fd.get('logo') || '').trim(),
          legalName: (fd.get('legalName') || '').trim(),
          taxId: (fd.get('taxId') || '').trim(),
          phone: (fd.get('phone') || '').trim(),
          email: (fd.get('email') || '').trim(),
          address: (fd.get('address') || '').trim(),
          city: (fd.get('city') || '').trim(),
          zip: (fd.get('zip') || '').trim(),
          country: (fd.get('country') || '').trim(),
          receiptFooter: (fd.get('receiptFooter') || '').trim()
        };
        settingsService.save(this.settings);
        document.title = `${this.settings.store.name} — Retail POS`;
        toast.success(`Store profile & branding updated for "${this.settings.store.name}"!`);
        this.render();
        this.attachEvents();
      });
    }

    // Hardware Settings Form Submit
    const hwForm = this.container.querySelector('#hardware-settings-form');
    if (hwForm) {
      hwForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(hwForm);
        this.settings.hardware = {
          ...this.settings.hardware,
          cameraFacingMode: fd.get('cameraFacingMode') || 'environment',
          cameraContinuous: fd.get('cameraContinuous') === 'on',
          cameraBeepSound: fd.get('cameraBeepSound') === 'on',
          cameraVibrate: fd.get('cameraVibrate') === 'on',
          scannerThresholdMs: Number(fd.get('scannerThresholdMs')) || 50,
          scaleBarcodeSupport: fd.get('scaleBarcodeSupport') === 'on',
          printerType: fd.get('printerType') || 'thermal_80mm',
          printerInterface: fd.get('printerInterface') || 'browser',
          printerIp: (fd.get('printerIp') || '192.168.1.100').trim(),
          printerPort: Number(fd.get('printerPort')) || 9100,
          autoPrintReceipt: fd.get('autoPrintReceipt') === 'on',
          printStoreLogo: fd.get('printStoreLogo') === 'on',
          cashDrawerKick: fd.get('cashDrawerKick') === 'on',
          customerDisplayEnabled: true
        };
        settingsService.save(this.settings);
        toast.success('Hardware & peripheral configurations saved successfully!');
        this.render();
        this.attachEvents();
      });
    }

    // Printer Interface Select change (show/hide network fields)
    const printerSelect = this.container.querySelector('#printer-interface-select');
    const networkFields = this.container.querySelector('#network-printer-fields');
    if (printerSelect && networkFields) {
      printerSelect.addEventListener('change', (e) => {
        if (e.target.value === 'network') {
          networkFields.classList.remove('hidden');
        } else {
          networkFields.classList.add('hidden');
        }
      });
    }

    // Hardware Test 1: Camera Scanner
    const testCameraBtn = this.container.querySelector('#test-camera-scanner-btn');
    if (testCameraBtn) {
      testCameraBtn.addEventListener('click', () => {
        new CameraScannerModal({
          title: 'Camera Scanner Hardware Test',
          autoAddToCart: false,
          onScan: (code, product) => {
            toast.success(`Scanned: ${code} ${product ? `(${product.name})` : ''}`);
          }
        }).open();
      });
    }

    // Hardware Test 2: Thermal Receipt Print
    const testPrintBtn = this.container.querySelector('#test-thermal-print-btn');
    if (testPrintBtn) {
      testPrintBtn.addEventListener('click', async () => {
        toast.info('Sending diagnostic test receipt to printer…');
        await hardwarePrinter.printTestReceipt();
      });
    }

    // Hardware Test 3: Cash Drawer Kick
    const testCashDrawerBtn = this.container.querySelector('#test-cash-drawer-btn');
    if (testCashDrawerBtn) {
      testCashDrawerBtn.addEventListener('click', async () => {
        await hardwarePrinter.kickCashDrawer();
        soundManager.playSuccess();
        toast.success('Electronic cash drawer kick pulse sent!');
      });
    }

    // Hardware Test 4: Launch Customer Screen
    const testCustScreenBtn = this.container.querySelector('#test-customer-screen-btn');
    const launchCustBtn = this.container.querySelector('#launch-customer-display-btn');
    const handleLaunchCustomer = () => {
      customerDisplayService.openCustomerWindow();
      toast.info('Customer display window opened');
    };
    if (testCustScreenBtn) testCustScreenBtn.addEventListener('click', handleLaunchCustomer);
    if (launchCustBtn) launchCustBtn.addEventListener('click', handleLaunchCustomer);

    // Hardware Test 5: Live Barcode Scanner Input Monitor
    const testScannerInput = this.container.querySelector('#scanner-diagnostic-test-input');
    const scannerFeedback = this.container.querySelector('#scanner-test-feedback');
    if (testScannerInput && scannerFeedback) {
      let scanStart = 0;
      testScannerInput.addEventListener('keydown', () => {
        if (!scanStart) scanStart = Date.now();
      });
      testScannerInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
          const val = testScannerInput.value.trim();
          const elapsed = Date.now() - scanStart;
          scanStart = 0;
          if (val) {
            scannerFeedback.className = 'badge badge-emerald text-[10px] font-mono font-bold flex-shrink-0';
            scannerFeedback.textContent = `✓ Scanned "${val}" (${elapsed}ms)`;
            soundManager.playBeep();
            toast.success(`HID Scanner captured: ${val} in ${elapsed}ms`);
            setTimeout(() => {
              testScannerInput.value = '';
              scannerFeedback.className = 'badge badge-blue text-[10px] font-mono font-bold flex-shrink-0';
              scannerFeedback.textContent = 'Ready for Scan';
            }, 3000);
          }
        }
      });
    }

    // Cloud Settings & Supabase Sync
    const cloudForm = this.container.querySelector('#cloud-settings-form');
    if (cloudForm) {
      cloudForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(cloudForm);
        const url = (fd.get('supabaseUrl') || '').trim();
        const key = (fd.get('supabaseKey') || '').trim();
        const isConn = supabaseClient.configure(url, key);
        toast.success(isConn ? 'Cloud database configured successfully!' : 'Cloud configuration saved.');
        this.render();
        this.attachEvents();
      });
    }

    const testCloudBtn = this.container.querySelector('#test-cloud-btn');
    if (testCloudBtn) {
      testCloudBtn.addEventListener('click', async () => {
        const urlInput = this.container.querySelector('#cloud-url-input');
        const keyInput = this.container.querySelector('#cloud-key-input');
        const resultEl = this.container.querySelector('#cloud-test-result');

        if (urlInput && keyInput) {
          supabaseClient.configure(urlInput.value, keyInput.value);
        }

        testCloudBtn.disabled = true;
        testCloudBtn.textContent = 'Testing…';

        const res = await supabaseClient.testConnection();
        testCloudBtn.disabled = false;
        testCloudBtn.textContent = 'Test Connection';

        if (resultEl) {
          resultEl.classList.remove('hidden', 'bg-emerald-500/15', 'text-emerald-700', 'dark:text-emerald-300', 'bg-red-500/15', 'text-red-700', 'dark:text-red-300');
          if (res.success) {
            resultEl.classList.add('bg-emerald-500/15', 'text-emerald-700', 'dark:text-emerald-300');
            resultEl.textContent = `✓ ${res.message}`;
            toast.success(res.message);
          } else {
            resultEl.classList.add('bg-red-500/15', 'text-red-700', 'dark:text-red-300');
            resultEl.textContent = `✗ ${res.message}`;
            toast.error(res.message);
          }
        }
      });
    }

    const resetCloudBtn = this.container.querySelector('#reset-cloud-btn');
    if (resetCloudBtn) {
      resetCloudBtn.addEventListener('click', () => {
        supabaseClient.resetToDefault();
        toast.success('Restored default verified Supabase credentials!');
        this.render();
        this.attachEvents();
      });
    }

    const syncNowBtn = this.container.querySelector('#sync-now-cloud-btn');
    if (syncNowBtn) {
      syncNowBtn.addEventListener('click', async () => {
        if (!supabaseClient.isConfigured()) {
          toast.error('Please configure your Supabase URL & Key first.');
          return;
        }
        syncNowBtn.disabled = true;
        syncNowBtn.textContent = 'Syncing…';
        try {
          const counts = await supabaseClient.syncAllToCloud();
          toast.success(`Synced ${counts.products} products, ${counts.categories} categories, ${counts.orders} orders to cloud!`);
        } catch (err) {
          console.error('Sync error:', err);
          toast.error(err.message || 'Failed to sync to cloud');
        } finally {
          syncNowBtn.disabled = false;
          syncNowBtn.textContent = 'Sync Local Store to Cloud Now';
        }
      });
    }

    // Re-verify All Cloud Tables
    const reverifyBtn = this.container.querySelector('#reverify-cloud-tables-btn');
    if (reverifyBtn) {
      reverifyBtn.addEventListener('click', async () => {
        reverifyBtn.disabled = true;
        reverifyBtn.textContent = 'Verifying All Tables…';
        try {
          const report = await supabaseClient.verifyAllCloudTables();
          this.lastVerificationResults = report;
          toast.success(`Verified ${report.healthyCount}/${report.totalTables} cloud tables (${report.totalLatency}ms)`);
          this.render();
          this.attachEvents();
        } catch (err) {
          toast.error(err.message || 'Table verification failed');
          reverifyBtn.disabled = false;
          reverifyBtn.textContent = '⚡ Re-verify All Tables';
        }
      });
    }

    // Clear Cloud Logs
    const clearLogsBtn = this.container.querySelector('#clear-cloud-logs-btn');
    if (clearLogsBtn) {
      clearLogsBtn.addEventListener('click', () => {
        supabaseClient.clearSyncLogs();
        toast.info('Cleared cloud sync log history');
        this.render();
        this.attachEvents();
      });
    }

    // Export Cloud Logs
    const exportLogsBtn = this.container.querySelector('#export-cloud-logs-btn');
    if (exportLogsBtn) {
      exportLogsBtn.addEventListener('click', () => {
        const logs = supabaseClient.getSyncLogs();
        const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `flowpos-cloud-logs-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Downloaded sync logs as JSON');
      });
    }

    // Log Filter
    const logFilter = this.container.querySelector('#cloud-log-filter');
    if (logFilter) {
      logFilter.addEventListener('change', (e) => {
        const filterVal = e.target.value;
        this.container.querySelectorAll('[data-log-item-type]').forEach(el => {
          if (filterVal === 'ALL' || el.getAttribute('data-log-item-type') === filterVal) {
            el.style.display = 'flex';
          } else {
            el.style.display = 'none';
          }
        });
      });
    }

    // Inspect Payload Modal
    this.container.querySelectorAll('[data-inspect-log-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const logId = btn.getAttribute('data-inspect-log-id');
        const logs = supabaseClient.getSyncLogs();
        const log = logs.find(l => l.id === logId);
        if (!log) return;

        const modal = new Modal({
          title: `Log Details: ${log.type} (${new Date(log.timestamp).toLocaleTimeString()})`,
          size: 'lg',
          content: `
            <div class="space-y-4 text-xs font-mono">
              <div class="grid grid-cols-2 gap-2 p-3 rounded-[12px] glass-card">
                <div><strong>Event Type:</strong> ${log.type}</div>
                <div><strong>Status:</strong> ${log.status}</div>
                <div><strong>Latency:</strong> ${log.latency}ms</div>
                <div><strong>Table:</strong> ${log.table}</div>
                <div class="col-span-2"><strong>Timestamp:</strong> ${log.timestamp}</div>
                <div class="col-span-2"><strong>Message:</strong> ${sanitizeHtml(log.message || '—')}</div>
              </div>
              <div>
                <label class="block text-[11px] font-bold text-[var(--text)] mb-1">Payload / Details Data</label>
                <pre class="p-3 rounded-[12px] bg-black/5 dark:bg-black/40 border border-[var(--line)] overflow-x-auto text-[11px] max-h-72">${JSON.stringify(log.details || log, null, 2)}</pre>
              </div>
            </div>
          `
        });
        modal.open();
      });
    });

    const checkoutForm = this.container.querySelector('#checkout-settings-form');
    if (checkoutForm) {
      checkoutForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(checkoutForm);
        const currCode = fd.get('currencyCode');
        const matched = SUPPORTED_CURRENCIES.find(c => c.code === currCode);

        this.settings.currency = {
          code: matched.code,
          symbol: matched.symbol,
          position: fd.get('currencyPos'),
          decimals: Number(fd.get('currencyDecimals')) || 2
        };

        this.settings.tax = {
          ...this.settings.tax,
          defaultRate: Number(fd.get('taxRate')) || 0,
          label: fd.get('taxLabel')
        };

        settingsService.save(this.settings);
        toast.success('Currency & tax configurations updated');
        setTimeout(() => window.location.reload(), 300);
      });
    }

    const securityForm = this.container.querySelector('#owner-security-form');
    if (securityForm) {
      securityForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(securityForm);
        const allUsers = sessionManager.getAllUsers();
        const ownerUser = allUsers.find(u => u.role === 'OWNER') || sessionManager.getUser();

        if (ownerUser) {
          const newName = (fd.get('adminName') || 'admin').trim();
          const newEmail = (fd.get('adminEmail') || `${newName.toLowerCase()}@flowpos.store`).trim();
          const newPassword = (fd.get('adminPassword') || 'admin').trim();
          const newPin = (fd.get('adminPin') || '1234').trim();

          sessionManager.updateUser(ownerUser.id, {
            name: newName,
            email: newEmail,
            password: newPassword,
            pin: newPin
          });

          toast.success(`Admin credentials updated: Username "${newName}" & PIN "${newPin}"`);
          this.render();
          this.attachEvents();
        }
      });
    }

    // Password & PIN Visibility Toggles in Settings
    const toggleAdminPwdBtn = this.container.querySelector('#toggle-admin-password-btn');
    const adminPwdInput = this.container.querySelector('#admin-password-input');
    if (toggleAdminPwdBtn && adminPwdInput) {
      toggleAdminPwdBtn.addEventListener('click', () => {
        const isPwd = adminPwdInput.type === 'password';
        adminPwdInput.type = isPwd ? 'text' : 'password';
        toggleAdminPwdBtn.innerHTML = renderIcon(isPwd ? 'eye-off' : 'eye', 'w-3.5 h-3.5');
      });
    }

    const toggleAdminPinBtn = this.container.querySelector('#toggle-admin-pin-btn');
    const adminPinInput = this.container.querySelector('#admin-pin-input');
    if (toggleAdminPinBtn && adminPinInput) {
      toggleAdminPinBtn.addEventListener('click', () => {
        const isPwd = adminPinInput.type === 'password';
        adminPinInput.type = isPwd ? 'text' : 'password';
        toggleAdminPinBtn.innerHTML = renderIcon(isPwd ? 'eye-off' : 'eye', 'w-3.5 h-3.5');
      });
    }

    const toggleCloudKeyBtn = this.container.querySelector('#toggle-cloud-key-btn');
    const cloudKeyInput = this.container.querySelector('#cloud-key-input');
    if (toggleCloudKeyBtn && cloudKeyInput) {
      toggleCloudKeyBtn.addEventListener('click', () => {
        const isPwd = cloudKeyInput.type === 'password';
        cloudKeyInput.type = isPwd ? 'text' : 'password';
        toggleCloudKeyBtn.innerHTML = renderIcon(isPwd ? 'eye-off' : 'eye', 'w-3.5 h-3.5');
      });
    }

    // 1. Export Complete Database Backup JSON
    const exportBtn = this.container.querySelector('#export-json-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', async () => {
        try {
          await settingsService.exportAllDataJSON();
          toast.success('Complete store database backup downloaded successfully!');
        } catch (err) {
          console.error('Export error:', err);
          toast.error('Failed to export database backup');
        }
      });
    }

    // 2. Import Database Backup JSON
    const importInput = this.container.querySelector('#import-json-file-input');
    if (importInput) {
      importInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = async (event) => {
            try {
              const backup = JSON.parse(event.target.result);
              showConfirmDialog({
                title: 'Restore Database Backup',
                message: `Are you sure you want to restore data from "${file.name}"? This will overwrite the current database with the backup data.`,
                confirmText: 'Restore Backup',
                isDanger: false,
                onConfirm: async () => {
                  toast.info('Restoring database from backup…');
                  await settingsService.importAllDataJSON(backup);
                }
              });
            } catch (err) {
              console.error('Import parse error:', err);
              toast.error('Invalid JSON file format. Please upload a valid FlowPOS backup file.');
            }
          };
          reader.readAsText(file);
        }
        importInput.value = '';
      });
    }

    // 3. Wipe All Demo Data & Start Clean Store (Configure Admin / Defaults)
    const wipeBtn = this.container.querySelector('#wipe-clean-btn');
    if (wipeBtn) {
      wipeBtn.addEventListener('click', () => {
        this.openCleanStoreModal();
      });
    }

    // 4. Re-Seed Sample Demo Catalog
    const reseedBtn = this.container.querySelector('#reseed-demo-btn');
    if (reseedBtn) {
      reseedBtn.addEventListener('click', () => {
        showConfirmDialog({
          title: 'Load Sample Demo Catalog',
          message: 'This will reset the database back to the sample Coffee Shop & Bakery demo catalog with 26 sample items.',
          confirmText: 'Load Demo Catalog',
          isDanger: false,
          onConfirm: async () => {
            toast.info('Loading demo catalog…');
            await settingsService.resetToSeedData();
          }
        });
      });
    }
  }

  openCleanStoreModal() {
    const modalContent = `
      <form id="clean-store-admin-form" class="space-y-4">
        <div class="p-3.5 rounded-[16px] bg-red-500/10 border border-red-500/30 text-xs text-red-700 dark:text-red-300 space-y-1">
          <strong class="block font-bold">⚠️ Factory Wipe & Initialize Clean Shop</strong>
          <p class="leading-relaxed">
            This will permanently erase all 26 demo products, sample sales, categories, and test staff. You can now define your store's Administrator account below (or keep defaults):
          </p>
        </div>

        <div class="space-y-3 pt-1">
          <div>
            <label class="block text-xs font-black text-[var(--text)] mb-1">Administrator Username *</label>
            <input name="adminName" type="text" value="admin" required placeholder="admin" class="glass-input w-full p-2.5 rounded-[12px] text-xs font-bold" />
            <p class="text-[10px] text-[var(--muted)] mt-0.5">Default: <strong>admin</strong></p>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-black text-[var(--text)] mb-1">Admin Password *</label>
              <input name="adminPassword" type="text" value="admin" required placeholder="admin" class="glass-input w-full p-2.5 rounded-[12px] text-xs font-bold" />
              <p class="text-[10px] text-[var(--muted)] mt-0.5">Default: <strong>admin</strong></p>
            </div>
            <div>
              <label class="block text-xs font-black text-[var(--text)] mb-1">4-Digit Staff PIN *</label>
              <input name="adminPin" type="text" maxlength="4" minlength="4" value="1234" required placeholder="1234" class="glass-input w-full p-2.5 rounded-[12px] text-xs font-mono font-bold" />
              <p class="text-[10px] text-[var(--muted)] mt-0.5">Default: <strong>1234</strong></p>
            </div>
          </div>

          <div>
            <label class="block text-xs font-black text-[var(--text)] mb-1">Admin Email Address</label>
            <input name="adminEmail" type="email" value="admin@flowpos.store" placeholder="admin@flowpos.store" class="glass-input w-full p-2.5 rounded-[12px] text-xs font-semibold" />
          </div>
        </div>

        <div class="flex justify-end space-x-2 pt-3 border-t border-[var(--line)]">
          <button type="button" id="cancel-clean-btn" class="px-4 py-2.5 rounded-[12px] text-xs font-bold glass-btn-secondary">
            Cancel
          </button>
          <button type="submit" id="confirm-clean-btn" class="px-5 py-2.5 rounded-[12px] text-xs font-black bg-red-600 hover:bg-red-700 text-white shadow-md transition">
            Wipe & Initialize Clean Store
          </button>
        </div>
      </form>
    `;

    const modal = new Modal({
      title: 'Initialize Clean Store & Admin Account',
      size: 'md',
      content: modalContent,
      onOpen: (modalEl) => {
        const cancelBtn = modalEl.querySelector('#cancel-clean-btn');
        if (cancelBtn) {
          cancelBtn.addEventListener('click', () => modal.close());
        }

        const form = modalEl.querySelector('#clean-store-admin-form');
        if (form) {
          form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fd = new FormData(form);
            const name = (fd.get('adminName') || 'admin').trim();
            const password = (fd.get('adminPassword') || 'admin').trim();
            const pin = (fd.get('adminPin') || '1234').trim();
            const email = (fd.get('adminEmail') || `${name.toLowerCase()}@flowpos.store`).trim();

            const confirmBtn = modalEl.querySelector('#confirm-clean-btn');
            if (confirmBtn) {
              confirmBtn.disabled = true;
              confirmBtn.textContent = 'Initializing Clean Store…';
            }

            toast.info(`Wiping demo data and creating admin "${name}"…`);
            await settingsService.wipeCleanDatabase({ name, password, pin, email });
          });
        }
      }
    });

    modal.open();
  }
}
