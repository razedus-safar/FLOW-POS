/**
 * FlowPOS Multi-Outlet & Branch Locations View
 * Manage multiple retail stores, switch active terminal outlet, and track branches
 */

import { outletsService } from '../services/outlets.js';
import { renderIcon } from '../utils/icons.js';
import { Modal } from '../components/Modal.js';
import { toast } from '../components/Toast.js';
import { showConfirmDialog } from '../components/ConfirmDialog.js';

export class OutletsPage {
  constructor(container) {
    this.container = container;
    this.outlets = [];
    this.init();
  }

  init() {
    this.outlets = outletsService.getAll();
    this.render();
    this.attachEvents();
  }

  render() {
    const activeOutlet = outletsService.getActiveOutlet();

    const outletsHtml = this.outlets.map(o => {
      const isCurrentActive = o.id === activeOutlet?.id;
      return `
        <div class="p-5 rounded-[22px] glass-panel border ${isCurrentActive ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/30' : 'border-[var(--line)]'} space-y-4 hover:border-[var(--accent)] transition-all shadow-md flex flex-col justify-between">
          <div>
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-center space-x-2.5">
                <div class="p-2.5 rounded-[12px] ${o.is_warehouse ? 'bg-amber-500/15 text-amber-500' : 'bg-[var(--accent)]/15 text-[var(--accent)]'}">
                  ${renderIcon(o.is_warehouse ? 'boxes' : 'store', 'w-4 h-4')}
                </div>
                <div>
                  <span class="badge ${isCurrentActive ? 'badge-emerald' : 'badge-subtle'} text-[9.5px] font-bold">
                    ${isCurrentActive ? '✓ Active POS Terminal' : o.is_warehouse ? 'Warehouse' : 'Branch Store'}
                  </span>
                </div>
              </div>
              <span class="text-xs font-mono font-bold text-[var(--muted)]">${o.code}</span>
            </div>

            <div class="mt-3.5 space-y-1">
              <h3 class="font-heading font-black text-sm text-[var(--text)] leading-tight">${o.name}</h3>
              <p class="text-xs text-[var(--muted)]">${o.address}, ${o.city}</p>
              <p class="text-[11px] text-[var(--muted)] font-mono">${o.phone || 'No phone recorded'}</p>
            </div>
          </div>

          <div class="pt-3 border-t border-[var(--line)] flex items-center justify-between gap-2">
            ${!isCurrentActive ? `
              <button
                type="button"
                data-set-active-outlet="${o.id}"
                class="px-3.5 py-1.5 rounded-[10px] glass-btn-primary text-xs font-bold active:scale-95 transition"
              >
                Switch Terminal Here
              </button>
            ` : `
              <span class="text-xs font-black text-emerald-500">Currently Selected</span>
            `}

            <div class="flex items-center space-x-1.5">
              <button
                type="button"
                data-edit-outlet="${o.id}"
                class="p-2 rounded-[10px] glass-btn-secondary text-xs hover:text-[var(--accent)] transition"
              >
                ${renderIcon('edit', 'w-3.5 h-3.5')}
              </button>
              ${this.outlets.length > 1 ? `
                <button
                  type="button"
                  data-delete-outlet="${o.id}"
                  class="p-2 rounded-[10px] glass-btn-secondary text-xs text-[var(--red)] hover:bg-red-500/10 transition"
                >
                  ${renderIcon('trash-2', 'w-3.5 h-3.5')}
                </button>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

    this.container.innerHTML = `
      <div class="h-full flex flex-col overflow-hidden p-4 sm:p-6 space-y-5">
        
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[var(--line)] flex-shrink-0">
          <div>
            <h1 class="text-xl sm:text-2xl font-black font-heading text-[var(--text)] tracking-tight">Multi-Outlet & Store Locations</h1>
            <p class="text-xs text-[var(--muted)] font-medium">Manage multiple physical store branches, warehouses, and switch the active POS register location.</p>
          </div>

          <button
            type="button"
            id="add-outlet-btn"
            class="px-5 py-2.5 rounded-[14px] glass-btn-primary text-xs font-black shadow-lg flex items-center space-x-1.5 active:scale-95 transition"
          >
            ${renderIcon('plus', 'w-4 h-4')}
            <span>Add New Branch</span>
          </button>
        </div>

        <!-- Outlets Grid -->
        <div class="flex-1 overflow-y-auto">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-6">
            ${outletsHtml}
          </div>
        </div>

      </div>
    `;
  }

  attachEvents() {
    // Add Outlet
    const addBtn = this.container.querySelector('#add-outlet-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        this.openOutletModal();
      });
    }

    // Switch Active
    this.container.querySelectorAll('[data-set-active-outlet]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-set-active-outlet');
        outletsService.setActiveOutlet(id);
        const active = outletsService.getActiveOutlet();
        toast.success(`Active POS terminal switched to: ${active.name}`);
        this.render();
        this.attachEvents();
      });
    });

    // Edit
    this.container.querySelectorAll('[data-edit-outlet]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-edit-outlet');
        const outlet = this.outlets.find(o => o.id === id);
        if (outlet) this.openOutletModal(outlet);
      });
    });

    // Delete
    this.container.querySelectorAll('[data-delete-outlet]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-delete-outlet');
        showConfirmDialog({
          title: 'Delete Branch Location?',
          message: 'Are you sure you want to remove this outlet location?',
          confirmText: 'Yes, Delete Location',
          danger: true,
          onConfirm: () => {
            try {
              outletsService.deleteOutlet(id);
              toast.info('Outlet deleted');
              this.init();
            } catch (e) {
              toast.error(e.message);
            }
          }
        });
      });
    });
  }

  openOutletModal(outlet = null) {
    const isEdit = !!outlet;
    const o = isEdit ? outlet : {
      name: '',
      code: `BR-${Math.floor(10 + Math.random() * 90)}`,
      address: '',
      city: '',
      phone: '',
      is_warehouse: false
    };

    const modalContent = `
      <form id="outlet-form" class="space-y-4">
        <div>
          <label class="block text-xs font-black text-[var(--text)] mb-1">Outlet / Branch Name *</label>
          <input
            name="name"
            type="text"
            required
            value="${o.name}"
            placeholder="e.g. Uptown Specialty Cafe"
            class="glass-input w-full p-2.5 rounded-[12px] text-xs font-bold"
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-black text-[var(--text)] mb-1">Location Code *</label>
            <input
              name="code"
              type="text"
              required
              value="${o.code}"
              class="glass-input w-full p-2.5 rounded-[12px] text-xs font-mono font-bold"
            />
          </div>
          <div>
            <label class="block text-xs font-black text-[var(--text)] mb-1">Phone Number</label>
            <input
              name="phone"
              type="text"
              value="${o.phone || ''}"
              placeholder="+1 (555) 000-0000"
              class="glass-input w-full p-2.5 rounded-[12px] text-xs font-bold"
            />
          </div>
        </div>

        <div>
          <label class="block text-xs font-black text-[var(--text)] mb-1">Street Address</label>
          <input
            name="address"
            type="text"
            value="${o.address || ''}"
            placeholder="123 Market St"
            class="glass-input w-full p-2.5 rounded-[12px] text-xs font-medium"
          />
        </div>

        <div>
          <label class="block text-xs font-black text-[var(--text)] mb-1">City & Region</label>
          <input
            name="city"
            type="text"
            value="${o.city || ''}"
            placeholder="Colombo, Western Province"
            class="glass-input w-full p-2.5 rounded-[12px] text-xs font-medium"
          />
        </div>

        <div class="pt-1">
          <label class="flex items-center space-x-2.5 cursor-pointer">
            <input type="checkbox" name="is_warehouse" ${o.is_warehouse ? 'checked' : ''} class="rounded text-[var(--accent)]" />
            <div>
              <strong class="text-xs text-[var(--text)] block">Warehouse / Fulfillment Center Only</strong>
              <span class="text-[10px] text-[var(--muted)]">Check if this location does not process retail walk-in sales</span>
            </div>
          </label>
        </div>

        <div class="pt-3 border-t border-[var(--line)] flex justify-end space-x-2.5">
          <button type="button" id="modal-cancel-btn" class="px-4 py-2 rounded-[12px] text-xs font-bold glass-btn-secondary">
            Cancel
          </button>
          <button type="submit" class="px-5 py-2 rounded-[12px] text-xs font-black glass-btn-primary shadow-md">
            ${isEdit ? 'Update Branch' : 'Create Branch'}
          </button>
        </div>
      </form>
    `;

    const modal = new Modal({
      title: isEdit ? `Edit Branch: ${o.name}` : 'Create New Branch Location',
      size: 'md',
      content: modalContent,
      onOpen: (modalEl) => {
        const form = modalEl.querySelector('#outlet-form');
        modalEl.querySelector('#modal-cancel-btn').addEventListener('click', () => modal.close());

        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const fd = new FormData(form);
          const data = {
            id: o.id,
            name: fd.get('name').trim(),
            code: fd.get('code').trim(),
            phone: fd.get('phone').trim(),
            address: fd.get('address').trim(),
            city: fd.get('city').trim(),
            is_warehouse: fd.get('is_warehouse') === 'on',
            is_active: true
          };

          outletsService.saveOutlet(data);
          toast.success(isEdit ? 'Branch updated!' : 'Branch created!');
          modal.close();
          this.init();
        });
      }
    });

    modal.open();
  }
}
