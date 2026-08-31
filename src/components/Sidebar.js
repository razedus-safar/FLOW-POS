/**
 * FlowPOS Sidebar Component - Pinned Layout & Perfect Viewport Scaling
 * Fixed brand header, smooth scrollable navigation, and pinned user profile footer
 */

import { renderIcon } from '../utils/icons.js';
import { sessionManager } from '../store/session.js';
import { registerService } from '../services/registers.js';
import { settingsService } from '../services/settings.js';

export const NAV_GROUPS = [
  {
    label: 'Sales & Kitchen',
    items: [
      { id: 'pos', label: 'POS Counter', icon: 'shopping-bag', path: '#/pos', permission: 'process_sales' },
      { id: 'kds', label: 'Kitchen Display (KDS)', icon: 'chef-hat', path: '#/kds', permission: 'process_sales' },
      { id: 'timeclock', label: 'Staff Time Clock', icon: 'clock', path: '#/timeclock', permission: 'process_sales' },
      { id: 'registers', label: 'Register Shift', icon: 'calculator', path: '#/registers', permission: 'manage_register' }
    ]
  },
  {
    label: 'Catalog & Stock',
    items: [
      { id: 'products', label: 'Products', icon: 'package', path: '#/products', permission: 'manage_products' },
      { id: 'labels', label: 'Barcode Labels', icon: 'scan', path: '#/labels', permission: 'manage_products' },
      { id: 'categories', label: 'Categories', icon: 'layers', path: '#/categories', permission: 'manage_products' },
      { id: 'inventory', label: 'Inventory Movements', icon: 'boxes', path: '#/inventory', permission: 'manage_inventory' },
      { id: 'stocktake', label: 'Stocktake Audit', icon: 'camera', path: '#/stocktake', permission: 'manage_inventory' },
      { id: 'purchasing', label: 'Purchase Orders', icon: 'truck', path: '#/purchasing', permission: 'create_purchase_orders' },
      { id: 'suppliers', label: 'Suppliers', icon: 'truck', path: '#/suppliers', permission: 'manage_suppliers' }
    ]
  },
  {
    label: 'Marketing & CRM',
    items: [
      { id: 'promotions', label: 'Smart Promotions', icon: 'tag', path: '#/promotions', permission: 'manage_settings' },
      { id: 'giftcards', label: 'Gift Cards & Vouchers', icon: 'gift', path: '#/giftcards', permission: 'manage_customers' },
      { id: 'customers', label: 'Customers', icon: 'users', path: '#/customers', permission: 'manage_customers' },
      { id: 'loyalty', label: 'Loyalty & Rewards', icon: 'award', path: '#/loyalty', permission: 'manage_customers' }
    ]
  },
  {
    label: 'Business & System',
    items: [
      { id: 'orders', label: 'Sales & Receipts', icon: 'receipt', path: '#/orders', permission: 'process_sales' },
      { id: 'reports', label: 'Reports & Analytics', icon: 'bar-chart-3', path: '#/reports', permission: 'view_reports' },
      { id: 'employees', label: 'Staff & Roles', icon: 'user-check', path: '#/employees', permission: 'manage_employees' },
      { id: 'outlets', label: 'Store Outlets', icon: 'store', path: '#/outlets', permission: 'manage_settings' },
      { id: 'settings', label: 'Store Settings', icon: 'settings', path: '#/settings', permission: 'manage_settings' }
    ]
  }
];

export const NAV_ITEMS = NAV_GROUPS.flatMap(g => g.items);

export class Sidebar {
  constructor(container, activeRoute = 'pos', onNavigate = null) {
    this.container = container;
    this.activeRoute = activeRoute;
    this.onNavigate = onNavigate;
    localStorage.removeItem('flowpos_sidebar_collapsed');

    window.addEventListener('flowpos:user-switched', () => {
      this.render();
      this.attachEvents();
    });

    window.addEventListener('flowpos:settings-updated', () => {
      this.render();
      this.attachEvents();
    });

    this.render();
    this.attachEvents();
  }

  setActiveRoute(route) {
    this.activeRoute = route;
    this.render();
    this.attachEvents();
  }

