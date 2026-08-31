/**
 * FlowPOS Durable Offline Sync Queue
 * Stores transactions safely when offline with UUID idempotency keys.
 */

import { localDB } from './database.js';
import { connectivityStore } from '../store/connectivity.js';

export const QUEUE_ACTIONS = {
  PROCESS_SALE: 'process_sale',
  STOCK_ADJUSTMENT: 'stock_adjustment',
  PROCESS_REFUND: 'process_refund',
  OPEN_REGISTER: 'open_register',
  CLOSE_REGISTER: 'close_register',
  CASH_MOVEMENT: 'cash_movement'
};

export const QUEUE_STATUS = {
  PENDING: 'pending',
  SYNCING: 'syncing',
  FAILED: 'failed',
  COMPLETED: 'completed'
};

class OfflineQueue {
  async enqueue(action, payload) {
    const queueItem = {
      id: `queue-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      action,
      payload,
      idempotency_key: payload.idempotency_key || `idemp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      status: QUEUE_STATUS.PENDING,
      retries: 0,
      error_message: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await localDB.put('sync_queue', queueItem);
    await this.updatePendingCount();
    return queueItem;
  }

  async getPending() {
    const all = await localDB.getAll('sync_queue');
    return all.filter(item => item.status === QUEUE_STATUS.PENDING || item.status === QUEUE_STATUS.FAILED);
  }

  async markSyncing(id) {
    const item = await localDB.getById('sync_queue', id);
    if (item) {
      item.status = QUEUE_STATUS.SYNCING;
      item.updated_at = new Date().toISOString();
      await localDB.put('sync_queue', item);
    }
  }

  async markCompleted(id) {
    const item = await localDB.getById('sync_queue', id);
    if (item) {
      item.status = QUEUE_STATUS.COMPLETED;
      item.updated_at = new Date().toISOString();
      await localDB.put('sync_queue', item);
      await this.updatePendingCount();
    }
  }

  async markFailed(id, errorMessage) {
    const item = await localDB.getById('sync_queue', id);
    if (item) {
      item.status = QUEUE_STATUS.FAILED;
      item.retries = (item.retries || 0) + 1;
      item.error_message = errorMessage || 'Sync failed';
      item.updated_at = new Date().toISOString();
      await localDB.put('sync_queue', item);
      await this.updatePendingCount();
    }
  }

  async updatePendingCount() {
    const pending = await this.getPending();
    connectivityStore.setPendingCount(pending.length);
    return pending.length;
  }

  async clearCompleted() {
    const all = await localDB.getAll('sync_queue');
    for (const item of all) {
      if (item.status === QUEUE_STATUS.COMPLETED) {
        await localDB.delete('sync_queue', item.id);
      }
    }
  }
}

export const offlineQueue = new OfflineQueue();
