/**
 * FlowPOS Kitchen Display System (KDS) - Interactive Food & Drink Order Queue
 * Live ticket bumping, elapsed timer color indicators, item strikethrough, and multi-theme support
 */

import { ordersService } from '../services/orders.js';
import { settingsService } from '../services/settings.js';
import { renderIcon } from '../utils/icons.js';
import { soundManager } from '../utils/audio.js';
import { toast } from '../components/Toast.js';

export class KDSPage {
  constructor(container) {
    this.container = container;
    this.activeOrders = [];
    this.completedOrders = [];
    this.struckItems = new Set(); // orderId-itemIdx
    this.timerInterval = null;
    this.kitchenTheme = 'auto'; // 'auto' | 'dark'
    this.init();
  }

  async init() {
    await this.loadOrders();
    this.render();
    this.attachEvents();

    // Live sync listener for incoming sales
    window.addEventListener('flowpos:order-completed', (e) => {
      if (e.detail) {
        this.activeOrders.unshift({
          ...e.detail,
          kdsStatus: 'IN_PREP',
          createdAtTimestamp: Date.now()
        });
        soundManager.playSuccess();
        toast.info(`New Order #${e.detail.order_number || 'REC'} received in kitchen!`);
        this.render();
        this.attachEvents();
      }
    });

    // Auto-refresh timer every 15s for color-coded elapsed time
    if (!this.timerInterval) {
      this.timerInterval = setInterval(() => {
        this.updateTimers();
      }, 15000);
    }
  }

  async loadOrders() {
    const all = await ordersService.getAllOrders();
    // Use recent orders as active prep items if any exist
    if (all && all.length > 0) {
      this.activeOrders = all.slice(0, 8).map((o, idx) => ({
        ...o,
        kdsStatus: 'IN_PREP',
        createdAtTimestamp: Date.now() - (idx * 120000) // simulated staggered minutes
      }));
    } else {
      // Create starter demo ticket for instant preview
      this.activeOrders = [
        {
          id: 'ord-demo-1',
          order_number: 'ORD-101',
          customer_name: 'Walk-in Guest',
          createdAtTimestamp: Date.now() - 180000,
          items: [
            { quantity: 2, product_name: 'Espresso Double Shot', notes: 'Extra hot' },
            { quantity: 1, product_name: 'Oat Milk Flat White', notes: 'Vanilla syrup' },
            { quantity: 1, product_name: 'Butter Croissant', notes: 'Warmed' }
          ]
        },
        {
          id: 'ord-demo-2',
          order_number: 'ORD-102',
          customer_name: 'Sarah Jenkins (Table 4)',
          createdAtTimestamp: Date.now() - 480000,
          items: [
            { quantity: 1, product_name: 'Iced Caramel Macchiato', notes: 'Less ice' },
            { quantity: 2, product_name: 'Avocado Toast with Poached Egg' }
          ]
        }
      ];
    }
  }

