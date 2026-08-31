/**
 * FlowPOS Global Search / Command Palette (⌘K) - Apple iOS 26 Liquid Glass Edition
 */

import { Modal } from './Modal.js';
import { productService } from '../services/products.js';
import { ordersService } from '../services/orders.js';
import { customerService } from '../services/customers.js';
import { supplierService } from '../services/suppliers.js';
import { cartStore } from '../store/cart.js';
import { toast } from './Toast.js';
import { renderIcon } from '../utils/icons.js';
import { formatCurrency } from '../utils/currency.js';
import { sanitizeHtml } from '../utils/security.js';
import { NAV_ITEMS } from './Sidebar.js';

class GlobalSearchService {
  constructor() {
    this.modal = null;
    this.init();
  }

  init() {
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.open();
      }
    });

    window.addEventListener('flowpos:open-global-search', () => {
      this.open();
    });
  }

  async performSearch(query) {
    const q = query.trim().toLowerCase();
    if (!q) return { products: [], orders: [], customers: [], navItems: NAV_ITEMS.slice(0, 6) };

    const [products, orders, customers, suppliers] = await Promise.all([
      productService.getAllProducts(),
      ordersService.getAllOrders(),
      customerService.getAllCustomers(),
      supplierService.getAllSuppliers()
    ]);

    const matchingNav = NAV_ITEMS.filter(n => n.label.toLowerCase().includes(q));
    const matchingProds = products.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || (p.barcode && p.barcode.includes(q))).slice(0, 5);
    const matchingOrders = orders.filter(o => o.order_number.toLowerCase().includes(q) || (o.customer_name && o.customer_name.toLowerCase().includes(q))).slice(0, 4);
    const matchingCusts = customers.filter(c => c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q))).slice(0, 4);

    return {
      navItems: matchingNav,
      products: matchingProds,
      orders: matchingOrders,
      customers: matchingCusts
    };
  }

  open() {
    const searchModalHtml = `
      <div class="space-y-3.5">
        <div class="relative">
          <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--accent)]">
            ${renderIcon('search', 'w-5 h-5')}
          </span>
          <input
            id="cmd-palette-input"
            type="text"
            class="glass-input w-full pl-11 pr-4 py-3 rounded-[16px] text-sm font-semibold"
            placeholder="Type a product, order #, customer, or navigation shortcut…"
            autofocus
          />
        </div>

        <div id="cmd-results-container" class="max-h-[60vh] overflow-y-auto space-y-3.5 pt-1 scrollbar-none">
          <!-- Populated dynamically -->
        </div>
      </div>
    `;

    this.modal = new Modal({
      title: 'Command Palette & Global Search',
      size: 'lg',
      content: searchModalHtml,
      onOpen: (modalEl) => {
        const input = modalEl.querySelector('#cmd-palette-input');
        const container = modalEl.querySelector('#cmd-results-container');

        const updateResults = async () => {
          const query = input.value;
          const { navItems, products, orders, customers } = await this.performSearch(query);

          let html = '';

          // Products
          if (products.length > 0) {
            html += `
              <div>
                <p class="text-[10px] font-black text-[var(--muted)] uppercase tracking-wider px-2 mb-1.5">Products</p>
                <div class="space-y-1.5">
                  ${products.map(p => `
                    <div class="flex items-center justify-between p-2.5 rounded-[14px] glass-card border border-[var(--line)] cursor-pointer group transition" data-cmd-product="${sanitizeHtml(p.id)}">
                      <div class="flex items-center space-x-3 min-w-0">
                        <img src="${sanitizeHtml(p.image_url)}" class="w-8 h-8 rounded-[10px] object-cover bg-slate-200/60 dark:bg-slate-800" />
                        <div class="truncate">
                          <p class="text-xs font-black text-[var(--text)] truncate group-hover:text-[var(--accent)] transition-colors">${sanitizeHtml(p.name)}</p>
                          <p class="text-[10px] text-[var(--muted)] font-mono font-bold">${sanitizeHtml(p.sku)} &bull; ${sanitizeHtml(p.stock_quantity)} in stock</p>
                        </div>
                      </div>
                      <div class="flex items-center space-x-2 flex-shrink-0">
                        <span class="text-xs font-black font-mono text-[var(--text)]">${formatCurrency(p.selling_price)}</span>
                        <button class="px-2.5 py-1 rounded-[10px] bg-[var(--accent)]/15 text-[var(--accent)] text-xs font-black hover:bg-[var(--accent)] hover:text-white transition active:scale-95" data-add-to-cart-cmd="${sanitizeHtml(p.id)}">
                          + Add
                        </button>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            `;
          }

          // Customers
          if (customers.length > 0) {
            html += `
              <div>
                <p class="text-[10px] font-black text-[var(--muted)] uppercase tracking-wider px-2 mb-1.5">Customers</p>
                <div class="space-y-1.5">
                  ${customers.map(c => `
                    <div class="flex items-center justify-between p-2.5 rounded-[14px] glass-card border border-[var(--line)] cursor-pointer transition" data-cmd-customer="${sanitizeHtml(c.id)}">
                      <div class="flex items-center space-x-2.5">
                        <div class="w-7 h-7 rounded-full bg-gradient-to-tr from-[#0071e3] to-[#af52de] flex items-center justify-center text-white text-xs font-black">
                          ${sanitizeHtml(c.name.charAt(0))}
                        </div>
                        <div>
                          <p class="text-xs font-black text-[var(--text)]">${sanitizeHtml(c.name)}</p>
                          <p class="text-[10px] text-[var(--muted)] font-medium">${sanitizeHtml(c.phone || c.email || 'No contact')}</p>
                        </div>
                      </div>
                      <span class="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400">${sanitizeHtml(c.tier)} &bull; ${sanitizeHtml(c.loyalty_points)} pts</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            `;
          }

          // Orders
          if (orders.length > 0) {
            html += `
              <div>
                <p class="text-[10px] font-black text-[var(--muted)] uppercase tracking-wider px-2 mb-1.5">Orders</p>
                <div class="space-y-1.5">
                  ${orders.map(o => `
                    <div class="flex items-center justify-between p-2.5 rounded-[14px] glass-card border border-[var(--line)] cursor-pointer transition" data-cmd-order="${sanitizeHtml(o.id)}">
                      <div>
                        <p class="text-xs font-black font-mono text-[var(--text)]">${sanitizeHtml(o.order_number)}</p>
                        <p class="text-[10px] text-[var(--muted)] font-medium">${sanitizeHtml(o.customer_name || 'Guest')} &bull; ${sanitizeHtml(o.items?.length || 0)} items</p>
                      </div>
                      <span class="text-xs font-black font-mono text-[var(--green)]">${formatCurrency(o.total_amount)}</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            `;
          }

          // Navigation Shortcuts
          if (navItems.length > 0) {
            html += `
              <div>
                <p class="text-[10px] font-black text-[var(--muted)] uppercase tracking-wider px-2 mb-1.5">Navigation Shortcuts</p>
                <div class="grid grid-cols-2 gap-2">
                  ${navItems.map(n => `
                    <a href="${n.path}" class="flex items-center space-x-2.5 p-2.5 rounded-[14px] glass-card border border-[var(--line)] text-[var(--text)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition text-xs font-bold" data-cmd-nav>
                      <span class="text-[var(--accent)]">${renderIcon(n.icon, 'w-4 h-4')}</span>
                      <span class="truncate">${n.label}</span>
                    </a>
                  `).join('')}
                </div>
              </div>
            `;
          }

          container.innerHTML = html || `<p class="text-center text-xs text-[var(--muted)] py-6 font-semibold">No matching records found</p>`;

          // Attach quick add to cart
          container.querySelectorAll('[data-add-to-cart-cmd]').forEach(btn => {
            btn.addEventListener('click', async (e) => {
              e.stopPropagation();
              const prodId = btn.getAttribute('data-add-to-cart-cmd');
              const prod = await productService.getProductById(prodId);
              if (prod) {
                cartStore.addItem(prod, 1);
                toast.success(`Added ${prod.name} to cart`);
              }
            });
          });

          // Close modal on nav click
          container.querySelectorAll('[data-cmd-nav]').forEach(link => {
            link.addEventListener('click', () => {
              this.modal.close();
            });
          });
        };

        input.addEventListener('input', updateResults);
        updateResults();
        setTimeout(() => input.focus(), 100);
      }
    });

    this.modal.open();
  }
}

export const globalSearchService = new GlobalSearchService();
