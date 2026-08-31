/**
 * FlowPOS Purchase Orders & Vendor Receiving View - Apple iOS 26 High-Contrast Edition
 */

import { purchasingService, PO_STATUS } from '../services/purchasing.js';
import { supplierService } from '../services/suppliers.js';
import { productService } from '../services/products.js';
import { DataTable } from '../components/DataTable.js';
import { Modal } from '../components/Modal.js';
import { toast } from '../components/Toast.js';
import { formatCurrency } from '../utils/currency.js';
import { formatDate } from '../utils/dates.js';
import { renderIcon } from '../utils/icons.js';

export class PurchaseOrdersPage {
  constructor(container) {
    this.container = container;
    this.pos = [];
    this.suppliers = [];
    this.products = [];
    this.init();
  }

  async init() {
    [this.pos, this.suppliers, this.products] = await Promise.all([
      purchasingService.getAllPOs(),
      supplierService.getAllSuppliers(),
      productService.getAllProducts()
    ]);
    this.render();
    this.attachEvents();
  }

  render() {
    const columns = [
      {
        key: 'po_number',
        label: 'PO Number',
        render: (val, row) => `
          <div>
            <p class="font-black font-mono text-[var(--text)] text-xs">${val}</p>
            <p class="text-[10px] text-[var(--muted)] font-bold">${row.supplier_name || 'Vendor'}</p>
          </div>
        `
      },
      {
        key: 'status',
        label: 'Status',
        render: (val) => {
          let badgeClass = 'badge-bronze';
          if (val === PO_STATUS.RECEIVED) badgeClass = 'badge-emerald';
          if (val === PO_STATUS.ORDERED) badgeClass = 'badge-blue';
          if (val === PO_STATUS.PARTIALLY_RECEIVED) badgeClass = 'badge-amber';
          return `<span class="badge ${badgeClass}">${val}</span>`;
        }
      },
      {
        key: 'items',
        label: 'Items Ordered',
        sortable: false,
        render: (val) => `<span class="text-xs font-bold text-[var(--text)]">${(val || []).length} item(s)</span>`
      },
      {
        key: 'total_cost',
        label: 'Total PO Cost',
        render: (val) => `<span class="font-mono font-black text-xs text-[var(--text)]">${formatCurrency(val)}</span>`
      },
      {
        key: 'created_at',
        label: 'Date Created',
        render: (val) => `<span class="font-mono text-xs text-[var(--muted)] font-bold">${formatDate(val, 'short')}</span>`
      },
      {
        key: 'actions',
        label: 'Actions',
        sortable: false,
        render: (_, row) => `
          <div class="flex items-center space-x-2">
            ${row.status !== PO_STATUS.RECEIVED ? `
              <button data-receive-po="${row.id}" class="px-3.5 py-1 rounded-[12px] text-xs font-black glass-btn-primary flex items-center space-x-1 shadow-sm">
                ${renderIcon('check', 'w-3.5 h-3.5')}
                <span>Receive</span>
              </button>
            ` : `
              <span class="text-xs font-black text-[var(--green)] flex items-center space-x-1">
                ${renderIcon('check-circle', 'w-3.5 h-3.5')}
                <span>Fulfilled</span>
              </span>
            `}
          </div>
        `
      }
    ];

    this.container.innerHTML = `
      <div class="h-full overflow-y-auto p-4 sm:p-6 space-y-5">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 class="text-xl sm:text-2xl font-black font-heading text-[var(--text)] tracking-tight">Purchase Orders</h1>
            <p class="text-xs text-[var(--muted)] font-medium">Create vendor replenishment orders and receive inventory.</p>
          </div>
          <button id="create-po-btn" class="px-4 py-2.5 rounded-[14px] text-xs font-black glass-btn-primary flex items-center space-x-1.5 shadow-md self-start sm:self-auto">
            ${renderIcon('plus', 'w-4 h-4')}
            <span>+ New Purchase Order</span>
          </button>
        </div>

        <div id="po-table-container"></div>
      </div>
    `;

    const tableContainer = this.container.querySelector('#po-table-container');
    new DataTable({
      columns,
      data: this.pos,
      searchPlaceholder: 'Search purchase orders…'
    }).render(tableContainer);
  }

  attachEvents() {
    this.container.addEventListener('click', async (e) => {
      const recBtn = e.target.closest('[data-receive-po]');
      if (recBtn) {
        const id = recBtn.getAttribute('data-receive-po');
        await this.handleReceivePO(id);
      }
    });

    const createBtn = this.container.querySelector('#create-po-btn');
    if (createBtn) {
      createBtn.addEventListener('click', () => this.openCreatePOModal());
    }
  }

