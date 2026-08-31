/**
 * FlowPOS Orders History & Returns View - Apple iOS 26 High-Contrast Edition
 */

import { ordersService } from '../services/orders.js';
import { sessionManager } from '../store/session.js';
import { auditService } from '../services/audit.js';
import { DataTable } from '../components/DataTable.js';
import { Modal } from '../components/Modal.js';
import { toast } from '../components/Toast.js';
import { showReceiptModal } from '../components/ReceiptModal.js';
import { formatCurrency } from '../utils/currency.js';
import { formatDate } from '../utils/dates.js';
import { renderIcon } from '../utils/icons.js';

export class OrdersPage {
  constructor(container) {
    this.container = container;
    this.orders = [];
    this.init();
  }

  async init() {
    this.orders = await ordersService.getAllOrders();
    this.render();
    this.attachEvents();
  }

  render() {
    const columns = [
      {
        key: 'order_number',
        label: 'Order #',
        render: (val, row) => `
          <div>
            <p class="font-mono font-black text-[var(--text)] text-xs">${val}</p>
            <p class="text-[10px] text-[var(--muted)] font-mono font-bold">${formatDate(row.created_at, 'datetime')}</p>
          </div>
        `
      },
      {
        key: 'customer_name',
        label: 'Customer',
        render: (val) => `<span class="text-xs font-black text-[var(--text)]">${val || 'Guest Customer'}</span>`
      },
      {
        key: 'cashier_name',
        label: 'Cashier',
        render: (val) => `<span class="text-xs font-bold text-[var(--muted)]">${val || 'Staff'}</span>`
      },
      {
        key: 'payment_status',
        label: 'Status',
        render: (val) => {
          let badgeClass = 'badge-emerald';
          if (val === 'refunded') badgeClass = 'badge-danger';
          if (val === 'partially_refunded') badgeClass = 'badge-amber';
          return `<span class="badge ${badgeClass}">${val.replace('_', ' ')}</span>`;
        }
      },
      {
        key: 'payments',
        label: 'Payment Tender',
        sortable: false,
        render: (val) => {
          const methods = (val || []).map(p => p.payment_method).join(' + ');
          return `<span class="capitalize text-xs font-mono font-bold text-[var(--text)]">${methods || 'Card'}</span>`;
        }
      },
      {
        key: 'total_amount',
        label: 'Total Paid',
        render: (val) => `<span class="font-mono font-black text-xs text-[var(--accent)]">${formatCurrency(val)}</span>`
      },
      {
        key: 'actions',
        label: 'Actions',
        sortable: false,
        render: (_, row) => `
          <div class="flex items-center space-x-1.5">
            <button data-view-order="${row.id}" class="p-2 rounded-[10px] text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 transition" title="View Receipt">
              ${renderIcon('receipt', 'w-4 h-4')}
            </button>
            ${row.payment_status !== 'refunded' ? `
              <button data-refund-order="${row.id}" class="p-2 rounded-[10px] text-[var(--muted)] hover:text-[var(--red)] hover:bg-red-500/10 transition" title="Process Refund">
                ${renderIcon('rotate-ccw', 'w-4 h-4')}
              </button>
            ` : ''}
          </div>
        `
      }
    ];

    this.container.innerHTML = `
      <div class="h-full overflow-y-auto p-4 sm:p-6 space-y-5">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 class="text-xl sm:text-2xl font-black font-heading text-[var(--text)] tracking-tight">Sales & Orders History</h1>
            <p class="text-xs text-[var(--muted)] font-medium">View receipts, reprint tickets, and issue authorized customer returns.</p>
          </div>
          <a href="#/pos" class="px-4 py-2.5 rounded-[14px] text-xs font-black glass-btn-primary flex items-center space-x-1.5 shadow-md self-start sm:self-auto">
            ${renderIcon('shopping-cart', 'w-4 h-4')}
            <span>+ New Sale</span>
          </a>
        </div>

        <div id="orders-table-container"></div>
      </div>
    `;

    const tableContainer = this.container.querySelector('#orders-table-container');
    new DataTable({
      columns,
      data: this.orders,
      searchPlaceholder: 'Search orders by #, customer, or cashier…'
    }).render(tableContainer);
  }

  attachEvents() {
    this.container.addEventListener('click', async (e) => {
      const viewBtn = e.target.closest('[data-view-order]');
      if (viewBtn) {
        const id = viewBtn.getAttribute('data-view-order');
        const order = this.orders.find(o => o.id === id);
        if (order) {
          showReceiptModal(order);
        }
        return;
      }

      const refundBtn = e.target.closest('[data-refund-order]');
      if (refundBtn) {
        const id = refundBtn.getAttribute('data-refund-order');
        this.openRefundModal(id);
        return;
      }
    });
  }

  openRefundModal(orderId) {
    const order = this.orders.find(o => o.id === orderId);
    if (!order) return;

    const modalContent = `
      <form id="refund-form" class="space-y-4">
        <div class="p-3.5 rounded-[16px] border border-[var(--line)] glass-card">
          <div class="flex items-center justify-between">
            <span class="font-mono font-black text-xs text-[var(--text)]">${order.order_number}</span>
            <span class="font-mono font-black text-sm text-[var(--accent)]">${formatCurrency(order.total_amount)}</span>
          </div>
          <p class="text-[10px] text-[var(--muted)] font-bold mt-1">Customer: ${order.customer_name || 'Guest'} &bull; ${order.items.length} items</p>
        </div>

        <div>
          <label class="block text-xs font-black text-[var(--text)] mb-1">Refund Reason *</label>
          <select name="refund_reason" class="glass-input w-full p-2.5 rounded-[12px] text-xs font-bold" required>
            <option value="Customer Return">Customer Return</option>
            <option value="Defective / Damaged Item">Defective / Damaged Item</option>
            <option value="Wrong Item Ordered">Wrong Item Ordered</option>
            <option value="Cashier Ring-up Error">Cashier Ring-up Error</option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-black text-[var(--text)] mb-1">Restock Items into Inventory?</label>
          <div class="flex items-center space-x-2 pt-1">
            <input type="checkbox" name="restock" id="restock-check" checked class="rounded-[6px] w-4 h-4 text-[var(--accent)] focus:ring-[var(--accent)]" />
            <label for="restock-check" class="text-xs font-bold text-[var(--text)]">Automatically return items back to active stock</label>
          </div>
        </div>

        <div class="flex justify-end space-x-2 pt-3 border-t border-[var(--line)]">
          <button type="button" id="refund-cancel-btn" class="px-4 py-2 rounded-[12px] text-xs font-bold glass-btn-secondary">
            Cancel
          </button>
          <button type="submit" class="px-5 py-2 rounded-[12px] text-xs font-black glass-btn-primary shadow-md">
            Execute Full Refund
          </button>
        </div>
      </form>
    `;

    const modal = new Modal({
      title: `Process Refund: ${order.order_number}`,
      size: 'md',
      content: modalContent,
      onOpen: (modalEl) => {
        const form = modalEl.querySelector('#refund-form');
        const cancelBtn = modalEl.querySelector('#refund-cancel-btn');

        cancelBtn.addEventListener('click', () => modal.close());

        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const fd = new FormData(form);
          const reason = fd.get('refund_reason');
          const restock = fd.get('restock') === 'on';

          await ordersService.refundOrder(orderId, order.items, reason, restock);
          toast.success(`Order ${order.order_number} refunded successfully!`);
          modal.close();
          this.init();
        });
      }
    });

    modal.open();
  }
}
