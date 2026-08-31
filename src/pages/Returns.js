/**
 * FlowPOS Dedicated Returns & Exchanges Desk View
 */

import { ordersService } from '../services/orders.js';
import { formatCurrency } from '../utils/currency.js';
import { formatDate } from '../utils/dates.js';
import { renderIcon } from '../utils/icons.js';
import { toast } from '../components/Toast.js';

export class ReturnsPage {
  constructor(container) {
    this.container = container;
    this.searchQuery = '';
    this.searchedOrder = null;
    this.init();
  }

  async init() {
    this.render();
    this.attachEvents();
  }

  render() {
    this.container.innerHTML = `
      <div class="h-full overflow-y-auto p-6 space-y-6 max-w-4xl mx-auto">
        <!-- Header -->
        <div>
          <h1 class="text-2xl font-bold font-heading text-slate-900 dark:text-white tracking-tight">Returns & Exchange Desk</h1>
          <p class="text-xs text-slate-500">Scan customer receipt barcode or search by order number to initiate returns.</p>
        </div>

        <!-- Search Bar -->
        <div class="glass-panel p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 flex items-center gap-3">
          <div class="relative flex-1">
            <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
              ${renderIcon('search', 'w-4 h-4')}
            </span>
            <input
              id="return-search-input"
              type="text"
              class="glass-input w-full pl-9 pr-4 py-2.5 rounded-xl text-xs font-mono font-medium"
              placeholder="Enter or scan Order # (e.g. ORD-20260829-1001)..."
              value="${this.searchQuery}"
            />
          </div>
          <button id="find-order-btn" class="px-4 py-2.5 rounded-xl text-xs font-bold glass-btn-primary flex items-center space-x-1.5">
            ${renderIcon('search', 'w-4 h-4')}
            <span>Find Receipt</span>
          </button>
        </div>

        <!-- Order Result Area -->
        <div id="return-order-details-area">
          ${this.searchedOrder ? this.renderOrderDetails(this.searchedOrder) : `
            <div class="py-16 text-center text-slate-400 glass-card rounded-2xl p-8 border border-slate-200/60 dark:border-white/5">
              <div class="w-14 h-14 rounded-2xl bg-slate-200/50 dark:bg-slate-800/50 flex items-center justify-center mx-auto mb-3">
                ${renderIcon('rotate-ccw', 'w-7 h-7 text-slate-400')}
              </div>
              <h3 class="text-sm font-bold text-slate-700 dark:text-slate-200">No Receipt Selected</h3>
              <p class="text-xs text-slate-400 mt-1 max-w-sm mx-auto">Enter an order number from the customer receipt above to review line items and process return.</p>
            </div>
          `}
        </div>
      </div>
    `;
  }

