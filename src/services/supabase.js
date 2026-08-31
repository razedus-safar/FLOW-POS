/**
 * Supabase Client & Multi-Store Cloud Synchronization Layer
 * Seamlessly connects to Supabase PostgreSQL or falls back to IndexedDB local offline storage.
 */

import { createClient } from '@supabase/supabase-js';
import { localDB } from '../offline/database.js';

class SupabaseService {
  constructor() {
    this.init();
  }

  init() {
    let savedConfig = null;
    if (typeof localStorage !== 'undefined') {
      try {
        const data = localStorage.getItem('flowpos_supabase_config');
        if (data) savedConfig = JSON.parse(data);
      } catch {}
    }

    const envUrl = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SUPABASE_URL : '';
    const envKey = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY : '';

    const url = (savedConfig?.url || envUrl || '').trim();
    const key = (savedConfig?.key || envKey || '').trim();

    this.url = url;
    this.key = key;
    this.configured = Boolean(url && key && !url.includes('your-project') && url.startsWith('http'));

    if (this.configured) {
      try {
        this.client = createClient(url, key, {
          auth: { persistSession: true, autoRefreshToken: true }
        });
      } catch (err) {
        console.warn('Supabase initialization failed:', err);
        this.client = null;
        this.configured = false;
      }
    } else {
      this.client = null;
    }
  }

  isConfigured() {
    return this.configured && this.client !== null;
  }

  getConfig() {
    return { url: this.url || '', key: this.key || '', configured: this.isConfigured() };
  }

  configure(url, key) {
    const config = { url: (url || '').trim(), key: (key || '').trim() };
    localStorage.setItem('flowpos_supabase_config', JSON.stringify(config));
    this.init();
    return this.isConfigured();
  }

  async testConnection() {
    if (!this.isConfigured()) return { success: false, message: 'Cloud database credentials are not configured.' };
    try {
      const start = performance.now();
      const { error } = await this.client.from('products').select('count', { count: 'exact', head: true });
      const latency = Math.round(performance.now() - start);
      if (error && !error.message?.includes('relation') && !error.message?.includes('does not exist')) {
        return { success: false, message: error.message };
      }
      return { success: true, latency, message: `Connected successfully (${latency}ms latency).` };
    } catch (err) {
      return { success: false, message: err.message || 'Connection timeout' };
    }
  }

  async syncAllToCloud() {
    if (!this.isConfigured()) throw new Error('Cloud database is not configured');
    const products = await localDB.getAll('products');
    const categories = await localDB.getAll('categories');
    const customers = await localDB.getAll('customers');
    const suppliers = await localDB.getAll('suppliers');
    const orders = await localDB.getAll('orders');

    if (categories.length > 0) await this.client.from('categories').upsert(categories);
    if (products.length > 0) await this.client.from('products').upsert(products);
    if (customers.length > 0) await this.client.from('customers').upsert(customers);
    if (suppliers.length > 0) await this.client.from('suppliers').upsert(suppliers);
    if (orders.length > 0) await this.client.from('orders').upsert(orders);

    return { products: products.length, categories: categories.length, orders: orders.length };
  }
}

export const supabaseClient = new SupabaseService();

