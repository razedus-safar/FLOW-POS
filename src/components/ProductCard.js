/**
 * FlowPOS Product Card Component - Large & Readable Edition
 * Collision-free badges, luminous squircle framing, clear typography, and tactile spring interactions
 */

import { renderIcon } from '../utils/icons.js';
import { formatCurrency } from '../utils/currency.js';
import { settingsService } from '../services/settings.js';
import { openModifierModal } from './ModifierModal.js';

export function createProductCard(product, onAddToCart) {
  const stockQty = Number(product.stock_quantity) || 0;
  const settings = settingsService.get();
  const showStockBadges = settings?.workspace?.showStockBadges !== false;
  const allowNegative = Boolean(settings?.workspace?.allowNegativeInventory || settings?.checkout?.allowNegativeInventory);

  const isOutOfStock = stockQty <= 0;
  const isLowStock = !isOutOfStock && stockQty <= (Number(product.reorder_level) || 8);
  const isCardDisabled = isOutOfStock && !allowNegative;
  const hasCustomizations = (product.variants && product.variants.length > 0) || (product.modifiers && product.modifiers.length > 0);

  const card = document.createElement('article');
  card.className = `product group relative flex flex-col justify-between rounded-[20px] p-3 sm:p-3.5 glass-card border border-[var(--line)] transition-all duration-200 overflow-hidden select-none ${isCardDisabled ? 'opacity-50 grayscale cursor-not-allowed' : 'cursor-pointer active:scale-98 hover:shadow-md'}`;
  card.setAttribute('data-product-id', product.id);

  const imgSrc = product.image_url || 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=500&auto=format&fit=crop&q=80';
  
  // Format clean category label
  let categoryLabel = product.category_name || 'General';
  if (categoryLabel.includes('&')) {
    categoryLabel = categoryLabel.split('&')[0].trim();
  }

  card.innerHTML = `
    <!-- Top Squircle Artwork Container -->
    <div class="art relative w-full h-32 sm:h-36 rounded-[14px] bg-slate-100 dark:bg-white/[0.04] flex items-center justify-center overflow-hidden border border-[var(--line)]">
      <img
        src="${imgSrc}"
        alt="${product.name}"
        loading="lazy"
        class="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300"
        onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
      />
      <div class="hidden w-full h-full items-center justify-center text-3xl">
        📦
      </div>

      <!-- Single Floating Stock Badge at Top-Right (No overlap) -->
      ${showStockBadges ? `
        <span class="stock absolute top-2 right-2 badge text-[9.5px] px-2 py-0.5 shadow-sm font-bold ${isOutOfStock ? 'badge-danger' : isLowStock ? 'badge-amber' : 'badge-emerald'}">
          ${isOutOfStock ? 'Out of stock' : `${product.stock_quantity} in stock`}
        </span>
      ` : ''}

      ${hasCustomizations ? `
        <span class="absolute bottom-2 left-2 badge badge-platinum text-[9px] px-2 py-0.5 font-extrabold shadow-sm">
          ⚙ Options
        </span>
      ` : ''}
    </div>

    <!-- Product Info Details -->
    <div class="info pt-2.5 pb-0.5 px-0.5 flex flex-col flex-1 justify-between space-y-2">
      <div>
        <div class="flex items-center gap-1.5 mb-1 flex-wrap">
          <span class="badge badge-blue text-[9px] px-1.5 py-0.2 rounded-md font-bold truncate max-w-[120px]">
            ${categoryLabel}
          </span>
          <span class="text-[9.5px] text-[var(--muted)] font-mono font-bold truncate">
            ${product.sku || 'SKU'}
          </span>
        </div>
        <h3 class="text-xs sm:text-sm font-black text-[var(--text)] line-clamp-2 group-hover:text-[var(--accent)] transition-colors leading-snug tracking-tight">
          ${product.name}
        </h3>
      </div>

      <!-- Price & Big Tap Target Add Button -->
      <div class="price-row flex items-center justify-between pt-1 border-t border-[var(--line)]/60">
        <span class="font-mono text-sm sm:text-base font-black text-[var(--text)] tracking-tight">
          ${formatCurrency(product.selling_price || product.price)}
        </span>

        <button
          type="button"
          data-add-btn="${product.id}"
          class="w-8 h-8 sm:w-9 sm:h-9 rounded-[10px] sm:rounded-[12px] bg-[var(--accent)] text-white flex items-center justify-center hover:opacity-90 active:scale-90 transition-transform shadow-xs flex-shrink-0"
          title="${hasCustomizations ? 'Customize options' : 'Add to Cart'}"
        >
          ${renderIcon(hasCustomizations ? 'sliders' : 'plus', 'w-4 h-4')}
        </button>
      </div>
    </div>
  `;

  const handleAction = () => {
    if (isCardDisabled) return;
    if (hasCustomizations) {
      openModifierModal(product, (customized) => {
        if (onAddToCart) onAddToCart(customized);
      });
    } else {
      if (onAddToCart) onAddToCart(product);
    }
  };

  // Attach card click handlers
  card.addEventListener('click', handleAction);

  const addBtn = card.querySelector('[data-add-btn]');
  if (addBtn) {
    addBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleAction();
    });
  }

  return card;
}
