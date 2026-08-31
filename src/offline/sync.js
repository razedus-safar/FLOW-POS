/**
 * FlowPOS Real-Time & Offline Synchronization Engine
 */

import { offlineQueue, QUEUE_STATUS, QUEUE_ACTIONS } from './queue.js';
import { connectivityStore } from '../store/connectivity.js';
import { supabaseClient } from '../services/supabase.js';
import { localDB } from './database.js';

class SyncEngine {
  constructor() {
    this.isProcessing = false;
    this.init();
  }

  init() {
    if (typeof window === 'undefined') return;

    window.addEventListener('flowpos:network-online', () => {
      this.syncNow();
    });

    // Heartbeat sync every 30s when online
    setInterval(() => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (isOnline && !this.isProcessing) {
        this.syncNow();
      }
    }, 30000);
  }

  async syncNow() {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    if (this.isProcessing || !isOnline) return;
    this.isProcessing = true;
    connectivityStore.setSyncing(true);

    try {
      const pendingItems = await offlineQueue.getPending();
      if (pendingItems.length === 0) {
        connectivityStore.setSyncing(false);
        this.isProcessing = false;
        return;
      }

      for (const item of pendingItems) {
        try {
          await offlineQueue.markSyncing(item.id);
          const success = await this.processQueueItem(item);
          if (success) {
            await offlineQueue.markCompleted(item.id);
          } else {
            await offlineQueue.markFailed(item.id, 'Failed to process item on server.');
          }
        } catch (err) {
          console.error('Sync item error:', err);
          await offlineQueue.markFailed(item.id, err.message);
        }
      }
    } catch (err) {
      console.error('Sync cycle error:', err);
    } finally {
      this.isProcessing = false;
      connectivityStore.setSyncing(false);
      await offlineQueue.updatePendingCount();
    }
  }

  async processQueueItem(item) {
    if (!supabaseClient.isConfigured()) {
      // If Supabase is not configured with live backend, mark as completed locally
      return true;
    }

    const { action, payload } = item;

    if (action === QUEUE_ACTIONS.PROCESS_SALE) {
      const { data, error } = await supabaseClient.client.rpc('process_pos_sale', {
        order_payload: payload
      });
      if (error) throw error;
      return true;
    }

    if (action === QUEUE_ACTIONS.STOCK_ADJUSTMENT) {
      const { error } = await supabaseClient.client.from('inventory_movements').insert(payload);
      if (error) throw error;
      return true;
    }

    if (action === QUEUE_ACTIONS.PROCESS_REFUND) {
      const { error } = await supabaseClient.client.rpc('process_order_refund', {
        refund_payload: payload
      });
      if (error) throw error;
      return true;
    }

    return true;
  }
}

export const syncEngine = new SyncEngine();
