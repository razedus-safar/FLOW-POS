/**
 * FlowPOS Customer Profiles & Loyalty View - Apple iOS 26 High-Contrast Edition
 */

import { customerService } from '../services/customers.js';
import { ordersService } from '../services/orders.js';
import { DataTable } from '../components/DataTable.js';
import { Modal } from '../components/Modal.js';
import { toast } from '../components/Toast.js';
import { formatCurrency } from '../utils/currency.js';
import { formatDate } from '../utils/dates.js';
import { renderIcon } from '../utils/icons.js';
import { sanitizeHtml } from '../utils/security.js';

export class CustomersPage {
  constructor(container) {
    this.container = container;
    this.customers = [];
    this.init();
  }

  async init() {
    this.customers = await customerService.getAllCustomers();
    this.render();
    this.attachEvents();
  }

  render() {
    const columns = [
      {
        key: 'name',
        label: 'Customer',
        render: (val, row) => `
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-[#007AFF] to-[#AF52DE] flex items-center justify-center text-white text-xs font-black flex-shrink-0 shadow-xs">
              ${sanitizeHtml(String(val || '').charAt(0))}
            </div>
            <div>
              <p class="font-extrabold text-[var(--text)] text-xs">${sanitizeHtml(val)}</p>
              <p class="text-[10px] text-[var(--muted)] font-mono font-bold">${sanitizeHtml(row.phone || row.email || 'No contact')}</p>
            </div>
          </div>
        `
      },
      {
        key: 'tier',
        label: 'Tier Level',
        render: (val) => {
          let badgeClass = 'badge-bronze';
          if (val === 'Gold') badgeClass = 'badge-gold';
          if (val === 'Platinum') badgeClass = 'badge-platinum';
          if (val === 'Silver') badgeClass = 'badge-silver';
          return `<span class="badge ${badgeClass}">${val || 'Bronze'}</span>`;
        }
      },
      {
        key: 'loyalty_points',
        label: 'Loyalty Points',
        render: (val) => `<span class="font-mono font-black text-xs text-amber-600 dark:text-amber-400">${val || 0} pts</span>`
      },
      {
        key: 'order_count',
        label: 'Total Orders',
        render: (val) => `<span class="font-mono font-bold text-xs text-[var(--text)]">${val || 0} visits</span>`
      },
      {
        key: 'total_spend',
        label: 'Lifetime Spend',
        render: (val) => `<span class="font-mono font-black text-xs text-[var(--green)]">${formatCurrency(val)}</span>`
      },
      {
        key: 'actions',
        label: 'Details',
        sortable: false,
        render: (_, row) => `
          <button data-view-cust="${row.id}" class="px-3.5 py-1 rounded-[12px] text-xs font-black glass-btn-secondary hover:text-[var(--accent)] transition">
            View History
          </button>
        `
      }
    ];

    this.container.innerHTML = `
      <div class="h-full overflow-y-auto p-4 sm:p-6 space-y-5">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 class="text-xl sm:text-2xl font-black font-heading text-[var(--text)] tracking-tight">Customer Directory</h1>
            <p class="text-xs text-[var(--muted)] font-medium">Manage customer loyalty points, purchase analytics, and contact information.</p>
          </div>
          <button id="add-customer-btn" class="px-4 py-2.5 rounded-[14px] text-xs font-black glass-btn-primary flex items-center space-x-1.5 shadow-md self-start sm:self-auto">
            <span>+ New Customer</span>
          </button>
        </div>

        <!-- Table Container -->
        <div id="customers-table-container"></div>
      </div>
    `;

    const tableContainer = this.container.querySelector('#customers-table-container');
    new DataTable({
      columns,
      data: this.customers,
      pageSize: 10,
      searchPlaceholder: 'Search customers by name, email, or phone…'
    }).render(tableContainer);
  }

  attachEvents() {
    this.container.addEventListener('click', async (e) => {
      const viewBtn = e.target.closest('[data-view-cust]');
      if (viewBtn) {
        const id = viewBtn.getAttribute('data-view-cust');
        await this.showCustomerProfile(id);
      }
    });

    const addBtn = this.container.querySelector('#add-customer-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.openCustomerModal());
    }
  }

