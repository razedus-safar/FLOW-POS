/**
 * FlowPOS Physical Inventory Stocktake & Camera Audit View
 * Rapid barcode shelf scanning, discrepancy tracking, and auto-reconciliation
 */

import { productService } from '../services/products.js';
import { CameraScannerModal } from '../components/CameraScannerModal.js';
import { formatCurrency } from '../utils/currency.js';
import { renderIcon } from '../utils/icons.js';
import { soundManager } from '../utils/audio.js';
import { toast } from '../components/Toast.js';
import { showConfirmDialog } from '../components/ConfirmDialog.js';

export class StocktakePage {
  constructor(container) {
    this.container = container;
    this.products = [];
    this.auditCounts = new Map(); // prodId -> { countedQty: number, lastScanned: Date }
    this.filter = 'all'; // 'all' | 'discrepancies' | 'counted' | 'uncounted'
    this.searchQuery = '';
    this.init();
  }

  async init() {
    this.products = await productService.getAllProducts();
    this.render();
    this.attachEvents();
  }

  render() {
    let filtered = this.products.filter(p => {
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchSku = (p.sku || '').toLowerCase().includes(q);
        const matchBarcode = (p.barcode || '').toLowerCase().includes(q);
        if (!matchName && !matchSku && !matchBarcode) return false;
      }

      const counted = this.auditCounts.get(p.id)?.countedQty;
      const hasCounted = counted !== undefined;
      const expected = Number(p.stock_quantity) || 0;
      const diff = hasCounted ? counted - expected : 0;

      if (this.filter === 'discrepancies') return hasCounted && diff !== 0;
      if (this.filter === 'counted') return hasCounted;
      if (this.filter === 'uncounted') return !hasCounted;
      return true;
    });

    // Metrics Calculation
    let totalCountedItems = 0;
    let discrepancyCount = 0;
    let netVarianceValue = 0;

    this.auditCounts.forEach((audit, prodId) => {
      const prod = this.products.find(p => p.id === prodId);
      if (prod) {
        totalCountedItems++;
        const expected = Number(prod.stock_quantity) || 0;
        const diff = audit.countedQty - expected;
        if (diff !== 0) {
          discrepancyCount++;
          netVarianceValue += diff * (Number(prod.cost_price) || Number(prod.price) || 0);
        }
      }
    });

    const rowsHtml = filtered.map(p => {
      const audit = this.auditCounts.get(p.id);
      const isCounted = audit !== undefined;
      const countedVal = isCounted ? audit.countedQty : 0;
      const expectedVal = Number(p.stock_quantity) || 0;
      const variance = isCounted ? countedVal - expectedVal : 0;
      const varianceClass = !isCounted
        ? 'text-slate-400'
        : variance === 0
          ? 'text-emerald-500 font-bold'
          : variance > 0
            ? 'text-blue-500 font-black'
            : 'text-red-500 font-black';

      return `
        <tr class="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition border-b border-[var(--line)] ${isCounted ? 'bg-emerald-500/[0.03]' : ''}">
          <td class="p-3">
            <div class="flex items-center space-x-3">
              <div class="w-9 h-9 rounded-[10px] bg-[var(--glass-bg-clear)] flex items-center justify-center font-bold text-xs flex-shrink-0">
                ${p.name.substring(0, 2).toUpperCase()}
              </div>
              <div class="truncate">
                <h4 class="text-xs font-bold text-[var(--text)] truncate">${p.name}</h4>
                <p class="text-[10px] text-[var(--muted)] font-mono">${p.sku} &bull; ${p.barcode || 'No barcode'}</p>
              </div>
            </div>
          </td>
          <td class="p-3 font-mono font-bold text-xs text-[var(--text)] text-center">
            ${expectedVal}
          </td>
          <td class="p-3 text-center">
            <div class="inline-flex items-center space-x-1.5">
              <button
                type="button"
                data-audit-dec="${p.id}"
                class="w-7 h-7 rounded-[8px] glass-btn-secondary text-xs font-bold flex items-center justify-center active:scale-90 transition"
              >-</button>
              <input
                type="number"
                min="0"
                value="${isCounted ? countedVal : ''}"
                placeholder="0"
                data-audit-input="${p.id}"
                class="w-16 h-8 text-center rounded-[8px] glass-input text-xs font-mono font-bold ${isCounted ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]/30' : ''}"
              />
              <button
                type="button"
                data-audit-inc="${p.id}"
                class="w-7 h-7 rounded-[8px] glass-btn-secondary text-xs font-bold flex items-center justify-center text-[var(--accent)] active:scale-90 transition"
              >+</button>
            </div>
          </td>
          <td class="p-3 font-mono text-xs text-center ${varianceClass}">
            ${!isCounted ? '—' : variance > 0 ? `+${variance}` : variance}
          </td>
          <td class="p-3 text-right">
            ${isCounted ? `
              <span class="badge ${variance === 0 ? 'badge-emerald' : variance > 0 ? 'badge-blue' : 'badge-danger'}">
                ${variance === 0 ? 'Matched' : variance > 0 ? 'Surplus' : 'Shrinkage'}
              </span>
            ` : `
              <span class="badge badge-subtle">Uncounted</span>
            `}
          </td>
        </tr>
      `;
    }).join('');

