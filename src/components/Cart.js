/**
 * FlowPOS Real-Time Cart Panel Component - Large & High Readability Edition
 * Features floating customer capsule, larger quantity steppers, live tax breakdown, and clear checkout button
 */

import { renderIcon } from '../utils/icons.js';
import { formatCurrency, getCurrencyConfig } from '../utils/currency.js';
import { cartStore } from '../store/cart.js';
import { globalStore } from '../store/state.js';
import { showConfirmDialog } from './ConfirmDialog.js';

export class CartPanel {
  constructor(container, { onCheckout, onCustomerSelect }) {
    this.container = container;
    this.onCheckout = onCheckout;
    this.onCustomerSelect = onCustomerSelect;
    this.render();
    this.attachEvents();
    this.subscribeStores();
  }

  subscribeStores() {
    globalStore.subscribe('cart', () => {
      this.render();
      this.attachEvents();
    });
  }

  render() {
    const cartData = globalStore.get('cart', {
      items: [],
      customer: null,
      discount: { type: 'percentage', value: 0 },
      taxRate: 10,
      totals: { subtotal: 0, discountAmount: 0, taxAmount: 0, total: 0, itemCount: 0 },
      suspendedCarts: []
    });

    const { items, customer, discount, taxRate, totals, suspendedCarts } = cartData;
    const hasItems = items.length > 0;
    const currency = getCurrencyConfig();

    const itemsHtml = items.map((item) => `
      <div class="item group relative grid grid-cols-[48px_1fr_auto] gap-3 items-center p-3 rounded-[18px] glass-card shadow-xs transition-all duration-150" data-cart-item="${item.product.id}">
        <!-- Thumbnail -->
        <div class="mini w-12 h-12 rounded-[14px] bg-[var(--glass-bg-clear)] flex items-center justify-center overflow-hidden border border-[var(--line)] flex-shrink-0">
          <img src="${item.product.image_url}" alt="${item.product.name}" class="w-full h-full object-contain p-1" onerror="this.src='https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&auto=format&fit=crop&q=80'" />
        </div>
        
        <!-- Info & Stepper -->
        <div class="min-w-0 pr-1">
          <strong class="block text-sm font-black text-[var(--text)] truncate leading-snug tracking-tight">${item.product.name}</strong>
          <small class="block text-xs text-[var(--muted)] font-mono font-bold mt-0.5">${formatCurrency(item.unit_price)} each</small>
          
          <!-- Stepper Capsule -->
          <div class="qty flex items-center gap-1 mt-1.5 bg-[var(--glass-bg-clear)] p-0.8 rounded-[12px] border border-[var(--line)] w-fit">
            <button data-qty-dec="${item.product.id}" class="w-6 h-6 rounded-[8px] bg-[var(--card-bg)] text-[var(--text)] font-black text-sm flex items-center justify-center hover:bg-[var(--accent)] hover:text-white active:scale-90 transition shadow-xs">
              −
            </button>
            <b class="text-xs font-mono font-black text-[var(--text)] min-w-[20px] text-center">${item.quantity}</b>
            <button data-qty-inc="${item.product.id}" class="w-6 h-6 rounded-[8px] bg-[var(--card-bg)] text-[var(--text)] font-black text-sm flex items-center justify-center hover:bg-[var(--accent)] hover:text-white active:scale-90 transition shadow-xs">
              +
            </button>
          </div>
        </div>

        <!-- Line Total & Delete -->
        <div class="text-right flex flex-col items-end min-w-[70px]">
          <span class="line text-sm font-black font-mono text-[var(--text)]">${formatCurrency(item.quantity * item.unit_price)}</span>
          <button data-remove-item="${item.product.id}" class="text-xs text-[var(--red)] hover:opacity-80 transition font-bold mt-2 p-1 rounded-md" title="Remove item">
            ${renderIcon('trash-2', 'w-4 h-4')}
          </button>
        </div>
      </div>
    `).join('');

    this.container.innerHTML = `
      <aside class="cart glass h-full flex flex-col rounded-[26px] p-4 sm:p-5 border border-[var(--line)] shadow-xl overflow-hidden select-none">
        <!-- Cart Header -->
        <div class="carthead flex items-center justify-between pb-3 border-b border-[var(--line)]">
          <div class="flex items-center space-x-2">
            <h2 class="text-lg font-black font-heading text-[var(--text)] m-0">Current Order</h2>
          </div>
          <div class="flex items-center space-x-2">
            <span class="count bg-[var(--accent)]/10 text-[var(--accent)] px-3 py-1 rounded-full text-xs font-black border border-[var(--accent)]/20" id="count">
              ${totals.itemCount} ${totals.itemCount === 1 ? 'item' : 'items'}
            </span>
            ${hasItems ? `
              <button id="clear-cart-btn" class="p-1.5 rounded-lg text-[var(--red)] hover:bg-red-500/10 transition" title="Clear order">
                ${renderIcon('trash-2', 'w-4 h-4')}
              </button>
            ` : ''}
          </div>
        </div>

        <!-- Customer Attachment Banner -->
        <div class="customer my-3 p-3 rounded-[18px] glass-card flex items-center gap-2.5 shadow-xs">
          ${customer ? `
            <div class="avatar w-8 h-8 rounded-full bg-gradient-to-tr from-[#0066CC] to-[#7E22CE] text-white font-black text-xs grid place-items-center flex-shrink-0 shadow-xs">
              ${customer.name.substring(0, 2).toUpperCase()}
            </div>
            <div class="min-w-0 flex-1">
              <strong class="block text-sm font-black text-[var(--text)] truncate">${customer.name}</strong>
              <small class="block text-[10px] text-[var(--accent)] font-extrabold mt-0.5 truncate uppercase">${customer.tier} Tier · ${customer.loyalty_points || 0} pts</small>
            </div>
            <button id="remove-customer-btn" class="text-lg text-[var(--muted)] hover:text-[var(--red)] p-1 rounded-lg transition leading-none font-bold">
              ×
            </button>
          ` : `
            <button id="assign-customer-btn" class="w-full flex items-center justify-between py-1 px-1 text-sm text-[var(--text)] hover:text-[var(--accent)] font-bold transition group">
              <span class="flex items-center gap-2">
                <span class="text-[var(--accent)] group-hover:scale-110 transition-transform">${renderIcon('users', 'w-4 h-4')}</span>
                <span>Attach Customer</span>
              </span>
              <span class="text-xs text-[var(--accent)] font-black px-2.5 py-0.8 rounded-full bg-[var(--accent)]/10">+ Select</span>
            </button>
          `}
        </div>

        <!-- Suspended Carts Notice -->
        ${suspendedCarts.length > 0 ? `
          <div class="mb-2 px-3 py-2 rounded-[12px] bg-amber-500/15 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-300 font-bold flex items-center justify-between">
            <span>${suspendedCarts.length} held cart(s)</span>
            <button id="view-held-carts-btn" class="underline font-black hover:opacity-80">Resume</button>
          </div>
        ` : ''}

        <!-- Cart Items Scrollable List -->
        <div class="cartitems flex-1 overflow-y-auto pr-0.5 flex flex-col gap-2.5 my-1.5 scrollbar-none">
          ${hasItems ? itemsHtml : `
            <div class="empty py-16 flex flex-col items-center justify-center text-[var(--muted)] text-center">
              <div class="text-4xl mb-2">🛒</div>
              <strong class="text-sm text-[var(--text)] font-black">Your basket is empty</strong>
              <span class="text-xs text-[var(--muted)] mt-1 font-medium">Click or scan products to start sale.</span>
            </div>
          `}
        </div>

        <!-- Summary & Totals -->
        <div class="summary pt-3 mt-auto border-t border-[var(--line)] space-y-2">
          <div class="sumrow flex justify-between text-sm text-[var(--muted)] font-medium">
            <span>Subtotal</span>
            <span class="font-mono text-[var(--text)] font-black">${formatCurrency(totals.subtotal)}</span>
          </div>

          ${discount.value > 0 ? `
            <div class="sumrow flex justify-between text-sm text-[var(--green)] font-black">
              <span>Discount</span>
              <span class="font-mono">−${formatCurrency(totals.discountAmount)}</span>
            </div>
          ` : ''}

          <div class="sumrow flex justify-between text-sm text-[var(--muted)] font-medium">
            <span>VAT / Tax (${taxRate}%)</span>
            <span class="font-mono text-[var(--text)] font-black">${formatCurrency(totals.taxAmount)}</span>
          </div>

          <div class="total border-t border-[var(--line)] pt-3 mt-2 flex justify-between items-end">
            <span class="text-sm text-[var(--muted)] font-bold">Total Due</span>
            <span class="text-3xl font-black font-mono text-[var(--accent)] tracking-tight">${formatCurrency(totals.total)}</span>
          </div>

          <!-- Checkout Big Button -->
          <button
            id="cart-checkout-btn"
            class="checkout w-full h-13 mt-3 rounded-[16px] font-black text-sm flex items-center justify-center space-x-2 transition-all ${hasItems ? 'glass-btn-primary shadow-xl text-white active:scale-98 cursor-pointer' : 'bg-slate-200 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'}"
            ${!hasItems ? 'disabled' : ''}
          >
            <span>Complete Sale · ${formatCurrency(totals.total)}</span>
            <span class="text-base font-black">→</span>
          </button>

          <!-- Quick Payment Row with Premium SVG Vector Icons -->
          <div class="payrow grid grid-cols-3 gap-2 mt-2">
            <button data-quick-pay="cash" class="glass-btn-secondary h-10 rounded-[12px] text-xs font-bold flex items-center justify-center space-x-1.5 ${!hasItems ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'hover:border-emerald-500 hover:text-emerald-700 active:scale-95'}">
              ${renderIcon('banknote', 'w-4 h-4 text-emerald-600')}
              <span>Cash</span>
            </button>
            <button data-quick-pay="card" class="glass-btn-secondary h-10 rounded-[12px] text-xs font-bold flex items-center justify-center space-x-1.5 ${!hasItems ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'hover:border-blue-500 hover:text-blue-700 active:scale-95'}">
              ${renderIcon('credit-card', 'w-4 h-4 text-blue-600')}
              <span>Card</span>
            </button>
            <button data-quick-pay="split" class="glass-btn-secondary h-10 rounded-[12px] text-xs font-bold flex items-center justify-center space-x-1.5 ${!hasItems ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'hover:border-purple-500 hover:text-purple-700 active:scale-95'}">
              ${renderIcon('layers', 'w-4 h-4 text-purple-600')}
              <span>Split</span>
            </button>
          </div>

          <div class="note text-center text-[10px] text-[var(--muted)] pt-1 font-semibold">
            F2 checkout · / search · Barcode scanner ready
          </div>
        </div>
      </aside>
    `;
  }

