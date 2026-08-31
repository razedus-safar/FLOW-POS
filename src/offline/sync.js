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
    this.debounceTimer = null;
    this.init();
  }

  init() {
    if (typeof window === 'undefined') return;

    window.addEventListener('flowpos:network-online', () => {
      this.syncNow();
    });

    // Reactive auto-sync triggers on local mutations
    const autoSyncEvents = [
      'flowpos:products-updated',
      'flowpos:customers-updated',
      'flowpos:inventory-updated',
      'flowpos:settings-updated',
      'flowpos:user-updated',
      'flowpos:registers-updated',
      'flowpos:timeclock-updated',
      'flowpos:orders-updated'
    ];

    autoSyncEvents.forEach(evt => {
      window.addEventListener(evt, () => {
        this.triggerDebouncedSync();
      });
    });

    // Continuous background sync heartbeat every 15s when online
    setInterval(() => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (isOnline && !this.isProcessing && supabaseClient.isConfigured()) {
        this.syncNow();
      }
    }, 15000);
  }

  triggerDebouncedSync(delayMs = 1200) {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.syncNow();
    }, delayMs);
  }

  async syncNow() {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    if (this.isProcessing || !isOnline || !supabaseClient.isConfigured()) return;
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
          console.error('Background sync item error:', err);
          await offlineQueue.markFailed(item.id, err.message);
        }
      }
    } catch (err) {
      console.error('Background sync cycle error:', err);
    } finally {
      this.isProcessing = false;
      connectivityStore.setSyncing(false);
      await offlineQueue.updatePendingCount();
    }
  }

  async processQueueItem(item) {
    if (!supabaseClient.isConfigured()) {
      return true;
    }

    const { action, payload } = item;

    if (action === QUEUE_ACTIONS.PROCESS_SALE) {
      // 1. Upsert order into Supabase 'orders' table directly
      const orderPayload = {
        id: String(payload.id),
        order_number: payload.order_number || `ORD-${payload.id}`,
        customer_id: payload.customer_id ? String(payload.customer_id) : null,
        customer_name: payload.customer_name || 'Walk-in Guest',
        subtotal: Number(payload.subtotal) || 0,
        tax_amount: Number(payload.tax_amount) || 0,
        discount_amount: Number(payload.discount_amount) || 0,
        total_amount: Number(payload.total_amount) || 0,
        payment_method: payload.payment_method || (payload.payments?.[0]?.payment_method) || 'cash',
        status: payload.status || payload.fulfillment_status || 'completed',
        items: payload.items || [],
        created_at: payload.created_at || new Date().toISOString()
      };
      const { error: orderErr } = await supabaseClient.client.from('orders').upsert(orderPayload, { onConflict: 'id' });
      if (orderErr) throw orderErr;

      // 2. Decrement cloud stock levels for purchased items
      for (const it of payload.items || []) {
        if (it.product_id) {
          try {
            const { data: prod } = await supabaseClient.client.from('products').select('stock_quantity').eq('id', String(it.product_id)).maybeSingle();
            if (prod) {
              const nextStock = Math.max(0, (Number(prod.stock_quantity) || 0) - (Number(it.quantity) || 1));
              await supabaseClient.client.from('products').update({ stock_quantity: nextStock, updated_at: new Date().toISOString() }).eq('id', String(it.product_id));
            }
          } catch (e) {
            console.warn('Background stock decrement warning:', e);
          }
        }
      }

      supabaseClient.logSyncEvent('BACKGROUND_SALE', `Synced sale ${orderPayload.order_number} to Supabase cloud`, { table: 'orders', id: orderPayload.id });
      return true;
    }

    if (action === QUEUE_ACTIONS.STOCK_ADJUSTMENT) {
      const { error } = await supabaseClient.client.from('inventory_movements').upsert({
        id: String(payload.id),
        product_id: String(payload.product_id),
        product_name: payload.product_name || '',
        sku: payload.sku || '',
        movement_type: payload.movement_type || 'adjustment',
        quantity: Number(payload.quantity) || 0,
        previous_stock: Number(payload.previous_stock) || 0,
        new_stock: Number(payload.new_stock) || 0,
        reference_id: payload.reference_id || '',
        reason: payload.reason || '',
        performed_by: payload.performed_by || 'Staff',
        created_at: payload.created_at || new Date().toISOString()
      }, { onConflict: 'id' });
      if (error) throw error;
      return true;
    }

    if (action === QUEUE_ACTIONS.PROCESS_REFUND) {
      if (payload.order) {
        await supabaseClient.client.from('orders').upsert({
          id: String(payload.order.id),
          payment_status: payload.order.payment_status || 'refunded',
          refund_amount: Number(payload.order.refund_amount) || 0,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });
      }
      return true;
    }

    return true;
  }
}

export const syncEngine = new SyncEngine();
