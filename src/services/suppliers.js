/**
 * FlowPOS Supplier Directory Service
 */

import { localDB } from '../offline/database.js';
import { supabaseClient } from './supabase.js';

export const INITIAL_SUPPLIERS = [
  {
    id: 'sup-01',
    name: 'Pacific Coast Roasters Inc.',
    contact_person: 'David Miller',
    email: 'david@pacificroasters.com',
    phone: '+1 (555) 301-4499',
    address: '88 Pier Blvd, Seattle, WA',
    lead_time_days: 3,
    payment_terms: 'Net 30'
  },
  {
    id: 'sup-02',
    name: 'Golden Grain Mill & Bakery Supply',
    contact_person: 'Sarah Jenkins',
    email: 'orders@goldengrain.com',
    phone: '+1 (555) 782-1200',
    address: '410 Harvest Way, Portland, OR',
    lead_time_days: 2,
    payment_terms: 'Net 15'
  },
  {
    id: 'sup-03',
    name: 'Mountain Crest Botanical Extracts',
    contact_person: 'Julian Fox',
    email: 'supplies@mountaincrest.org',
    phone: '+1 (555) 902-8833',
    address: '12 Alpine Road, Boulder, CO',
    lead_time_days: 5,
    payment_terms: 'Net 30'
  }
];

class SupplierService {
  async ensureSeeded() {
    const isWiped = typeof localStorage !== 'undefined' && localStorage.getItem('flowpos_db_seeded') === 'wiped';
    if (isWiped) return;

    const existing = await localDB.getAll('suppliers');
    if (existing.length === 0) {
      await localDB.putMany('suppliers', INITIAL_SUPPLIERS);
    }
  }

  async getAllSuppliers() {
    await this.ensureSeeded();
    return await localDB.getAll('suppliers');
  }

  async getSupplierById(id) {
    return await localDB.getById('suppliers', id);
  }

  async saveSupplier(supplier) {
    if (!supplier.id) {
      supplier.id = `sup-${Date.now()}`;
    }
    supplier.lead_time_days = Number(supplier.lead_time_days) || 3;
    supplier.payment_terms = supplier.payment_terms || 'Net 30';
    supplier.is_active = supplier.is_active !== false;

    await localDB.put('suppliers', supplier);

    if (typeof supabaseClient !== 'undefined' && supabaseClient.isConfigured()) {
      try {
        await supabaseClient.client.from('suppliers').upsert({
          id: String(supplier.id),
          name: supplier.name,
          contact_person: supplier.contact_person || '',
          email: supplier.email || '',
          phone: supplier.phone || '',
          address: supplier.address || '',
          lead_time_days: supplier.lead_time_days,
          payment_terms: supplier.payment_terms,
          is_active: supplier.is_active,
          created_at: supplier.created_at || new Date().toISOString()
        }, { onConflict: 'id' });
      } catch (err) {
        console.warn('Online supplier sync failed:', err);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('flowpos:suppliers-updated', { detail: supplier }));
    }
    return supplier;
  }

  async deleteSupplier(id) {
    await localDB.delete('suppliers', id);

    if (typeof supabaseClient !== 'undefined' && supabaseClient.isConfigured()) {
      try {
        await supabaseClient.client.from('suppliers').delete().eq('id', id);
      } catch (err) {
        console.warn('Online supplier delete failed:', err);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('flowpos:suppliers-updated', { detail: { id, deleted: true } }));
    }
  }
}

export const supplierService = new SupplierService();
export const suppliersService = supplierService;
