/**
 * FlowPOS Central Application Shell & Router - iOS 26 Fully Responsive Edition
 * Supports desktop 3-column docked layout, tablet adaptive grid, and mobile off-canvas drawer & cart slide-over
 */

import { Sidebar } from './components/Sidebar.js';
import { Topbar } from './components/Topbar.js';
import { LoginPage } from './pages/Login.js';
import { POSPage } from './pages/POS.js';
import { DashboardPage } from './pages/Dashboard.js';
import { ProductsPage } from './pages/Products.js';
import { CategoriesPage } from './pages/Categories.js';
import { InventoryPage } from './pages/Inventory.js';
import { PurchaseOrdersPage } from './pages/PurchaseOrders.js';
import { SuppliersPage } from './pages/Suppliers.js';
import { CustomersPage } from './pages/Customers.js';
import { LoyaltyPage } from './pages/Loyalty.js';
import { OrdersPage } from './pages/Orders.js';
import { ReturnsPage } from './pages/Returns.js';
import { RegistersPage } from './pages/Registers.js';
import { ReportsPage } from './pages/Reports.js';
import { EmployeesPage } from './pages/Employees.js';
import { SettingsPage } from './pages/Settings.js';
import { BarcodeLabelsPage } from './pages/BarcodeLabels.js';
import { StocktakePage } from './pages/Stocktake.js';
import { PromotionsPage } from './pages/Promotions.js';
import { KDSPage } from './pages/KDS.js';
import { TimeClockPage } from './pages/TimeClock.js';
import { GiftCardsPage } from './pages/GiftCards.js';
import { OutletsPage } from './pages/Outlets.js';
import { NotFoundPage } from './pages/NotFound.js';
import { CustomerDisplayPage } from './pages/CustomerDisplay.js';
import { sessionManager } from './store/session.js';
import { supabaseClient } from './services/supabase.js';
import { sanitizeHtml } from './utils/security.js';

const ROUTE_PERMISSIONS = {
  pos: 'process_sales',
  kds: 'process_sales',
  timeclock: 'process_sales',
  registers: 'manage_register',
  products: 'manage_products',
  labels: 'manage_products',
  categories: 'manage_products',
  inventory: 'manage_inventory',
  stocktake: 'manage_inventory',
  purchasing: 'create_purchase_orders',
  suppliers: 'manage_suppliers',
  promotions: 'manage_settings',
  giftcards: 'manage_customers',
  customers: 'manage_customers',
  loyalty: 'manage_customers',
  orders: 'process_sales',
  returns: 'process_refund',
  reports: 'view_reports',
  employees: 'manage_employees',
  outlets: 'manage_settings',
  settings: 'manage_settings',
  dashboard: 'view_dashboard'
};

export class App {
  constructor(rootElement) {
    this.root = rootElement;
    this.sidebar = null;
    this.topbar = null;
    this.currentPageInstance = null;
    this.currentRoute = 'pos';
    this.init();
  }

  init() {
    window.addEventListener('flowpos:auth-logout', () => {
      this.render();
    });
    window.addEventListener('flowpos:logout', () => {
      this.render();
    });

    window.addEventListener('hashchange', () => {
      this.render();
    });

    // Auto-sync & Pull latest store data & staff credentials from Supabase
    if (supabaseClient.isConfigured()) {
      supabaseClient.pullFromCloud().then(res => {
        if (res.success && (res.users > 0 || res.products > 0)) {
          sessionManager.loadUsers();
          if (this.currentPageInstance && typeof this.currentPageInstance.render === 'function') {
            this.currentPageInstance.render();
          }
        }
      });

      supabaseClient.subscribeRealtime((table) => {
        if (table === 'users') {
          sessionManager.loadUsers();
        }
        if (this.currentPageInstance && typeof this.currentPageInstance.render === 'function') {
          this.currentPageInstance.render();
        }
      });
    }

    // Mobile Sidebar Drawer Toggle Event
    window.addEventListener('flowpos:toggle-mobile-sidebar', () => {
      const sidebarContainer = this.root.querySelector('#app-sidebar-container');
      const backdrop = this.root.querySelector('#mobile-sidebar-backdrop');
      if (sidebarContainer && backdrop) {
        sidebarContainer.classList.toggle('-translate-x-full');
        backdrop.classList.toggle('hidden');
      }
    });

    this.render();
  }

