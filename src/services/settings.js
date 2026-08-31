/**
 * FlowPOS Settings Service
 */

import { auditService } from './audit.js';
import { localDB } from '../offline/database.js';
import { INITIAL_PRODUCTS, INITIAL_CATEGORIES } from './products.js';
import { INITIAL_CUSTOMERS } from './customers.js';
import { INITIAL_SUPPLIERS } from './suppliers.js';
import { INITIAL_PUNCHES } from './timeClock.js';
import { INITIAL_GIFT_CARDS } from './giftCards.js';
import { DEFAULT_PROMOTIONS } from './promotions.js';
import { INITIAL_OUTLETS, CLEAN_OUTLETS } from './outlets.js';
import { DEFAULT_USERS } from '../store/session.js';
import { SUPPORTED_CURRENCIES } from '../utils/currency.js';
import { cartStore } from '../store/cart.js';
import { supabaseClient } from './supabase.js';

const SETTINGS_KEY = 'flowpos_app_settings';

const DEFAULT_SETTINGS = {
  store: {
    name: 'FlowPOS Artisan Market & Café',
    legalName: 'Flow Retail Ventures LLC',
    taxId: 'US-TAX-88492019',
    phone: '+1 (555) 234-5678',
    email: 'contact@flowpos.store',
    address: '742 Evergreen Promenade, Suite 100',
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94107',
    receiptHeader: 'FlowPOS Artisan Market & Café\nSpecialty Roasts & Gourmet Provisions',
    receiptFooter: 'Thank you for shopping local! Returns accepted within 30 days with receipt.'
  },
  currency: {
    symbol: 'Rs. ',
    code: 'LKR',
    position: 'prefix',
    decimals: 2
  },
  tax: {
    defaultRate: 8.5,
    pricesIncludeTax: false,
    taxName: 'Sales Tax (8.5%)'
  },
  checkout: {
    requireCustomer: false,
    allowNegativeInventory: false,
    autoPrintReceipt: false,
    soundEffects: true
  },
  hardware: {
    // Mobile / Web Camera Barcode & QR Scanner
    cameraFacingMode: 'environment', // 'environment' | 'user'
    cameraContinuous: true,
    cameraBeepSound: true,
    cameraVibrate: true,
    
    // Hardware HID / USB Barcode Scanner
    scannerMode: 'auto', // 'auto' | 'manual'
    scannerThresholdMs: 50,
    scannerBeep: true,
    scaleBarcodeSupport: true,
    
    // Thermal Receipt Printer
    printerType: 'thermal_80mm', // 'thermal_80mm' | 'thermal_58mm' | 'standard_a4'
    printerInterface: 'browser', // 'browser' | 'bluetooth' | 'usb' | 'network'
    printerIp: '192.168.1.100',
    printerPort: 9100,
    autoPrintReceipt: false,
    printStoreLogo: true,
    printBarcodeOnReceipt: true,
    cashDrawerKick: true,
    
    // Customer Facing Display
    customerDisplayEnabled: true
  },
  workspace: {
    showStockBadges: true,
    offlineQueue: true,
    pinLockSecurity: true,
    soundEffects: true,
    autoPrintReceipt: false,
    allowNegativeInventory: false
  }
};

class SettingsService {
  constructor() {
    this.settings = this.load();
  }

