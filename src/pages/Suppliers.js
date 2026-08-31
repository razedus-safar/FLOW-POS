/**
 * FlowPOS Supplier Directory View - Apple iOS 26 High-Contrast Edition
 */

import { supplierService } from '../services/suppliers.js';
import { DataTable } from '../components/DataTable.js';
import { Modal } from '../components/Modal.js';
import { toast } from '../components/Toast.js';
import { showConfirmDialog } from '../components/ConfirmDialog.js';
import { renderIcon } from '../utils/icons.js';
import { sanitizeHtml } from '../utils/security.js';

export class SuppliersPage {
  constructor(container) {
    this.container = container;
    this.suppliers = [];
    this.init();
  }

  async init() {
    this.suppliers = await supplierService.getAllSuppliers();
    this.render();
    this.attachEvents();
  }

  render() {
    const columns = [
      {
        key: 'name',
        label: 'Supplier Name',
        render: (val, row) => `
          <div>
            <p class="font-extrabold text-[var(--text)] text-xs">${sanitizeHtml(val)}</p>
            <p class="text-[10px] text-[var(--muted)] font-mono font-bold">${sanitizeHtml(row.contact_person || 'No contact')}</p>
          </div>
        `
      },
      { key: 'email', label: 'Email', render: (val) => `<span class="font-mono font-bold text-[var(--text)] text-xs">${sanitizeHtml(val || '—')}</span>` },
      { key: 'phone', label: 'Phone', render: (val) => `<span class="font-mono font-bold text-[var(--text)] text-xs">${sanitizeHtml(val || '—')}</span>` },
      { key: 'lead_time_days', label: 'Lead Time', render: (val) => `<span class="badge badge-blue">${sanitizeHtml(val || 3)} days</span>` },
      { key: 'payment_terms', label: 'Terms', render: (val) => `<span class="text-xs font-bold text-[var(--muted)]">${sanitizeHtml(val || 'Net 30')}</span>` },
      {
        key: 'actions',
        label: 'Actions',
        sortable: false,
        render: (_, row) => `
          <div class="flex items-center space-x-1.5">
            <button data-edit-sup="${row.id}" class="p-1.5 rounded-[10px] text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 transition" title="Edit">
              ${renderIcon('settings', 'w-4 h-4')}
            </button>
            <button data-delete-sup="${row.id}" class="p-1.5 rounded-[10px] text-[var(--muted)] hover:text-[var(--red)] hover:bg-red-500/10 transition" title="Delete">
              ${renderIcon('trash-2', 'w-4 h-4')}
            </button>
          </div>
        `
      }
    ];

    this.container.innerHTML = `
      <div class="h-full overflow-y-auto p-4 sm:p-6 space-y-5">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 class="text-xl sm:text-2xl font-black font-heading text-[var(--text)] tracking-tight">Suppliers & Vendors</h1>
            <p class="text-xs text-[var(--muted)] font-medium">Manage external product suppliers, lead times, and terms.</p>
          </div>
          <button id="add-supplier-btn" class="px-4 py-2.5 rounded-[14px] text-xs font-black glass-btn-primary flex items-center space-x-1.5 shadow-md self-start sm:self-auto">
            ${renderIcon('plus', 'w-4 h-4')}
            <span>Add Supplier</span>
          </button>
        </div>

        <div id="suppliers-table-container"></div>
      </div>
    `;

    const tableContainer = this.container.querySelector('#suppliers-table-container');
    new DataTable({
      columns,
      data: this.suppliers,
      searchPlaceholder: 'Search suppliers…'
    }).render(tableContainer);
  }

  attachEvents() {
    this.container.addEventListener('click', (e) => {
      const editBtn = e.target.closest('[data-edit-sup]');
      if (editBtn) {
        const id = editBtn.getAttribute('data-edit-sup');
        this.openSupplierModal(id);
        return;
      }

      const delBtn = e.target.closest('[data-delete-sup]');
      if (delBtn) {
        const id = delBtn.getAttribute('data-delete-sup');
        this.confirmDeleteSupplier(id);
        return;
      }
    });

    const addBtn = this.container.querySelector('#add-supplier-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.openSupplierModal());
    }
  }