  async handleReceivePO(poId) {
    const po = this.pos.find(p => p.id === poId);
    if (!po) return;

    const modalContent = `
      <div class="space-y-4">
        <p class="text-xs text-[var(--text)] font-semibold">Confirm receiving all ordered items into live store inventory for <strong class="font-mono font-black">${po.po_number}</strong>?</p>
        
        <div class="space-y-2 max-h-56 overflow-y-auto border border-[var(--line)] rounded-[16px] p-3 glass-card">
          ${po.items.map(item => `
            <div class="flex items-center justify-between text-xs py-1 border-b border-[var(--line)] last:border-none">
              <div>
                <p class="font-extrabold text-[var(--text)]">${item.product_name}</p>
                <p class="text-[10px] text-[var(--muted)] font-mono">Ordered: ${item.quantity_ordered} units</p>
              </div>
              <span class="font-mono font-black text-[var(--text)]">${formatCurrency(item.unit_cost * item.quantity_ordered)}</span>
            </div>
          `).join('')}
        </div>

        <div class="flex justify-end space-x-2 pt-2 border-t border-[var(--line)]">
          <button type="button" id="cancel-rec-btn" class="px-4 py-2 rounded-[12px] text-xs font-bold glass-btn-secondary">
            Cancel
          </button>
          <button type="button" id="confirm-rec-btn" class="px-5 py-2 rounded-[12px] text-xs font-black glass-btn-primary shadow-md">
            Confirm & Restock
          </button>
        </div>
      </div>
    `;

    const modal = new Modal({
      title: `Receive Inventory: ${po.po_number}`,
      size: 'md',
      content: modalContent,
      onOpen: (modalEl) => {
        const cancelBtn = modalEl.querySelector('#cancel-rec-btn');
        const confirmBtn = modalEl.querySelector('#confirm-rec-btn');

        if (cancelBtn) {
          cancelBtn.addEventListener('click', () => modal.close());
        }

        if (confirmBtn) {
          confirmBtn.addEventListener('click', async () => {
            try {
              confirmBtn.disabled = true;
              confirmBtn.textContent = 'Restocking…';
              await purchasingService.receivePO(poId);
              toast.success(`Purchase order ${po.po_number} received! Stock levels updated.`);
              modal.close();
              await this.init();
            } catch (err) {
              console.error('Receive PO error:', err);
              toast.error(err.message || 'Failed to receive purchase order');
              confirmBtn.disabled = false;
              confirmBtn.textContent = 'Confirm & Restock';
            }
          });
        }
      }
    });

    modal.open();
  }