    this.container.innerHTML = `
      <div class="h-full flex flex-col overflow-hidden p-4 sm:p-6 space-y-4">
        
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[var(--line)] flex-shrink-0">
          <div>
            <h1 class="text-xl sm:text-2xl font-black font-heading text-[var(--text)] tracking-tight">Physical Inventory Stocktake</h1>
            <p class="text-xs text-[var(--muted)] font-medium">Walk the store with phone camera to audit physical stock counts and reconcile discrepancies.</p>
          </div>

          <div class="flex items-center space-x-2.5 flex-shrink-0">
            <!-- Camera Scan Audit Button -->
            <button
              type="button"
              id="stocktake-camera-scan-btn"
              class="px-4 py-2.5 rounded-[14px] bg-gradient-to-r from-[#0066CC] to-[#7E22CE] text-white text-xs font-black shadow-lg flex items-center space-x-1.5 active:scale-95 transition"
            >
              ${renderIcon('camera', 'w-4 h-4')}
              <span>Scan Shelf Items</span>
            </button>

            <!-- Reconcile Button -->
            <button
              type="button"
              id="stocktake-reconcile-btn"
              class="px-4 py-2.5 rounded-[14px] glass-btn-primary text-xs font-black shadow-lg flex items-center space-x-1.5 active:scale-95 transition ${totalCountedItems === 0 ? 'opacity-50 pointer-events-none' : ''}"
            >
              ${renderIcon('check', 'w-4 h-4')}
              <span>Reconcile & Update Stock</span>
            </button>
          </div>
        </div>

        <!-- Metrics Strip -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-shrink-0">
          <div class="p-3.5 rounded-[18px] glass-card shadow-xs">
            <span class="text-[10px] text-[var(--muted)] font-black uppercase tracking-wider block">Audited Items</span>
            <strong class="text-lg sm:text-xl font-black font-mono text-[var(--text)] block mt-0.5">${totalCountedItems} / ${this.products.length}</strong>
            <span class="text-[10px] text-[var(--accent)] font-bold">${Math.round((totalCountedItems / Math.max(1, this.products.length)) * 100)}% Progress</span>
          </div>

          <div class="p-3.5 rounded-[18px] glass-card shadow-xs">
            <span class="text-[10px] text-[var(--muted)] font-black uppercase tracking-wider block">Discrepancies</span>
            <strong class="text-lg sm:text-xl font-black font-mono text-[var(--amber)] block mt-0.5">${discrepancyCount} Products</strong>
            <span class="text-[10px] text-[var(--muted)] font-semibold">Stock mismatch</span>
          </div>

          <div class="p-3.5 rounded-[18px] glass-card shadow-xs">
            <span class="text-[10px] text-[var(--muted)] font-black uppercase tracking-wider block">Variance Value</span>
            <strong class="text-lg sm:text-xl font-black font-mono ${netVarianceValue >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'} block mt-0.5">
              ${formatCurrency(netVarianceValue)}
            </strong>
            <span class="text-[10px] text-[var(--muted)] font-semibold">Estimated Net Diff</span>
          </div>

          <div class="p-3.5 rounded-[18px] glass-card shadow-xs flex flex-col justify-between">
            <span class="text-[10px] text-[var(--muted)] font-black uppercase tracking-wider block">Quick Reset</span>
            <button type="button" id="reset-audit-session-btn" class="text-xs font-bold text-[var(--red)] hover:underline text-left">
              Clear Audit Session
            </button>
            <span class="text-[9px] text-[var(--muted)]">Zero all counted inputs</span>
          </div>
        </div>

        <!-- Filter & Search Toolbar -->
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 flex-shrink-0">
          <div class="flex items-center p-1 rounded-[14px] bg-[var(--glass-bg-clear)] border border-[var(--line)] text-xs font-bold">
            <button data-audit-filter="all" class="px-3 py-1.5 rounded-[10px] transition ${this.filter === 'all' ? 'bg-[var(--accent)] text-white shadow-xs font-black' : 'text-[var(--muted)]'}">All (${this.products.length})</button>
            <button data-audit-filter="discrepancies" class="px-3 py-1.5 rounded-[10px] transition ${this.filter === 'discrepancies' ? 'bg-[var(--accent)] text-white shadow-xs font-black' : 'text-[var(--muted)]'}">Discrepancies (${discrepancyCount})</button>
            <button data-audit-filter="counted" class="px-3 py-1.5 rounded-[10px] transition ${this.filter === 'counted' ? 'bg-[var(--accent)] text-white shadow-xs font-black' : 'text-[var(--muted)]'}">Counted (${totalCountedItems})</button>
            <button data-audit-filter="uncounted" class="px-3 py-1.5 rounded-[10px] transition ${this.filter === 'uncounted' ? 'bg-[var(--accent)] text-white shadow-xs font-black' : 'text-[var(--muted)]'}">Uncounted (${this.products.length - totalCountedItems})</button>
          </div>

          <div class="relative w-full sm:w-72">
            <input
              type="text"
              id="stocktake-search-input"
              value="${this.searchQuery}"
              placeholder="Search product, barcode, SKU…"
              class="glass-input w-full h-10 pl-3 pr-8 rounded-[12px] text-xs font-semibold"
            />
          </div>
        </div>

        <!-- Table Area -->
        <div class="flex-1 glass2 rounded-[22px] border border-[var(--line)] overflow-hidden flex flex-col shadow-lg">
          <div class="flex-1 overflow-y-auto">
            <table class="w-full text-left border-collapse">
              <thead class="sticky top-0 bg-[var(--bg-secondary)] border-b border-[var(--line)] text-[10px] font-black uppercase text-[var(--muted)] tracking-wider z-10">
                <tr>
                  <th class="p-3">Product Info</th>
                  <th class="p-3 text-center">System Stock</th>
                  <th class="p-3 text-center">Physical Count</th>
                  <th class="p-3 text-center">Variance</th>
                  <th class="p-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[var(--line)] text-xs">
                ${filtered.length === 0 ? `
                  <tr>
                    <td colspan="5" class="p-12 text-center text-[var(--muted)] font-semibold">
                      No products match your filter criteria.
                    </td>
                  </tr>
                ` : rowsHtml}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    `;
  }

  attachEvents() {
    // Camera Scan Audit
    const scanBtn = this.container.querySelector('#stocktake-camera-scan-btn');
    if (scanBtn) {
      scanBtn.addEventListener('click', () => {
        new CameraScannerModal({
          title: 'Stocktake Camera Audit Mode',
          autoAddToCart: false,
          onScan: (code, product) => {
            if (product) {
              const current = this.auditCounts.get(product.id)?.countedQty || 0;
              this.auditCounts.set(product.id, { countedQty: current + 1, lastScanned: new Date() });
              soundManager.playBeep();
              toast.success(`Counted: ${product.name} (Total: ${current + 1})`);
              this.render();
              this.attachEvents();
            } else {
              toast.error(`Barcode "${code}" not registered in catalog`);
            }
          }
        }).open();
      });
    }

    // Filter Buttons
    this.container.querySelectorAll('[data-audit-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.filter = btn.getAttribute('data-audit-filter');
        this.render();
        this.attachEvents();
      });
    });

    // Search Input
    const searchInput = this.container.querySelector('#stocktake-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        this.render();
        this.attachEvents();
      });
    }

    // Input numbers
    this.container.querySelectorAll('[data-audit-input]').forEach(inp => {
      inp.addEventListener('change', (e) => {
        const id = inp.getAttribute('data-audit-input');
        const val = e.target.value.trim();
        if (val === '') {
          this.auditCounts.delete(id);
        } else {
          this.auditCounts.set(id, { countedQty: Math.max(0, Number(val)), lastScanned: new Date() });
        }
        this.render();
        this.attachEvents();
      });
    });

    // Increment
    this.container.querySelectorAll('[data-audit-inc]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-audit-inc');
        const current = this.auditCounts.get(id)?.countedQty || 0;
        this.auditCounts.set(id, { countedQty: current + 1, lastScanned: new Date() });
        this.render();
        this.attachEvents();
      });
    });

    // Decrement
    this.container.querySelectorAll('[data-audit-dec]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-audit-dec');
        const current = this.auditCounts.get(id)?.countedQty || 0;
        if (current > 0) {
          this.auditCounts.set(id, { countedQty: current - 1, lastScanned: new Date() });
          this.render();
          this.attachEvents();
        }
      });
    });

    // Reset Session
    const resetBtn = this.container.querySelector('#reset-audit-session-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        showConfirmDialog({
          title: 'Clear Stocktake Audit Session?',
          message: 'All physical count inputs will be cleared for this session.',
          confirmText: 'Yes, Clear Session',
          danger: true,
          onConfirm: () => {
            this.auditCounts.clear();
            toast.info('Audit session cleared');
            this.render();
            this.attachEvents();
          }
        });
      });
    }

    // Reconcile and Apply Stock Updates
    const reconcileBtn = this.container.querySelector('#stocktake-reconcile-btn');
    if (reconcileBtn) {
      reconcileBtn.addEventListener('click', () => {
        showConfirmDialog({
          title: 'Reconcile & Update Inventory?',
          message: `This will overwrite system inventory counts for ${this.auditCounts.size} audited products with physical counts and record adjustment audit movements.`,
          confirmText: 'Confirm & Apply Adjustments',
          onConfirm: async () => {
            let updatedCount = 0;
            for (const [prodId, audit] of this.auditCounts.entries()) {
              const prod = this.products.find(p => p.id === prodId);
              if (prod) {
                await productService.adjustStock(prod.id, audit.countedQty - Number(prod.stock_quantity), 'STOCKTAKE_AUDIT_RECONCILIATION');
                updatedCount++;
              }
            }
            toast.success(`Successfully reconciled inventory for ${updatedCount} products!`);
            this.auditCounts.clear();
            await this.init();
          }
        });
      });
    }
  }
}
