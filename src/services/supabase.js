/**
 * Supabase Client & Multi-Device Cloud Synchronization Engine
 * Full cloud backup, pull on startup, live websocket sync, staff passwords & permissions
 */

import { createClient } from '@supabase/supabase-js';
import { localDB } from '../offline/database.js';

class SupabaseService {
  constructor() {
    this.realtimeChannel = null;
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

  /**
   * PUSH / SYNC ALL LOCAL STORE DATA TO CLOUD
   */
  async syncAllToCloud() {
    if (!this.isConfigured()) throw new Error('Cloud database is not configured');

    const users = typeof localStorage !== 'undefined' ? JSON.parse(localStorage.getItem('flowpos_staff_users') || '[]') : [];
    const settingsRaw = typeof localStorage !== 'undefined' ? localStorage.getItem('flowpos_app_settings') : null;
    const categories = await localDB.getAll('categories');
    const products = await localDB.getAll('products');
    const customers = await localDB.getAll('customers');
    const suppliers = await localDB.getAll('suppliers');
    const orders = await localDB.getAll('orders');

    // 1. Sync Staff Users, Passwords & PINs
    if (users.length > 0) {
      const payload = users.map(u => ({
        id: String(u.id),
        name: u.name || 'admin',
        role: u.role || 'CASHIER',
        email: u.email || `${u.name}@flowpos.store`,
        pin: String(u.pin || '1234'),
        password: String(u.password || 'admin'),
        avatar: u.avatar || '',
        title: u.title || '',
        is_active: u.is_active !== false,
        updated_at: new Date().toISOString()
      }));
      const { error } = await this.client.from('users').upsert(payload, { onConflict: 'id' });
      if (error) throw new Error(`Users sync error: ${error.message}`);
    }

    // 2. Sync Store Settings & Branding
    if (settingsRaw) {
      const parsedSettings = JSON.parse(settingsRaw);
      const { error } = await this.client.from('settings').upsert({
        key: 'global_settings',
        value: parsedSettings,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });
      if (error) console.warn('Settings sync warning:', error.message);
    }

    // 3. Sync Categories
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

    // 4. Sync Suppliers
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

    // 5. Sync Products
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
        created_at: p.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
      const { error } = await this.client.from('products').upsert(payload, { onConflict: 'id' });
      if (error) throw new Error(`Products sync error: ${error.message}`);
    }

    // 6. Sync Customers
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

    // 7. Sync Orders
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
      users: users.length,
      products: products.length,
      categories: categories.length,
      customers: customers.length,
      suppliers: suppliers.length,
      orders: orders.length
    };
  }

  /**
   * PULL LATEST STORE DATA FROM CLOUD
   * Used automatically when another device / computer opens the website
   */
  async pullFromCloud() {
    if (!this.isConfigured()) return { success: false, message: 'Not configured' };

    try {
      // 1. Pull Staff Users & Passwords
      const { data: cloudUsers, error: userErr } = await this.client.from('users').select('*');
      if (!userErr && Array.isArray(cloudUsers) && cloudUsers.length > 0) {
        localStorage.setItem('flowpos_staff_users', JSON.stringify(cloudUsers));
        await localDB.putMany('users', cloudUsers);
      }

      // 2. Pull Store Settings
      const { data: cloudSettings, error: setErr } = await this.client.from('settings').select('*').eq('key', 'global_settings').single();
      if (!setErr && cloudSettings?.value) {
        localStorage.setItem('flowpos_app_settings', JSON.stringify(cloudSettings.value));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('flowpos:settings-updated', { detail: cloudSettings.value }));
        }
      }

      // 3. Pull Categories
      const { data: cloudCats, error: catErr } = await this.client.from('categories').select('*');
      if (!catErr && Array.isArray(cloudCats) && cloudCats.length > 0) {
        await localDB.putMany('categories', cloudCats);
      }

      // 4. Pull Products
      const { data: cloudProds, error: prodErr } = await this.client.from('products').select('*');
      if (!prodErr && Array.isArray(cloudProds) && cloudProds.length > 0) {
        await localDB.putMany('products', cloudProds);
      }

      // 5. Pull Customers
      const { data: cloudCusts, error: custErr } = await this.client.from('customers').select('*');
      if (!custErr && Array.isArray(cloudCusts) && cloudCusts.length > 0) {
        await localDB.putMany('customers', cloudCusts);
      }

      // 6. Pull Suppliers
      const { data: cloudSupps, error: suppErr } = await this.client.from('suppliers').select('*');
      if (!suppErr && Array.isArray(cloudSupps) && cloudSupps.length > 0) {
        await localDB.putMany('suppliers', cloudSupps);
      }

      // 7. Pull Orders
      const { data: cloudOrders, error: ordErr } = await this.client.from('orders').select('*').order('created_at', { ascending: false }).limit(200);
      if (!ordErr && Array.isArray(cloudOrders) && cloudOrders.length > 0) {
        await localDB.putMany('orders', cloudOrders);
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('flowpos:cloud-pulled'));
      }

      return {
        success: true,
        users: cloudUsers?.length || 0,
        products: cloudProds?.length || 0,
        categories: cloudCats?.length || 0
      };
    } catch (err) {
      console.warn('Cloud pull warning:', err);
      return { success: false, message: err.message };
    }
  }

  /**
   * SUBSCRIBE TO REALTIME WEBSOCKET CHANGES ACROSS TERMINALS
   */
  subscribeRealtime(onUpdateCallback) {
    if (!this.isConfigured()) return;
    if (this.realtimeChannel) return;

    try {
      this.realtimeChannel = this.client
        .channel('flowpos-live-mesh')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, async (payload) => {
          if (payload.new && payload.new.value) {
            localStorage.setItem('flowpos_app_settings', JSON.stringify(payload.new.value));
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('flowpos:settings-updated', { detail: payload.new.value }));
            }
            if (onUpdateCallback) onUpdateCallback('settings', payload);
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, async (payload) => {
          if (payload.new) {
            const users = JSON.parse(localStorage.getItem('flowpos_staff_users') || '[]');
            const idx = users.findIndex(u => u.id === payload.new.id);
            if (idx >= 0) users[idx] = payload.new;
            else users.push(payload.new);
            localStorage.setItem('flowpos_staff_users', JSON.stringify(users));
            await localDB.put('users', payload.new);
            if (onUpdateCallback) onUpdateCallback('users', payload);
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, async (payload) => {
          if (payload.eventType === 'DELETE') {
            await localDB.delete('products', payload.old.id);
          } else if (payload.new) {
            await localDB.put('products', payload.new);
          }
          if (onUpdateCallback) onUpdateCallback('products', payload);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, async (payload) => {
          if (payload.new) {
            await localDB.put('orders', payload.new);
          }
          if (onUpdateCallback) onUpdateCallback('orders', payload);
        })
        .subscribe();
    } catch (err) {
      console.warn('Realtime subscription error:', err);
    }
  }
}

export const supabaseClient = new SupabaseService();