  async showCustomerProfile(customerId) {
    const cust = this.customers.find(c => c.id === customerId);
    if (!cust) return;

    const orders = await ordersService.getOrdersByCustomer(customerId);

    const ordersHtml = orders.length === 0
      ? `<p class="text-center text-xs text-[var(--muted)] py-6 font-semibold">No order history recorded for this customer yet.</p>`
      : orders.map(o => `
        <div class="flex items-center justify-between p-3 rounded-[14px] glass-card border border-[var(--line)]">
          <div>
            <p class="font-mono font-black text-xs text-[var(--text)]">${sanitizeHtml(o.order_number)}</p>
            <p class="text-[10px] text-[var(--muted)] font-medium">${formatDate(o.created_at)} &bull; ${o.items?.length || 0} items</p>
          </div>
          <div class="text-right">
            <p class="font-mono font-black text-xs text-[var(--green)]">${formatCurrency(o.total_amount)}</p>
            <span class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">${sanitizeHtml(o.payment_method)}</span>
          </div>
        </div>
      `).join('');

    const modalContent = `
      <div class="space-y-4">
        <!-- Customer Summary Header -->
        <div class="flex items-center space-x-3.5 p-4 rounded-[18px] glass-card border border-[var(--line)]">
          <div class="w-12 h-12 rounded-full bg-gradient-to-tr from-[#007AFF] to-[#AF52DE] flex items-center justify-center text-white text-lg font-black shadow-md flex-shrink-0">
            ${sanitizeHtml(String(cust.name || '').charAt(0))}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-black text-[var(--text)] truncate">${sanitizeHtml(cust.name)}</h3>
              <span class="px-2.5 py-0.8 rounded-full text-[9px] font-black uppercase bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25">${sanitizeHtml(cust.tier || 'Bronze')}</span>
            </div>
            <p class="text-[11px] text-[var(--muted)] font-medium">${sanitizeHtml(cust.email || 'No email')} &bull; ${sanitizeHtml(cust.phone || 'No phone')}</p>
          </div>
        </div>

        <!-- Metrics Grid -->
        <div class="grid grid-cols-3 gap-2.5">
          <div class="p-3 rounded-[16px] glass-card border border-[var(--line)] text-center">
            <p class="text-[10px] font-black text-[var(--muted)] uppercase tracking-wider">Total Spent</p>
            <p class="text-sm font-black font-mono text-[var(--green)] mt-0.5">${formatCurrency(cust.total_spend)}</p>
          </div>
          <div class="p-3 rounded-[16px] glass-card border border-[var(--line)] text-center">
            <p class="text-[10px] font-black text-[var(--muted)] uppercase tracking-wider">Visits</p>
            <p class="text-sm font-black font-mono text-[var(--text)] mt-0.5">${cust.order_count || 0}</p>
          </div>
          <div class="p-3 rounded-[16px] glass-card border border-[var(--line)] text-center">
            <p class="text-[10px] font-black text-[var(--muted)] uppercase tracking-wider">Points</p>
            <p class="text-sm font-black font-mono text-amber-600 dark:text-amber-400 mt-0.5">${cust.loyalty_points || 0}</p>
          </div>
        </div>

        <!-- Order History List -->
        <div class="space-y-2">
          <h4 class="text-xs font-black text-[var(--text)] uppercase tracking-wider">Recent Orders</h4>
          <div class="space-y-1.5 max-h-56 overflow-y-auto pr-1 scrollbar-none">
            ${ordersHtml}
          </div>
        </div>
      </div>
    `;

    new Modal({
      title: 'Customer Profile & History',
      size: 'md',
      content: modalContent
    }).open();
  }

  openCustomerModal() {
    const modalContent = `
      <form id="customer-form" class="space-y-4">
        <div>
          <label class="block text-xs font-black text-[var(--text)] mb-1">Full Name *</label>
          <input
            name="name"
            type="text"
            required
            placeholder="e.g. Jessica Williams"
            class="glass-input w-full p-2.5 rounded-[12px] text-xs font-semibold"
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-black text-[var(--text)] mb-1">Phone Number</label>
            <input
              name="phone"
              type="tel"
              placeholder="+1 (555) 000-0000"
              class="glass-input w-full p-2.5 rounded-[12px] text-xs font-mono font-bold"
            />
          </div>
          <div>
            <label class="block text-xs font-black text-[var(--text)] mb-1">Email Address</label>
            <input
              name="email"
              type="email"
              placeholder="jessica@example.com"
              class="glass-input w-full p-2.5 rounded-[12px] text-xs font-medium"
            />
          </div>
        </div>

        <div class="flex justify-end space-x-2 pt-3 border-t border-[var(--line)]">
          <button type="button" id="modal-cancel-btn" class="px-4 py-2 rounded-[12px] text-xs font-bold glass-btn-secondary">
            Cancel
          </button>
          <button type="submit" class="px-5 py-2 rounded-[12px] text-xs font-black glass-btn-primary shadow-md">
            Save Customer
          </button>
        </div>
      </form>
    `;

    const modal = new Modal({
      title: 'Add New Customer Profile',
      size: 'md',
      content: modalContent,
      onOpen: (modalEl) => {
        const form = modalEl.querySelector('#customer-form');
        const cancelBtn = modalEl.querySelector('#modal-cancel-btn');

        cancelBtn.addEventListener('click', () => modal.close());

        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const fd = new FormData(form);
          const data = {
            name: fd.get('name').trim(),
            phone: fd.get('phone').trim(),
            email: fd.get('email').trim(),
            tier: 'Bronze',
            loyalty_points: 0,
            total_spend: 0,
            order_count: 0
          };

          if (!data.name) {
            toast.error('Customer name is required.');
            return;
          }

          await customerService.addCustomer(data);
          toast.success('Customer profile created!');
          modal.close();
          this.init();
        });
      }
    });

    modal.open();
  }
}
