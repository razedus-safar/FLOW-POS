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

    const envUrl = (typeof import.meta !== 'undefined' && import.meta.env)
      ? (import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL || '')
      : '';
    const envKey = (typeof import.meta !== 'undefined' && import.meta.env)
      ? (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '')
      : '';

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
      const { error } = await this.client.from('products').select('id', { count: 'exact', head: true });
      const latency = Math.round(performance.now() - start);
      if (error) {
        return { success: false, message: error.message };
      }
      return { success: true, latency, message: `Connected successfully (${latency}ms latency).` };
    } catch (err) {
      return { success: false, message: err.message || 'Connection timeout' };
    }
  }

  async syncAllToCloud() {
    if (!this.isConfigured()) throw new Error('Cloud database is not configured');

    const categories = await localDB.getAll('categories');
    const products = await localDB.getAll('products');
    const customers = await localDB.getAll('customers');
    const suppliers = await localDB.getAll('suppliers');
    const orders = await localDB.getAll('orders');

    // 1. Sync Categories
    if (categories.length > 0) {
      const payload = categories.map(c => ({
        id: String(c.id),
        name: c.name || 'General',
        slug: c.slug || String(c.name || '').toLowerCase().replace(/[^a-z0-9]/g, '-'),
        color_code: c.color_code || '#0071e3',
        icon: c.icon || 'tag',
        is_active: c.is_active !== false,
        created_at: c.created_at || new Date().toISOString()
      }));
      const { error } = await this.client.from('categories').upsert(payload, { onConflict: 'id' });
      if (error) throw new Error(`Categories sync error: ${error.message}`);
    }

    // 2. Sync Suppliers
    if (suppliers.length > 0) {
      const payload = suppliers.map(s => ({
        id: String(s.id),
        name: s.name,
        contact_person: s.contact_person || '',
        email: s.email || '',
        phone: s.phone || '',
        address: s.address || '',
        lead_time_days: Number(s.lead_time_days) || 3,
        payment_terms: s.payment_terms || 'Net 30',
        is_active: s.is_active !== false,
        created_at: s.created_at || new Date().toISOString()
      }));
      const { error } = await this.client.from('suppliers').upsert(payload, { onConflict: 'id' });
      if (error) throw new Error(`Suppliers sync error: ${error.message}`);
    }

    // 3. Sync Products
    if (products.length > 0) {
      const payload = products.map(p => ({
        id: String(p.id),
        name: p.name,
        description: p.description || '',
        sku: p.sku || `SKU-${p.id}`,
        barcode: p.barcode || null,
        category_id: p.category_id ? String(p.category_id) : null,
        category_name: p.category_name || '',
        category_color: p.category_color || '#0071e3',
        cost_price: Number(p.cost_price) || 0,
        selling_price: Number(p.selling_price) || 0,
        tax_rate: Number(p.tax_rate) || 0,
        stock_quantity: Number(p.stock_quantity) || 0,
        reorder_level: Number(p.reorder_level) || 5,
        image_url: p.image_url || '',
        track_inventory: p.track_inventory !== false,
        is_active: p.is_active !== false,
        created_at: p.created_at || new Date().toISOString()
      }));
      const { error } = await this.client.from('products').upsert(payload, { onConflict: 'id' });
      if (error) throw new Error(`Products sync error: ${error.message}`);
    }

    // 4. Sync Customers
    if (customers.length > 0) {
      const payload = customers.map(c => ({
        id: String(c.id),
        name: c.name,
        phone: c.phone || null,
        email: c.email || null,
        address: c.address || '',
        loyalty_points: Number(c.loyalty_points) || 0,
        tier: c.tier || 'Bronze',
        total_spend: Number(c.total_spend) || 0,
        order_count: Number(c.order_count) || 0,
        notes: c.notes || '',
        created_at: c.created_at || new Date().toISOString()
      }));
      const { error } = await this.client.from('customers').upsert(payload, { onConflict: 'id' });
      if (error) throw new Error(`Customers sync error: ${error.message}`);
    }

    // 5. Sync Orders
    if (orders.length > 0) {
      const payload = orders.map(o => ({
        id: String(o.id),
        order_number: o.order_number || `ORD-${o.id}`,
        customer_id: o.customer_id ? String(o.customer_id) : null,
        customer_name: o.customer_name || 'Walk-in Guest',
        subtotal: Number(o.subtotal) || 0,
        tax_amount: Number(o.tax_amount) || 0,
        discount_amount: Number(o.discount_amount) || 0,
        total_amount: Number(o.total_amount) || 0,
        payment_method: o.payment_method || 'cash',
        status: o.status || 'completed',
        items: o.items || [],
        created_at: o.created_at || new Date().toISOString()
      }));
      const { error } = await this.client.from('orders').upsert(payload, { onConflict: 'id' });
      if (error) throw new Error(`Orders sync error: ${error.message}`);
    }

    return {
      products: products.length,
      categories: categories.length,
      customers: customers.length,
      suppliers: suppliers.length,
      orders: orders.length
    };
  }
}

export const supabaseClient = new SupabaseService();