  openCreatePOModal() {
    let orderItems = [];

    const supOptions = this.suppliers.map(s => `
      <option value="${s.id}">${s.name}</option>
    `).join('');

    const prodOptions = this.products.map(p => `
      <option value="${p.id}">${p.name} (Cost: $${p.cost_price})</option>
    `).join('');

    const modalContent = `
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-black text-[var(--text)] mb-1">Select Supplier *</label>
          <select id="po-supplier-select" class="glass-input w-full p-2.5 rounded-[12px] text-xs font-bold">
            ${supOptions}
          </select>
        </div>

        <!-- Add Item Row -->
        <div class="p-3 rounded-[16px] border border-[var(--line)] glass-card space-y-3">
          <h4 class="text-xs font-black text-[var(--text)]">Add Line Items</h4>
          <div class="grid grid-cols-12 gap-2">
            <div class="col-span-6">
              <select id="po-add-prod-select" class="glass-input w-full p-2 rounded-[10px] text-xs font-semibold">
                ${prodOptions}
              </select>
            </div>
            <div class="col-span-3">
              <input id="po-add-qty" type="number" min="1" value="10" placeholder="Qty" class="glass-input w-full p-2 rounded-[10px] text-xs font-mono font-bold" />
            </div>
            <div class="col-span-3">
              <button id="po-add-item-btn" type="button" class="w-full py-2 rounded-[10px] text-xs font-black glass-btn-secondary text-[var(--accent)] hover:text-white hover:bg-[var(--accent)] transition">
                + Add Item
              </button>
            </div>
          </div>
        </div>

        <!-- Items Table -->
        <div class="space-y-2">
          <div class="flex items-center justify-between text-xs font-black text-[var(--muted)] px-1">
            <span>Ordered Items</span>
            <span id="po-total-display" class="font-mono text-[var(--text)] text-sm font-black">$0.00 Total</span>
          </div>
          <div id="po-items-list" class="max-h-44 overflow-y-auto space-y-1.5 border border-[var(--line)] rounded-[14px] p-2.5 glass-card scrollbar-none">
            <p class="text-xs text-[var(--muted)] text-center py-4 font-semibold">No items added to this PO yet.</p>
          </div>
        </div>

        <div class="flex justify-end space-x-2 pt-3 border-t border-[var(--line)]">
          <button type="button" id="po-cancel-btn" class="px-4 py-2 rounded-[12px] text-xs font-bold glass-btn-secondary">
            Cancel
          </button>
          <button type="button" id="po-submit-btn" class="px-5 py-2 rounded-[12px] text-xs font-black glass-btn-primary shadow-md">
            Issue Purchase Order
          </button>
        </div>
      </div>
    `;

    const modal = new Modal({
      title: 'Create New Vendor Purchase Order',
      size: 'lg',
      content: modalContent,
      onOpen: (modalEl) => {
        const supSelect = modalEl.querySelector('#po-supplier-select');
        const prodSelect = modalEl.querySelector('#po-add-prod-select');
        const qtyInput = modalEl.querySelector('#po-add-qty');
        const addBtn = modalEl.querySelector('#po-add-item-btn');
        const itemsList = modalEl.querySelector('#po-items-list');
        const totalDisplay = modalEl.querySelector('#po-total-display');
        const cancelBtn = modalEl.querySelector('#po-cancel-btn');
        const submitBtn = modalEl.querySelector('#po-submit-btn');

        cancelBtn.addEventListener('click', () => modal.close());

        const renderItems = () => {
          if (orderItems.length === 0) {
            itemsList.innerHTML = `<p class="text-xs text-[var(--muted)] text-center py-4 font-semibold">No items added to this PO yet.</p>`;
            totalDisplay.textContent = '$0.00 Total';
            return;
          }

          const total = orderItems.reduce((s, i) => s + (i.unit_cost * i.quantity_ordered), 0);
          totalDisplay.textContent = `${formatCurrency(total)} Total`;

          itemsList.innerHTML = orderItems.map((item, idx) => `
            <div class="flex items-center justify-between p-2 rounded-[10px] bg-white/60 dark:bg-white/[0.05] text-xs border border-[var(--line)]">
              <div>
                <p class="font-extrabold text-[var(--text)]">${item.product_name}</p>
                <p class="text-[10px] text-[var(--muted)] font-mono">${item.quantity_ordered} units @ $${item.unit_cost}</p>
              </div>
              <div class="flex items-center space-x-2">
                <span class="font-mono font-black text-[var(--text)]">${formatCurrency(item.unit_cost * item.quantity_ordered)}</span>
                <button data-remove-item="${idx}" class="text-[var(--red)] hover:bg-red-500/10 p-1 rounded-md transition font-black">
                  ${renderIcon('x', 'w-3.5 h-3.5')}
                </button>
              </div>
            </div>
          `).join('');

          itemsList.querySelectorAll('[data-remove-item]').forEach(btn => {
            btn.addEventListener('click', () => {
              const idx = Number(btn.getAttribute('data-remove-item'));
              orderItems.splice(idx, 1);
              renderItems();
            });
          });
        };

        addBtn.addEventListener('click', () => {
          const prodId = prodSelect.value;
          const prod = this.products.find(p => p.id === prodId);
          const qty = Number(qtyInput.value) || 1;

          if (!prod) return;

          const existing = orderItems.find(i => i.product_id === prodId);
          if (existing) {
            existing.quantity_ordered += qty;
          } else {
            orderItems.push({
              product_id: prod.id,
              product_name: prod.name,
              quantity_ordered: qty,
              unit_cost: prod.cost_price || 5.00
            });
          }

          renderItems();
        });

        submitBtn.addEventListener('click', async () => {
          if (orderItems.length === 0) {
            toast.error('Please add at least one line item to the PO.');
            return;
          }

          const supId = supSelect.value;
          const sup = this.suppliers.find(s => s.id === supId);

          const totalCost = orderItems.reduce((s, i) => s + (i.unit_cost * i.quantity_ordered), 0);

          await purchasingService.createPO({
            supplier_id: supId,
            supplier_name: sup?.name || 'Vendor',
            items: orderItems,
            total_cost: totalCost
          });

          toast.success('Purchase Order created successfully!');
          modal.close();
          this.init();
        });
      }
    });

    modal.open();
  }
}
