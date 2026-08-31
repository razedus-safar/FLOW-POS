/**
 * FlowPOS Gift Cards & Vouchers Management View
 * Issue cards, check balances, top-up credit, and print digital gift vouchers
 */

import { giftCardsService } from '../services/giftCards.js';
import { formatCurrency } from '../utils/currency.js';
import { renderIcon } from '../utils/icons.js';
import { Modal } from '../components/Modal.js';
import { toast } from '../components/Toast.js';
import { soundManager } from '../utils/audio.js';

export class GiftCardsPage {
  constructor(container) {
    this.container = container;
    this.cards = [];
    this.searchQuery = '';
    this.init();
  }

  init() {
    this.cards = giftCardsService.getAll();
    this.render();
    this.attachEvents();
  }

  render() {
    const totalLiability = this.cards.reduce((sum, c) => sum + (c.status === 'ACTIVE' ? c.current_balance : 0), 0);
    const activeCardsCount = this.cards.filter(c => c.status === 'ACTIVE').length;

    let filtered = this.cards.filter(c => {
      if (!this.searchQuery) return true;
      const q = this.searchQuery.toLowerCase();
      return c.code.toLowerCase().includes(q) || (c.customer_name || '').toLowerCase().includes(q);
    });

    const cardsHtml = filtered.map(card => {
      const isDepleted = card.current_balance <= 0;
      return `
        <div class="p-5 rounded-[22px] glass-panel border border-[var(--line)] space-y-4 hover:border-[var(--accent)] transition-all shadow-md flex flex-col justify-between">
          <div>
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-center space-x-2">
                <span class="p-2 rounded-[10px] bg-[var(--accent)]/15 text-[var(--accent)]">
                  ${renderIcon('gift', 'w-4 h-4')}
                </span>
                <span class="badge ${card.status === 'ACTIVE' ? 'badge-emerald' : 'badge-subtle'} text-[10px] font-bold">
                  ${card.status}
                </span>
              </div>
              <strong class="font-mono text-base font-black ${isDepleted ? 'text-[var(--muted)]' : 'text-[var(--accent)]'}">
                ${formatCurrency(card.current_balance)}
              </strong>
            </div>

            <div class="mt-3.5 space-y-1">
              <span class="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Card Code</span>
              <div class="font-mono text-xs font-black text-[var(--text)] tracking-wider flex items-center space-x-1.5">
                <span>${card.code}</span>
              </div>
              <p class="text-xs font-bold text-[var(--text)] truncate mt-1">Recipient: ${card.customer_name || 'Anonymous Guest'}</p>
              <p class="text-[10px] text-[var(--muted)]">Initial: ${formatCurrency(card.initial_balance)} &bull; Issued: ${new Date(card.created_at).toLocaleDateString()}</p>
            </div>
          </div>

          <div class="pt-3 border-t border-[var(--line)] flex items-center justify-between gap-2">
            <button
              type="button"
              data-topup-card="${card.code}"
              class="px-3 py-1.5 rounded-[10px] glass-btn-secondary text-xs font-bold active:scale-95 transition"
            >
              + Top-up
            </button>

            <button
              type="button"
              data-print-card="${card.code}"
              class="px-3 py-1.5 rounded-[10px] glass-btn-primary text-xs font-black active:scale-95 transition"
            >
              Voucher Preview
            </button>
          </div>
        </div>
      `;
    }).join('');

    this.container.innerHTML = `
      <div class="h-full flex flex-col overflow-hidden p-4 sm:p-6 space-y-5">
        
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[var(--line)] flex-shrink-0">
          <div>
            <h1 class="text-xl sm:text-2xl font-black font-heading text-[var(--text)] tracking-tight">Gift Cards & Store Credits</h1>
            <p class="text-xs text-[var(--muted)] font-medium">Issue digital gift cards, top-up balances, and redeem vouchers during checkout.</p>
          </div>

          <button
            type="button"
            id="issue-gift-card-btn"
            class="px-5 py-2.5 rounded-[14px] glass-btn-primary text-xs font-black shadow-lg flex items-center space-x-1.5 active:scale-95 transition"
          >
            ${renderIcon('plus', 'w-4 h-4')}
            <span>Issue Gift Card</span>
          </button>
        </div>

        <!-- Metrics Strip -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3.5 flex-shrink-0">
          <div class="p-4 rounded-[20px] glass-card flex items-center space-x-3.5">
            <div class="p-3 rounded-[14px] bg-purple-500/15 text-purple-500">
              ${renderIcon('credit-card', 'w-5 h-5')}
            </div>
            <div>
              <span class="text-[10px] uppercase font-bold text-[var(--muted)]">Active Gift Cards</span>
              <strong class="text-xl font-black text-[var(--text)] block">${activeCardsCount} Cards</strong>
            </div>
          </div>

          <div class="p-4 rounded-[20px] glass-card flex items-center space-x-3.5">
            <div class="p-3 rounded-[14px] bg-emerald-500/15 text-emerald-500">
              ${renderIcon('banknote', 'w-5 h-5')}
            </div>
            <div>
              <span class="text-[10px] uppercase font-bold text-[var(--muted)]">Outstanding Balance Liability</span>
              <strong class="text-xl font-black font-mono text-[var(--green)] block">${formatCurrency(totalLiability)}</strong>
            </div>
          </div>

          <!-- Quick Balance Check Input -->
          <div class="p-3 rounded-[20px] glass-card flex items-center space-x-2">
            <input
              type="text"
              id="quick-balance-check-input"
              placeholder="Enter Gift Card Code…"
              class="glass-input flex-1 h-9 px-3 rounded-[12px] text-xs font-mono font-bold uppercase"
            />
            <button
              type="button"
              id="check-balance-btn"
              class="px-3 h-9 rounded-[12px] glass-btn-primary text-xs font-black"
            >
              Check
            </button>
          </div>
        </div>

        <!-- Search Bar -->
        <div class="flex items-center justify-between gap-3 flex-shrink-0">
          <div class="relative w-full sm:w-80">
            <input
              type="text"
              id="gift-cards-search-input"
              value="${this.searchQuery}"
              placeholder="Search code, customer name…"
              class="glass-input w-full h-10 pl-3 pr-8 rounded-[12px] text-xs font-semibold"
            />
          </div>
        </div>

        <!-- Cards Grid -->
        <div class="flex-1 overflow-y-auto">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-6">
            ${filtered.length === 0 ? `
              <div class="col-span-full py-16 text-center space-y-2 text-[var(--muted)]">
                <div class="text-4xl">🎟️</div>
                <strong class="text-sm font-bold text-[var(--text)]">No gift cards found</strong>
                <p class="text-xs">Click "Issue Gift Card" above to create your first voucher.</p>
              </div>
            ` : cardsHtml}
          </div>
        </div>

      </div>
    `;
  }