  openSupplierModal(supplierId = null) {
    const isEdit = !!supplierId;
    const sup = isEdit ? this.suppliers.find(s => s.id === supplierId) : {
      name: '',
      contact_person: '',
      email: '',
      phone: '',
      lead_time_days: 3,
      payment_terms: 'Net 30',
      address: ''
    };

    if (!sup) return;

    const modalContent = `
      <form id="supplier-form" class="space-y-4">
        <div>
          <label class="block text-xs font-black text-[var(--text)] mb-1">Company / Supplier Name *</label>
          <input
            name="name"
            type="text"
            required
            value="${sup.name}"
            placeholder="e.g. Pacific Coast Roasters Inc."
            class="glass-input w-full p-2.5 rounded-[12px] text-xs font-semibold"
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-black text-[var(--text)] mb-1">Contact Person</label>
            <input
              name="contact_person"
              type="text"
              value="${sup.contact_person || ''}"
              placeholder="David Miller"
              class="glass-input w-full p-2.5 rounded-[12px] text-xs font-medium"
            />
          </div>
          <div>
            <label class="block text-xs font-black text-[var(--text)] mb-1">Email</label>
            <input
              name="email"
              type="email"
              value="${sup.email || ''}"
              placeholder="orders@supplier.com"
              class="glass-input w-full p-2.5 rounded-[12px] text-xs font-medium"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-black text-[var(--text)] mb-1">Phone</label>
            <input
              name="phone"
              type="tel"
              value="${sup.phone || ''}"
              placeholder="+1 (555) 301-4499"
              class="glass-input w-full p-2.5 rounded-[12px] text-xs font-mono font-bold"
            />
          </div>
          <div>
            <label class="block text-xs font-black text-[var(--text)] mb-1">Lead Time (Days)</label>
            <input
              name="lead_time_days"
              type="number"
              min="1"
              value="${sup.lead_time_days || 3}"
              class="glass-input w-full p-2.5 rounded-[12px] text-xs font-mono font-bold"
            />
          </div>
        </div>

        <div>
          <label class="block text-xs font-black text-[var(--text)] mb-1">Payment Terms</label>
          <select name="payment_terms" class="glass-input w-full p-2.5 rounded-[12px] text-xs font-bold">
            <option value="Net 15" ${sup.payment_terms === 'Net 15' ? 'selected' : ''}>Net 15</option>
            <option value="Net 30" ${sup.payment_terms === 'Net 30' ? 'selected' : ''}>Net 30</option>
            <option value="Net 60" ${sup.payment_terms === 'Net 60' ? 'selected' : ''}>Net 60</option>
            <option value="Due on Receipt" ${sup.payment_terms === 'Due on Receipt' ? 'selected' : ''}>Due on Receipt</option>
          </select>
        </div>

        <div class="flex justify-end space-x-2 pt-3 border-t border-[var(--line)]">
          <button type="button" id="modal-cancel-btn" class="px-4 py-2 rounded-[12px] text-xs font-bold glass-btn-secondary">
            Cancel
          </button>
          <button type="submit" class="px-5 py-2 rounded-[12px] text-xs font-black glass-btn-primary shadow-md">
            ${isEdit ? 'Update Supplier' : 'Save Supplier'}
          </button>
        </div>
      </form>
    `;

    const modal = new Modal({
      title: isEdit ? 'Edit Supplier' : 'Register New Supplier',
      size: 'md',
      content: modalContent,
      onOpen: (modalEl) => {
        const form = modalEl.querySelector('#supplier-form');
        const cancelBtn = modalEl.querySelector('#modal-cancel-btn');

        cancelBtn.addEventListener('click', () => modal.close());

        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const fd = new FormData(form);
          const data = {
            id: isEdit ? sup.id : undefined,
            name: fd.get('name').trim(),
            contact_person: fd.get('contact_person').trim(),
            email: fd.get('email').trim(),
            phone: fd.get('phone').trim(),
            lead_time_days: Number(fd.get('lead_time_days')) || 3,
            payment_terms: fd.get('payment_terms')
          };

          if (!data.name) {
            toast.error('Supplier name is required.');
            return;
          }

          await supplierService.saveSupplier(data);
          toast.success(isEdit ? 'Supplier updated!' : 'Supplier registered!');
          modal.close();
          this.init();
        });
      }
    });

    modal.open();
  }

  confirmDeleteSupplier(id) {
    const sup = this.suppliers.find(s => s.id === id);
    if (!sup) return;

    showConfirmDialog({
      title: 'Delete Supplier',
      message: `Are you sure you want to remove "${sup.name}"?`,
      confirmText: 'Delete Supplier',
      isDanger: true,
      onConfirm: async () => {
        await supplierService.deleteSupplier(id);
        toast.info(`Deleted ${sup.name}`);
        this.init();
      }
    });
  }
}