  attachEvents() {
    this.container.querySelectorAll('[data-qty-inc]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-qty-inc');
        cartStore.updateQuantity(id, 1);
      });
    });

    this.container.querySelectorAll('[data-qty-dec]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-qty-dec');
        const cartData = globalStore.get('cart');
        const item = cartData.items.find(i => i.product.id === id);
        if (item && item.quantity === 1) {
          cartStore.removeItem(id);
        } else {
          cartStore.updateQuantity(id, -1);
        }
      });
    });

    this.container.querySelectorAll('[data-remove-item]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-remove-item');
        cartStore.removeItem(id);
      });
    });

    const clearBtn = this.container.querySelector('#clear-cart-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        showConfirmDialog({
          title: 'Clear Basket',
          message: 'Are you sure you want to clear all items in the active basket?',
          confirmText: 'Clear Basket',
          isDanger: true,
          onConfirm: () => cartStore.clear()
        });
      });
    }

    const assignCustBtn = this.container.querySelector('#assign-customer-btn');
    if (assignCustBtn) {
      assignCustBtn.addEventListener('click', () => {
        if (this.onCustomerSelect) this.onCustomerSelect();
      });
    }

    const removeCustBtn = this.container.querySelector('#remove-customer-btn');
    if (removeCustBtn) {
      removeCustBtn.addEventListener('click', () => {
        cartStore.setCustomer(null);
      });
    }

    const checkoutBtn = this.container.querySelector('#cart-checkout-btn');
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', () => {
        if (this.onCheckout) this.onCheckout();
      });
    }

    this.container.querySelectorAll('[data-quick-pay]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.onCheckout) this.onCheckout(btn.getAttribute('data-quick-pay'));
      });
    });

    const heldBtn = this.container.querySelector('#view-held-carts-btn');
    if (heldBtn) {
      heldBtn.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('flowpos:open-held-carts'));
      });
    }
  }
}
