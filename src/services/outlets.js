/**
 * FlowPOS Multi-Outlet & Branch Location Service
 * Manage multiple physical stores, warehouses, and inter-branch inventory transfers
 */

import { supabaseClient } from './supabase.js';

const STORAGE_KEY = 'flowpos_outlets';
const ACTIVE_OUTLET_KEY = 'flowpos_active_outlet_id';

export const INITIAL_OUTLETS = [
  {
    id: 'out-01',
    name: 'Flagship Store & Roastery',
    code: 'FLAG-01',
    address: '742 Evergreen Promenade, Suite 100',
    city: 'San Francisco, CA',
    phone: '+1 (555) 234-5678',
    is_warehouse: false,
    is_active: true
  },
  {
    id: 'out-02',
    name: 'Downtown Mall Espresso Bar',
    code: 'MALL-02',
    address: '100 Market St, Ground Concourse',
    city: 'San Francisco, CA',
    phone: '+1 (555) 876-5432',
    is_warehouse: false,
    is_active: true
  },
  {
    id: 'out-03',
    name: 'Central Roastery & Supply Warehouse',
    code: 'WH-01',
    address: '400 Industrial Way, Bay 4',
    city: 'Oakland, CA',
    phone: '+1 (555) 990-1122',
    is_warehouse: true,
    is_active: true
  }
];

export const CLEAN_OUTLETS = [
  {
    id: 'out-main',
    name: 'Main Store',
    code: 'MAIN-01',
    address: 'Main Store Terminal',
    city: '',
    phone: '',
    is_warehouse: false,
    is_active: true
  }
];

class OutletsService {
  constructor() {
    const isWiped = typeof localStorage !== 'undefined' && localStorage.getItem('flowpos_db_seeded') === 'wiped';
    this.outlets = this.load();
    this.activeOutletId = typeof localStorage !== 'undefined'
      ? (localStorage.getItem(ACTIVE_OUTLET_KEY) || (isWiped ? 'out-main' : 'out-01'))
      : (isWiped ? 'out-main' : 'out-01');
  }

  load() {
    if (typeof localStorage !== 'undefined') {
      const isWiped = localStorage.getItem('flowpos_db_seeded') === 'wiped';
      try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data !== null) return JSON.parse(data);
      } catch {}
      if (isWiped) {
        this.save(CLEAN_OUTLETS);
        return CLEAN_OUTLETS;
      }
      this.save(INITIAL_OUTLETS);
    }
    return INITIAL_OUTLETS;
  }

  save(outlets) {
    this.outlets = outlets;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(outlets));
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('flowpos:outlets-updated', { detail: outlets }));
    }
  }

  getAll() {
    return this.outlets;
  }

  getActiveOutlet() {
    return this.outlets.find(o => o.id === this.activeOutletId) || this.outlets[0];
  }

  setActiveOutlet(id) {
    this.activeOutletId = id;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(ACTIVE_OUTLET_KEY, id);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('flowpos:outlet-switched', { detail: this.getActiveOutlet() }));
    }
  }

  saveOutlet(outlet) {
    const idx = this.outlets.findIndex(o => o.id === outlet.id);
    if (idx >= 0) {
      this.outlets[idx] = outlet;
    } else {
      outlet.id = outlet.id || `out-${Date.now().toString().slice(-4)}`;
      this.outlets.push(outlet);
    }
    this.save(this.outlets);

    if (typeof supabaseClient !== 'undefined' && supabaseClient.isConfigured()) {
      try {
        supabaseClient.client.from('outlets').upsert(outlet, { onConflict: 'id' }).catch(() => {});
      } catch (err) {}
    }

    return outlet;
  }

  deleteOutlet(id) {
    if (this.outlets.length <= 1) throw new Error('Cannot delete the last remaining outlet');
    this.outlets = this.outlets.filter(o => o.id !== id);
    this.save(this.outlets);

    if (typeof supabaseClient !== 'undefined' && supabaseClient.isConfigured()) {
      try {
        supabaseClient.client.from('outlets').delete().eq('id', id).catch(() => {});
      } catch (err) {}
    }
  }
}

export const outletsService = new OutletsService();