  render() {
    const hash = window.location.hash.replace('#/', '') || 'pos';
    const cleanRoute = hash.split('?')[0].split('/')[0];

    // Standalone Customer-Facing Display (No shell or login requirement)
    if (cleanRoute === 'customer-display') {
      if (this.currentPageInstance && typeof this.currentPageInstance.destroy === 'function') {
        this.currentPageInstance.destroy();
        this.currentPageInstance = null;
      }
      this.root.innerHTML = `<div id="customer-display-view-container" class="w-full h-full min-h-screen"></div>`;
      const container = this.root.querySelector('#customer-display-view-container');
      this.currentPageInstance = new CustomerDisplayPage(container);
      return;
    }

    // Require Login if not authenticated or explicitly navigating to /login
    if (!sessionManager.isAuthenticated() || cleanRoute === 'login') {
      if (sessionManager.isAuthenticated() && cleanRoute === 'login') {
        sessionManager.logout();
        return;
      }
      if (this.currentPageInstance && typeof this.currentPageInstance.destroy === 'function') {
        this.currentPageInstance.destroy();
        this.currentPageInstance = null;
      }
      this.root.innerHTML = `<div id="login-view-container" class="w-full h-full"></div>`;
      const loginContainer = this.root.querySelector('#login-view-container');
      new LoginPage(loginContainer, () => {
        window.location.hash = '#/pos';
        this.render();
      });
      return;
    }

    // Ensure App Shell is rendered
    const pageContainer = this.root.querySelector('#page-content');
    if (!pageContainer) {
      this.renderShell();
    }

    this.navigate(cleanRoute);
  }

  renderShell() {
    this.root.innerHTML = `
      <!-- Mobile Backdrop Overlay -->
      <div id="mobile-sidebar-backdrop" class="hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden transition-opacity"></div>

      <!-- App Sidebar Container (Fixed overlay on mobile, static on desktop) -->
      <div id="app-sidebar-container" class="fixed inset-y-0 left-0 z-50 transform -translate-x-full lg:translate-x-0 lg:static lg:flex-shrink-0 h-full transition-transform duration-300 ease-in-out"></div>

      <!-- Main Application Stage -->
      <div class="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        <div id="app-topbar-container" class="flex-shrink-0 relative z-30"></div>
        <main id="page-content" class="flex-1 overflow-hidden relative z-0"></main>
      </div>
    `;

    const sidebarContainer = this.root.querySelector('#app-sidebar-container');
    const topbarContainer = this.root.querySelector('#app-topbar-container');
    const backdrop = this.root.querySelector('#mobile-sidebar-backdrop');

    if (backdrop) {
      backdrop.addEventListener('click', () => {
        if (sidebarContainer) sidebarContainer.classList.add('-translate-x-full');
        backdrop.classList.add('hidden');
      });
    }

    this.sidebar = new Sidebar(sidebarContainer, this.currentRoute, () => {
      // On mobile route click, close drawer
      if (window.innerWidth < 1024) {
        if (sidebarContainer) sidebarContainer.classList.add('-translate-x-full');
        if (backdrop) backdrop.classList.add('hidden');
      }
    });

    this.topbar = new Topbar(topbarContainer);
  }

