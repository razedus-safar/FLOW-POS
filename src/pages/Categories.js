/**
 * FlowPOS Categories & Brands Management View - Apple iOS 26 High-Contrast Edition
 * Full Add / Edit / Delete Category Modals with color pickers and icon selector
 */

import { productService } from '../services/products.js';
import { Modal } from '../components/Modal.js';
import { toast } from '../components/Toast.js';
import { showConfirmDialog } from '../components/ConfirmDialog.js';
import { renderIcon } from '../utils/icons.js';
import { sanitizeHtml } from '../utils/security.js';

const PRESET_COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ec4899',
  '#8b5cf6', '#0ea5e9', '#14b8a6', '#64748b',
  '#ef4444', '#f97316'
];

const PRESET_ICONS = [
  { id: 'layers', label: 'Layers' },
  { id: 'package', label: 'Package' },
  { id: 'shopping-bag', label: 'Bag' },
  { id: 'tag', label: 'Tag' },
  { id: 'sparkles', label: 'Sparkles' },
  { id: 'boxes', label: 'Boxes' },
  { id: 'award', label: 'Award' },
  { id: 'truck', label: 'Truck' }
];

export class CategoriesPage {
  constructor(container) {
    this.container = container;
    this.categories = [];
    this.products = [];
    this.init();
  }

  async init() {
    [this.categories, this.products] = await Promise.all([
      productService.getCategories(),
      productService.getAllProducts()
    ]);
    this.render();
    this.attachEvents();
  }

  render() {
    const productCounts = new Map();
    this.products.forEach(p => {
      const count = productCounts.get(p.category_id) || 0;
      productCounts.set(p.category_id, count + 1);
    });

    const categoryCardsHtml = this.categories.map(c => `
      <div class="glass-card p-4 rounded-[20px] border border-[var(--line)] flex flex-col justify-between space-y-3.5 shadow-xs hover:shadow-md transition group">
        <div class="flex items-center justify-between">
          <div class="p-2.5 rounded-[12px] text-white shadow-sm" style="background-color: ${sanitizeHtml(c.color_code || '#6366f1')}">
            ${renderIcon(c.icon || 'layers', 'w-5 h-5')}
          </div>
          <span class="badge badge-blue font-mono font-bold text-[10px]">
            ${productCounts.get(c.id) || 0} products
          </span>
        </div>

        <div>
          <h3 class="font-black text-sm text-[var(--text)] font-heading leading-tight">${sanitizeHtml(c.name)}</h3>
          <p class="text-[10px] text-[var(--muted)] font-mono font-bold mt-0.5">/${sanitizeHtml(c.slug)}</p>
        </div>

        <div class="pt-2 border-t border-[var(--line)] flex items-center justify-between">
          <div class="flex items-center space-x-1.5">
            <span class="w-3.5 h-3.5 rounded-full border border-white/20 shadow-xs" style="background-color: ${sanitizeHtml(c.color_code)}"></span>
            <span class="text-[11px] font-mono font-bold text-[var(--muted)]">${sanitizeHtml(c.color_code)}</span>
          </div>

          <div class="flex items-center space-x-1">
            <button
              type="button"
              data-edit-category="${sanitizeHtml(c.id)}"
              class="px-2.5 py-1 rounded-[8px] text-[11px] font-bold glass-btn-secondary hover:text-[var(--accent)] active:scale-95 transition"
            >
              Edit
            </button>
            <button
              type="button"
              data-delete-category="${sanitizeHtml(c.id)}"
              class="p-1 rounded-[8px] text-[var(--muted)] hover:text-red-500 hover:bg-red-500/10 active:scale-95 transition"
              title="Delete Category"
            >
              ${renderIcon('trash-2', 'w-3.5 h-3.5')}
            </button>
          </div>
        </div>
      </div>
    `).join('');

    this.container.innerHTML = `
      <div class="h-full overflow-y-auto p-4 sm:p-6 space-y-5">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 class="text-xl sm:text-2xl font-black font-heading text-[var(--text)] tracking-tight">Product Categories</h1>
            <p class="text-xs text-[var(--muted)] font-medium">Organize catalog items by department, color themes, and icons.</p>
          </div>
          <button id="add-category-btn" class="px-4 py-2.5 rounded-[14px] text-xs font-black glass-btn-primary flex items-center space-x-2 shadow-md self-start sm:self-auto active:scale-95 transition">
            ${renderIcon('plus', 'w-4 h-4')}
            <span>Add Category</span>
          </button>
        </div>

        <!-- Grid Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          ${categoryCardsHtml}
        </div>
      </div>
    `;
  }

