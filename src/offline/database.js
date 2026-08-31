/**
 * FlowPOS IndexedDB Storage Layer
 * High-performance, offline-first local database.
 */

const DB_NAME = 'flowpos_db';
const DB_VERSION = 3;

export const ALL_OBJECT_STORES = [
  'products',
  'categories',
  'customers',
  'suppliers',
  'orders',
  'inventory_movements',
  'register_sessions',
  'users',
  'settings',
  'sync_queue',
  'purchase_orders',
  'gift_cards',
  'promotions',
  'outlets',
  'time_punches',
  'audit_logs'
];

class LocalDatabase {
  constructor() {
    this.db = null;
    this.memoryStore = new Map();
    this.initPromise = this.open();
  }

  async open() {
    if (typeof indexedDB === 'undefined') {
      return null;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // 1. Products store with SKU, Barcode, Category indexes
        if (!db.objectStoreNames.contains('products')) {
          const productStore = db.createObjectStore('products', { keyPath: 'id' });
          productStore.createIndex('sku', 'sku', { unique: false });
          productStore.createIndex('barcode', 'barcode', { unique: false });
          productStore.createIndex('category_id', 'category_id', { unique: false });
          productStore.createIndex('name', 'name', { unique: false });
        }

        // 2. Categories store
        if (!db.objectStoreNames.contains('categories')) {
          const catStore = db.createObjectStore('categories', { keyPath: 'id' });
          catStore.createIndex('slug', 'slug', { unique: false });
        }

        // 3. Customers store
        if (!db.objectStoreNames.contains('customers')) {
          const customerStore = db.createObjectStore('customers', { keyPath: 'id' });
          customerStore.createIndex('phone', 'phone', { unique: false });
          customerStore.createIndex('email', 'email', { unique: false });
          customerStore.createIndex('tier', 'tier', { unique: false });
        }

        // 4. Suppliers store
        if (!db.objectStoreNames.contains('suppliers')) {
          const suppStore = db.createObjectStore('suppliers', { keyPath: 'id' });
          suppStore.createIndex('name', 'name', { unique: false });
          suppStore.createIndex('email', 'email', { unique: false });
        }

        // 5. Orders store
        if (!db.objectStoreNames.contains('orders')) {
          const orderStore = db.createObjectStore('orders', { keyPath: 'id' });
          orderStore.createIndex('order_number', 'order_number', { unique: true });
          orderStore.createIndex('created_at', 'created_at', { unique: false });
          orderStore.createIndex('customer_id', 'customer_id', { unique: false });
          orderStore.createIndex('status', 'status', { unique: false });
        }

        // 6. Inventory movements store
        if (!db.objectStoreNames.contains('inventory_movements')) {
          const invStore = db.createObjectStore('inventory_movements', { keyPath: 'id' });
          invStore.createIndex('product_id', 'product_id', { unique: false });
          invStore.createIndex('created_at', 'created_at', { unique: false });
          invStore.createIndex('movement_type', 'movement_type', { unique: false });
        }

        // 7. Register sessions store
        if (!db.objectStoreNames.contains('register_sessions')) {
          const regStore = db.createObjectStore('register_sessions', { keyPath: 'id' });
          regStore.createIndex('status', 'status', { unique: false });
          regStore.createIndex('opened_at', 'opened_at', { unique: false });
        }

        // 8. Users & Staff Profiles store
        if (!db.objectStoreNames.contains('users')) {
          const userStore = db.createObjectStore('users', { keyPath: 'id' });
          userStore.createIndex('email', 'email', { unique: false });
          userStore.createIndex('role', 'role', { unique: false });
          userStore.createIndex('name', 'name', { unique: false });
        }

        // 9. Settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }

        // 10. Sync Queue store
        if (!db.objectStoreNames.contains('sync_queue')) {
          const syncStore = db.createObjectStore('sync_queue', { keyPath: 'id' });
          syncStore.createIndex('status', 'status', { unique: false });
          syncStore.createIndex('created_at', 'created_at', { unique: false });
          syncStore.createIndex('idempotency_key', 'idempotency_key', { unique: true });
        }

        // 11. Purchase Orders store
        if (!db.objectStoreNames.contains('purchase_orders')) {
          const poStore = db.createObjectStore('purchase_orders', { keyPath: 'id' });
          poStore.createIndex('supplier_id', 'supplier_id', { unique: false });
          poStore.createIndex('status', 'status', { unique: false });
          poStore.createIndex('created_at', 'created_at', { unique: false });
        }

        // 12. Gift Cards store
        if (!db.objectStoreNames.contains('gift_cards')) {
          const gcStore = db.createObjectStore('gift_cards', { keyPath: 'id' });
          gcStore.createIndex('code', 'code', { unique: true });
          gcStore.createIndex('status', 'status', { unique: false });
        }

        // 13. Promotions store
        if (!db.objectStoreNames.contains('promotions')) {
          const promoStore = db.createObjectStore('promotions', { keyPath: 'id' });
          promoStore.createIndex('code', 'code', { unique: false });
          promoStore.createIndex('status', 'status', { unique: false });
        }

        // 14. Outlets store
        if (!db.objectStoreNames.contains('outlets')) {
          const outletStore = db.createObjectStore('outlets', { keyPath: 'id' });
          outletStore.createIndex('code', 'code', { unique: false });
        }

        // 15. Time Punches store
        if (!db.objectStoreNames.contains('time_punches')) {
          const tpStore = db.createObjectStore('time_punches', { keyPath: 'id' });
          tpStore.createIndex('user_id', 'user_id', { unique: false });
          tpStore.createIndex('status', 'status', { unique: false });
        }

        // 16. Audit Logs store
        if (!db.objectStoreNames.contains('audit_logs')) {
          const auditStore = db.createObjectStore('audit_logs', { keyPath: 'id' });
          auditStore.createIndex('action', 'action', { unique: false });
          auditStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('IndexedDB open error:', event.target.error);
        resolve(null);
      };
    });
  }

  async getStore(storeName, mode = 'readonly') {
    if (!this.db && typeof indexedDB !== 'undefined') {
      await this.initPromise;
    }
    if (!this.db) return null;
    const tx = this.db.transaction(storeName, mode);
    return tx.objectStore(storeName);
  }

  async getAll(storeName) {
    const store = await this.getStore(storeName, 'readonly');
    if (!store) {
      const map = this.memoryStore.get(storeName) || new Map();
      return Array.from(map.values());
    }
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async getById(storeName, id) {
    const store = await this.getStore(storeName, 'readonly');
    if (!store) {
      const map = this.memoryStore.get(storeName) || new Map();
      return map.get(id) || null;
    }
    return new Promise((resolve, reject) => {
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async put(storeName, item) {
    const store = await this.getStore(storeName, 'readwrite');
    if (!store) {
      if (!this.memoryStore.has(storeName)) this.memoryStore.set(storeName, new Map());
      const key = item.id || item.key;
      this.memoryStore.get(storeName).set(key, item);
      return key;
    }
    return new Promise((resolve, reject) => {
      const req = store.put(item);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async putMany(storeName, items) {
    if (!items || items.length === 0) return;
    const store = await this.getStore(storeName, 'readwrite');
    if (!store) {
      if (!this.memoryStore.has(storeName)) this.memoryStore.set(storeName, new Map());
      const map = this.memoryStore.get(storeName);
      items.forEach(item => map.set(item.id || item.key, item));
      return;
    }
    const db = this.db || await this.initPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const s = tx.objectStore(storeName);
      items.forEach(item => s.put(item));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async delete(storeName, id) {
    const store = await this.getStore(storeName, 'readwrite');
    if (!store) {
      if (this.memoryStore.has(storeName)) {
        this.memoryStore.get(storeName).delete(id);
      }
      return;
    }
    return new Promise((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async clear(storeName) {
    const store = await this.getStore(storeName, 'readwrite');
    if (!store) {
      if (this.memoryStore.has(storeName)) {
        this.memoryStore.get(storeName).clear();
      }
      return;
    }
    return new Promise((resolve, reject) => {
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
}

export const localDB = new LocalDatabase();