  load() {
    if (typeof localStorage === 'undefined') return { ...DEFAULT_SETTINGS };
    try {
      const data = localStorage.getItem(SETTINGS_KEY);
      if (!data) return { ...DEFAULT_SETTINGS };
      const parsed = JSON.parse(data);
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        store: { ...DEFAULT_SETTINGS.store, ...(parsed.store || {}) },
        currency: { ...DEFAULT_SETTINGS.currency, ...(parsed.currency || {}) },
        tax: { ...DEFAULT_SETTINGS.tax, ...(parsed.tax || {}) },
        checkout: { ...DEFAULT_SETTINGS.checkout, ...(parsed.checkout || {}) },
        hardware: { ...DEFAULT_SETTINGS.hardware, ...(parsed.hardware || {}) },
        workspace: { ...DEFAULT_SETTINGS.workspace, ...(parsed.workspace || {}) }
      };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  get() {
    return this.settings;
  }

  getSettings() {
    return this.get();
  }

  save(newSettings) {
    let currencyObj = this.settings.currency;
    if (newSettings.currency) {
      if (typeof newSettings.currency === 'string') {
        const code = newSettings.currency;
        const matched = SUPPORTED_CURRENCIES.find(c => c.code === code) || {
          code,
          symbol: code === 'LKR' ? 'Rs. ' : '$',
          position: 'prefix',
          decimals: code === 'JPY' ? 0 : 2
        };
        currencyObj = {
          code: matched.code,
          symbol: matched.symbol,
          position: matched.position || 'prefix',
          decimals: matched.decimals ?? 2
        };
      } else {
        currencyObj = { ...this.settings.currency, ...newSettings.currency };
      }
    }

    this.settings = {
      ...this.settings,
      ...newSettings,
      store: { ...this.settings.store, ...(newSettings.store || {}) },
      currency: currencyObj,
      tax: { ...this.settings.tax, ...(newSettings.tax || {}) },
      checkout: { ...this.settings.checkout, ...(newSettings.checkout || {}) },
      hardware: { ...this.settings.hardware, ...(newSettings.hardware || {}) },
      workspace: { ...this.settings.workspace, ...(newSettings.workspace || {}) }
    };
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    }

    if (typeof supabaseClient !== 'undefined' && supabaseClient.isConfigured()) {
      supabaseClient.client.from('settings').upsert({
        key: 'global_settings',
        value: this.settings,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' }).then(({ error }) => {
        if (error) console.warn('Settings cloud sync warning:', error.message);
      }).catch(err => console.warn('Settings cloud sync error:', err));
    }

    auditService.log('SETTINGS_UPDATED', 'settings', 'global', this.settings);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('flowpos:settings-updated', { detail: this.settings }));
    }
    return this.settings;
  }

  saveSettings(newSettings) {
    return this.save(newSettings);
  }

  async exportAllDataJSON() {
    const products = await localDB.getAll('products');
    const categories = await localDB.getAll('categories');
    const customers = await localDB.getAll('customers');
    const suppliers = await localDB.getAll('suppliers');
    const orders = await localDB.getAll('orders');
    const movements = await localDB.getAll('inventory_movements');
    const sessions = await localDB.getAll('register_sessions');
    const users = await localDB.getAll('users');
    let staffUsers = users;
    try {
      const storedUsers = localStorage.getItem('flowpos_staff_users');
      if (storedUsers) staffUsers = JSON.parse(storedUsers);
    } catch {}

    let purchaseOrders = [];
    try {
      const storedPOs = localStorage.getItem('flowpos_purchase_orders');
      if (storedPOs) purchaseOrders = JSON.parse(storedPOs);
    } catch {}

    // Scrub sensitive passwords and PINs from exported backup file to prevent credential leaks
    const safeUsers = staffUsers.map(u => ({
      id: u.id,
      name: u.name,
      role: u.role,
      email: u.email,
      avatar: u.avatar,
      title: u.title
    }));

    const backup = {
      app: 'FlowPOS',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      settings: this.settings,
      products,
      categories,
      customers,
      suppliers,
      orders,
      movements,
      sessions,
      users: safeUsers,
      purchaseOrders,
      auditLogs
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `flowpos_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return backup;
  }

  async importAllDataJSON(backup) {
    if (!backup || typeof backup !== 'object') {
      throw new Error('Invalid JSON backup file structure.');
    }

    await localDB.clear('products');
    await localDB.clear('categories');
    await localDB.clear('customers');
    await localDB.clear('suppliers');
    await localDB.clear('orders');
    await localDB.clear('inventory_movements');
    await localDB.clear('register_sessions');
    await localDB.clear('sync_queue');
    await localDB.clear('users');

    if (Array.isArray(backup.products) && backup.products.length > 0) {
      await localDB.putMany('products', backup.products);
    }
    if (Array.isArray(backup.categories) && backup.categories.length > 0) {
      await localDB.putMany('categories', backup.categories);
    }
    if (Array.isArray(backup.customers) && backup.customers.length > 0) {
      await localDB.putMany('customers', backup.customers);
    }
    if (Array.isArray(backup.suppliers) && backup.suppliers.length > 0) {
      await localDB.putMany('suppliers', backup.suppliers);
    }
    if (Array.isArray(backup.orders) && backup.orders.length > 0) {
      await localDB.putMany('orders', backup.orders);
    }
    if (Array.isArray(backup.movements) && backup.movements.length > 0) {
      await localDB.putMany('inventory_movements', backup.movements);
    }
    if (Array.isArray(backup.sessions) && backup.sessions.length > 0) {
      await localDB.putMany('register_sessions', backup.sessions);
    }

    if (backup.settings) {
      this.save(backup.settings);
    }

    if (Array.isArray(backup.users) && backup.users.length > 0) {
      const sanitizedUsers = backup.users.map(u => ({
        ...u,
        pin: u.pin || '1234',
        password: u.password || 'admin'
      }));
      localStorage.setItem('flowpos_staff_users', JSON.stringify(sanitizedUsers));
      await localDB.putMany('users', sanitizedUsers);
    }

    if (Array.isArray(backup.purchaseOrders)) {
      localStorage.setItem('flowpos_purchase_orders', JSON.stringify(backup.purchaseOrders));
    }

    localStorage.setItem('flowpos_db_seeded', 'custom');
    auditService.log('DATABASE_IMPORTED', 'system', 'database', {});
    window.location.reload();
  }

  async wipeCleanDatabase(customAdmin = {}) {
    await localDB.clear('products');
    await localDB.clear('categories');
    await localDB.clear('customers');
    await localDB.clear('suppliers');
    await localDB.clear('orders');
    await localDB.clear('inventory_movements');
    await localDB.clear('register_sessions');
    await localDB.clear('sync_queue');
    await localDB.clear('users');
    await localDB.clear('purchase_orders');
    await localDB.clear('gift_cards');
    await localDB.clear('promotions');
    await localDB.clear('outlets');
    await localDB.clear('time_punches');
    await localDB.clear('audit_logs');

    // Create a starter clean General category
    await localDB.put('categories', {
      id: 'cat-general',
      name: 'General',
      slug: 'general',
      color_code: '#0071e3',
      icon: 'tag'
    });

    const adminName = (customAdmin.name || 'admin').trim();
    const adminPassword = (customAdmin.password || 'admin').trim();
    const adminPin = String(customAdmin.pin || '1234').trim();
    const adminEmail = (customAdmin.email || `${adminName.toLowerCase().replace(/[^a-z0-9]/g, '')}@flowpos.store`).trim();

    const adminOwner = {
      id: 'usr-admin',
      name: adminName,
      role: 'OWNER',
      email: adminEmail,
      pin: adminPin,
      password: adminPassword,
      avatar: customAdmin.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      title: 'Store Owner & Executive Admin'
    };

    await localDB.put('users', adminOwner);

    // Set storage flags
    localStorage.setItem('flowpos_db_seeded', 'wiped');
    localStorage.setItem('flowpos_staff_users', JSON.stringify([adminOwner]));
    localStorage.setItem('flowpos_active_user_id', 'usr-admin');
    localStorage.setItem('flowpos_authenticated', 'true');

    // Clear and set explicit empty state for all feature modules
    localStorage.setItem('flowpos_time_punches', JSON.stringify([]));
    localStorage.setItem('flowpos_gift_cards', JSON.stringify([]));
    localStorage.setItem('flowpos_promotions', JSON.stringify([]));
    localStorage.setItem('flowpos_purchase_orders', JSON.stringify([]));
    localStorage.setItem('flowpos_suspended_carts', JSON.stringify([]));
    localStorage.setItem('flowpos_held_orders', JSON.stringify([]));
    localStorage.setItem('flowpos_cart', JSON.stringify({ items: [] }));
    localStorage.setItem('flowpos_audit_logs', JSON.stringify([]));
    localStorage.setItem('flowpos_outlets', JSON.stringify(CLEAN_OUTLETS));
    localStorage.setItem('flowpos_active_outlet_id', 'out-main');

    localStorage.removeItem('flowpos_active_register_session');
    localStorage.removeItem('flowpos_last_sync_time');

    if (cartStore) {
      cartStore.clearCart();
    }

    if (typeof supabaseClient !== 'undefined' && supabaseClient.isConfigured()) {
      try {
        await supabaseClient.client.from('orders').delete().neq('id', '___none___');
        await supabaseClient.client.from('products').delete().neq('id', '___none___');
        await supabaseClient.client.from('customers').delete().neq('id', '___none___');
        await supabaseClient.client.from('suppliers').delete().neq('id', '___none___');
        await supabaseClient.client.from('promotions').delete().neq('id', '___none___');
        await supabaseClient.client.from('gift_cards').delete().neq('id', '___none___');
        await supabaseClient.client.from('time_punches').delete().neq('id', '___none___');
        await supabaseClient.client.from('register_sessions').delete().neq('id', '___none___');
        await supabaseClient.client.from('users').delete().neq('id', '___none___');
        await supabaseClient.client.from('users').upsert([adminOwner]);
        await supabaseClient.client.from('categories').delete().neq('id', '___none___');
        await supabaseClient.client.from('categories').upsert([{
          id: 'cat-general',
          name: 'General',
          slug: 'general',
          color_code: '#0071e3',
          icon: 'tag',
          is_active: true
        }]);
      } catch (e) {
        console.warn('Cloud wipe warning:', e);
      }
    }

    auditService.log('SHOP_DATABASE_WIPED_CLEAN', 'system', 'database', { admin: adminName });
    window.location.reload();
  }

  async resetToSeedData() {
    await localDB.clear('products');
    await localDB.clear('categories');
    await localDB.clear('customers');
    await localDB.clear('suppliers');
    await localDB.clear('orders');
    await localDB.clear('inventory_movements');
    await localDB.clear('register_sessions');
    await localDB.clear('sync_queue');
    await localDB.clear('users');
    await localDB.clear('purchase_orders');
    await localDB.clear('gift_cards');
    await localDB.clear('promotions');
    await localDB.clear('outlets');
    await localDB.clear('time_punches');
    await localDB.clear('audit_logs');

    await localDB.putMany('categories', INITIAL_CATEGORIES);
    await localDB.putMany('products', INITIAL_PRODUCTS);
    await localDB.putMany('customers', INITIAL_CUSTOMERS);
    await localDB.putMany('suppliers', INITIAL_SUPPLIERS);
    await localDB.putMany('users', DEFAULT_USERS);

    // Set demo sample data across all modules
    localStorage.setItem('flowpos_db_seeded', 'true');
    localStorage.setItem('flowpos_staff_users', JSON.stringify(DEFAULT_USERS));
    localStorage.setItem('flowpos_active_user_id', 'usr-admin');
    localStorage.setItem('flowpos_authenticated', 'true');
    localStorage.setItem('flowpos_time_punches', JSON.stringify(INITIAL_PUNCHES));
    localStorage.setItem('flowpos_gift_cards', JSON.stringify(INITIAL_GIFT_CARDS));
    localStorage.setItem('flowpos_promotions', JSON.stringify(DEFAULT_PROMOTIONS));
    localStorage.setItem('flowpos_outlets', JSON.stringify(INITIAL_OUTLETS));
    localStorage.setItem('flowpos_active_outlet_id', 'out-01');
    localStorage.setItem('flowpos_purchase_orders', JSON.stringify([]));
    localStorage.setItem('flowpos_suspended_carts', JSON.stringify([]));
    localStorage.setItem('flowpos_held_orders', JSON.stringify([]));
    localStorage.setItem('flowpos_cart', JSON.stringify({ items: [] }));
    localStorage.setItem('flowpos_audit_logs', JSON.stringify([]));

    localStorage.removeItem('flowpos_active_register_session');
    localStorage.removeItem('flowpos_last_sync_time');

    if (cartStore) {
      cartStore.clearCart();
    }

    auditService.log('SYSTEM_DATABASE_RESET', 'system', 'database', {});
    window.location.reload();
  }

  async factoryReset() {
    await localDB.clear('products');
    await localDB.clear('categories');
    await localDB.clear('customers');
    await localDB.clear('suppliers');
    await localDB.clear('orders');
    await localDB.clear('inventory_movements');
    await localDB.clear('register_sessions');
    await localDB.clear('sync_queue');
    await localDB.clear('users');

    localStorage.clear();
    sessionStorage.clear();
    window.location.href = window.location.origin + window.location.pathname;
  }
}

export const settingsService = new SettingsService();