  attachEvents() {
    const addBtn = this.container.querySelector('#add-category-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        this.openCategoryModal();
      });
    }

    this.container.querySelectorAll('[data-edit-category]').forEach(btn => {
      btn.addEventListener('click', () => {
        const catId = btn.getAttribute('data-edit-category');
        const cat = this.categories.find(c => c.id === catId);
        if (cat) this.openCategoryModal(cat);
      });
    });

    this.container.querySelectorAll('[data-delete-category]').forEach(btn => {
      btn.addEventListener('click', () => {
        const catId = btn.getAttribute('data-delete-category');
        const cat = this.categories.find(c => c.id === catId);
        if (!cat) return;

        const prodCount = this.products.filter(p => p.category_id === catId).length;
        showConfirmDialog({
          title: 'Delete Category',
          message: `Are you sure you want to delete "${cat.name}"? ${prodCount > 0 ? `It currently contains ${prodCount} products.` : ''}`,
          confirmText: 'Delete Category',
          isDanger: true,
          onConfirm: async () => {
            await productService.deleteCategory(catId);
            toast.success(`Category "${cat.name}" removed`);
            await this.init();
          }
        });
      });
    });
  }

  openCategoryModal(cat = null) {
    const isEdit = Boolean(cat);
    let selectedColor = cat?.color_code || PRESET_COLORS[0];
    let selectedIcon = cat?.icon || PRESET_ICONS[0].id;

    const modal = new Modal({
      title: isEdit ? 'Edit Category' : 'Create New Category',
      content: `
        <form id="category-form" class="space-y-4">
          <div>
            <label class="block text-xs font-black text-[var(--text)] mb-1">Category Name *</label>
            <input
              id="cat-name-input"
              name="name"
              type="text"
              required
              value="${cat ? cat.name : ''}"
              placeholder="e.g. Specialty Beverages"
              class="glass-input w-full p-2.5 rounded-[12px] text-xs font-bold"
            />
          </div>

          <div>
            <label class="block text-xs font-black text-[var(--text)] mb-1">URL Slug</label>
            <input
              id="cat-slug-input"
              name="slug"
              type="text"
              value="${cat ? cat.slug : ''}"
              placeholder="e.g. specialty-beverages"
              class="glass-input w-full p-2.5 rounded-[12px] text-xs font-mono font-semibold"
            />
          </div>

          <!-- Color Chooser -->
          <div>
            <label class="block text-xs font-black text-[var(--text)] mb-1.5">Theme Color</label>
            <div class="flex items-center gap-2 flex-wrap mb-2">
              ${PRESET_COLORS.map(color => `
                <button
                  type="button"
                  data-select-color="${color}"
                  class="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 shadow-xs flex items-center justify-center ${selectedColor === color ? 'border-[var(--accent)] scale-110 ring-2 ring-[var(--accent)]/40' : 'border-white/30'}"
                  style="background-color: ${color}"
                >
                  ${selectedColor === color ? '<span class="text-white text-xs font-bold">✓</span>' : ''}
                </button>
              `).join('')}
              <input
                id="cat-color-picker"
                type="color"
                value="${selectedColor}"
                class="w-7 h-7 rounded-full border-0 cursor-pointer overflow-hidden p-0"
                title="Custom color"
              />
            </div>
            <input type="hidden" name="color_code" id="cat-color-hidden" value="${selectedColor}" />
          </div>

          <!-- Icon Chooser -->
          <div>
            <label class="block text-xs font-black text-[var(--text)] mb-1.5">Icon Style</label>
            <div class="grid grid-cols-4 gap-2">
              ${PRESET_ICONS.map(ic => `
                <button
                  type="button"
                  data-select-icon="${ic.id}"
                  class="p-2.5 rounded-[12px] border text-xs font-bold flex flex-col items-center justify-center space-y-1 transition ${selectedIcon === ic.id ? 'border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent)] font-black ring-1 ring-[var(--accent)]' : 'border-[var(--line)] glass-card text-[var(--text)] hover:bg-white/40 dark:hover:bg-white/5'}"
                >
                  <span>${renderIcon(ic.id, 'w-4 h-4')}</span>
                  <span class="text-[9.5px]">${ic.label}</span>
                </button>
              `).join('')}
            </div>
            <input type="hidden" name="icon" id="cat-icon-hidden" value="${selectedIcon}" />
          </div>

          <div class="pt-3 border-t border-[var(--line)] flex items-center justify-end space-x-2">
            <button type="button" id="cat-modal-cancel" class="px-4 py-2 rounded-[12px] text-xs font-bold glass-btn-secondary">
              Cancel
            </button>
            <button type="submit" class="px-5 py-2 rounded-[12px] text-xs font-black glass-btn-primary shadow-md">
              ${isEdit ? 'Save Changes' : 'Create Category'}
            </button>
          </div>
        </form>
      `,
      onOpen: (modalEl) => {
        const form = modalEl.querySelector('#category-form');
        const nameInput = modalEl.querySelector('#cat-name-input');
        const slugInput = modalEl.querySelector('#cat-slug-input');
        const colorHidden = modalEl.querySelector('#cat-color-hidden');
        const colorPicker = modalEl.querySelector('#cat-color-picker');
        const iconHidden = modalEl.querySelector('#cat-icon-hidden');
        const cancelBtn = modalEl.querySelector('#cat-modal-cancel');

        // Auto slug from name
        if (nameInput && slugInput && !isEdit) {
          nameInput.addEventListener('input', () => {
            slugInput.value = nameInput.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
          });
        }

        // Color buttons
        modalEl.querySelectorAll('[data-select-color]').forEach(btn => {
          btn.addEventListener('click', () => {
            const color = btn.getAttribute('data-select-color');
            selectedColor = color;
            colorHidden.value = color;
            if (colorPicker) colorPicker.value = color;
            modalEl.querySelectorAll('[data-select-color]').forEach(b => {
              b.className = b.getAttribute('data-select-color') === color
                ? 'w-7 h-7 rounded-full border-2 border-[var(--accent)] scale-110 ring-2 ring-[var(--accent)]/40 shadow-xs flex items-center justify-center transition-transform'
                : 'w-7 h-7 rounded-full border-2 border-white/30 shadow-xs flex items-center justify-center transition-transform hover:scale-110';
              b.innerHTML = b.getAttribute('data-select-color') === color ? '<span class="text-white text-xs font-bold">✓</span>' : '';
            });
          });
        });

        if (colorPicker) {
          colorPicker.addEventListener('input', (e) => {
            selectedColor = e.target.value;
            colorHidden.value = selectedColor;
          });
        }

        // Icon buttons
        modalEl.querySelectorAll('[data-select-icon]').forEach(btn => {
          btn.addEventListener('click', () => {
            const iconId = btn.getAttribute('data-select-icon');
            selectedIcon = iconId;
            iconHidden.value = iconId;
            modalEl.querySelectorAll('[data-select-icon]').forEach(b => {
              const isSel = b.getAttribute('data-select-icon') === iconId;
              b.className = isSel
                ? 'p-2.5 rounded-[12px] border border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent)] font-black ring-1 ring-[var(--accent)] text-xs flex flex-col items-center justify-center space-y-1 transition'
                : 'p-2.5 rounded-[12px] border border-[var(--line)] glass-card text-[var(--text)] hover:bg-white/40 dark:hover:bg-white/5 text-xs font-bold flex flex-col items-center justify-center space-y-1 transition';
            });
          });
        });

        if (cancelBtn) {
          cancelBtn.addEventListener('click', () => modal.close());
        }

        if (form) {
          form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fd = new FormData(form);
            const name = fd.get('name')?.trim();
            const slug = fd.get('slug')?.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            const color_code = fd.get('color_code') || selectedColor;
            const icon = fd.get('icon') || selectedIcon;

            if (!name) {
              toast.error('Category name is required');
              return;
            }

            const categoryData = {
              ...(cat || {}),
              name,
              slug,
              color_code,
              icon
            };

            try {
              await productService.saveCategory(categoryData);
              modal.close();
              toast.success(`Category "${name}" ${isEdit ? 'updated' : 'created'} successfully!`);
              await this.init();
            } catch (err) {
              console.error('Save category error:', err);
              toast.error('Failed to save category');
            }
          });
        }
      }
    });

    modal.open();
  }
}