  render() {
    const settings = settingsService.getSettings();
    const store = settings?.store || {};

    const ticketsHtml = this.activeOrders.map(order => {
      const elapsedMins = Math.floor((Date.now() - (order.createdAtTimestamp || Date.now())) / 60000);
      const isLate = elapsedMins >= 10;
      const isWarning = elapsedMins >= 5 && elapsedMins < 10;

      let timerBadgeClass = 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      let cardBorderClass = 'border-emerald-500/40 hover:border-emerald-500';

      if (isLate) {
        timerBadgeClass = 'bg-red-500 text-white font-black animate-pulse';
        cardBorderClass = 'border-red-500 ring-2 ring-red-500/30 shadow-red-500/20';
      } else if (isWarning) {
        timerBadgeClass = 'bg-amber-500 text-slate-950 font-black';
        cardBorderClass = 'border-amber-400 ring-1 ring-amber-400/30';
      }

      const itemsHtml = (order.items || []).map((item, itemIdx) => {
        const itemKey = `${order.id}-${itemIdx}`;
        const isStruck = this.struckItems.has(itemKey);

        return `
          <li
            class="flex items-start justify-between p-2 rounded-[12px] border transition select-none cursor-pointer ${isStruck ? 'bg-black/5 dark:bg-white/5 opacity-40 line-through border-transparent' : 'bg-white/50 dark:bg-white/5 border-[var(--line)] hover:border-[var(--accent)]'}"
            data-strike-item="${itemKey}"
            title="Click to strike through when prepared"
          >
            <div class="flex items-start space-x-2.5 min-w-0">
              <span class="w-6 h-6 rounded-[8px] ${isStruck ? 'bg-slate-300 dark:bg-slate-700 text-slate-600' : 'bg-[var(--accent)]/15 text-[var(--accent)] font-black'} font-mono text-xs flex items-center justify-center flex-shrink-0">
                ${item.quantity}x
              </span>
              <div class="min-w-0">
                <span class="text-xs font-bold text-[var(--text)] leading-tight block truncate ${isStruck ? 'line-through' : ''}">
                  ${item.product_name || item.name}
                </span>
                ${item.notes ? `<span class="text-[10px] text-amber-500 dark:text-amber-400 font-medium block">${item.notes}</span>` : ''}
              </div>
            </div>
            <span class="text-xs text-[var(--muted)] pl-1">
              ${isStruck ? '✓' : '○'}
            </span>
          </li>
        `;
      }).join('');

      return `
        <div class="kds-ticket flex flex-col justify-between rounded-[22px] glass-card border-2 ${cardBorderClass} shadow-xl p-4 transition-all duration-200">
          
          <!-- Ticket Header -->
          <div class="pb-3 border-b border-[var(--line)] space-y-2 flex-shrink-0">
            <div class="flex items-center justify-between">
              <span class="text-sm font-black font-mono text-[var(--text)]">#${order.order_number || order.id?.substring(0, 6) || 'TICKET'}</span>
              <span class="text-[11px] px-2.5 py-0.5 rounded-full font-mono font-black border ${timerBadgeClass}">
                ⏱ ${elapsedMins}m
              </span>
            </div>
            <div class="flex items-center justify-between text-[11px] text-[var(--muted)] font-medium">
              <span class="truncate max-w-[140px]">${order.customer_name || 'Walk-in Guest'}</span>
              <span class="font-bold font-mono">${order.items?.length || 0} Items</span>
            </div>
          </div>

          <!-- Items List -->
          <div class="flex-1 overflow-y-auto py-3 space-y-1.5 min-h-[160px] max-h-[260px] scrollbar-thin">
            <ul class="space-y-1.5">
              ${itemsHtml}
            </ul>
          </div>

          <!-- Bump Action Button -->
          <div class="pt-3 border-t border-[var(--line)] flex-shrink-0">
            <button
              type="button"
              data-bump-order="${order.id}"
              class="w-full py-2.5 rounded-[14px] bg-emerald-600 hover:bg-emerald-500 active:scale-96 text-white font-black text-xs flex items-center justify-center space-x-2 shadow-lg transition"
            >
              ${renderIcon('check', 'w-4 h-4')}
              <span>BUMP / READY</span>
            </button>
          </div>
        </div>
      `;
    }).join('');

    this.container.innerHTML = `
      <div class="h-full flex flex-col overflow-hidden p-4 sm:p-6 space-y-4 select-none">
        
        <!-- Top KDS Header Bar -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--line)] flex-shrink-0">
          <div class="flex items-center space-x-3">
            <div class="p-2.5 rounded-[14px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              ${renderIcon('chef-hat', 'w-5 h-5')}
            </div>
            <div>
              <h1 class="text-xl sm:text-2xl font-black font-heading text-[var(--text)] tracking-tight">Kitchen & Bar Display System (KDS)</h1>
              <p class="text-xs text-[var(--muted)] font-medium">${store.name || 'FlowPOS'} &bull; Real-time Preparation & Ticket Bump Queue</p>
            </div>
          </div>

          <!-- Controls -->
          <div class="flex flex-wrap items-center gap-2">
            <span class="badge badge-emerald px-3 py-1.5 text-xs font-black">
              ${this.activeOrders.length} Active Ticket${this.activeOrders.length === 1 ? '' : 's'}
            </span>

            <button
              type="button"
              id="simulate-order-btn"
              class="px-3 py-1.5 rounded-[12px] glass-btn-secondary text-xs font-bold flex items-center space-x-1.5 active:scale-95 transition"
              title="Add a test kitchen order"
            >
              ${renderIcon('plus', 'w-3.5 h-3.5')}
              <span>Add Test Order</span>
            </button>

            ${this.completedOrders.length > 0 ? `
              <button
                type="button"
                id="recall-last-ticket-btn"
                class="px-3 py-1.5 rounded-[12px] glass-btn-secondary text-xs font-bold text-[var(--accent)] flex items-center space-x-1.5 active:scale-95 transition"
              >
                ${renderIcon('rotate-ccw', 'w-3.5 h-3.5')}
                <span>Recall Last (${this.completedOrders.length})</span>
              </button>
            ` : ''}
          </div>
        </div>

        <!-- Orders Ticket Grid -->
        <div class="flex-1 overflow-y-auto pb-4">
          ${this.activeOrders.length === 0 ? `
            <div class="h-64 flex flex-col items-center justify-center text-center space-y-3 glass-card rounded-[24px] border border-[var(--line)] p-8">
              <div class="text-5xl">🍳</div>
              <h3 class="text-base font-black text-[var(--text)]">All orders prepped and served!</h3>
              <p class="text-xs text-[var(--muted)] max-w-sm">New orders from POS counter will appear here automatically in real time.</p>
              <button
                type="button"
                id="empty-simulate-order-btn"
                class="px-4 py-2 rounded-[12px] glass-btn-primary text-xs font-bold"
              >
                + Generate Test Ticket
              </button>
            </div>
          ` : `
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              ${ticketsHtml}
            </div>
          `}
        </div>

      </div>
    `;
  }

