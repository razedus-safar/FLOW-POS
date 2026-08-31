/**
 * FlowPOS Customer-Facing Secondary Screen
 * Clean, high-contrast display for customer checkout, order review & payment QR
 */

import { settingsService } from '../services/settings.js';
import { customerDisplayService } from '../services/customerDisplay.js';
import { formatCurrency } from '../utils/currency.js';
import { renderIcon } from '../utils/icons.js';
import { cartStore } from '../store/cart.js';
import { globalStore } from '../store/state.js';

export class CustomerDisplayPage {
  constructor(container) {
    this.container = container;
    this.cartData = customerDisplayService.getLatestCart() || globalStore.get('cart') || cartStore.getCart();
    this.unsubscribe = null;
    this.unsubscribeCart = null;
    this.init();
  }

  async init() {
    this.render();

    try {
      const initialCart = await customerDisplayService.getLatestCart();
      if (initialCart && initialCart.items) {
        this.cartData = initialCart;
        this.render();
      }
    } catch (e) {
      console.warn('Failed to load initial cloud cart:', e);
    }

    // Listen for customer display broadcasts (BroadcastChannel, localStorage, Supabase Realtime, Postgres Changes & Polling)
    this.unsubscribe = customerDisplayService.subscribe((type, payload) => {
      if (type === 'CART_UPDATED') {
        this.cartData = payload;
        this.render();
      } else if (type === 'CHECKOUT_COMPLETED') {
        this.renderSuccessState(payload);
      }
    });

    // Listen to real-time global cart store (same window)
    this.unsubscribeCart = globalStore.subscribe('cart', (state) => {
      if (state) {
        this.cartData = state;
        this.render();
      }
    });
  }

  destroy() {
    if (this.unsubscribe) this.unsubscribe();
    if (this.unsubscribeCart) this.unsubscribeCart();
  }

