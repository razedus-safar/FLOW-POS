/**
 * FlowPOS Smart Promotional Campaigns & Discount Rules View
 * Manage automated BOGO, Happy Hour rules, volume tiers, and flash sales
 */

import { promotionsService } from '../services/promotions.js';
import { productService } from '../services/products.js';
import { Modal } from '../components/Modal.js';
import { toast } from '../components/Toast.js';
import { showConfirmDialog } from '../components/ConfirmDialog.js';
import { renderIcon } from '../utils/icons.js';
import { formatCurrency } from '../utils/currency.js';

export class PromotionsPage {
  constructor(container) {
    this.container = container;
    this.promotions = [];
    this.categories = [];
    this.init();
  }

  async init() {
    this.promotions = promotionsService.getAll();
    this.categories = await productService.getCategories();
    this.render();
    this.attachEvents();
  }

  render() {
    const promoCardsHtml = this.promotions.map(p => `
      <div class="p-5 rounded-[22px] glass-panel border border-[var(--line)] space-y-4 hover:border-[var(--accent)] transition-all shadow-md flex flex-col justify-between">
        <div>
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center space-x-2">
              <span class="p-2 rounded-[10px] bg-[var(--accent)]/15 text-[var(--accent)]">
                ${renderIcon('tag', 'w-4 h-4')}
              </span>
              <span class="badge ${p.is_active ? 'badge-emerald' : 'badge-subtle'} text-[10px] font-bold">
                ${p.is_active ? '● Active' : '○ Inactive'}
              </span>
            </div>
            <span class="badge badge-purple text-xs font-black font-mono px-2.5 py-1">
              ${p.badge || `${p.value}% OFF`}
            </span>
          </div>

          <div class="mt-3 space-y-1">
            <h3 class="font-heading font-black text-sm text-[var(--text)] leading-tight">${p.name}</h3>
            <p class="text-xs text-[var(--muted)]">
              ${p.type === 'volume' ? `Apply ${p.value}% off cart when buying ${p.min_items || 5}+ items` : p.type === 'fixed_amount' ? `Flat ${formatCurrency(p.value)} off orders over ${formatCurrency(p.min_order_amount || 0)}` : `${p.value}% discount on eligible items`}
            </p>
          </div>
        </div>

        <div class="pt-3 border-t border-[var(--line)] flex items-center justify-between">
          <button
            type="button"
            data-toggle-promo="${p.id}"
            class="text-xs font-bold ${p.is_active ? 'text-amber-500 hover:text-amber-400' : 'text-emerald-500 hover:text-emerald-400'} transition"
          >
            ${p.is_active ? 'Pause Rule' : 'Activate Rule'}
          </button>

          <div class="flex items-center space-x-1.5">
            <button
              type="button"
              data-edit-promo="${p.id}"
              class="p-2 rounded-[10px] glass-btn-secondary text-xs hover:text-[var(--accent)] transition"
              title="Edit Rule"
            >
              ${renderIcon('edit', 'w-3.5 h-3.5')}
            </button>
            <button
              type="button"
              data-delete-promo="${p.id}"
              class="p-2 rounded-[10px] glass-btn-secondary text-xs text-[var(--red)] hover:bg-red-500/10 transition"
              title="Delete Rule"
            >
              ${renderIcon('trash-2', 'w-3.5 h-3.5')}
            </button>
          </div>
        </div>
      </div>
    `).join('');

    this.container.innerHTML = `
      <div class="h-full flex flex-col overflow-hidden p-4 sm:p-6 space-y-5">
        
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[var(--line)] flex-shrink-0">
          <div>
            <h1 class="text-xl sm:text-2xl font-black font-heading text-[var(--text)] tracking-tight">Smart Promotions & Discounts</h1>
            <p class="text-xs text-[var(--muted)] font-medium">Create automated marketing rules, volume bundle discounts, and Happy Hour flash sales.</p>
          </div>

          <button
            type="button"
            id="create-promo-btn"
            class="px-5 py-2.5 rounded-[14px] glass-btn-primary text-xs font-black shadow-lg flex items-center space-x-1.5 active:scale-95 transition"
          >
            ${renderIcon('plus', 'w-4 h-4')}
            <span>New Promotion Rule</span>
          </button>
        </div>

        <!-- Metric Banners -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-shrink-0">
          <div class="p-4 rounded-[20px] glass-card flex items-center space-x-3.5">
            <div class="p-3 rounded-[14px] bg-purple-500/15 text-purple-500">
              ${renderIcon('sparkles', 'w-5 h-5')}
            </div>
            <div>
              <span class="text-[10px] uppercase font-bold text-[var(--muted)]">Active Campaigns</span>
              <strong class="text-lg font-black text-[var(--text)] block">${this.promotions.filter(p => p.is_active).length} Running</strong>
            </div>
          </div>

          <div class="p-4 rounded-[20px] glass-card flex items-center space-x-3.5">
            <div class="p-3 rounded-[14px] bg-emerald-500/15 text-emerald-500">
              ${renderIcon('gift', 'w-5 h-5')}
            </div>
            <div>
              <span class="text-[10px] uppercase font-bold text-[var(--muted)]">Auto Rule Evaluation</span>
              <strong class="text-lg font-black text-emerald-500 block">✓ Real-Time POS Engine</strong>
            </div>
          </div>

          <div class="p-4 rounded-[20px] glass-card flex items-center space-x-3.5">
            <div class="p-3 rounded-[14px] bg-amber-500/15 text-amber-500">
              ${renderIcon('clock', 'w-5 h-5')}
            </div>
            <div>
              <span class="text-[10px] uppercase font-bold text-[var(--muted)]">Happy Hour Flash Sales</span>
              <strong class="text-lg font-black text-[var(--text)] block">Scheduled Discounts</strong>
            </div>
          </div>
        </div>

        <!-- Promo Cards Grid -->
        <div class="flex-1 overflow-y-auto">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-6">
            ${promoCardsHtml}
          </div>
        </div>

      </div>
    `;
  }

