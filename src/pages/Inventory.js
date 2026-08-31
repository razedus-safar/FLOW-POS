/**
 * FlowPOS Inventory Management & Stock Movement Ledger View - Apple iOS 26 High-Contrast Edition
 */

import { inventoryService } from '../services/inventory.js';
import { productService } from '../services/products.js';
import { DataTable } from '../components/DataTable.js';
import { Modal } from '../components/Modal.js';
import { toast } from '../components/Toast.js';
import { formatCurrency } from '../utils/currency.js';
import { formatDate } from '../utils/dates.js';
import { renderIcon } from '../utils/icons.js';

export class InventoryPage {
  constructor(container) {
    this.container = container;
    this.activeTab = 'stock'; // 'stock' | 'movements'
    this.summary = null;
    this.products = [];
    this.movements = [];
    this.init();
  }

  async init() {
    [this.summary, this.products, this.movements] = await Promise.all([
      inventoryService.getInventorySummary(),
      productService.getAllProducts(),
      inventoryService.getMovements()
    ]);
    this.render();
    this.attachEvents();
  }

  render() {
    const stockColumns = [
      {
        key: 'name',
        label: 'Product Title',
        render: (val, row) => `
          <div>
            <p class="font-extrabold text-[var(--text)] text-xs">${val}</p>
            <p class="text-[10px] text-[var(--muted)] font-mono font-bold">${row.sku}</p>
          </div>
        `
      },
      {
        key: 'stock_quantity',
        label: 'Stock Quantity',
        render: (val, row) => {
          const reorder = Number(row.reorder_level) || 5;
          if (val <= 0) return `<span class="badge badge-danger">Out of Stock (0)</span>`;
          if (val <= reorder) return `<span class="badge badge-amber">Low Stock (${val})</span>`;
          return `<span class="badge badge-emerald">${val} units</span>`;
        }
      },
      {
        key: 'reorder_level',
        label: 'Reorder Level',
        render: (val) => `<span class="font-mono text-xs text-[var(--muted)] font-bold">${val || 5}</span>`
      },
      {
        key: 'cost_price',
        label: 'Unit Cost',
        render: (val) => `<span class="font-mono text-xs text-[var(--muted)] font-bold">${formatCurrency(val)}</span>`
      },
      {
        key: 'total_valuation',
        label: 'Stock Valuation (Cost)',
        sortable: false,
        render: (_, row) => `<span class="font-mono font-black text-xs text-[var(--text)]">${formatCurrency((row.stock_quantity || 0) * (row.cost_price || 0))}</span>`
      },
      {
        key: 'actions',
        label: 'Adjust',
        sortable: false,
        render: (_, row) => `
          <button data-adjust-stock="${row.id}" class="px-3.5 py-1 rounded-[12px] text-xs font-black glass-btn-secondary hover:text-[var(--accent)] transition">
            Adjust Stock
          </button>
        `
      }
    ];

    const movementColumns = [
      {
        key: 'created_at',
        label: 'Timestamp',
        render: (val) => `<span class="font-mono text-xs text-[var(--muted)] font-bold">${formatDate(val, 'datetime')}</span>`
      },
      {
        key: 'product_id',
        label: 'Product',
        render: (val) => {
          const prod = this.products.find(p => p.id === val);
          return `<span class="font-extrabold text-xs text-[var(--text)]">${prod ? prod.name : 'Unknown Item'}</span>`;
        }
      },
      {
        key: 'type',
        label: 'Movement Type',
        render: (val) => {
          let badgeClass = 'badge-bronze';
          if (val === 'sale') badgeClass = 'badge-danger';
          if (val === 'purchase' || val === 'adjustment_add') badgeClass = 'badge-emerald';
          if (val === 'return') badgeClass = 'badge-blue';
          return `<span class="badge ${badgeClass}">${val.replace('_', ' ')}</span>`;
        }
      },
      {
        key: 'quantity_change',
        label: 'Qty Delta',
        render: (val) => {
          const isPos = val > 0;
          return `<span class="font-mono font-black text-xs ${isPos ? 'text-[var(--green)]' : 'text-[var(--red)]'}">${isPos ? '+' : ''}${val}</span>`;
        }
      },
      {
        key: 'reason',
        label: 'Reason / Note',
        render: (val) => `<span class="text-xs text-[var(--muted)] font-semibold">${val || 'Routine update'}</span>`
      }
    ];

    this.container.innerHTML = `
      <div class="h-full overflow-y-auto p-4 sm:p-6 space-y-5">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 class="text-xl sm:text-2xl font-black font-heading text-[var(--text)] tracking-tight">Inventory & Stock Ledger</h1>
            <p class="text-xs text-[var(--muted)] font-medium">Track stock adjustments, inventory valuation, and audit movements.</p>
          </div>
          <div class="flex rounded-[14px] p-0.8 glass border border-[var(--line)] self-start sm:self-auto">
            <button id="tab-stock" class="px-4 py-1.5 rounded-[10px] text-xs font-black transition ${this.activeTab === 'stock' ? 'bg-[var(--accent)] text-white shadow-xs' : 'text-[var(--muted)] hover:text-[var(--text)]'}">
              Current Stock
            </button>
            <button id="tab-movements" class="px-4 py-1.5 rounded-[10px] text-xs font-black transition ${this.activeTab === 'movements' ? 'bg-[var(--accent)] text-white shadow-xs' : 'text-[var(--muted)] hover:text-[var(--text)]'}">
              Movement History
            </button>
          </div>
        </div>

        <!-- Inventory Metrics -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div class="p-4 rounded-[20px] glass-card border border-[var(--line)] space-y-1 shadow-xs">
            <span class="text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">Total Stock On Hand</span>
            <h3 class="text-xl font-black font-heading text-[var(--text)]">${this.summary?.totalUnits || 0} units</h3>
            <p class="text-[10px] text-[var(--muted)] font-bold">${this.products.length} catalog products</p>
          </div>
          <div class="p-4 rounded-[20px] glass-card border border-[var(--line)] space-y-1 shadow-xs">
            <span class="text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">Inventory Cost Value</span>
            <h3 class="text-xl font-black font-mono text-[var(--text)]">${formatCurrency(this.summary?.costValuation || 0)}</h3>
            <p class="text-[10px] text-[var(--muted)] font-bold">Asset cost basis</p>
          </div>
          <div class="p-4 rounded-[20px] glass-card border border-[var(--line)] space-y-1 shadow-xs">
            <span class="text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">Retail Potential Value</span>
            <h3 class="text-xl font-black font-mono text-[var(--text)]">${formatCurrency(this.summary?.retailValuation || 0)}</h3>
            <p class="text-[10px] text-[var(--green)] font-bold">Projected profit: ${formatCurrency((this.summary?.retailValuation || 0) - (this.summary?.costValuation || 0))}</p>
          </div>
          <div class="p-4 rounded-[20px] glass-card border border-[var(--line)] space-y-1 shadow-xs">
            <span class="text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">Reorder Alerts</span>
            <h3 class="text-xl font-black font-heading ${this.summary?.lowStockCount > 0 ? 'text-[var(--orange)]' : 'text-[var(--green)]'}">${this.summary?.lowStockCount || 0} items</h3>
            <p class="text-[10px] text-[var(--muted)] font-bold">${this.summary?.outOfStockCount || 0} out of stock</p>
          </div>
        </div>

        <!-- Table Container -->
        <div id="inventory-table-container"></div>
      </div>
    `;

    const tableContainer = this.container.querySelector('#inventory-table-container');
    if (this.activeTab === 'stock') {
      new DataTable({
        columns: stockColumns,
        data: this.products,
        searchPlaceholder: 'Search stock levels by title or SKU…'
      }).render(tableContainer);
    } else {
      new DataTable({
        columns: movementColumns,
        data: this.movements,
        searchPlaceholder: 'Search audit movements…'
      }).render(tableContainer);
    }
  }

