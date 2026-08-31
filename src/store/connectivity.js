/**
 * FlowPOS Connectivity & Network Status Store
 */

import { globalStore } from './state.js';

class ConnectivityStore {
  constructor() {
    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    this.isSyncing = false;
    this.pendingSyncCount = 0;
    this.lastSyncTime = typeof localStorage !== 'undefined' ? (localStorage.getItem('flowpos_last_sync_time') || null) : null;

    this.init();
  }

  init() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notify();
      window.dispatchEvent(new CustomEvent('flowpos:network-online'));
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notify();
      window.dispatchEvent(new CustomEvent('flowpos:network-offline'));
    });

    this.notify();
  }

  setSyncing(syncing) {
    this.isSyncing = Boolean(syncing);
    if (!syncing) {
      this.lastSyncTime = new Date().toISOString();
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('flowpos_last_sync_time', this.lastSyncTime);
      }
    }
    this.notify();
  }

  setPendingCount(count) {
    this.pendingSyncCount = Math.max(0, count);
    this.notify();
  }

  notify() {
    const payload = {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      pendingSyncCount: this.pendingSyncCount,
      lastSyncTime: this.lastSyncTime
    };
    globalStore.set('connectivity', payload);
  }
}

export const connectivityStore = new ConnectivityStore();