  render() {
    const user = sessionManager.getUser() || { name: 'admin', role: 'OWNER', avatar: '' };
    const settings = settingsService.getSettings();
    const store = settings?.store || {};
    const storeName = store.name || 'FlowPOS';
    const storeTagline = store.tagline || 'Retail OS';
    const storeLogo = store.logo || '';
    const activeSession = registerService.getActiveSession();

    const navGroupsHtml = NAV_GROUPS.map((group) => {
      const allowedItems = group.items.filter(item => !item.permission || sessionManager.can(item.permission));
      if (allowedItems.length === 0) return '';

      const itemsHtml = allowedItems.map(item => {
        const isActive = this.activeRoute === item.id;
        const activeClass = isActive
          ? 'bg-[var(--accent)] text-white font-bold shadow-xs'
          : 'text-[var(--text)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] font-semibold';

        return `
          <a href="${item.path}" data-route="${item.id}" class="nav-item flex items-center h-8.5 px-2.5 rounded-[10px] text-[13px] transition-all duration-150 group active:scale-98 select-none ${activeClass}">
            <span class="w-4 h-4 flex items-center justify-center flex-shrink-0 ${isActive ? 'text-white' : 'text-[var(--muted)] group-hover:text-[var(--accent)]'} transition-colors">
              ${renderIcon(item.icon, 'w-4 h-4')}
            </span>
            <span class="ml-2.5 text-[13px] truncate tracking-normal">${item.label}</span>
          </a>
        `;
      }).join('');

      return `
        <div class="nav-group space-y-0.5">
          <div class="px-2.5 pt-1.5 pb-0.5 text-[9.5px] uppercase tracking-widest font-bold text-[var(--muted)] opacity-80">${group.label}</div>
          <nav class="nav flex flex-col space-y-0.5">
            ${itemsHtml}
          </nav>
        </div>
      `;
    }).join('');

    this.container.innerHTML = `
      <aside class="sidebar h-full flex flex-col justify-between glass border-r border-[var(--line)] w-56 sm:w-60 transition-all duration-200 select-none z-30 shadow-xs p-2.5 sm:p-3">
        <!-- 1. Top Fixed Brand Header -->
        <div class="brand flex items-center justify-between pb-2.5 border-b border-[var(--line)] flex-shrink-0">
          <a href="#/pos" class="flex items-center gap-2.5 group min-w-0">
            <div class="logo w-8.5 h-8.5 rounded-[10px] bg-gradient-to-tr from-[#0066CC] to-[#7E22CE] text-white font-bold text-base flex items-center justify-center shadow-xs flex-shrink-0 group-hover:scale-105 transition-transform overflow-hidden">
              ${storeLogo ? `<img src="${storeLogo}" alt="${storeName}" class="w-full h-full object-cover rounded-[10px]" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" /><span class="hidden">${storeName.substring(0, 1).toUpperCase()}</span>` : storeName.substring(0, 1).toUpperCase()}
            </div>
            <div class="brand-text min-w-0">
              <span class="font-bold font-heading text-sm tracking-tight text-[var(--text)] block leading-tight truncate">${storeName}</span>
              <span class="text-[9px] text-[var(--muted)] font-mono tracking-wider uppercase font-semibold block truncate">${storeTagline}</span>
            </div>
          </a>
        </div>

        <!-- 2. Scrollable Middle Navigation -->
        <div class="nav-container flex-1 overflow-y-auto py-1.5 space-y-1 scrollbar-none min-h-0">
          ${navGroupsHtml}
        </div>

        <!-- 3. Bottom Fixed User & Sign Out Footer -->
        <div class="user-footer pt-2 border-t border-[var(--line)] flex items-center justify-between flex-shrink-0">
          <div class="flex items-center space-x-2 min-w-0">
            ${user.avatar ? `
              <img src="${user.avatar}" alt="${user.name}" class="w-8 h-8 rounded-full object-cover ring-1 ring-[var(--line)] flex-shrink-0 shadow-xs" onerror="this.style.display='none'; this.nextElementSibling.style.display='grid';" />
              <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-[#0066CC] to-[#7E22CE] text-white font-bold text-xs hidden place-items-center flex-shrink-0 shadow-xs">
                ${user.name.substring(0, 2).toUpperCase()}
              </div>
            ` : `
              <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-[#0066CC] to-[#7E22CE] text-white font-bold text-xs grid place-items-center flex-shrink-0 shadow-xs">
                ${user.name.substring(0, 2).toUpperCase()}
              </div>
            `}
            <div class="truncate">
              <p class="text-xs font-bold text-[var(--text)] truncate leading-tight">${user.name}</p>
              <p class="text-[9px] text-[var(--accent)] font-bold uppercase font-mono tracking-wider leading-none mt-0.5">${user.role}</p>
            </div>
          </div>

          <button id="sidebar-logout-btn" class="p-1.5 text-[var(--muted)] hover:text-[var(--red)] rounded-[8px] hover:bg-red-500/10 transition active:scale-90 flex-shrink-0" title="Lock Terminal / Sign Out">
            ${renderIcon('log-out', 'w-4 h-4')}
          </button>
        </div>
      </aside>
    `;
  }

  attachEvents() {
    this.container.querySelectorAll('.nav-item').forEach(link => {
      link.addEventListener('click', () => {
        const route = link.getAttribute('data-route');
        if (this.onNavigate) {
          this.onNavigate(route);
        }
      });
    });

    const logoutBtn = this.container.querySelector('#sidebar-logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        sessionManager.logout();
      });
    }
  }
}
