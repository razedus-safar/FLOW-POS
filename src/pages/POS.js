/**
 * FlowPOS Flagship POS Cashier Station View - iOS 26 Clean Luxury Edition
 * Polished visual layout, unified search, real-time live metrics, category carousel, and multi-tender checkout
 */

import { productService } from '../services/products.js';
import { customerService } from '../services/customers.js';
import { paymentsService } from '../services/payments.js';
import { ordersService } from '../services/orders.js';
import { registerService } from '../services/registers.js';
import { cartStore } from '../store/cart.js';
import { globalStore } from '../store/state.js';
import { createProductCard } from '../components/ProductCard.js';
import { CartPanel } from '../components/Cart.js';
import { Modal } from '../components/Modal.js';
import { toast } from '../components/Toast.js';
import { showReceiptModal } from '../components/ReceiptModal.js';
import { CameraScannerModal } from '../components/CameraScannerModal.js';
import { customerDisplayService } from '../services/customerDisplay.js';
import { barcodeScanner } from '../utils/barcode.js';
import { formatCurrency, getCurrencyConfig } from '../utils/currency.js';
import { renderIcon } from '../utils/icons.js';
import { soundManager } from '../utils/audio.js';
import { settingsService } from '../services/settings.js';

export class POSPage {
  constructor(container) {
    this.container = container;
    this.products = [];
    this.categories = [];
    this.metrics = { todaySales: 0, orderCount: 0, avgOrder: 0, lowStockCount: 0 };
    this.selectedCategory = 'all';
    this.searchQuery = '';
    this.cartPanel = null;
    this.unsubscribeBarcode = null;
    this.isMobileCartOpen = false;
    this.init();
  }

  async init() {
    try {
      const activeShift = registerService.getActiveSession();
      if (!activeShift) {
        await registerService.openSession(200.00, 'Morning Cashier Shift');
      }

      [this.products, this.categories] = await Promise.all([
        productService.getAllProducts(),
        productService.getCategories()
      ]);
      await this.computeMetrics();
    } catch (err) {
      console.error('POS init error:', err);
    } finally {
      this.render();
      this.attachEvents();
      this.setupShortcuts();
    }
  }

  async computeMetrics() {
    try {
      const orders = await ordersService.getAllOrders();
      const todayStr = new Date().toISOString().split('T')[0];
      const todayOrders = orders.filter(o => o.created_at && o.created_at.startsWith(todayStr));
      const todaySales = todayOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
      const orderCount = todayOrders.length;
      const avgOrder = orderCount > 0 ? todaySales / orderCount : 0;
      const lowStockCount = this.products.filter(p => Number(p.stock_quantity) <= (Number(p.reorder_level) || 8)).length;

      this.metrics = {
        todaySales,
        orderCount,
        avgOrder,
        lowStockCount
      };
    } catch {
      this.metrics = {
        todaySales: 0,
        orderCount: 0,
        avgOrder: 0,
        lowStockCount: this.products.filter(p => Number(p.stock_quantity) <= 8).length
      };
    }
  }

  destroy() {
    if (this.unsubscribeBarcode) this.unsubscribeBarcode();
    if (this.handleSettingsChange) {
      window.removeEventListener('flowpos:settings-updated', this.handleSettingsChange);
    }
  }

  setupShortcuts() {
    this.handleSettingsChange = () => {
      const filtered = this.getFilteredProducts();
      this.renderProductsInGrid(filtered);
    };
    window.addEventListener('flowpos:settings-updated', this.handleSettingsChange);

    this.unsubscribeBarcode = barcodeScanner.subscribe(async (scannedCode) => {
      const prod = await productService.getProductByBarcode(scannedCode);
      if (prod) {
        const settings = settingsService.get();
        const allowNegative = Boolean(settings?.workspace?.allowNegativeInventory || settings?.checkout?.allowNegativeInventory);
        if (Number(prod.stock_quantity) <= 0 && !allowNegative) {
          toast.warning(`"${prod.name}" is out of stock!`);
        } else {
          cartStore.addItem(prod, 1);
          soundManager.playBeep();
          toast.success(`Scanned: ${prod.name}`);
        }
      } else {
        toast.error(`No product found with barcode "${scannedCode}"`);
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        const searchInput = this.container.querySelector('#pos-product-search');
        if (searchInput) searchInput.focus();
      } else if (e.key === 'F2') {
        e.preventDefault();
        this.openCheckoutModal();
      }
    });

    window.addEventListener('flowpos:open-discount-modal', () => this.openDiscountModal());
    window.addEventListener('flowpos:open-held-carts', () => this.openHeldCartsModal());
    window.addEventListener('flowpos:toggle-mobile-cart', () => this.toggleMobileCart());
  }

