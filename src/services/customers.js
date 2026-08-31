/**
 * FlowPOS Customer & Loyalty Profile Service
 */

import { localDB } from '../offline/database.js';
import { auditService } from './audit.js';
import { supabaseClient } from './supabase.js';

export const INITIAL_CUSTOMERS = [
  {
    id: 'cust-01',
    name: 'Claire Beaumont',
    phone: '+1 (555) 412-8801',
    email: 'claire.b@example.com',
    address: '450 Marina Blvd, San Francisco, CA',
    loyalty_points: 340,
    tier: 'Gold',
    total_spend: 485.50,
    order_count: 18,
    notes: 'Prefers light roast beans & oat milk.'
  },
  {
    id: 'cust-02',
    name: 'Ethan Walker',
    phone: '+1 (555) 623-1194',
    email: 'ewalker@example.com',
    address: '128 Mission St, San Francisco, CA',
    loyalty_points: 180,
    tier: 'Silver',
    total_spend: 220.00,
    order_count: 9,
    notes: 'Regular morning croissant buyer.'
  },
  {
    id: 'cust-03',
    name: 'Dr. Hiroshi Tanaka',
    phone: '+1 (555) 890-4412',
    email: 'hiroshi.t@meduniv.org',
    address: '77 Parnassus Ave, San Francisco, CA',
    loyalty_points: 620,
    tier: 'Platinum',
    total_spend: 890.25,
    order_count: 34,
    notes: 'Matcha enthusiast.'
  },
  {
    id: 'cust-04',
    name: 'Olivia Sterling',
    phone: '+1 (555) 309-7751',
    email: 'olivia.s@designer.io',
    address: '320 Hayes St, San Francisco, CA',
    loyalty_points: 95,
    tier: 'Bronze',
    total_spend: 115.00,
    order_count: 4,
    notes: 'Buys merchandise and drinkware.'
  },
  {
    id: 'cust-05',
    name: 'Mateo Rossi',
    phone: '+1 (555) 745-9920',
    email: 'mateo.rossi@coffeeclub.net',
    address: '19 Columbus Ave, San Francisco, CA',
    loyalty_points: 410,
    tier: 'Gold',
    total_spend: 560.75,
    order_count: 21,
    notes: 'Subscribed to coffee beans newsletter.'
  }
];

class CustomerService {
  async ensureSeeded() {
    const isWiped = typeof localStorage !== 'undefined' && localStorage.getItem('flowpos_db_seeded') === 'wiped';
    if (isWiped) return;

    const existing = await localDB.getAll('customers');
    if (existing.length === 0) {
      await localDB.putMany('customers', INITIAL_CUSTOMERS);
    }
  }

  async getAllCustomers() {
    await this.ensureSeeded();
    return await localDB.getAll('customers');
  }

  async getCustomerById(id) {
    return await localDB.getById('customers', id);
  }

  async addCustomer(customer) {
    return await this.saveCustomer(customer);
  }

  async saveCustomer(customer) {
    if (!customer.id) {
      customer.id = `cust-${Date.now()}`;
      customer.loyalty_points = customer.loyalty_points || 0;
      customer.total_spend = customer.total_spend || 0;
      customer.order_count = customer.order_count || 0;
      customer.tier = customer.tier || 'Bronze';
      customer.created_at = new Date().toISOString();
    }
    customer.updated_at = new Date().toISOString();
    await localDB.put('customers', customer);
    auditService.log('CUSTOMER_SAVED', 'customers', customer.id, { name: customer.name });

    if (typeof supabaseClient !== 'undefined' && supabaseClient.isConfigured()) {
      try {
        await supabaseClient.client.from('customers').upsert({
          id: String(customer.id),
          name: customer.name,
          phone: customer.phone || null,
          email: customer.email || null,
          address: customer.address || '',
          loyalty_points: Number(customer.loyalty_points) || 0,
          tier: customer.tier || 'Bronze',
          total_spend: Number(customer.total_spend) || 0,
          order_count: Number(customer.order_count) || 0,
          notes: customer.notes || '',
          created_at: customer.created_at || new Date().toISOString(),
          updated_at: customer.updated_at || new Date().toISOString()
        }, { onConflict: 'id' });
      } catch (err) {
        console.warn('Online customer sync failed:', err);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('flowpos:customers-updated', { detail: customer }));
    }
    return customer;
  }

  async deleteCustomer(id) {
    await localDB.delete('customers', id);
    auditService.log('CUSTOMER_DELETED', 'customers', id, { id });

    if (typeof supabaseClient !== 'undefined' && supabaseClient.isConfigured()) {
      try {
        await supabaseClient.client.from('customers').delete().eq('id', id);
      } catch (err) {
        console.warn('Online customer delete failed:', err);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('flowpos:customers-updated', { detail: { id, deleted: true } }));
    }
  }

  async searchCustomers(query) {
    const customers = await this.getAllCustomers();
    if (!query) return customers;
    const q = query.toLowerCase();
    return customers.filter(c => 
      c.name.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q))
    );
  }
}

export const customerService = new CustomerService();