  attachEvents() {
    // Issue Button
    const issueBtn = this.container.querySelector('#issue-gift-card-btn');
    if (issueBtn) {
      issueBtn.addEventListener('click', () => {
        this.openIssueModal();
      });
    }

    // Search
    const searchInput = this.container.querySelector('#gift-cards-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        this.render();
        this.attachEvents();
      });
    }

    // Top-up Buttons
    this.container.querySelectorAll('[data-topup-card]').forEach(btn => {
      btn.addEventListener('click', () => {
        const code = btn.getAttribute('data-topup-card');
        this.openTopUpModal(code);
      });
    });

    // Voucher Preview
    this.container.querySelectorAll('[data-print-card]').forEach(btn => {
      btn.addEventListener('click', () => {
        const code = btn.getAttribute('data-print-card');
        this.openVoucherModal(code);
      });
    });

    // Quick Balance Check
    const checkBtn = this.container.querySelector('#check-balance-btn');
    const checkInput = this.container.querySelector('#quick-balance-check-input');
    if (checkBtn && checkInput) {
      checkBtn.addEventListener('click', () => {
        const code = checkInput.value.trim();
        const card = giftCardsService.getByCode(code);
        if (card) {
          toast.success(`Card ${card.code}: Balance is ${formatCurrency(card.current_balance)} (${card.customer_name})`);
        } else {
          toast.error('Invalid Gift Card code');
        }
      });
    }
  }

  openIssueModal() {
    const randomCode = `GIFT-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;

    const content = `
      <form id="issue-card-form" class="space-y-4">
        <div>
          <label class="block text-xs font-black text-[var(--text)] mb-1">Gift Card Code</label>
          <input
            name="code"
            type="text"
            required
            value="${randomCode}"
            class="glass-input w-full p-2.5 rounded-[12px] text-xs font-mono font-black tracking-wider uppercase"
          />
        </div>

        <div>
          <label class="block text-xs font-black text-[var(--text)] mb-1">Card Amount (Stored Value) *</label>
          <input
            name="amount"
            type="number"
            required
            min="100"
            step="100"
            value="5000"
            class="glass-input w-full p-2.5 rounded-[12px] text-xs font-mono font-bold text-[var(--accent)]"
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-black text-[var(--text)] mb-1">Customer / Recipient Name</label>
            <input
              name="customer_name"
              type="text"
              placeholder="e.g. Kasun Silva"
              class="glass-input w-full p-2.5 rounded-[12px] text-xs font-bold"
            />
          </div>
          <div>
            <label class="block text-xs font-black text-[var(--text)] mb-1">Phone Number (Optional)</label>
            <input
              name="customer_phone"
              type="text"
              placeholder="+94 77 123 4567"
              class="glass-input w-full p-2.5 rounded-[12px] text-xs font-bold"
            />
          </div>
        </div>

        <div class="pt-3 border-t border-[var(--line)] flex justify-end space-x-2.5">
          <button type="button" id="modal-cancel-btn" class="px-4 py-2 rounded-[12px] text-xs font-bold glass-btn-secondary">
            Cancel
          </button>
          <button type="submit" class="px-5 py-2 rounded-[12px] text-xs font-black glass-btn-primary shadow-md">
            Issue Voucher
          </button>
        </div>
      </form>
    `;

    const modal = new Modal({
      title: 'Issue New Gift Card',
      size: 'md',
      content,
      onOpen: (modalEl) => {
        const form = modalEl.querySelector('#issue-card-form');
        const cancelBtn = modalEl.querySelector('#modal-cancel-btn');
        cancelBtn.addEventListener('click', () => modal.close());

        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const fd = new FormData(form);
          const newCard = giftCardsService.issue({
            code: fd.get('code'),
            amount: Number(fd.get('amount')),
            customer_name: fd.get('customer_name') || '',
            customer_phone: fd.get('customer_phone') || ''
          });

          soundManager.playSuccess();
          toast.success(`Gift card ${newCard.code} issued with ${formatCurrency(newCard.initial_balance)}!`);
          modal.close();
          this.init();
        });
      }
    });

    modal.open();
  }

  openTopUpModal(code) {
    const card = giftCardsService.getByCode(code);
    if (!card) return;

    const content = `
      <form id="topup-card-form" class="space-y-4">
        <div class="p-3 rounded-[14px] glass-card border border-[var(--line)] space-y-1">
          <span class="text-[10px] uppercase font-bold text-[var(--muted)]">Card Code:</span>
          <strong class="text-xs font-mono font-black text-[var(--text)] block">${card.code}</strong>
          <span class="text-xs text-[var(--muted)]">Current Balance: <strong class="text-[var(--accent)]">${formatCurrency(card.current_balance)}</strong></span>
        </div>

        <div>
          <label class="block text-xs font-black text-[var(--text)] mb-1">Add Value Amount *</label>
          <input
            name="amount"
            type="number"
            required
            min="100"
            step="100"
            value="2000"
            class="glass-input w-full p-2.5 rounded-[12px] text-xs font-mono font-bold text-[var(--accent)]"
          />
        </div>

        <div class="pt-3 border-t border-[var(--line)] flex justify-end space-x-2.5">
          <button type="button" id="modal-cancel-btn" class="px-4 py-2 rounded-[12px] text-xs font-bold glass-btn-secondary">
            Cancel
          </button>
          <button type="submit" class="px-5 py-2 rounded-[12px] text-xs font-black glass-btn-primary shadow-md">
            Top-up Balance
          </button>
        </div>
      </form>
    `;

    const modal = new Modal({
      title: `Top-up Gift Card: ${card.code}`,
      size: 'sm',
      content,
      onOpen: (modalEl) => {
        const form = modalEl.querySelector('#topup-card-form');
        modalEl.querySelector('#modal-cancel-btn').addEventListener('click', () => modal.close());

        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const amt = Number(new FormData(form).get('amount')) || 0;
          giftCardsService.topUp(card.code, amt);
          soundManager.playSuccess();
          toast.success(`Added ${formatCurrency(amt)} to ${card.code}!`);
          modal.close();
          this.init();
        });
      }
    });

    modal.open();
  }

  openVoucherModal(code) {
    const card = giftCardsService.getByCode(code);
    if (!card) return;

    const content = `
      <div class="space-y-4">
        <!-- Printable Gift Card Graphic -->
        <div class="p-6 rounded-[24px] bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 text-white border border-white/20 shadow-2xl space-y-4 select-none">
          <div class="flex items-center justify-between">
            <span class="text-xs font-black tracking-widest uppercase text-indigo-400">GIFT VOUCHER</span>
            <span class="text-xl">🎁</span>
          </div>
          <div>
            <span class="text-[10px] text-slate-400 uppercase tracking-wider block">Stored Balance</span>
            <div class="text-2xl sm:text-3xl font-black font-mono text-emerald-400 mt-0.5">
              ${formatCurrency(card.current_balance)}
            </div>
          </div>
          <div class="pt-2 border-t border-white/10 flex items-center justify-between">
            <div>
              <span class="text-[9px] text-slate-400 uppercase block">Card Reference</span>
              <span class="text-xs font-mono font-bold tracking-widest text-white">${card.code}</span>
            </div>
            <span class="text-[10px] text-slate-400">${card.customer_name || 'Guest'}</span>
          </div>
        </div>

        <div class="flex justify-end space-x-2">
          <button type="button" id="close-voucher-modal-btn" class="px-4 py-2 rounded-[12px] glass-btn-primary text-xs font-bold">
            Done
          </button>
        </div>
      </div>
    `;

    const modal = new Modal({
      title: 'Digital Gift Voucher Preview',
      size: 'sm',
      content,
      onOpen: (modalEl) => {
        modalEl.querySelector('#close-voucher-modal-btn').addEventListener('click', () => modal.close());
      }
    });

    modal.open();
  }
}