  toggleMobileCart() {
    this.isMobileCartOpen = !this.isMobileCartOpen;
    const cartDrawer = this.container.querySelector('#pos-cart-panel-container');
    const cartBackdrop = this.container.querySelector('#mobile-cart-backdrop');
    if (cartDrawer && cartBackdrop) {
      if (this.isMobileCartOpen) {
        cartDrawer.classList.remove('translate-x-full');
        cartDrawer.classList.add('translate-x-0');
        cartBackdrop.classList.remove('hidden');
      } else {
        cartDrawer.classList.add('translate-x-full');
        cartDrawer.classList.remove('translate-x-0');
        cartBackdrop.classList.add('hidden');
      }
    }
  }

  getFilteredProducts() {
    let list = [...this.products];
    if (this.selectedCategory !== 'all') {
      list = list.filter(p => p.category_id === this.selectedCategory);
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(p => 
        p.name.toLowerCase().includes(q) || 
        p.sku.toLowerCase().includes(q) || 
        (p.barcode && p.barcode.toLowerCase().includes(q))
      );
    }
    return list;
  }

  render() {
    const filtered = this.getFilteredProducts();
    const todayFormatted = new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' });
    const cartData = globalStore.get('cart', { totals: { itemCount: 0, total: 0 } });

    const categoryChipsHtml = [
      { id: 'all', name: 'All Products' },
      ...this.categories
    ].map(cat => {
      const isSelected = this.selectedCategory === cat.id;
      return `
        <button
          type="button"
          data-category-filter="${cat.id}"
          class="chip ${isSelected ? 'active' : ''}"
        >
          ${cat.name}
        </button>
      `;
    }).join('');

    this.container.innerHTML = `
      <div class="h-full flex overflow-hidden p-3.5 sm:p-5 gap-4 relative">
        
        <!-- Mobile Cart Backdrop -->
        <div id="mobile-cart-backdrop" class="hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm xl:hidden transition-opacity"></div>

        <!-- Center Main Product Catalog Area -->
        <main class="main flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          
          <!-- Top Title Bar -->
          <header class="top flex items-center justify-between gap-2.5 pb-3 flex-shrink-0">
            <div class="title min-w-0">
              <h1 class="text-xl sm:text-2xl font-black font-heading text-[var(--text)] tracking-tight m-0 truncate">POS Counter</h1>
              <p class="text-[11px] text-[var(--muted)] font-semibold mt-0.5 truncate">${todayFormatted} · Register #01 · Shift Active</p>
            </div>

            <!-- Action Buttons -->
            <div class="flex items-center space-x-2 flex-shrink-0">
              <!-- Live Phone/Tablet Camera Barcode & QR Scanner -->
              <button
                type="button"
                id="pos-camera-scan-btn"
                class="h-9 px-3 sm:px-3.5 rounded-[12px] bg-gradient-to-r from-[#0066CC] to-[#7E22CE] text-white text-xs font-black shadow-md hover:opacity-95 active:scale-95 transition flex items-center space-x-1.5 flex-shrink-0"
                title="Scan Barcode or QR with Phone/Tablet Camera"
              >
                ${renderIcon('camera', 'w-4 h-4')}
                <span class="hidden sm:inline">Scan Camera</span>
                <span class="sm:hidden">Scan</span>
              </button>

              <!-- Secondary Customer Display Launcher -->
              <button
                type="button"
                id="pos-customer-display-btn"
                class="h-9 px-3 rounded-[12px] glass border border-[var(--line)] text-xs font-bold text-[var(--text)] hover:text-[var(--accent)] active:scale-95 transition flex items-center space-x-1.5 shadow-xs flex-shrink-0"
                title="Open Dual Customer-Facing Screen"
              >
                ${renderIcon('monitor', 'w-3.5 h-3.5')}
                <span class="hidden md:inline">Customer Screen</span>
              </button>

              <!-- Quick Discount -->
              <button
                type="button"
                id="pos-notif-btn"
                class="h-9 px-3 rounded-[12px] glass border border-[var(--line)] text-xs font-bold text-[var(--text)] hover:text-[var(--accent)] active:scale-95 transition flex items-center space-x-1.5 shadow-xs flex-shrink-0"
                title="Apply Order Discount"
              >
                <span>⚡ Discount</span>
              </button>
            </div>
          </header>

          <!-- Sales Metrics Strip (Responsive: Horizontal scroll on mobile, 4-col grid on desktop) -->
          <section class="metrics flex overflow-x-auto gap-2 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-3 mb-2.5 sm:mb-3.5 flex-shrink-0 scrollbar-none pb-0.5">
            <div class="metric min-w-[130px] sm:min-w-0 p-2.5 sm:p-4 rounded-[16px] sm:rounded-[20px] glass-card shadow-xs flex-1">
              <span class="text-[10px] sm:text-xs text-[var(--muted)] font-black uppercase tracking-wider block truncate">Today's Sales</span>
              <strong class="text-base sm:text-xl font-black font-mono text-[var(--text)] tracking-tight block mt-0.5 sm:mt-1 truncate">${formatCurrency(this.metrics.todaySales)}</strong>
              <span class="text-[10px] sm:text-xs text-[var(--green)] font-extrabold truncate block mt-0.5">Live Revenue</span>
            </div>

            <div class="metric min-w-[130px] sm:min-w-0 p-2.5 sm:p-4 rounded-[16px] sm:rounded-[20px] glass-card shadow-xs flex-1">
              <span class="text-[10px] sm:text-xs text-[var(--muted)] font-black uppercase tracking-wider block truncate">Orders Completed</span>
              <strong class="text-base sm:text-xl font-black font-mono text-[var(--text)] tracking-tight block mt-0.5 sm:mt-1 truncate">${this.metrics.orderCount}</strong>
              <span class="text-[10px] sm:text-xs text-[var(--green)] font-extrabold truncate block mt-0.5">Processed Today</span>
            </div>

            <div class="metric min-w-[130px] sm:min-w-0 p-2.5 sm:p-4 rounded-[16px] sm:rounded-[20px] glass-card shadow-xs flex-1">
              <span class="text-[10px] sm:text-xs text-[var(--muted)] font-black uppercase tracking-wider block truncate">Average Ticket</span>
              <strong class="text-base sm:text-xl font-black font-mono text-[var(--text)] tracking-tight block mt-0.5 sm:mt-1 truncate">${formatCurrency(this.metrics.avgOrder)}</strong>
              <span class="text-[10px] sm:text-xs text-[var(--accent)] font-extrabold truncate block mt-0.5">Per Customer</span>
            </div>

            <div class="metric min-w-[130px] sm:min-w-0 p-2.5 sm:p-4 rounded-[16px] sm:rounded-[20px] glass-card shadow-xs flex-1">
              <span class="text-[10px] sm:text-xs text-[var(--muted)] font-black uppercase tracking-wider block truncate">Low Stock Alert</span>
              <strong class="text-base sm:text-xl font-black font-mono text-[var(--text)] tracking-tight block mt-0.5 sm:mt-1 truncate">${this.metrics.lowStockCount}</strong>
              <span class="text-[10px] sm:text-xs text-[var(--amber)] font-extrabold truncate block mt-0.5">Reorder Items</span>
            </div>
          </section>

          <!-- Catalog Toolbar: Search Bar + Category Chips -->
          <div class="toolbar mb-3.5 flex-shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <!-- Inline Search Input -->
            <label class="search h-11 w-full sm:w-72 flex items-center gap-2.5 px-3.5 rounded-[16px] glass-card shadow-xs flex-shrink-0">
              <span class="text-[var(--accent)] text-base flex-shrink-0">${renderIcon('search', 'w-4 h-4')}</span>
              <input
                id="pos-product-search"
                type="text"
                value="${this.searchQuery}"
                placeholder="Filter products (/)"
                class="w-full border-0 outline-0 bg-transparent text-[var(--text)] text-sm font-bold placeholder:text-[var(--muted)] truncate"
              />
            </label>

            <!-- Category Chips Carousel -->
            <div class="chips flex-1 flex gap-1.5 sm:gap-2 overflow-x-auto pb-0.5 scrollbar-none items-center">
              ${categoryChipsHtml}
            </div>
          </div>

          <!-- Product Grid Scroll Area -->
          <section class="flex-1 overflow-y-auto pr-1 pb-16 xl:pb-4 scrollbar-none">
            <div id="pos-product-grid" class="product-grid grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-4 gap-3 sm:gap-4">
              <!-- Cards rendered via JS -->
            </div>
          </section>

          <!-- Floating Bottom Cart Bar (Mobile/Tablet only) -->
          <div class="xl:hidden fixed bottom-3 inset-x-3 sm:inset-x-6 z-30">
            <button id="floating-cart-bar-btn" class="w-full h-12 rounded-[18px] glass-btn-primary shadow-2xl flex items-center justify-between px-4 text-xs font-black active:scale-98 transition">
              <div class="flex items-center space-x-2">
                <span class="p-1 rounded-lg bg-white/20 text-white">${renderIcon('shopping-bag', 'w-4 h-4')}</span>
                <span id="floating-cart-count">${cartData.totals.itemCount} items in basket</span>
              </div>
              <div class="flex items-center space-x-1">
                <span id="floating-cart-total" class="font-mono text-sm">${formatCurrency(cartData.totals.total)}</span>
                <span>→</span>
              </div>
            </button>
          </div>
        </main>

        <!-- Right Side Cart Panel: Docked on XL screens, Off-canvas Slide-Over on Mobile/Tablet -->
        <div
          id="pos-cart-panel-container"
          class="fixed inset-y-0 right-0 z-50 w-full sm:w-96 p-3 sm:p-4 transform translate-x-full xl:translate-x-0 xl:static xl:flex-shrink-0 xl:p-0 h-full transition-transform duration-300 ease-in-out"
        ></div>
      </div>
    `;

    this.renderProductsInGrid(filtered);

    // Render Cart Component
    const cartContainer = this.container.querySelector('#pos-cart-panel-container');
    if (cartContainer) {
      this.cartPanel = new CartPanel(cartContainer, {
        onCheckout: (method) => {
          if (window.innerWidth < 1280 && this.isMobileCartOpen) {
            this.toggleMobileCart();
          }
          this.openCheckoutModal(method);
        },
        onCustomerSelect: () => this.openCustomerModal()
      });
    }

    // Subscribe to cart store to update floating cart bar
    globalStore.subscribe('cart', () => {
      const updatedCart = globalStore.get('cart', { totals: { itemCount: 0, total: 0 } });
      const floatingCount = this.container.querySelector('#floating-cart-count');
      const floatingTotal = this.container.querySelector('#floating-cart-total');
      if (floatingCount) floatingCount.textContent = `${updatedCart.totals.itemCount} items in basket`;
      if (floatingTotal) floatingTotal.textContent = formatCurrency(updatedCart.totals.total);
    });
  }