  attachEvents() {
    // Create Promo
    const createBtn = this.container.querySelector('#create-promo-btn');
    if (createBtn) {
      createBtn.addEventListener('click', () => {
        this.openPromoModal();
      });
    }

    // Toggle
    this.container.querySelectorAll('[data-toggle-promo]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-toggle-promo');
        promotionsService.toggleActive(id);
        toast.success('Promotion status updated');
        this.init();
      });
    });

    // Edit
    this.container.querySelectorAll('[data-edit-promo]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-edit-promo');
        const promo = this.promotions.find(p => p.id === id);
        if (promo) this.openPromoModal(promo);
      });
    });

    // Delete
    this.container.querySelectorAll('[data-delete-promo]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-delete-promo');
        showConfirmDialog({
          title: 'Delete Promotional Rule?',
          message: 'Are you sure you want to remove this promotion?',
          confirmText: 'Yes, Delete Rule',
          danger: true,
          onConfirm: () => {
            promotionsService.deletePromotion(id);
            toast.info('Promotion deleted');
            this.init();
          }
        });
      });
    });
  }

  openPromoModal(promo = null) {
    const isEdit = !!promo;
    const p = isEdit ? promo : {
      name: '',
      type: 'percentage',
      value: 10,
      badge: '10% OFF',
      min_order_amount: 0,
      min_items: 1,
      is_active: true
    };

    const modalContent = `
      <form id="promo-rule-form" class="space-y-4">
        <div>
          <label class="block text-xs font-black text-[var(--text)] mb-1">Promotion Name *</label>
          <input
            name="name"
            type="text"
            required
            value="${p.name}"
            placeholder="e.g. Weekend Flash Sale 20%"
            class="glass-input w-full p-2.5 rounded-[12px] text-xs font-bold"
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-black text-[var(--text)] mb-1">Discount Type</label>
            <select name="type" class="glass-input w-full p-2.5 rounded-[12px] text-xs font-bold">
              <option value="percentage" ${p.type === 'percentage' ? 'selected' : ''}>Percentage (%) Off</option>
              <option value="fixed_amount" ${p.type === 'fixed_amount' ? 'selected' : ''}>Flat Cash (Rs./$) Off</option>
              <option value="volume" ${p.type === 'volume' ? 'selected' : ''}>Bulk Volume (% on X+ Items)</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-black text-[var(--text)] mb-1">Discount Value *</label>
            <input
              name="value"
              type="number"
              required
              min="1"
              value="${p.value}"
              placeholder="15"
              class="glass-input w-full p-2.5 rounded-[12px] text-xs font-mono font-bold"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-black text-[var(--text)] mb-1">Min Order Amount (Optional)</label>
            <input
              name="min_order_amount"
              type="number"
              min="0"
              value="${p.min_order_amount || 0}"
              class="glass-input w-full p-2.5 rounded-[12px] text-xs font-mono font-bold"
            />
          </div>
          <div>
            <label class="block text-xs font-black text-[var(--text)] mb-1">Badge Text</label>
            <input
              name="badge"
              type="text"
              value="${p.badge || 'PROMO'}"
              placeholder="e.g. 15% OFF"
              class="glass-input w-full p-2.5 rounded-[12px] text-xs font-bold"
            />
          </div>
        </div>

        <div class="pt-3 border-t border-[var(--line)] flex justify-end space-x-2.5">
          <button type="button" id="modal-cancel-btn" class="px-4 py-2 rounded-[12px] text-xs font-bold glass-btn-secondary">
            Cancel
          </button>
          <button type="submit" class="px-5 py-2 rounded-[12px] text-xs font-black glass-btn-primary shadow-md">
            ${isEdit ? 'Update Rule' : 'Create Promotion'}
          </button>
        </div>
      </form>
    `;

    const modal = new Modal({
      title: isEdit ? `Edit Rule: ${p.name}` : 'New Promotional Rule',
      size: 'md',
      content: modalContent,
      onOpen: (modalEl) => {
        const form = modalEl.querySelector('#promo-rule-form');
        const cancelBtn = modalEl.querySelector('#modal-cancel-btn');
        cancelBtn.addEventListener('click', () => modal.close());

        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const fd = new FormData(form);
          const data = {
            id: p.id,
            name: fd.get('name').trim(),
            type: fd.get('type'),
            value: Number(fd.get('value')) || 10,
            badge: fd.get('badge').trim() || `${fd.get('value')}% OFF`,
            min_order_amount: Number(fd.get('min_order_amount')) || 0,
            is_active: p.is_active !== false
          };

          promotionsService.savePromotion(data);
          toast.success(isEdit ? 'Promotion updated!' : 'Promotion created!');
          modal.close();
          this.init();
        });
      }
    });

    modal.open();
  }
}