  navigate(route) {
    this.currentRoute = route || 'pos';
    if (this.sidebar) {
      this.sidebar.setActiveRoute(this.currentRoute);
    }

    if (this.currentPageInstance && typeof this.currentPageInstance.destroy === 'function') {
      this.currentPageInstance.destroy();
    }

    const pageContainer = this.root.querySelector('#page-content');
    if (!pageContainer) return;

    pageContainer.innerHTML = '';

    const requiredPermission = ROUTE_PERMISSIONS[this.currentRoute];
    if (requiredPermission && !sessionManager.can(requiredPermission)) {
      const user = sessionManager.getUser();
      pageContainer.innerHTML = `
        <div class="h-full flex items-center justify-center p-6 text-center">
          <div class="max-w-md w-full glass2 p-8 rounded-[32px] border border-red-500/30 shadow-2xl space-y-5">
            <div class="w-16 h-16 rounded-full bg-red-500/15 text-red-500 flex items-center justify-center text-3xl mx-auto">
              🔒
            </div>
            <div class="space-y-2">
              <h2 class="text-xl font-bold font-heading text-[var(--text)]">Access Restricted</h2>
              <p class="text-xs text-[var(--muted)] leading-relaxed">
                Staff member <strong>${sanitizeHtml(user?.name || 'User')}</strong> (Role: <span class="badge badge-amber">${sanitizeHtml(user?.role || 'Staff')}</span>) does not have the <code>${sanitizeHtml(requiredPermission)}</code> permission required for this module.
              </p>
            </div>
            <a href="#/pos" class="inline-flex items-center justify-center px-6 py-3 rounded-[16px] glass-btn-primary text-xs font-bold shadow-md hover:scale-105 active:scale-95 transition">
              Return to POS Counter
            </a>
          </div>
        </div>
      `;
      return;
    }

    switch (this.currentRoute) {
      case 'pos':
        this.currentPageInstance = new POSPage(pageContainer);
        break;
      case 'dashboard':
        this.currentPageInstance = new DashboardPage(pageContainer);
        break;
      case 'products':
        this.currentPageInstance = new ProductsPage(pageContainer);
        break;
      case 'categories':
        this.currentPageInstance = new CategoriesPage(pageContainer);
        break;
      case 'inventory':
        this.currentPageInstance = new InventoryPage(pageContainer);
        break;
      case 'purchasing':
        this.currentPageInstance = new PurchaseOrdersPage(pageContainer);
        break;
      case 'suppliers':
        this.currentPageInstance = new SuppliersPage(pageContainer);
        break;
      case 'customers':
        this.currentPageInstance = new CustomersPage(pageContainer);
        break;
      case 'loyalty':
        this.currentPageInstance = new LoyaltyPage(pageContainer);
        break;
      case 'orders':
        this.currentPageInstance = new OrdersPage(pageContainer);
        break;
      case 'returns':
        this.currentPageInstance = new ReturnsPage(pageContainer);
        break;
      case 'registers':
        this.currentPageInstance = new RegistersPage(pageContainer);
        break;
      case 'reports':
        this.currentPageInstance = new ReportsPage(pageContainer);
        break;
      case 'employees':
        this.currentPageInstance = new EmployeesPage(pageContainer);
        break;
      case 'settings':
        this.currentPageInstance = new SettingsPage(pageContainer);
        break;
      case 'labels':
        this.currentPageInstance = new BarcodeLabelsPage(pageContainer);
        break;
      case 'stocktake':
        this.currentPageInstance = new StocktakePage(pageContainer);
        break;
      case 'promotions':
        this.currentPageInstance = new PromotionsPage(pageContainer);
        break;
      case 'kds':
        this.currentPageInstance = new KDSPage(pageContainer);
        break;
      case 'timeclock':
        this.currentPageInstance = new TimeClockPage(pageContainer);
        break;
      case 'giftcards':
        this.currentPageInstance = new GiftCardsPage(pageContainer);
        break;
      case 'outlets':
        this.currentPageInstance = new OutletsPage(pageContainer);
        break;
      default:
        this.currentPageInstance = new NotFoundPage(pageContainer);
        break;
    }
  }
}