  renderOrderDetails(order) {
    const itemsHtml = order.items.map(item => `
      <div class="flex items-center justify-between p-3 rounded-xl bg-slate-100/60 dark:bg-slate-800/40 border border-slate-200/50 dark:border-white/5 text-xs">
        <div>
          <p class="font-bold text-slate-900 dark:text-white">${item.product_name}</p>
          <p class="text-[11px] text-slate-400 font-mono">${item.quantity} purchased &bull; ${formatCurrency(item.unit_price)} each</p>
        </div>
        <div class="flex items-center space-x-3">
          <label class="flex items-center space-x-1 text-slate-500 cursor-pointer text-[11px]">
            <input type="checkbox" data-desk-restock="${item.product_id}" checked class="rounded text-indigo-600" />
            <span>Restock Inventory</span>
          </label>
          <div class="flex items-center space-x-1">
            <span class="text-slate-400 text-[11px]">Return Qty:</span>
            <input
              type="number"
              data-desk-qty="${item.product_id}"
              min="0"
              max="${item.quantity}"
              value="${item.quantity}"
              class="glass-input w-16 p-1.5 rounded-lg text-xs font-mono font-bold text-center"
            />
          </div>
        </div>
      </div>
    `).join('');

    return `
      <div class="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 space-y-4">
        <!-- Order Header -->
        <div class="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-white/10">
          <div>
            <div class="flex items-center space-x-2">
              <span class="font-mono font-black text-sm text-[var(--text)]">${order.order_number}</span>
              <span class="badge ${order.payment_status === 'paid' ? 'badge-emerald' : 'badge-danger'}">${order.payment_status}</span>
            </div>
            <p class="text-[11px] text-slate-400 mt-0.5">Purchased on ${formatDate(order.created_at, 'datetime')} &bull; Cashier: ${order.cashier_name || 'Staff'}</p>
          </div>
          <div class="text-right">
            <span class="text-xs text-slate-400">Total Charged</span>
            <p class="text-base font-extrabold font-heading text-slate-900 dark:text-white">${formatCurrency(order.total_amount)}</p>
          </div>
        </div>

        <!-- Items Table -->
        <div class="space-y-2">
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300">Order Line Items</label>
          ${itemsHtml}
        </div>

        <!-- Refund controls -->
        <div class="grid grid-cols-2 gap-3 pt-2">
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Refund Method</label>
            <select id="desk-refund-method" class="glass-input w-full p-2 rounded-xl text-xs">
              <option value="cash">Cash Tender Payout</option>
              <option value="card">Original Card Reversal</option>
              <option value="store_credit">Store Credit Voucher</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Return Reason</label>
            <select id="desk-refund-reason" class="glass-input w-full p-2 rounded-xl text-xs">
              <option value="Customer Return">Customer Return</option>
              <option value="Defective Merchandise">Defective Merchandise</option>
              <option value="Wrong Item">Wrong Item</option>
            </select>
          </div>
        </div>

        <div class="pt-3 border-t border-slate-200/60 dark:border-white/10 flex justify-end">
          <button id="desk-submit-refund-btn" class="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/30 transition">
            Process Return & Issue Refund
          </button>
        </div>
      </div>
    `;
  }

  attachEvents() {
    const searchInput = this.container.querySelector('#return-search-input');
    const findBtn = this.container.querySelector('#find-order-btn');

    const handleSearch = async () => {
      const q = searchInput?.value.trim().toLowerCase();
      if (!q) {
        toast.warning('Enter an order number.');
        return;
      }

      const allOrders = await ordersService.getAllOrders();
      const match = allOrders.find(o => o.order_number.toLowerCase().includes(q));

      if (match) {
        this.searchedOrder = match;
        this.render();
        this.attachEvents();
        this.attachRefundHandlers();
      } else {
        toast.error(`Order "${q}" not found.`);
      }
    };

    if (findBtn) findBtn.addEventListener('click', handleSearch);
    if (searchInput) {
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleSearch();
      });
    }

    this.attachRefundHandlers();
  }

  attachRefundHandlers() {
    const submitBtn = this.container.querySelector('#desk-submit-refund-btn');
    if (!submitBtn || !this.searchedOrder) return;

    submitBtn.addEventListener('click', async () => {
      const itemsToRefund = [];
      this.container.querySelectorAll('[data-desk-qty]').forEach(inp => {
        const prodId = inp.getAttribute('data-desk-qty');
        const qty = Number(inp.value) || 0;
        const restock = this.container.querySelector(`[data-desk-restock="${prodId}"]`)?.checked !== false;

        if (qty > 0) {
          itemsToRefund.push({
            product_id: prodId,
            quantity: qty,
            restock
          });
        }
      });

      if (itemsToRefund.length === 0) {
        toast.warning('Select at least 1 item quantity to return.');
        return;
      }

      const refundMethod = this.container.querySelector('#desk-refund-method').value;
      const reason = this.container.querySelector('#desk-refund-reason').value;

      submitBtn.disabled = true;
      submitBtn.textContent = 'Processing refund...';

      const res = await ordersService.processRefund({
        orderId: this.searchedOrder.id,
        itemsToRefund,
        refundMethod,
        reason
      });

      toast.success(`Refund of ${formatCurrency(res.refundAmount)} processed successfully.`);
      this.searchedOrder = null;
      this.render();
      this.attachEvents();
    });
  }
}