  attachEvents() {
    // Bump Order (Mark Ready)
    this.container.querySelectorAll('[data-bump-order]').forEach(btn => {
      btn.addEventListener('click', () => {
        const orderId = btn.getAttribute('data-bump-order');
        const bumpedIdx = this.activeOrders.findIndex(o => o.id === orderId);
        if (bumpedIdx >= 0) {
          const [bumped] = this.activeOrders.splice(bumpedIdx, 1);
          this.completedOrders.push(bumped);
          soundManager.playSuccess();
          toast.success(`Order #${bumped.order_number || orderId} BUMPED / Ready for Pickup!`);
          this.render();
          this.attachEvents();
        }
      });
    });

    // Strike item individual toggle
    this.container.querySelectorAll('[data-strike-item]').forEach(item => {
      item.addEventListener('click', () => {
        const key = item.getAttribute('data-strike-item');
        if (this.struckItems.has(key)) {
          this.struckItems.delete(key);
        } else {
          this.struckItems.add(key);
          soundManager.playChime();
        }
        this.render();
        this.attachEvents();
      });
    });

    // Recall Last Ticket
    const recallBtn = this.container.querySelector('#recall-last-ticket-btn');
    if (recallBtn) {
      recallBtn.addEventListener('click', () => {
        if (this.completedOrders.length > 0) {
          const recalled = this.completedOrders.pop();
          this.activeOrders.unshift(recalled);
          toast.info(`Recalled Order #${recalled.order_number || recalled.id}`);
          this.render();
          this.attachEvents();
        }
      });
    }

    // Simulate Test Order
    const simBtns = this.container.querySelectorAll('#simulate-order-btn, #empty-simulate-order-btn');
    simBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const demoNumber = Math.floor(100 + Math.random() * 900);
        const sampleItems = [
          { quantity: 1, product_name: 'Caffe Latte with Oat Milk', notes: 'Extra hot' },
          { quantity: 2, product_name: 'Blueberry Muffin' },
          { quantity: 1, product_name: 'Iced Matcha Green Tea' }
        ];

        this.activeOrders.unshift({
          id: `ord-test-${Date.now()}`,
          order_number: `ORD-${demoNumber}`,
          customer_name: 'Mobile / QR Order',
          createdAtTimestamp: Date.now(),
          items: sampleItems
        });
        soundManager.playSuccess();
        toast.success(`Test Order #ORD-${demoNumber} added to Kitchen Queue!`);
        this.render();
        this.attachEvents();
      });
    });
  }

  updateTimers() {
    this.render();
    this.attachEvents();
  }

  destroy() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }
}