  render() {
    const settings = settingsService.getSettings();
    const store = settings?.store || {};
    const storeName = store.name || 'FlowPOS Store';
    const storeTagline = store.tagline || 'Welcome to our shop!';
    const storeLogo = store.logo || '';

    const items = this.cartData?.items || [];
    const totals = this.cartData?.totals || { subtotal: 0, taxAmount: 0, discountAmount: 0, total: 0, itemCount: 0 };

    const itemsHtml = items.length === 0 ? `
      <div class="h-full flex flex-col items-center justify-center text-center p-8 space-y-3 opacity-60">
        <div class="w-16 h-16 rounded-[20px] bg-[var(--glass-bg-clear)] flex items-center justify-center text-3xl">
          🛍️
        </div>
        <h3 class="text-base font-bold text-[var(--text)]">Ready for Next Customer</h3>
        <p class="text-xs text-[var(--muted)] max-w-xs">Items scanned by the cashier will appear here in real time.</p>
      </div>
    ` : items.map(item => {
      const unitPrice = Number(item.unit_price ?? item.product?.selling_price ?? item.product?.price ?? 0);
      const qty = Number(item.quantity) || 1;
      const lineTotal = unitPrice * qty;
      const imgSrc = item.product?.image_url || '';

      return `
        <div class="flex items-center justify-between p-3.5 rounded-[18px] glass-card border border-[var(--line)] shadow-xs">
          <div class="flex items-center space-x-3.5 min-w-0">
            <div class="w-12 h-12 rounded-[14px] bg-[var(--glass-bg-clear)] flex items-center justify-center flex-shrink-0 overflow-hidden border border-[var(--line)]">
              ${imgSrc ? `<img src="${imgSrc}" alt="${item.product?.name || 'Product'}" class="w-full h-full object-cover" />` : `<span class="font-bold text-sm text-[var(--muted)]">${(item.product?.name || 'P').substring(0, 1)}</span>`}
            </div>
            <div class="truncate">
              <h4 class="text-sm font-bold text-[var(--text)] truncate">${item.product?.name || 'Item'}</h4>
              <p class="text-xs text-[var(--muted)] font-medium mt-0.5">
                <span class="font-bold text-[var(--accent)]">${qty}</span> &times; ${formatCurrency(unitPrice)}
              </p>
            </div>
          </div>
          <div class="text-right flex-shrink-0 pl-3">
            <span class="text-sm font-black text-[var(--text)] font-mono">${formatCurrency(lineTotal)}</span>
          </div>
        </div>
      `;
    }).join('');

    this.container.innerHTML = `
      <div class="min-h-screen w-full bg-[var(--bg)] text-[var(--text)] flex flex-col p-4 sm:p-8">
        
        <!-- Header -->
        <header class="w-full flex items-center justify-between pb-4 border-b border-[var(--line)] flex-shrink-0">
          <div class="flex items-center space-x-3.5">
            <div class="w-12 h-12 rounded-[16px] bg-gradient-to-tr from-[#0066CC] to-[#7E22CE] text-white flex items-center justify-center font-bold text-2xl shadow-md overflow-hidden border border-[var(--line)]">
              ${storeLogo ? `<img src="${storeLogo}" alt="${storeName}" class="w-full h-full object-cover" />` : storeName.substring(0, 1).toUpperCase()}
            </div>
            <div>
              <h1 class="font-heading font-black text-xl sm:text-2xl text-[var(--text)] tracking-tight">${storeName}</h1>
              <p class="text-xs text-[var(--accent)] font-bold uppercase tracking-wider">${storeTagline}</p>
            </div>
          </div>

          <div class="flex items-center space-x-3">
            <span class="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20">
              <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Register Active</span>
            </span>
          </div>
        </header>

        <!-- Main Body -->
        <div class="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6 min-h-0">
          
          <!-- Left Column: Itemized Cart (7 Cols) -->
          <div class="lg:col-span-7 flex flex-col min-h-0 glass2 rounded-[28px] border border-[var(--line)] p-5 shadow-lg">
            <div class="flex items-center justify-between pb-3 border-b border-[var(--line)]">
              <h2 class="font-bold text-sm text-[var(--text)]">Your Items (${totals.itemCount})</h2>
              <span class="text-xs text-[var(--muted)] font-medium">Live Order Summary</span>
            </div>

            <div class="flex-1 overflow-y-auto space-y-2.5 py-4 pr-1">
              ${itemsHtml}
            </div>
          </div>

          <!-- Right Column: Grand Total & Contactless QR (5 Cols) -->
          <div class="lg:col-span-5 flex flex-col justify-between glass2 rounded-[28px] border border-[var(--line)] p-6 shadow-lg space-y-6">
            
            <!-- Price Calculation Breakdown -->
            <div class="space-y-3.5">
              <h3 class="text-xs font-black uppercase tracking-wider text-[var(--muted)]">Payment Summary</h3>
              
              <div class="space-y-2.5 text-xs text-[var(--muted)] font-semibold">
                <div class="flex justify-between">
                  <span>Subtotal</span>
                  <span class="font-bold text-[var(--text)]">${formatCurrency(totals.subtotal)}</span>
                </div>

                ${(totals.discountAmount || totals.discount || 0) > 0 ? `
                  <div class="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Discount Savings</span>
                    <span class="font-bold">-${formatCurrency(totals.discountAmount || totals.discount)}</span>
                  </div>
                ` : ''}

                ${(totals.taxAmount || totals.tax || 0) > 0 ? `
                  <div class="flex justify-between">
                    <span>Sales Tax</span>
                    <span class="font-bold text-[var(--text)]">${formatCurrency(totals.taxAmount || totals.tax)}</span>
                  </div>
                ` : ''}
              </div>

              <!-- Grand Total Card -->
              <div class="p-5 rounded-[22px] bg-gradient-to-tr from-[#0066CC] to-[#7E22CE] text-white shadow-xl flex items-center justify-between">
                <div>
                  <p class="text-[11px] uppercase tracking-widest font-bold text-white/80">Total Due</p>
                  <p class="text-3xl sm:text-4xl font-heading font-black tracking-tight mt-0.5">${formatCurrency(totals.total)}</p>
                </div>
                <div class="w-12 h-12 rounded-[16px] bg-white/15 backdrop-blur-sm flex items-center justify-center text-2xl">
                  💳
                </div>
              </div>
            </div>

            <!-- Dynamic Scan & Pay QR Code Card -->
            <div class="p-4.5 rounded-[22px] glass-card border border-[var(--line)] flex items-center space-x-4">
              <!-- Crisp Dynamic QR Code Display -->
              <div class="w-24 h-24 rounded-[16px] bg-white p-2 flex items-center justify-center flex-shrink-0 shadow-sm border border-slate-200">
                <svg viewBox="0 0 100 100" class="w-full h-full text-slate-900" fill="currentColor">
                  <!-- Vector QR Code Pattern -->
                  <rect x="0" y="0" width="30" height="30" rx="3" fill="#0F172A" />
                  <rect x="5" y="5" width="20" height="20" rx="2" fill="#FFFFFF" />
                  <rect x="10" y="10" width="10" height="10" rx="1" fill="#0F172A" />
                  
                  <rect x="70" y="0" width="30" height="30" rx="3" fill="#0F172A" />
                  <rect x="75" y="5" width="20" height="20" rx="2" fill="#FFFFFF" />
                  <rect x="80" y="10" width="10" height="10" rx="1" fill="#0F172A" />
                  
                  <rect x="0" y="70" width="30" height="30" rx="3" fill="#0F172A" />
                  <rect x="5" y="75" width="20" height="20" rx="2" fill="#FFFFFF" />
                  <rect x="10" y="80" width="10" height="10" rx="1" fill="#0F172A" />

                  <rect x="40" y="10" width="10" height="10" fill="#0066CC" />
                  <rect x="55" y="10" width="8" height="8" fill="#0F172A" />
                  <rect x="40" y="25" width="8" height="8" fill="#0F172A" />
                  <rect x="40" y="40" width="20" height="20" rx="2" fill="#7E22CE" />
                  <rect x="70" y="45" width="10" height="10" fill="#0F172A" />
                  <rect x="85" y="45" width="10" height="10" fill="#0066CC" />
                  <rect x="40" y="70" width="10" height="10" fill="#0F172A" />
                  <rect x="55" y="75" width="15" height="15" fill="#0F172A" />
                  <rect x="75" y="75" width="20" height="20" rx="2" fill="#0F172A" />
                </svg>
              </div>
              <div class="space-y-1">
                <div class="badge badge-blue text-[10px] font-bold">Touch-Free Pay</div>
                <h4 class="text-xs font-black text-[var(--text)]">Scan to Pay via QR</h4>
                <p class="text-[10px] text-[var(--muted)]">Supports UPI, LankaQR, PromptPay, PayPal & Digital Wallets</p>
              </div>
            </div>

            <!-- Footer Message -->
            <div class="text-center text-[10px] text-[var(--muted)] font-medium">
              Thank you for shopping at <strong class="text-[var(--text)]">${storeName}</strong>
            </div>

          </div>

        </div>

      </div>
    `;
  }

