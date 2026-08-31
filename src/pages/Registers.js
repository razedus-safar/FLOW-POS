/**
 * FlowPOS Register Management & Shift Reconciliation View - Apple iOS 26 High-Contrast Edition
 */

import { registerService } from '../services/registers.js';
import { DataTable } from '../components/DataTable.js';
import { Modal } from '../components/Modal.js';
import { toast } from '../components/Toast.js';
import { formatCurrency } from '../utils/currency.js';
import { formatDate } from '../utils/dates.js';
import { renderIcon } from '../utils/icons.js';

export class RegistersPage {
  constructor(container) {
    this.container = container;
    this.activeSession = null;
    this.history = [];
    this.init();
  }

  async init() {
    this.activeSession = registerService.getActiveSession();
    this.history = await registerService.getSessionHistory();
    this.render();
    this.attachEvents();
  }

  render() {
    const session = this.activeSession;
    const expectedCash = registerService.getExpectedCash();

    const historyColumns = [
      {
        key: 'opened_at',
        label: 'Shift Date',
        render: (val) => `<span class="font-mono text-xs text-[var(--muted)] font-bold">${formatDate(val, 'datetime')}</span>`
      },
      {
        key: 'user_name',
        label: 'Cashier',
        render: (val) => `<span class="font-extrabold text-xs text-[var(--text)]">${val || 'Staff'}</span>`
      },
      {
        key: 'opening_cash',
        label: 'Opening Float',
        render: (val) => `<span class="font-mono text-xs font-bold text-[var(--text)]">${formatCurrency(val)}</span>`
      },
      {
        key: 'total_cash_sales',
        label: 'Cash Sales',
        render: (val) => `<span class="font-mono text-xs font-bold text-[var(--green)]">+${formatCurrency(val)}</span>`
      },
      {
        key: 'closing_cash_actual',
        label: 'Counted Cash',
        render: (val) => `<span class="font-mono font-black text-xs text-[var(--text)]">${val !== null && val !== undefined ? formatCurrency(val) : '—'}</span>`
      },
      {
        key: 'cash_difference',
        label: 'Difference',
        render: (val) => {
          if (val === null || val === undefined) return '<span class="text-xs text-[var(--muted)] font-bold">Active</span>';
          if (val === 0) return '<span class="badge badge-emerald">Balanced ($0.00)</span>';
          if (val > 0) return `<span class="badge badge-emerald">+${formatCurrency(val)}</span>`;
          return `<span class="badge badge-danger">${formatCurrency(val)}</span>`;
        }
      },
      {
        key: 'status',
        label: 'Status',
        render: (val) => `<span class="badge ${val === 'open' ? 'badge-blue' : 'badge-bronze'}">${val}</span>`
      }
    ];

    this.container.innerHTML = `
      <div class="h-full overflow-y-auto p-4 sm:p-6 space-y-5">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 class="text-xl sm:text-2xl font-black font-heading text-[var(--text)] tracking-tight">Cash Register Management</h1>
            <p class="text-xs text-[var(--muted)] font-medium">Track cash drawer shifts, opening floats, cash drops, and end-of-day reconciliation.</p>
          </div>
          <div>
            ${session ? `
              <button id="close-shift-btn" class="px-4 py-2.5 rounded-[14px] text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-md active:scale-95 transition flex items-center space-x-1.5">
                ${renderIcon('log-out', 'w-4 h-4')}
                <span>Close Register Shift</span>
              </button>
            ` : `
              <button id="open-shift-btn" class="px-4 py-2.5 rounded-[14px] text-xs font-black glass-btn-primary flex items-center space-x-1.5 shadow-md active:scale-95">
                ${renderIcon('calculator', 'w-4 h-4')}
                <span>Open Register Shift</span>
              </button>
            `}
          </div>
        </div>

        <!-- Active Shift Dashboard -->
        ${session ? `
          <div class="glass-card p-5 rounded-[24px] border border-[var(--line)] space-y-4 shadow-xs">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--line)]">
              <div class="flex items-center space-x-3.5">
                <div class="p-2.5 rounded-[12px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  ${renderIcon('calculator', 'w-6 h-6')}
                </div>
                <div>
                  <div class="flex items-center space-x-2">
                    <h3 class="font-black font-heading text-sm text-[var(--text)]">${session.register_name}</h3>
                    <span class="badge badge-emerald">ACTIVE SHIFT</span>
                  </div>
                  <p class="text-xs text-[var(--muted)] font-medium">Opened on ${formatDate(session.opened_at, 'datetime')} by <strong class="text-[var(--text)]">${session.user_name}</strong></p>
                </div>
              </div>

              <!-- Cash In / Out Quick Buttons -->
              <div class="flex items-center space-x-2">
                <button id="cash-in-btn" class="px-3.5 py-1.8 rounded-[12px] text-xs font-black glass-btn-secondary flex items-center space-x-1 text-emerald-600 dark:text-emerald-400">
                  ${renderIcon('plus', 'w-3.5 h-3.5')}
                  <span>Cash In</span>
                </button>
                <button id="cash-out-btn" class="px-3.5 py-1.8 rounded-[12px] text-xs font-black glass-btn-secondary flex items-center space-x-1 text-rose-600 dark:text-rose-400">
                  ${renderIcon('minus', 'w-3.5 h-3.5')}
                  <span>Cash Out (Drop)</span>
                </button>
              </div>
            </div>

            <!-- Shift Cash Metrics Grid -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div class="p-4 rounded-[18px] glass-card border border-[var(--line)] shadow-xs">
                <span class="text-[10px] text-[var(--muted)] font-black uppercase tracking-wider">Opening Float</span>
                <p class="text-lg font-black font-mono text-[var(--text)] mt-1">${formatCurrency(session.opening_cash)}</p>
              </div>

              <div class="p-4 rounded-[18px] glass-card border border-[var(--line)] shadow-xs">
                <span class="text-[10px] text-[var(--muted)] font-black uppercase tracking-wider">Cash Sales</span>
                <p class="text-lg font-black font-mono text-[var(--green)] mt-1">+${formatCurrency(session.total_cash_sales)}</p>
              </div>

              <div class="p-4 rounded-[18px] glass-card border border-[var(--line)] shadow-xs">
                <span class="text-[10px] text-[var(--muted)] font-black uppercase tracking-wider">Drawer Drops / Out</span>
                <p class="text-lg font-black font-mono text-[var(--red)] mt-1">-${formatCurrency(session.cash_drops || 0)}</p>
              </div>

              <div class="p-4 rounded-[18px] glass-card border border-[var(--accent)]/30 bg-[var(--accent)]/5 shadow-xs">
                <span class="text-[10px] text-[var(--accent)] font-black uppercase tracking-wider">Expected in Drawer</span>
                <p class="text-lg font-black font-mono text-[var(--text)] mt-1">${formatCurrency(expectedCash)}</p>
              </div>
            </div>
          </div>
        ` : `
          <div class="p-8 rounded-[24px] glass-card border border-[var(--line)] text-center space-y-3">
            <div class="w-12 h-12 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] flex items-center justify-center mx-auto text-xl">
              ${renderIcon('calculator', 'w-6 h-6')}
            </div>
            <h3 class="font-black font-heading text-base text-[var(--text)]">No Active Register Session</h3>
            <p class="text-xs text-[var(--muted)] max-w-sm mx-auto">Open a shift float before processing cash transactions and ring-ups at the register counter.</p>
          </div>
        `}

        <!-- Shift History -->
        <div class="space-y-3">
          <h3 class="font-black font-heading text-sm text-[var(--text)] px-1">Register Shift History</h3>
          <div id="register-history-table-container"></div>
        </div>
      </div>
    `;

    const tableContainer = this.container.querySelector('#register-history-table-container');
    new DataTable({
      columns: historyColumns,
      data: this.history,
      searchPlaceholder: 'Search shifts by cashier or date…'
    }).render(tableContainer);
  }

  attachEvents() {
    const openBtn = this.container.querySelector('#open-shift-btn');
    if (openBtn) {
      openBtn.addEventListener('click', () => this.openShiftModal());
    }

    const closeBtn = this.container.querySelector('#close-shift-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeShiftModal());
    }

    const cashInBtn = this.container.querySelector('#cash-in-btn');
    if (cashInBtn) {
      cashInBtn.addEventListener('click', () => this.openCashMovementModal('in'));
    }

    const cashOutBtn = this.container.querySelector('#cash-out-btn');
    if (cashOutBtn) {
      cashOutBtn.addEventListener('click', () => this.openCashMovementModal('out'));
    }
  }

  openShiftModal() {
    const modalContent = `
      <form id="open-shift-form" class="space-y-4">
        <div>
          <label class="block text-xs font-black text-[var(--text)] mb-1">Starting Cash Float ($) *</label>
          <input
            name="opening_cash"
            type="number"
            step="any"
            required
            value="200.00"
            class="glass-input w-full p-2.5 rounded-[12px] text-sm font-mono font-black"
          />
          <p class="text-[10px] text-[var(--muted)] mt-1">Counted physical drawer cash balance before start of shift.</p>
        </div>

        <div>
          <label class="block text-xs font-black text-[var(--text)] mb-1">Shift Notes / Register ID</label>
          <input
            name="notes"
            type="text"
            placeholder="Morning shift opening count"
            class="glass-input w-full p-2.5 rounded-[12px] text-xs font-medium"
          />
        </div>

        <div class="flex justify-end space-x-2 pt-3 border-t border-[var(--line)]">
          <button type="button" id="modal-cancel-btn" class="px-4 py-2 rounded-[12px] text-xs font-bold glass-btn-secondary">
            Cancel
          </button>
          <button type="submit" class="px-5 py-2 rounded-[12px] text-xs font-black glass-btn-primary shadow-md">
            Open Register Shift
          </button>
        </div>
      </form>
    `;

    const modal = new Modal({
      title: 'Open Register Shift',
      size: 'md',
      content: modalContent,
      onOpen: (modalEl) => {
        const form = modalEl.querySelector('#open-shift-form');
        const cancelBtn = modalEl.querySelector('#modal-cancel-btn');

        cancelBtn.addEventListener('click', () => modal.close());

        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const fd = new FormData(form);
          const openingCash = Number(fd.get('opening_cash')) || 200;
          const notes = fd.get('notes').trim();

          registerService.openSession(openingCash, notes);
          toast.success(`Register shift opened with ${formatCurrency(openingCash)} float!`);
          modal.close();
          this.init();
        });
      }
    });

    modal.open();
  }

  closeShiftModal() {
    const session = this.activeSession;
    if (!session) return;

    const expected = registerService.getExpectedCash();

    const modalContent = `
      <form id="close-shift-form" class="space-y-4">
        <div class="p-3.5 rounded-[16px] border border-[var(--line)] glass-card">
          <div class="flex justify-between items-center text-xs">
            <span class="text-[var(--muted)] font-bold">System Expected Cash in Drawer:</span>
            <span class="font-mono font-black text-sm text-[var(--accent)]">${formatCurrency(expected)}</span>
          </div>
          <p class="text-[10px] text-[var(--muted)] mt-1">Sum of float (${formatCurrency(session.opening_cash)}) + cash sales (${formatCurrency(session.total_cash_sales)}) - drops (${formatCurrency(session.cash_drops || 0)})</p>
        </div>

        <div>
          <label class="block text-xs font-black text-[var(--text)] mb-1">Actual Physical Cash Count ($) *</label>
          <input
            id="counted-cash-input"
            name="closing_cash_actual"
            type="number"
            step="any"
            required
            value="${expected}"
            class="glass-input w-full p-2.5 rounded-[12px] text-sm font-mono font-black"
          />
        </div>

        <!-- Real-time Discrepancy Indicator -->
        <div id="diff-indicator" class="p-2.5 rounded-[12px] text-xs font-bold text-center bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
          Drawer perfectly balanced ($0.00 difference)
        </div>

        <div>
          <label class="block text-xs font-black text-[var(--text)] mb-1">Closing Notes / Discrepancy Explanation</label>
          <input
            name="notes"
            type="text"
            placeholder="End of shift cash count balanced"
            class="glass-input w-full p-2.5 rounded-[12px] text-xs font-medium"
          />
        </div>

        <div class="flex justify-end space-x-2 pt-3 border-t border-[var(--line)]">
          <button type="button" id="modal-cancel-btn" class="px-4 py-2 rounded-[12px] text-xs font-bold glass-btn-secondary">
            Cancel
          </button>
          <button type="submit" class="px-5 py-2 rounded-[12px] text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-md">
            Close Shift & Finalize
          </button>
        </div>
      </form>
    `;

    const modal = new Modal({
      title: 'Close Register Shift & Reconcile',
      size: 'md',
      content: modalContent,
      onOpen: (modalEl) => {
        const form = modalEl.querySelector('#close-shift-form');
        const cancelBtn = modalEl.querySelector('#modal-cancel-btn');
        const input = modalEl.querySelector('#counted-cash-input');
        const diffInd = modalEl.querySelector('#diff-indicator');

        cancelBtn.addEventListener('click', () => modal.close());

        input.addEventListener('input', () => {
          const counted = Number(input.value) || 0;
          const diff = counted - expected;
          if (Math.abs(diff) < 0.01) {
            diffInd.className = 'p-2.5 rounded-[12px] text-xs font-black text-center bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25';
            diffInd.textContent = 'Drawer perfectly balanced ($0.00 difference)';
          } else if (diff > 0) {
            diffInd.className = 'p-2.5 rounded-[12px] text-xs font-black text-center bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25';
            diffInd.textContent = `Cash Overage: +${formatCurrency(diff)}`;
          } else {
            diffInd.className = 'p-2.5 rounded-[12px] text-xs font-black text-center bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/25';
            diffInd.textContent = `Cash Shortage: ${formatCurrency(diff)}`;
          }
        });

        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const fd = new FormData(form);
          const counted = Number(fd.get('closing_cash_actual')) || 0;
          const notes = fd.get('notes').trim();

          registerService.closeSession(counted, notes);
          toast.success('Register shift reconciled and closed successfully!');
          modal.close();
          this.init();
        });
      }
    });

    modal.open();
  }

  openCashMovementModal(type = 'in') {
    const isDrop = type === 'out';

    const modalContent = `
      <form id="cash-movement-form" class="space-y-4">
        <div>
          <label class="block text-xs font-black text-[var(--text)] mb-1">${isDrop ? 'Cash Drop Amount ($)' : 'Cash In Amount ($)'} *</label>
          <input
            name="amount"
            type="number"
            step="any"
            required
            placeholder="50.00"
            class="glass-input w-full p-2.5 rounded-[12px] text-sm font-mono font-black"
          />
        </div>

        <div>
          <label class="block text-xs font-black text-[var(--text)] mb-1">Reason / Note *</label>
          <input
            name="reason"
            type="text"
            required
            placeholder="${isDrop ? 'Safe drop / high cash drawer' : 'Add change / small bills'}"
            class="glass-input w-full p-2.5 rounded-[12px] text-xs font-semibold"
          />
        </div>

        <div class="flex justify-end space-x-2 pt-3 border-t border-[var(--line)]">
          <button type="button" id="modal-cancel-btn" class="px-4 py-2 rounded-[12px] text-xs font-bold glass-btn-secondary">
            Cancel
          </button>
          <button type="submit" class="px-5 py-2 rounded-[12px] text-xs font-black glass-btn-primary shadow-md">
            Record Movement
          </button>
        </div>
      </form>
    `;

    const modal = new Modal({
      title: isDrop ? 'Cash Drop / Out of Drawer' : 'Cash In / Add to Drawer',
      size: 'md',
      content: modalContent,
      onOpen: (modalEl) => {
        const form = modalEl.querySelector('#cash-movement-form');
        const cancelBtn = modalEl.querySelector('#modal-cancel-btn');

        cancelBtn.addEventListener('click', () => modal.close());

        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const fd = new FormData(form);
          const amount = Number(fd.get('amount')) || 0;
          const reason = fd.get('reason').trim();

          if (amount <= 0) {
            toast.error('Please enter a valid cash amount.');
            return;
          }

          if (isDrop) {
            registerService.recordCashDrop(amount, reason);
            toast.info(`Recorded cash drop of ${formatCurrency(amount)}`);
          } else {
            toast.success(`Added ${formatCurrency(amount)} cash to drawer`);
          }

          modal.close();
          this.init();
        });
      }
    });

    modal.open();
  }
}
