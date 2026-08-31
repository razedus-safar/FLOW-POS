/**
 * FlowPOS Loyalty & Rewards Management View - iOS 26 High Contrast Edition
 */

import { loyaltyService } from '../services/loyalty.js';
import { customerService } from '../services/customers.js';
import { toast } from '../components/Toast.js';
import { renderIcon } from '../utils/icons.js';

export class LoyaltyPage {
  constructor(container) {
    this.container = container;
    this.rules = null;
    this.customers = [];
    this.init();
  }

  async init() {
    this.rules = loyaltyService.getRules();
    this.customers = await customerService.getAllCustomers();
    this.render();
    this.attachEvents();
  }

  render() {
    const sortedCustomers = [...this.customers].sort((a, b) => (b.loyalty_points || 0) - (a.loyalty_points || 0));

    const customerLeaderboardHtml = sortedCustomers.map((c, idx) => `
      <div class="flex items-center justify-between p-3 rounded-[16px] glass-card border border-[var(--line)] transition-all">
        <div class="flex items-center space-x-3 min-w-0">
          <span class="w-5 text-center text-xs font-black text-[var(--muted)] font-mono">#${idx + 1}</span>
          <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-[#0071e3] to-[#af52de] flex items-center justify-center text-white text-xs font-black shadow-xs flex-shrink-0">
            ${c.name.charAt(0)}
          </div>
          <div class="truncate">
            <p class="text-xs font-extrabold text-[var(--text)] truncate">${c.name}</p>
            <p class="text-[10px] text-[var(--muted)] font-mono font-semibold">${c.order_count || 0} visits &bull; $${(c.total_spend || 0).toFixed(2)} spent</p>
          </div>
        </div>
        <div class="text-right flex-shrink-0">
          <span class="badge ${c.tier === 'Gold' ? 'badge-gold' : c.tier === 'Platinum' ? 'badge-platinum' : c.tier === 'Silver' ? 'badge-silver' : 'badge-bronze'}">${c.tier}</span>
          <p class="text-xs font-mono font-black text-[var(--text)] mt-0.5">${c.loyalty_points || 0} pts</p>
        </div>
      </div>
    `).join('');

    const tiersHtml = this.rules.tiers.map(t => `
      <div class="p-3.5 rounded-[16px] border border-[var(--line)] glass-card space-y-1.5">
        <div class="flex items-center justify-between">
          <span class="text-xs font-black text-[var(--text)]">${t.name}</span>
          <span class="px-2 py-0.5 rounded-full text-[9px] font-black text-white shadow-xs" style="background-color: ${t.color}">${t.multiplier}x Points</span>
        </div>
        <p class="text-[10px] text-[var(--muted)] font-semibold">Unlocked after $${t.minSpend} spend</p>
      </div>
    `).join('');

    this.container.innerHTML = `
      <div class="h-full overflow-y-auto p-4 sm:p-6 space-y-5">
        <!-- Header -->
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-xl sm:text-2xl font-black font-heading text-[var(--text)] tracking-tight">Loyalty & Rewards Program</h1>
            <p class="text-xs text-[var(--muted)] font-medium">Configure customer points earning rates, tier multipliers, and redemption rules.</p>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <!-- Left: Program Rules Configuration -->
          <div class="lg:col-span-8 glass p-5 rounded-[24px] border border-[var(--line)] space-y-4 shadow-sm">
            <h3 class="font-black text-sm text-[var(--text)] flex items-center space-x-2">
              <span class="text-[var(--accent)]">${renderIcon('award', 'w-4 h-4')}</span>
              <span>Earning & Redemption Rules</span>
            </h3>

            <form id="loyalty-rules-form" class="space-y-4">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-black text-[var(--text)] mb-1">Point Earning Rate ($ / 1 pt)</label>
                  <div class="relative">
                    <input
                      name="earnRate"
                      type="number"
                      min="0.1"
                      step="0.1"
                      value="${this.rules.earnRateDollarsPerPoint}"
                      class="glass-input w-full p-2.5 rounded-[12px] text-xs font-mono font-bold"
                    />
                    <span class="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-[var(--muted)] font-bold">per $1.00</span>
                  </div>
                  <p class="text-[10px] text-[var(--muted)] font-medium mt-1">Example: 1 = 1 point per dollar spent.</p>
                </div>

                <div>
                  <label class="block text-xs font-black text-[var(--text)] mb-1">Redemption Rate (Points / $1 discount)</label>
                  <div class="relative">
                    <input
                      name="redemptionRate"
                      type="number"
                      min="1"
                      value="${this.rules.redemptionPointsPerDollar}"
                      class="glass-input w-full p-2.5 rounded-[12px] text-xs font-mono font-bold"
                    />
                    <span class="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-[var(--muted)] font-bold">points = $1</span>
                  </div>
                  <p class="text-[10px] text-[var(--muted)] font-medium mt-1">Example: 20 points = $1.00 discount (100 pts = $5 off).</p>
                </div>
              </div>

              <div>
                <label class="block text-xs font-black text-[var(--text)] mb-1">Minimum Points to Redeem</label>
                <input
                  name="minPoints"
                  type="number"
                  min="1"
                  value="${this.rules.minimumPointsToRedeem}"
                  class="glass-input w-full sm:w-48 p-2.5 rounded-[12px] text-xs font-mono font-bold"
                />
              </div>

              <!-- Tiers Overview -->
              <div class="space-y-2 pt-3 border-t border-[var(--line)]">
                <h4 class="text-xs font-black text-[var(--text)] uppercase tracking-wider">Configured Member Tiers</h4>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  ${tiersHtml}
                </div>
              </div>

              <div class="pt-2 flex justify-end">
                <button type="submit" class="px-5 py-2.5 rounded-[14px] text-xs font-black glass-btn-primary shadow-md">
                  Save Loyalty Rules
                </button>
              </div>
            </form>
          </div>

          <!-- Right: Customer Points Leaderboard -->
          <div class="lg:col-span-4 glass p-5 rounded-[24px] border border-[var(--line)] space-y-3 flex flex-col shadow-sm">
            <div class="flex items-center justify-between pb-2.5 border-b border-[var(--line)]">
              <h3 class="font-black text-sm text-[var(--text)]">Top Loyalty Members</h3>
              <span class="text-xs text-amber-600 dark:text-amber-400 font-black font-mono">${this.customers.reduce((s, c) => s + (c.loyalty_points || 0), 0)} Total Pts</span>
            </div>
            <div class="flex-1 overflow-y-auto space-y-2 max-h-96 pr-0.5 scrollbar-none">
              ${customerLeaderboardHtml}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  attachEvents() {
    const form = this.container.querySelector('#loyalty-rules-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        this.rules.earnRateDollarsPerPoint = Number(formData.get('earnRate')) || 1;
        this.rules.redemptionPointsPerDollar = Number(formData.get('redemptionRate')) || 20;
        this.rules.minimumPointsToRedeem = Number(formData.get('minPoints')) || 50;

        loyaltyService.saveRules(this.rules);
        toast.success('Loyalty rules updated successfully!');
      });
    }
  }
}
