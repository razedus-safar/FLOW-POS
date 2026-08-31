/**
 * FlowPOS Product Variants & Modifiers Customization Modal
 * Allows cashiers to select sizes, colors, add-on toppings, and customizations
 */

import { Modal } from './Modal.js';
import { formatCurrency } from '../utils/currency.js';
import { renderIcon } from '../utils/icons.js';
import { cartStore } from '../store/cart.js';
import { soundManager } from '../utils/audio.js';
import { toast } from './Toast.js';

export function openModifierModal(product, onAdded = null) {
  const basePrice = Number(product.selling_price || product.price || 0);
  const variants = product.variants || [];
  const modifierGroups = product.modifiers || [];

  let selectedVariant = variants.length > 0 ? variants[0] : null;
  const selectedModifiers = new Set(); // set of modifier option objects

  const calculateTotal = () => {
    let price = selectedVariant ? Number(selectedVariant.price || basePrice) : basePrice;
    selectedModifiers.forEach(m => {
      price += Number(m.price || 0);
    });
    return price;
  };

  const renderVariantsHtml = () => {
    if (variants.length === 0) return '';
    return `
      <div class="space-y-2">
        <label class="block text-xs font-black text-[var(--text)] uppercase tracking-wider">Select Option / Variant</label>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
          ${variants.map(v => {
            const isSelected = selectedVariant?.id === v.id;
            return `
              <button
                type="button"
                data-select-variant="${v.id}"
                class="p-3 rounded-[14px] text-left border transition-all ${isSelected ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/30 bg-[var(--accent)]/10' : 'border-[var(--line)] glass-card hover:border-[var(--accent)]'}"
              >
                <strong class="text-xs font-black text-[var(--text)] block truncate">${v.name}</strong>
                <span class="text-xs font-mono font-bold text-[var(--accent)] mt-0.5 block">${formatCurrency(v.price || basePrice)}</span>
              </button>
            `;
          }).join('')}
        </div>
      </div>
    `;
  };

  const renderModifiersHtml = () => {
    if (modifierGroups.length === 0) return '';
    return modifierGroups.map(group => `
      <div class="space-y-2 pt-2 border-t border-[var(--line)]">
        <label class="block text-xs font-black text-[var(--text)] uppercase tracking-wider">${group.name}</label>
        <div class="grid grid-cols-2 gap-2">
          ${(group.options || []).map((opt, optIdx) => {
            const isChecked = Array.from(selectedModifiers).some(m => m.name === opt.name);
            return `
              <label class="flex items-center justify-between p-2.5 rounded-[12px] glass-card border border-[var(--line)] hover:border-[var(--accent)] cursor-pointer transition select-none">
                <div class="flex items-center space-x-2 min-w-0">
                  <input
                    type="checkbox"
                    data-mod-group="${group.name}"
                    data-mod-name="${opt.name}"
                    data-mod-price="${opt.price || 0}"
                    ${isChecked ? 'checked' : ''}
                    class="rounded text-[var(--accent)] focus:ring-0"
                  />
                  <span class="text-xs font-bold text-[var(--text)] truncate">${opt.name}</span>
                </div>
                ${opt.price > 0 ? `<span class="text-[11px] font-mono font-black text-[var(--accent)]">+${formatCurrency(opt.price)}</span>` : '<span class="text-[10px] text-slate-400 font-medium">Free</span>'}
              </label>
            `;
          }).join('')}
        </div>
      </div>
    `).join('');
  };

  const contentHtml = `
    <div class="space-y-4">
      <!-- Product Header -->
      <div class="flex items-center space-x-3.5 pb-3 border-b border-[var(--line)]">
        <div class="w-14 h-14 rounded-[16px] bg-[var(--glass-bg-clear)] flex items-center justify-center overflow-hidden flex-shrink-0 border border-[var(--line)] shadow-xs">
          ${product.image_url ? `<img src="${product.image_url}" alt="${product.name}" class="w-full h-full object-cover" />` : `<span class="text-xl font-black">${product.name.substring(0, 1)}</span>`}
        </div>
        <div class="min-w-0 flex-1">
          <h3 class="font-heading font-black text-sm text-[var(--text)] truncate">${product.name}</h3>
          <p class="text-xs text-[var(--muted)] truncate">${product.description || 'Customizable menu item'}</p>
          <span class="text-xs font-mono font-bold text-[var(--accent)] mt-0.5 block">Base: ${formatCurrency(basePrice)}</span>
        </div>
      </div>

      <!-- Variants Selection -->
      <div id="variants-container">
        ${renderVariantsHtml()}
      </div>

      <!-- Modifiers & Add-ons -->
      <div id="modifiers-container" class="space-y-3">
        ${renderModifiersHtml()}
      </div>

      <!-- Add to Cart Footer Action -->
      <div class="pt-3 border-t border-[var(--line)] flex items-center justify-between gap-3">
        <div>
          <span class="text-[10px] uppercase font-bold text-[var(--muted)] block">Customized Price</span>
          <strong id="modal-calculated-total" class="text-xl font-black font-mono text-[var(--text)]">
            ${formatCurrency(calculateTotal())}
          </strong>
        </div>

        <button
          type="button"
          id="add-customized-cart-btn"
          class="px-6 py-3 rounded-[16px] glass-btn-primary text-xs font-black shadow-lg flex items-center space-x-2 active:scale-95 transition"
        >
          <span>Add to Basket</span>
          <span>→</span>
        </button>
      </div>
    </div>
  `;

  const modal = new Modal({
    title: `Customize: ${product.name}`,
    size: 'md',
    content: contentHtml,
    onOpen: (modalEl) => {
      const updateTotalDisplay = () => {
        const totalEl = modalEl.querySelector('#modal-calculated-total');
        if (totalEl) totalEl.textContent = formatCurrency(calculateTotal());
      };

      // Variant Buttons
      modalEl.querySelectorAll('[data-select-variant]').forEach(btn => {
        btn.addEventListener('click', () => {
          const varId = btn.getAttribute('data-select-variant');
          selectedVariant = variants.find(v => v.id === varId) || selectedVariant;
          modalEl.querySelectorAll('[data-select-variant]').forEach(b => {
            b.className = 'p-3 rounded-[14px] text-left border border-[var(--line)] glass-card hover:border-[var(--accent)] transition-all';
          });
          btn.className = 'p-3 rounded-[14px] text-left border border-[var(--accent)] ring-2 ring-[var(--accent)]/30 bg-[var(--accent)]/10 transition-all';
          updateTotalDisplay();
        });
      });

      // Modifier Checkboxes
      modalEl.querySelectorAll('[data-mod-name]').forEach(cb => {
        cb.addEventListener('change', (e) => {
          const name = cb.getAttribute('data-mod-name');
          const price = Number(cb.getAttribute('data-mod-price')) || 0;
          if (e.target.checked) {
            selectedModifiers.add({ name, price });
          } else {
            Array.from(selectedModifiers).forEach(m => {
              if (m.name === name) selectedModifiers.delete(m);
            });
          }
          updateTotalDisplay();
        });
      });

      // Submit Button
      const addBtn = modalEl.querySelector('#add-customized-cart-btn');
      if (addBtn) {
        addBtn.addEventListener('click', () => {
          const finalPrice = calculateTotal();
          const modNames = Array.from(selectedModifiers).map(m => m.name);
          const variantName = selectedVariant ? selectedVariant.name : '';
          
          let displayName = product.name;
          if (variantName) displayName += ` (${variantName})`;
          if (modNames.length > 0) displayName += ` + ${modNames.join(', ')}`;

          const customizedItem = {
            ...product,
            id: `${product.id}-${selectedVariant?.id || 'base'}-${modNames.join('-')}`,
            name: displayName,
            price: finalPrice,
            selling_price: finalPrice,
            is_customized: true
          };

          cartStore.addItem(customizedItem, 1);
          soundManager.playBeep();
          toast.success(`Added ${displayName}`);
          modal.close();
          if (onAdded) onAdded(customizedItem);
        });
      }
    }
  });

  modal.open();
}