  renderProductsInGrid(productsList) {
    const grid = this.container.querySelector('#pos-product-grid');
    if (!grid) return;
    grid.innerHTML = '';

    if (productsList.length === 0) {
      grid.innerHTML = `
        <div class="col-span-full py-16 flex flex-col items-center justify-center text-[var(--muted)] glass-card rounded-[24px] p-8 border border-[var(--line)]">
          <div class="text-4xl mb-2">📦</div>
          <strong class="text-sm font-black text-[var(--text)]">No products found</strong>
          <span class="text-xs text-[var(--muted)] mt-1 font-medium">Try another search keyword or category filter</span>
        </div>
      `;
      return;
    }

    productsList.forEach(prod => {
      const card = createProductCard(prod, (p) => {
        cartStore.addItem(p, 1);
        soundManager.playBeep();
        toast.success(`Added ${p.name}`);
      });
      grid.appendChild(card);
    });
  }

  attachEvents() {
    const searchInput = this.container.querySelector('#pos-product-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        const filtered = this.getFilteredProducts();
        this.renderProductsInGrid(filtered);
      });
    }

    this.container.querySelectorAll('[data-category-filter]').forEach(pill => {
      pill.addEventListener('click', () => {
        this.selectedCategory = pill.getAttribute('data-category-filter');
        this.render();
        this.attachEvents();
      });
    });

    const notifBtn = this.container.querySelector('#pos-notif-btn');
    if (notifBtn) {
      notifBtn.addEventListener('click', () => {
        this.openDiscountModal();
      });
    }

    const cameraScanBtn = this.container.querySelector('#pos-camera-scan-btn');
    if (cameraScanBtn) {
      cameraScanBtn.addEventListener('click', () => {
        new CameraScannerModal({
          title: 'Scan Barcode or QR Code',
          autoAddToCart: true
        }).open();
      });
    }

    const customerDisplayBtn = this.container.querySelector('#pos-customer-display-btn');
    if (customerDisplayBtn) {
      customerDisplayBtn.addEventListener('click', () => {
        customerDisplayService.openCustomerWindow();
        toast.info('Opened customer-facing display window');
      });
    }

    const floatingCartBtn = this.container.querySelector('#floating-cart-bar-btn');
    if (floatingCartBtn) {
      floatingCartBtn.addEventListener('click', () => {
        this.toggleMobileCart();
      });
    }

    const cartBackdrop = this.container.querySelector('#mobile-cart-backdrop');
    if (cartBackdrop) {
      cartBackdrop.addEventListener('click', () => {
        this.toggleMobileCart();
      });
    }
  }

  // Customer Selection Modal
  async openCustomerModal() {
    const customers = await customerService.getAllCustomers();

    const customerRowsHtml = customers.map(c => `
      <div class="flex items-center justify-between p-3 rounded-[16px] hover:bg-[var(--accent)]/10 border border-[var(--line)] cursor-pointer transition glass-card active:scale-98" data-select-customer-id="${c.id}">
        <div class="flex items-center space-x-3 min-w-0">
          <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-[#0071e3] to-[#af52de] text-white font-black text-xs grid place-items-center flex-shrink-0 shadow-xs">
            ${c.name.substring(0, 2).toUpperCase()}
          </div>
          <div class="truncate">
            <p class="text-xs font-black text-[var(--text)] truncate">${c.name}</p>
            <p class="text-[10px] text-[var(--muted)] font-medium">${c.phone || c.email || 'No contact'}</p>
          </div>
        </div>
        <div class="text-right flex-shrink-0">
          <span class="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25">${c.tier}</span>
          <p class="text-[9px] text-[var(--muted)] font-mono font-bold mt-0.5">${c.loyalty_points || 0} pts</p>
        </div>
      </div>
    `).join('');

    const modalContent = `
      <div class="space-y-3.5">
        <!-- Search bar -->
        <div class="flex items-center justify-between gap-2">
          <input
            id="search-cust-input"
            type="text"
            placeholder="Search customer by name or phone…"
            class="glass-input flex-1 py-2.5 px-3.5 rounded-[14px] text-xs font-semibold"
          />
          <button id="show-add-cust-form-btn" class="px-4 py-2.5 rounded-[14px] text-xs font-bold glass-btn-primary flex items-center space-x-1 shadow-md">
            <span>+ New</span>
          </button>
        </div>

        <!-- Add Customer Form -->
        <div id="add-cust-form-container" class="hidden p-4 rounded-[20px] glass-card border border-[var(--line)] space-y-3">
          <h4 class="text-xs font-black text-[var(--text)]">Register Customer Account</h4>
          <input id="new-cust-name" type="text" placeholder="Full Name *" class="glass-input w-full p-2.5 rounded-[12px] text-xs font-medium" />
          <div class="grid grid-cols-2 gap-2">
            <input id="new-cust-phone" type="tel" placeholder="Phone Number" class="glass-input p-2.5 rounded-[12px] text-xs font-mono font-medium" />
            <input id="new-cust-email" type="email" placeholder="Email Address" class="glass-input p-2.5 rounded-[12px] text-xs font-medium" />
          </div>
          <button id="save-new-cust-btn" class="w-full py-2.5 rounded-[12px] text-xs font-bold glass-btn-primary shadow-md">
            Save & Attach Customer
          </button>
        </div>

        <!-- Customer List -->
        <div id="customer-list-container" class="max-h-72 overflow-y-auto space-y-2 pr-1 scrollbar-none">
          ${customerRowsHtml}
        </div>
      </div>
    `;

    const modal = new Modal({
      title: 'Select Customer Account',
      size: 'md',
      content: modalContent,
      onOpen: (modalEl) => {
        modalEl.querySelectorAll('[data-select-customer-id]').forEach(card => {
          card.addEventListener('click', () => {
            const custId = card.getAttribute('data-select-customer-id');
            const cust = customers.find(c => c.id === custId);
            if (cust) {
              cartStore.setCustomer(cust);
              toast.success(`Attached ${cust.name} to cart`);
              modal.close();
            }
          });
        });

        const toggleBtn = modalEl.querySelector('#show-add-cust-form-btn');
        const formContainer = modalEl.querySelector('#add-cust-form-container');
        if (toggleBtn && formContainer) {
          toggleBtn.addEventListener('click', () => {
            formContainer.classList.toggle('hidden');
          });
        }

        const saveBtn = modalEl.querySelector('#save-new-cust-btn');
        if (saveBtn) {
          saveBtn.addEventListener('click', async () => {
            const name = modalEl.querySelector('#new-cust-name').value.trim();
            const phone = modalEl.querySelector('#new-cust-phone').value.trim();
            const email = modalEl.querySelector('#new-cust-email').value.trim();

            if (!name) {
              toast.error('Customer name is required.');
              return;
            }

            const newCust = await customerService.saveCustomer({ name, phone, email });
            cartStore.setCustomer(newCust);
            toast.success(`Created & attached ${newCust.name}`);
            modal.close();
          });
        }
      }
    });

    modal.open();
  }

  // Discount Modal
  openDiscountModal() {
    const currentDiscount = cartStore.discount;

    const modalContent = `
      <div class="space-y-4">
        <p class="text-xs text-[var(--muted)] font-medium">Apply a percentage or fixed discount to the current basket.</p>
        
        <div class="grid grid-cols-2 gap-2">
          <button id="disc-type-pct" class="py-2.5 rounded-[12px] text-xs font-black ${currentDiscount.type === 'percentage' ? 'bg-[var(--accent)] text-white shadow-md' : 'glass-btn-secondary'} transition">
            Percentage (%)
          </button>
          <button id="disc-type-fix" class="py-2.5 rounded-[12px] text-xs font-black ${currentDiscount.type === 'fixed' ? 'bg-[var(--accent)] text-white shadow-md' : 'glass-btn-secondary'} transition">
            Fixed Amount (${getCurrencyConfig().symbol.trim()})
          </button>
        </div>

        <div>
          <label class="block text-xs font-black text-[var(--text)] mb-1">Discount Amount</label>
          <input
            id="discount-val-input"
            type="number"
            min="0"
            step="any"
            value="${currentDiscount.value || ''}"
            placeholder="e.g. 10"
            class="glass-input w-full p-2.5 rounded-[12px] text-base font-black font-mono"
          />
        </div>

        <div class="flex items-center gap-2 pt-2">
          <button id="clear-discount-btn" class="flex-1 py-2.5 rounded-[12px] text-xs font-black glass-btn-secondary text-[var(--red)]">
            Remove Discount
          </button>
          <button id="apply-discount-confirm-btn" class="flex-1 py-2.5 rounded-[12px] text-xs font-black glass-btn-primary shadow-md">
            Apply Discount
          </button>
        </div>
      </div>
    `;

    let selectedType = currentDiscount.type;

    const modal = new Modal({
      title: 'Order Discount',
      size: 'sm',
      content: modalContent,
      onOpen: (modalEl) => {
        const pctBtn = modalEl.querySelector('#disc-type-pct');
        const fixBtn = modalEl.querySelector('#disc-type-fix');
        const valInput = modalEl.querySelector('#discount-val-input');

        pctBtn.addEventListener('click', () => {
          selectedType = 'percentage';
          pctBtn.className = 'py-2.5 rounded-[12px] text-xs font-black bg-[var(--accent)] text-white shadow-md transition';
          fixBtn.className = 'py-2.5 rounded-[12px] text-xs font-black glass-btn-secondary transition';
        });

        fixBtn.addEventListener('click', () => {
          selectedType = 'fixed';
          fixBtn.className = 'py-2.5 rounded-[12px] text-xs font-black bg-[var(--accent)] text-white shadow-md transition';
          pctBtn.className = 'py-2.5 rounded-[12px] text-xs font-black glass-btn-secondary transition';
        });

        modalEl.querySelector('#clear-discount-btn').addEventListener('click', () => {
          cartStore.setDiscount('percentage', 0);
          modal.close();
        });

        modalEl.querySelector('#apply-discount-confirm-btn').addEventListener('click', () => {
          const val = Number(valInput.value) || 0;
          cartStore.setDiscount(selectedType, val);
          modal.close();
        });
      }
    });

    modal.open();
  }

  // Held Carts Modal
  openHeldCartsModal() {
    const held = cartStore.suspendedCarts;

    const heldCardsHtml = held.map(h => `
      <div class="flex items-center justify-between p-3.5 rounded-[18px] glass-card border border-[var(--line)]">
        <div>
          <h4 class="text-xs font-black text-[var(--text)]">${h.note}</h4>
          <p class="text-[10px] text-[var(--muted)] font-mono font-medium">${h.items?.length || 0} items &bull; Total: ${formatCurrency(h.totals?.total || 0)}</p>
        </div>
        <div class="flex items-center space-x-2">
          <button data-delete-held="${h.id}" class="p-2 text-[var(--red)] hover:bg-red-500/10 rounded-[10px] transition" title="Delete hold">
            ${renderIcon('trash-2', 'w-4 h-4')}
          </button>
          <button data-resume-held="${h.id}" class="px-4 py-2 rounded-[12px] text-xs font-bold glass-btn-primary shadow-xs">
            Resume
          </button>
        </div>
      </div>
    `).join('');

    const modal = new Modal({
      title: 'Suspended Carts (On Hold)',
      size: 'md',
      content: `
        <div class="space-y-2.5">
          ${heldCardsHtml || `<p class="text-xs text-[var(--muted)] font-medium text-center py-6">No held carts.</p>`}
        </div>
      `,
      onOpen: (modalEl) => {
        modalEl.querySelectorAll('[data-resume-held]').forEach(btn => {
          btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-resume-held');
            cartStore.resumeCart(id);
            modal.close();
            toast.success('Resumed cart');
          });
        });

        modalEl.querySelectorAll('[data-delete-held]').forEach(btn => {
          btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-delete-held');
            cartStore.deleteSuspendedCart(id);
            modal.close();
            toast.info('Deleted held cart');
          });
        });
      }
    });

    modal.open();
  }

  // Multi-Step Checkout Modal
  openCheckoutModal(defaultMethod = 'cash') {
    const cartData = globalStore.get('cart');
    if (!cartData || cartData.items.length === 0) {
      toast.warning('Cart is empty. Add products before checking out.');
      return;
    }

    const totalDue = cartData.totals.total;
    let selectedMethod = defaultMethod || 'cash';
    let cashReceived = totalDue;

    const getSmartCashIncrements = (total) => {
      let step = 10;
      if (total >= 5000) step = 1000;
      else if (total >= 1000) step = 500;
      else if (total >= 200) step = 100;
      else if (total >= 50) step = 50;

      const nextRound = Math.ceil(total / step) * step;
      const amounts = [
        total,
        nextRound === total ? total + step : nextRound,
        nextRound + step,
        nextRound + step * 2
      ];
      return [...new Set(amounts)].slice(0, 4);
    };

    const smartAmounts = getSmartCashIncrements(totalDue);

    const renderModalBody = () => `
      <div class="space-y-4">
        <!-- Total Banner -->
        <div class="flex items-center justify-between p-4 sm:p-5 rounded-[22px] bg-gradient-to-r from-[#0071e3] via-[#0077ed] to-[#4f46e5] text-white shadow-xl shadow-[#0071e3]/25">
          <div>
            <span class="text-[10px] text-white/80 font-bold uppercase tracking-wider">Total Amount Due</span>
            <p class="text-2xl sm:text-3xl font-black font-mono tracking-tight mt-0.5">${formatCurrency(totalDue)}</p>
          </div>
          <div class="text-right">
            <span class="text-[11px] text-white/90 font-mono font-bold">${cartData.totals.itemCount} item(s)</span>
            <p class="text-xs text-white font-black mt-0.5">${cartData.customer ? cartData.customer.name : 'Guest Sale'}</p>
          </div>
        </div>

        <!-- Payment Method Selector Tabs -->
        <div>
          <label class="block text-[11px] font-black text-[var(--text)] uppercase tracking-wider mb-2">Select Tender Method</label>
          <div class="grid grid-cols-4 gap-2">
            <button type="button" data-method="cash" class="flex flex-col items-center justify-center p-3 rounded-[16px] border text-xs font-black transition-all ${selectedMethod === 'cash' ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-md' : 'glass-btn-secondary'}">
              <span class="text-base mb-1">💵</span>
              <span>Cash</span>
            </button>
            <button type="button" data-method="card" class="flex flex-col items-center justify-center p-3 rounded-[16px] border text-xs font-black transition-all ${selectedMethod === 'card' ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-md' : 'glass-btn-secondary'}">
              <span class="text-base mb-1">💳</span>
              <span>Card</span>
            </button>
            <button type="button" data-method="mobile" class="flex flex-col items-center justify-center p-3 rounded-[16px] border text-xs font-black transition-all ${selectedMethod === 'mobile' ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-md' : 'glass-btn-secondary'}">
              <span class="text-base mb-1">📱</span>
              <span>Apple Pay</span>
            </button>
            <button type="button" data-method="split" class="flex flex-col items-center justify-center p-3 rounded-[16px] border text-xs font-black transition-all ${selectedMethod === 'split' ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-md' : 'glass-btn-secondary'}">
              <span class="text-base mb-1">⚖️</span>
              <span>Split</span>
            </button>
          </div>
        </div>

        <!-- Dynamic Tender Form -->
        <div id="tender-form-area">
          ${selectedMethod === 'cash' ? `
            <div class="space-y-3.5 p-4 rounded-[20px] glass-card border border-[var(--line)]">
              <!-- Quick Cash Buttons -->
              <div>
                <span class="text-[10px] font-black text-[var(--muted)] uppercase tracking-wider">Quick Cash Increments</span>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                  <button type="button" data-cash-val="${totalDue}" class="py-2.5 px-2 rounded-[12px] text-xs font-black glass-btn-secondary border border-[var(--line)] truncate">
                    Exact (${formatCurrency(totalDue)})
                  </button>
                  ${smartAmounts.filter(a => a !== totalDue).map(amt => `
                    <button type="button" data-cash-val="${amt}" class="py-2.5 px-2 rounded-[12px] text-xs font-black font-mono glass-btn-secondary border border-[var(--line)] truncate">
                      ${formatCurrency(amt)}
                    </button>
                  `).join('')}
                </div>
              </div>

              <!-- Cash Tender Input & Change Due -->
              <div class="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label class="block text-[11px] font-black text-[var(--text)] mb-1">Cash Received</label>
                  <input
                    id="cash-tendered-input"
                    type="number"
                    step="any"
                    min="${totalDue}"
                    value="${cashReceived}"
                    class="glass-input w-full p-2.8 rounded-[14px] text-base font-black font-mono"
                  />
                </div>
                <div>
                  <label class="block text-[11px] font-black text-[var(--text)] mb-1">Change Due</label>
                  <div class="p-2.8 rounded-[14px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-base font-black font-mono flex items-center justify-between">
                    <span id="cash-change-display">${formatCurrency(Math.max(0, cashReceived - totalDue))}</span>
                    <span class="text-sm">✓</span>
                  </div>
                </div>
              </div>
            </div>
          ` : ''}

          ${selectedMethod === 'card' ? `
            <div class="p-6 rounded-[20px] glass-card border border-[var(--line)] flex flex-col items-center justify-center text-center space-y-2">
              <div class="text-4xl">💳</div>
              <p class="text-xs font-black text-[var(--text)]">Insert, Tap or Swipe Card</p>
              <p class="text-[11px] text-[var(--muted)] font-mono font-bold">Payment reader ready for ${formatCurrency(totalDue)}</p>
            </div>
          ` : ''}

          ${selectedMethod === 'mobile' ? `
            <div class="p-6 rounded-[20px] glass-card border border-[var(--line)] flex flex-col items-center justify-center text-center space-y-2">
              <div class="text-4xl">📱</div>
              <p class="text-xs font-black text-[var(--text)]">Hold iPhone or Apple Watch Near Reader</p>
              <p class="text-[11px] text-[var(--muted)] font-mono font-bold">Apple Pay ready for ${formatCurrency(totalDue)}</p>
            </div>
          ` : ''}

          ${selectedMethod === 'split' ? `
            <div class="space-y-3 p-4 rounded-[20px] glass-card border border-[var(--line)]">
              <div class="grid grid-cols-3 gap-2.5 text-xs">
                <div>
                  <label class="block text-[10px] font-black text-[var(--muted)] mb-1">Cash Amount</label>
                  <input id="split-cash-input" type="number" step="any" value="${(totalDue / 2).toFixed(2)}" class="glass-input w-full p-2.5 rounded-[12px] font-mono font-bold" />
                </div>
                <div>
                  <label class="block text-[10px] font-black text-[var(--muted)] mb-1">Card Amount</label>
                  <input id="split-card-input" type="number" step="any" value="${(totalDue / 2).toFixed(2)}" class="glass-input w-full p-2.5 rounded-[12px] font-mono font-bold" />
                </div>
                <div>
                  <label class="block text-[10px] font-black text-[var(--muted)] mb-1">Mobile Amount</label>
                  <input id="split-mobile-input" type="number" step="any" value="0.00" class="glass-input w-full p-2.5 rounded-[12px] font-mono font-bold" />
                </div>
              </div>
            </div>
          ` : ''}
        </div>

        <!-- Complete Button -->
        <button
          id="confirm-payment-btn"
          class="w-full py-4 rounded-[16px] text-xs font-black glass-btn-primary flex items-center justify-center space-x-1.5 shadow-xl active:scale-97 transition"
        >
          <span>Complete Sale (${formatCurrency(totalDue)})</span>
          <span class="text-sm">→</span>
        </button>
      </div>
    `;

    const modal = new Modal({
      title: 'Checkout & Payment',
      size: 'md',
      content: renderModalBody(),
      onOpen: (modalEl) => {
        const setupHandlers = () => {
          modalEl.querySelectorAll('[data-method]').forEach(tab => {
            tab.addEventListener('click', () => {
              selectedMethod = tab.getAttribute('data-method');
              modal.setContent(renderModalBody());
              setupHandlers();
            });
          });

          const cashInput = modalEl.querySelector('#cash-tendered-input');
          const changeDisp = modalEl.querySelector('#cash-change-display');

          if (cashInput && changeDisp) {
            cashInput.addEventListener('input', () => {
              cashReceived = Number(cashInput.value) || 0;
              const change = Math.max(0, cashReceived - totalDue);
              changeDisp.textContent = formatCurrency(change);
            });
          }

          modalEl.querySelectorAll('[data-cash-val]').forEach(btn => {
            btn.addEventListener('click', () => {
              const val = Number(btn.getAttribute('data-cash-val'));
              cashReceived = val;
              if (cashInput) cashInput.value = val;
              if (changeDisp) changeDisp.textContent = formatCurrency(Math.max(0, val - totalDue));
            });
          });

          const confirmBtn = modalEl.querySelector('#confirm-payment-btn');
          if (confirmBtn) {
            confirmBtn.addEventListener('click', async () => {
              let payments = [];

              if (selectedMethod === 'cash') {
                if (cashReceived < totalDue) {
                  toast.error(`Cash tendered (${formatCurrency(cashReceived)}) is less than total due (${formatCurrency(totalDue)}).`);
                  return;
                }
                payments.push({
                  method: 'cash',
                  amount: totalDue,
                  amount_tendered: cashReceived,
                  change_due: cashReceived - totalDue
                });
              } else if (selectedMethod === 'card') {
                payments.push({ method: 'card', amount: totalDue });
              } else if (selectedMethod === 'mobile') {
                payments.push({ method: 'mobile', amount: totalDue });
              } else if (selectedMethod === 'split') {
                const sCash = Number(modalEl.querySelector('#split-cash-input').value) || 0;
                const sCard = Number(modalEl.querySelector('#split-card-input').value) || 0;
                const sMobile = Number(modalEl.querySelector('#split-mobile-input').value) || 0;
                const splitSum = sCash + sCard + sMobile;

                if (Math.abs(splitSum - totalDue) > 0.01) {
                  toast.error(`Split tender sum (${formatCurrency(splitSum)}) must equal total due (${formatCurrency(totalDue)}).`);
                  return;
                }

                if (sCash > 0) payments.push({ method: 'cash', amount: sCash, amount_tendered: sCash, change_due: 0 });
                if (sCard > 0) payments.push({ method: 'card', amount: sCard });
                if (sMobile > 0) payments.push({ method: 'mobile', amount: sMobile });
              }

              confirmBtn.disabled = true;
              confirmBtn.textContent = 'Processing transaction…';

              try {
                const result = await paymentsService.processSale({
                  cartData,
                  payments,
                  orderNotes: cartData.orderNotes
                });

                soundManager.playSuccess();
                modal.close();

                const settings = settingsService.get();
                const autoReceipt = settings?.workspace?.autoPrintReceipt ?? false;
                if (autoReceipt) {
                  showReceiptModal(result.order, () => {
                    this.init();
                  });
                } else {
                  toast.success(`Order ${result.order.receipt_number || ''} completed successfully`);
                  this.init();
                }
              } catch (err) {
                console.error('Checkout error:', err);
                toast.error(err.message || 'Payment processing failed');
                confirmBtn.disabled = false;
                confirmBtn.textContent = 'Complete Sale';
              }
            });
          }
        };

        setupHandlers();
      }
    });

    modal.open();
  }
}