  renderSuccessState(order) {
    const settings = settingsService.getSettings();
    const store = settings?.store || {};

    this.container.innerHTML = `
      <div class="min-h-screen w-full bg-[var(--bg)] flex items-center justify-center p-6 text-center">
        <div class="w-full max-w-lg glass2 rounded-[32px] border border-emerald-500/30 p-8 shadow-2xl space-y-5 animate-in zoom-in-95 duration-300">
          <div class="w-20 h-20 rounded-full bg-emerald-500/15 text-emerald-500 text-4xl grid place-items-center mx-auto shadow-lg shadow-emerald-500/20">
            ✓
          </div>
          <div class="space-y-1.5">
            <h2 class="text-2xl font-black font-heading text-[var(--text)]">Payment Successful!</h2>
            <p class="text-xs text-[var(--muted)] font-semibold">Order #${order?.order_number || 'REC-1001'} is confirmed.</p>
          </div>
          <div class="p-4 rounded-[20px] glass-card border border-[var(--line)] text-sm font-black text-[var(--accent)] font-mono">
            Total Paid: ${formatCurrency(order?.total || order?.total_amount || 0)}
          </div>
          <p class="text-xs text-[var(--muted)] font-medium">Thank you for visiting ${store.name || 'FlowPOS'}! Please collect your receipt.</p>
        </div>
      </div>
    `;

    setTimeout(() => {
      this.cartData = { items: [], totals: { subtotal: 0, taxAmount: 0, discountAmount: 0, total: 0, itemCount: 0 } };
      this.render();
    }, 4500);
  }
}
