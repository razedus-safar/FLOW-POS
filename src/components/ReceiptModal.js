/**
 * FlowPOS Receipt Modal & Thermal Printer Formatter
 */

import { Modal } from './Modal.js';
import { formatCurrency } from '../utils/currency.js';
import { formatDate } from '../utils/dates.js';
import { settingsService } from '../services/settings.js';
import { hardwarePrinter } from '../services/printer.js';
import { renderIcon } from '../utils/icons.js';
import confetti from 'canvas-confetti';

export function showReceiptModal(order, onComplete = null) {
  const settings = settingsService.get();
  const store = settings.store || {};
  const hw = settings.hardware || {};

  // Trigger celebration confetti
  try {
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.6 }
    });
  } catch {}

  // Auto-print receipt if enabled in hardware settings
  if (hw.autoPrintReceipt) {
    setTimeout(() => {
      hardwarePrinter.printReceipt(order);
    }, 400);
  }

  const itemsRowsHtml = (order.items || []).map(item => `
    <div class="flex justify-between text-xs py-1 border-b border-dashed border-slate-300 dark:border-slate-700">
      <div class="flex-1 pr-2">
        <p class="font-medium text-slate-800 dark:text-slate-200">${item.quantity}x ${item.product_name || item.name}</p>
        <p class="text-[10px] text-slate-400 font-mono">@ ${formatCurrency(item.unit_price || item.price)}</p>
      </div>
      <div class="text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
        ${formatCurrency(item.line_total || item.total_price || (item.quantity * item.price))}
      </div>
    </div>
  `).join('');

  const payments = order.payments || [{ payment_method: order.payment_method || 'CASH', amount: order.total_amount || order.total || 0 }];
  const paymentsHtml = payments.map(p => `
    <div class="flex justify-between text-xs py-0.5 text-slate-600 dark:text-slate-300">
      <span class="capitalize">${p.payment_method}</span>
      <span class="font-mono">${formatCurrency(p.amount)}</span>
    </div>
    ${p.payment_method === 'cash' && p.change_due > 0 ? `
      <div class="flex justify-between text-xs py-0.5 text-emerald-600 dark:text-emerald-400 font-semibold">
        <span>Change Returned</span>
        <span class="font-mono">${formatCurrency(p.change_due)}</span>
      </div>
    ` : ''}
  `).join('');

  const receiptContentHtml = `
    <div class="space-y-4">
      <!-- Success Badge -->
      <div class="flex flex-col items-center justify-center p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
        <div class="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center mb-1.5 shadow-lg shadow-emerald-500/30">
          ${renderIcon('check', 'w-6 h-6')}
        </div>
        <h4 class="font-bold font-heading text-sm text-emerald-600 dark:text-emerald-400">Payment Successful</h4>
        <p class="text-xs text-slate-500 font-mono">Order #${order.order_number || order.id || 'REC-1001'}</p>
      </div>

      <!-- Thermal Receipt Preview Card -->
      <div id="thermal-receipt-print-area" class="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 shadow-inner font-mono text-slate-900 dark:text-slate-100 text-xs space-y-3">
        <!-- Store Header -->
        <div class="text-center space-y-1 pb-2 border-b border-dashed border-slate-300 dark:border-slate-700">
          <h3 class="font-bold text-sm tracking-tight">${store.name || 'FlowPOS Store'}</h3>
          <p class="text-[10px] text-slate-500 dark:text-slate-400">${store.address || ''}, ${store.city || ''}</p>
          <p class="text-[10px] text-slate-500 dark:text-slate-400">Tel: ${store.phone || ''} &bull; Tax ID: ${store.taxId || ''}</p>
        </div>

        <!-- Order Meta -->
        <div class="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 pb-1">
          <div>
            <p>Order: <span class="font-bold text-slate-800 dark:text-slate-200">${order.order_number || order.id}</span></p>
            <p>Cashier: ${order.cashier_name || 'Staff'}</p>
          </div>
          <div class="text-right">
            <p>${formatDate(order.created_at, 'short')}</p>
            <p>${formatDate(order.created_at, 'time')}</p>
          </div>
        </div>

        ${order.customer_name ? `
          <div class="text-[11px] bg-slate-100 dark:bg-slate-800/60 p-1.5 rounded text-slate-700 dark:text-slate-300">
            Customer: <span class="font-bold">${order.customer_name}</span>
          </div>
        ` : ''}

        <!-- Items -->
        <div class="space-y-1 pt-1">
          ${itemsRowsHtml}
        </div>

        <!-- Totals -->
        <div class="pt-2 border-t border-slate-300 dark:border-slate-700 space-y-1">
          <div class="flex justify-between text-xs">
            <span>Subtotal</span>
            <span>${formatCurrency(order.subtotal || order.total || 0)}</span>
          </div>
          ${order.discount_amount > 0 ? `
            <div class="flex justify-between text-xs text-emerald-600 dark:text-emerald-400">
              <span>Discount</span>
              <span>-${formatCurrency(order.discount_amount)}</span>
            </div>
          ` : ''}
          <div class="flex justify-between text-xs">
            <span>Tax (${order.tax_rate || 0}%)</span>
            <span>${formatCurrency(order.tax_amount || 0)}</span>
          </div>
          <div class="flex justify-between text-sm font-bold pt-1 border-t border-dashed border-slate-300 dark:border-slate-700">
            <span>TOTAL</span>
            <span>${formatCurrency(order.total_amount || order.total || 0)}</span>
          </div>
        </div>

        <!-- Payments -->
        <div class="pt-2 border-t border-slate-300 dark:border-slate-700 space-y-0.5">
          ${paymentsHtml}
        </div>

        <!-- Footer -->
        <div class="text-center text-[10px] text-slate-400 dark:text-slate-500 pt-3 border-t border-dashed border-slate-300 dark:border-slate-700 leading-tight">
          <p>${store.receiptFooter || 'Thank you for shopping!'}</p>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="space-y-2 pt-1">
        <div class="grid grid-cols-2 gap-2">
          <!-- WhatsApp Digital Receipt -->
          <button id="whatsapp-receipt-btn" class="py-2.5 px-3 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center space-x-1.5 shadow-md active:scale-95 transition">
            <span>💬 Send WhatsApp</span>
          </button>

          <!-- Copy Receipt Text / SMS -->
          <button id="copy-receipt-btn" class="py-2.5 px-3 rounded-xl text-xs font-bold glass-btn-secondary flex items-center justify-center space-x-1.5 active:scale-95 transition">
            <span>📋 Copy Digital Text</span>
          </button>
        </div>

        <div class="flex items-center gap-2.5">
          <button id="print-receipt-btn" class="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold glass-btn-secondary flex items-center justify-center space-x-2 active:scale-95 transition">
            ${renderIcon('printer', 'w-4 h-4')}
            <span>Print Thermal</span>
          </button>
          <button id="finish-sale-btn" class="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold glass-btn-primary flex items-center justify-center space-x-2 shadow-md active:scale-95 transition">
            <span>New Sale</span>
            ${renderIcon('chevron-right', 'w-4 h-4')}
          </button>
        </div>
      </div>
    </div>
  `;

  const modal = new Modal({
    title: 'Sale Receipt',
    size: 'md',
    content: receiptContentHtml,
    onOpen: (modalEl) => {
      const printBtn = modalEl.querySelector('#print-receipt-btn');
      if (printBtn) {
        printBtn.addEventListener('click', () => {
          hardwarePrinter.printReceipt(order);
        });
      }

      // WhatsApp Share
      const waBtn = modalEl.querySelector('#whatsapp-receipt-btn');
      if (waBtn) {
        waBtn.addEventListener('click', () => {
          const itemsText = (order.items || []).map(i => `• ${i.quantity}x ${i.product_name || i.name} - ${formatCurrency(i.line_total || i.total_price || (i.quantity * i.price))}`).join('\n');
          const totalVal = formatCurrency(order.total_amount || order.total || 0);
          const storeName = store.name || 'FlowPOS Store';
          const ref = order.order_number || order.id || 'REC-1001';

          const text = `🧾 *${storeName}*\nOrder Ref: #${ref}\nDate: ${new Date().toLocaleDateString()}\n------------------------\n${itemsText}\n------------------------\n*TOTAL DUE: ${totalVal}*\nPayment: ${order.payment_method || 'CASH'}\n\n${store.receiptFooter || 'Thank you for your visit!'}`;

          const custPhone = (order.customer_phone || order.phone || '').replace(/[^0-9]/g, '');
          const waUrl = custPhone ? `https://wa.me/${custPhone}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
          window.open(waUrl, '_blank');
          toast.success('Opened WhatsApp with digital receipt!');
        });
      }

      // Copy Receipt Text
      const copyBtn = modalEl.querySelector('#copy-receipt-btn');
      if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
          const itemsText = (order.items || []).map(i => `${i.quantity}x ${i.product_name || i.name} - ${formatCurrency(i.line_total || i.total_price || (i.quantity * i.price))}`).join('\n');
          const totalVal = formatCurrency(order.total_amount || order.total || 0);
          const storeName = store.name || 'FlowPOS Store';
          const ref = order.order_number || order.id || 'REC-1001';

          const text = `Receipt from ${storeName}\nOrder #${ref}\nDate: ${new Date().toLocaleString()}\n\nItems:\n${itemsText}\n\nTOTAL: ${totalVal}\nPayment: ${order.payment_method || 'CASH'}\n${store.receiptFooter || ''}`;

          try {
            await navigator.clipboard.writeText(text);
            toast.success('Digital receipt copied to clipboard!');
          } catch (e) {
            toast.info('Receipt summary prepared.');
          }
        });
      }

      const finishBtn = modalEl.querySelector('#finish-sale-btn');
      if (finishBtn) {
        finishBtn.addEventListener('click', () => {
          modal.close();
          if (onComplete) onComplete();
        });
      }
    }
  });

  modal.open();
}
