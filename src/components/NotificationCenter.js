/**
 * FlowPOS Notification Center Panel
 */

import { Modal } from './Modal.js';
import { productService } from '../services/products.js';
import { offlineQueue } from '../offline/queue.js';
import { registerService } from '../services/registers.js';
import { renderIcon } from '../utils/icons.js';

class NotificationCenterService {
  constructor() {
    this.init();
  }

  init() {
    window.addEventListener('flowpos:toggle-notifications', () => {
      this.open();
    });
  }

  async getNotifications() {
    const notifications = [];
    const products = await productService.getAllProducts();
    const lowStock = products.filter(p => Number(p.stock_quantity) <= (Number(p.reorder_level) || 5));

    if (lowStock.length > 0) {
      notifications.push({
        id: 'notif-low-stock',
        type: 'warning',
        icon: 'alert-triangle',
        title: `${lowStock.length} Products Low on Stock`,
        message: lowStock.slice(0, 3).map(p => `${p.name} (${p.stock_quantity} left)`).join(', ') + (lowStock.length > 3 ? '...' : ''),
        time: 'Active Alert'
      });
    }

    const pending = await offlineQueue.getPending();
    if (pending.length > 0) {
      notifications.push({
        id: 'notif-sync-queue',
        type: 'info',
        icon: 'refresh-cw',
        title: 'Offline Transactions Queued',
        message: `${pending.length} sale(s) waiting for cloud synchronization.`,
        time: 'Pending'
      });
    }

    const activeSession = registerService.getActiveSession();
    if (!activeSession) {
      notifications.push({
        id: 'notif-reg-closed',
        type: 'info',
        icon: 'calculator',
        title: 'Register Shift is Closed',
        message: 'Open a register session to track opening float and drawer sales.',
        time: 'Reminder'
      });
    }

    if (notifications.length === 0) {
      notifications.push({
        id: 'notif-all-good',
        type: 'success',
        icon: 'check',
        title: 'All Systems Operational',
        message: 'No active stock alerts or pending synchronizations.',
        time: 'Just now'
      });
    }

    return notifications;
  }

  async open() {
    const notifications = await this.getNotifications();

    const notifsHtml = notifications.map(n => {
      let iconBg = 'bg-indigo-500/15 text-indigo-500';
      if (n.type === 'warning') iconBg = 'bg-amber-500/15 text-amber-500';
      if (n.type === 'success') iconBg = 'bg-emerald-500/15 text-emerald-500';

      return `
        <div class="flex items-start space-x-3 p-3 rounded-xl bg-slate-100/60 dark:bg-slate-800/40 border border-slate-200/50 dark:border-white/5">
          <div class="p-2 rounded-lg ${iconBg} flex-shrink-0">
            ${renderIcon(n.icon, 'w-4 h-4')}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between">
              <h4 class="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">${n.title}</h4>
              <span class="text-[10px] text-slate-400 font-medium">${n.time}</span>
            </div>
            <p class="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-snug">${n.message}</p>
          </div>
        </div>
      `;
    }).join('');

    const modal = new Modal({
      title: 'Notifications & Alerts',
      size: 'md',
      content: `
        <div class="space-y-2.5">
          ${notifsHtml}
        </div>
      `
    });

    modal.open();
  }
}

export const notificationCenter = new NotificationCenterService();