  attachEvents() {
    const tabStock = this.container.querySelector('#tab-stock');
    const tabMov = this.container.querySelector('#tab-movements');

    if (tabStock && tabMov) {
      tabStock.addEventListener('click', () => {
        this.activeTab = 'stock';
        this.render();
        this.attachEvents();
      });
      tabMov.addEventListener('click', () => {
        this.activeTab = 'movements';
        this.render();
        this.attachEvents();
      });
    }

    this.container.addEventListener('click', (e) => {
      const adjBtn = e.target.closest('[data-adjust-stock]');
      if (adjBtn) {
        const id = adjBtn.getAttribute('data-adjust-stock');
        this.openAdjustmentModal(id);
      }
    });
  }

  openAdjustmentModal(productId) {
    const prod = this.products.find(p => p.id === productId);
    if (!prod) return;

    const modalContent = `
      <form id="adjust-stock-form" class="space-y-4">
        <div class="p-3.5 rounded-[16px] border border-[var(--line)] glass-card">
          <p class="font-extrabold text-xs text-[var(--text)]">${prod.name}</p>
          <p class="text-[10px] text-[var(--muted)] font-mono font-bold mt-0.5">SKU: ${prod.sku} &bull; Current Stock: <strong class="text-[var(--text)] font-black">${prod.stock_quantity} units</strong></p>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-black text-[var(--text)] mb-1">Adjustment Type</label>
            <select name="adjustment_type" class="glass-input w-full p-2.5 rounded-[12px] text-xs font-bold">
              <option value="set">Set Absolute Stock</option>
              <option value="add">Add Quantity (+)</option>
              <option value="subtract">Subtract Quantity (-)</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-black text-[var(--text)] mb-1">Quantity Value *</label>
            <input
              name="quantity"
              type="number"
              min="0"
              required
              placeholder="0"
              class="glass-input w-full p-2.5 rounded-[12px] text-xs font-mono font-black"
            />
          </div>
        </div>

        <div>
          <label class="block text-xs font-black text-[var(--text)] mb-1">Reason / Note *</label>
          <input
            name="reason"
            type="text"
            required
            placeholder="e.g. Physical inventory count, damaged goods"
            class="glass-input w-full p-2.5 rounded-[12px] text-xs font-semibold"
          />
        </div>

        <div class="flex justify-end space-x-2 pt-3 border-t border-[var(--line)]">
          <button type="button" id="cancel-adj-btn" class="px-4 py-2 rounded-[12px] text-xs font-bold glass-btn-secondary">
            Cancel
          </button>
          <button type="submit" class="px-5 py-2 rounded-[12px] text-xs font-black glass-btn-primary shadow-md">
            Save Stock Adjustment
          </button>
        </div>
      </form>
    `;

    const modal = new Modal({
      title: 'Manual Stock Level Adjustment',
      size: 'md',
      content: modalContent,
      onOpen: (modalEl) => {
        const form = modalEl.querySelector('#adjust-stock-form');
        const cancelBtn = modalEl.querySelector('#cancel-adj-btn');

        cancelBtn.addEventListener('click', () => modal.close());

        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const fd = new FormData(form);
          const type = fd.get('adjustment_type');
          const qty = Number(fd.get('quantity')) || 0;
          const reason = fd.get('reason').trim();

          let newStock = prod.stock_quantity;
          if (type === 'set') newStock = qty;
          if (type === 'add') newStock = prod.stock_quantity + qty;
          if (type === 'subtract') newStock = Math.max(0, prod.stock_quantity - qty);

          await inventoryService.adjustStock(productId, newStock, reason);
          toast.success(`Updated stock for ${prod.name} to ${newStock} units`);
          modal.close();
          this.init();
        });
      }
    });

    modal.open();
  }
}
