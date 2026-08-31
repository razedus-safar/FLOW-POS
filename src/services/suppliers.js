/**
 * FlowPOS Supplier Directory Service
 */

import { localDB } from '../offline/database.js';

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
    await localDB.put('suppliers', supplier);
    return supplier;
  }

  async deleteSupplier(id) {
    await localDB.delete('suppliers', id);
  }
}

export const supplierService = new SupplierService();
export const suppliersService = supplierService;
