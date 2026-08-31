/**
 * FlowPOS Business Analytics & Security Audit Ledger - Apple iOS 26 High-Contrast Edition
 */

import { reportsService } from '../services/reports.js';
import { auditService } from '../services/audit.js';
import { toast } from '../components/Toast.js';
import { formatCurrency } from '../utils/currency.js';
import { formatDate } from '../utils/dates.js';
import { renderIcon } from '../utils/icons.js';

export class ReportsPage {
  constructor(container) {
    this.container = container;
    this.activeTab = 'financial'; // 'financial' | 'audit'
    this.selectedRange = 'today';
    this.reportData = {
      orderCount: 0,
      totalRevenue: 0,
      grossProfit: 0,
      grossMargin: 0,
      averageOrderValue: 0,
      totalTax: 0,
      totalDiscount: 0,
      itemsSold: 0,
      paymentBreakdown: { cash: 0, card: 0, mobile: 0 },
      topProducts: []
    };
    this.auditLogs = [];
    this.init();
  }

  async init() {
    try {
      [this.reportData, this.auditLogs] = await Promise.all([
        reportsService.getSalesReport(this.selectedRange),
        auditService.getRecentLogs(100)
      ]);
    } catch (err) {
      console.error('Failed to fetch reports data:', err);
    } finally {
      this.render();
      this.attachEvents();
    }
  }

  render() {
    const report = this.reportData || {
      orderCount: 0,
      totalRevenue: 0,
      grossProfit: 0,
      grossMargin: 0,
      averageOrderValue: 0,
      totalTax: 0,
      totalDiscount: 0,
      itemsSold: 0,
      paymentBreakdown: { cash: 0, card: 0, mobile: 0 },
      topProducts: []
    };

    const ranges = [
      { id: 'today', label: 'Today' },
      { id: 'yesterday', label: 'Yesterday' },
      { id: '7days', label: 'Last 7 Days' },
      { id: '30days', label: 'Last 30 Days' },
      { id: 'month', label: 'This Month' }
    ];

    const rangeButtonsHtml = ranges.map(r => `
      <button data-report-range="${r.id}" class="px-3.5 py-1.5 rounded-[12px] text-xs font-black transition-all ${this.selectedRange === r.id ? 'bg-[var(--accent)] text-white shadow-xs' : 'glass-btn-secondary'}">
        ${r.label}
      </button>
    `).join('');

    const topProductsRowsHtml = (report.topProducts || []).map((p, idx) => `
      <tr class="hover:bg-black/[0.03] dark:hover:bg-white/[0.04] border-b border-[var(--line)] transition">
        <td class="px-4 py-3 text-xs font-mono font-bold text-[var(--muted)]">#${idx + 1}</td>
        <td class="px-4 py-3 text-xs font-extrabold text-[var(--text)]">${p.name}</td>
        <td class="px-4 py-3 text-xs font-mono text-[var(--muted)] font-bold">${p.sku}</td>
        <td class="px-4 py-3 text-xs font-mono text-center font-black text-[var(--text)]">${p.quantity}</td>
        <td class="px-4 py-3 text-xs font-mono font-black text-right text-[var(--accent)]">${formatCurrency(p.revenue)}</td>
      </tr>
    `).join('');

    const auditRowsHtml = (this.auditLogs || []).slice(0, 50).map(log => `
      <tr class="hover:bg-black/[0.03] dark:hover:bg-white/[0.04] border-b border-[var(--line)] transition">
        <td class="px-4 py-3 text-xs font-mono text-[var(--muted)] font-bold whitespace-nowrap">${formatDate(log.timestamp, 'short')} ${formatDate(log.timestamp, 'time')}</td>
        <td class="px-4 py-3 text-xs font-extrabold text-[var(--text)]">${log.user_name} <span class="text-[10px] text-[var(--accent)] font-mono font-bold">(${log.user_role})</span></td>
        <td class="px-4 py-3">
          <span class="badge badge-blue">
            ${log.action}
          </span>
        </td>
        <td class="px-4 py-3 text-xs font-mono text-[var(--muted)] font-bold">${log.entity} / ${log.entity_id}</td>
        <td class="px-4 py-3 text-xs text-[var(--text)] font-mono font-semibold truncate max-w-xs">
          ${typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}
        </td>
      </tr>
    `).join('');

    this.container.innerHTML = `
      <div class="h-full overflow-y-auto p-4 sm:p-6 space-y-5">
        <!-- Header & Tabs -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 class="text-xl sm:text-2xl font-black font-heading text-[var(--text)] tracking-tight">Business Reports & Audit Trail</h1>
            <p class="text-xs text-[var(--muted)] font-medium">Track profit margins, tender mix, inventory valuation, and security logs.</p>
          </div>

          <div class="flex items-center space-x-2">
            <!-- View Tabs -->
            <div class="flex items-center p-0.8 rounded-[14px] glass border border-[var(--line)]">
              <button id="tab-financial-btn" class="px-3.5 py-1.5 rounded-[10px] text-xs font-black transition-all ${this.activeTab === 'financial' ? 'bg-[var(--accent)] text-white shadow-xs' : 'text-[var(--muted)] hover:text-[var(--text)]'}">
                Financial Reports
              </button>
              <button id="tab-audit-btn" class="px-3.5 py-1.5 rounded-[10px] text-xs font-black transition-all ${this.activeTab === 'audit' ? 'bg-[var(--accent)] text-white shadow-xs' : 'text-[var(--muted)] hover:text-[var(--text)]'}">
                Security & Audit Logs
              </button>
            </div>

            ${this.activeTab === 'financial' ? `
              <button id="export-report-btn" class="px-4 py-2 rounded-[14px] text-xs font-black glass-btn-primary flex items-center space-x-1.5 shadow-md">
                ${renderIcon('download', 'w-4 h-4')}
                <span>Export CSV</span>
              </button>
            ` : ''}
          </div>
        </div>

        ${this.activeTab === 'financial' ? `
          <!-- Range Filter Bar -->
          <div class="flex items-center space-x-2 pb-1">
            <div class="flex items-center space-x-1.5 p-1 rounded-[16px] glass border border-[var(--line)]">
              ${rangeButtonsHtml}
            </div>
          </div>

          <!-- 4 Primary KPI Summary Cards -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div class="glass-card p-4 sm:p-5 rounded-[22px] border border-[var(--line)] shadow-xs">
              <span class="text-[10px] font-black text-[var(--muted)] uppercase tracking-wider">Gross Sales</span>
              <p class="text-2xl font-black font-heading text-[var(--text)] mt-1">${formatCurrency(report.totalRevenue || 0)}</p>
              <p class="text-[10px] text-[var(--green)] font-black mt-1">${report.orderCount || 0} orders processed</p>
            </div>

            <div class="glass-card p-4 sm:p-5 rounded-[22px] border border-[var(--line)] shadow-xs">
              <span class="text-[10px] font-black text-[var(--muted)] uppercase tracking-wider">Gross Profit</span>
              <p class="text-2xl font-black font-heading text-[var(--green)] mt-1">${formatCurrency(report.grossProfit || 0)}</p>
              <p class="text-[10px] text-[var(--muted)] font-bold mt-1">${report.grossMargin || 0}% net margin</p>
            </div>

            <div class="glass-card p-4 sm:p-5 rounded-[22px] border border-[var(--line)] shadow-xs">
              <span class="text-[10px] font-black text-[var(--muted)] uppercase tracking-wider">Average Order Value</span>
              <p class="text-2xl font-black font-heading text-[var(--text)] mt-1">${formatCurrency(report.averageOrderValue || 0)}</p>
              <p class="text-[10px] text-[var(--muted)] font-bold mt-1">${report.itemsSold || 0} items sold</p>
            </div>

            <div class="glass-card p-4 sm:p-5 rounded-[22px] border border-[var(--line)] shadow-xs">
              <span class="text-[10px] font-black text-[var(--muted)] uppercase tracking-wider">Sales Tax Collected</span>
              <p class="text-2xl font-black font-heading text-[var(--accent)] mt-1">${formatCurrency(report.totalTax || 0)}</p>
              <p class="text-[10px] text-[var(--muted)] font-bold mt-1">Discounts: ${formatCurrency(report.totalDiscount || 0)}</p>
            </div>
          </div>

          <!-- Payment Breakdown & Top Products -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div class="glass-card p-5 rounded-[24px] border border-[var(--line)] space-y-4 shadow-xs">
              <h3 class="font-black font-heading text-sm text-[var(--text)]">Payment Tender Breakdown</h3>
              <div class="space-y-4">
                <div>
                  <div class="flex justify-between text-xs mb-1.5">
                    <span class="font-extrabold text-[var(--text)]">Credit / Debit Card</span>
                    <span class="font-mono font-black text-[var(--text)]">${formatCurrency(report.paymentBreakdown?.card || 0)}</span>
                  </div>
                  <div class="w-full bg-slate-200/60 dark:bg-white/10 rounded-full h-2.5 overflow-hidden">
                    <div class="bg-[var(--accent)] h-2.5 rounded-full" style="width: ${(report.totalRevenue || 0) > 0 ? (((report.paymentBreakdown?.card || 0) / report.totalRevenue) * 100) : 0}%"></div>
                  </div>
                </div>

                <div>
                  <div class="flex justify-between text-xs mb-1.5">
                    <span class="font-extrabold text-[var(--text)]">Cash Drawer</span>
                    <span class="font-mono font-black text-[var(--text)]">${formatCurrency(report.paymentBreakdown?.cash || 0)}</span>
                  </div>
                  <div class="w-full bg-slate-200/60 dark:bg-white/10 rounded-full h-2.5 overflow-hidden">
                    <div class="bg-[var(--green)] h-2.5 rounded-full" style="width: ${(report.totalRevenue || 0) > 0 ? (((report.paymentBreakdown?.cash || 0) / report.totalRevenue) * 100) : 0}%"></div>
                  </div>
                </div>

                <div>
                  <div class="flex justify-between text-xs mb-1.5">
                    <span class="font-extrabold text-[var(--text)]">Mobile / Apple Pay</span>
                    <span class="font-mono font-black text-[var(--text)]">${formatCurrency(report.paymentBreakdown?.mobile || 0)}</span>
                  </div>
                  <div class="w-full bg-slate-200/60 dark:bg-white/10 rounded-full h-2.5 overflow-hidden">
                    <div class="bg-[var(--purple)] h-2.5 rounded-full" style="width: ${(report.totalRevenue || 0) > 0 ? (((report.paymentBreakdown?.mobile || 0) / report.totalRevenue) * 100) : 0}%"></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Top Performing Products Table -->
            <div class="lg:col-span-2 glass-card p-5 rounded-[24px] border border-[var(--line)] space-y-3 shadow-xs">
              <h3 class="font-black font-heading text-sm text-[var(--text)]">Top Performing Products by Volume</h3>
              <div class="overflow-x-auto rounded-[16px] border border-[var(--line)]">
                <table class="min-w-full divide-y divide-[var(--line)]">
                  <thead>
                    <tr class="text-left text-[10px] font-black text-[var(--text)] uppercase tracking-wider">
                      <th class="px-4 py-2.5">Rank</th>
                      <th class="px-4 py-2.5">Product</th>
                      <th class="px-4 py-2.5">SKU</th>
                      <th class="px-4 py-2.5 text-center">Qty Sold</th>
                      <th class="px-4 py-2.5 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-[var(--line)]">
                    ${topProductsRowsHtml || '<tr><td colspan="5" class="text-center py-6 text-xs text-[var(--muted)] font-semibold">No sales records in range.</td></tr>'}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ` : `
          <!-- Security & Audit Trail View -->
          <div class="glass-card p-5 rounded-[24px] border border-[var(--line)] space-y-3 shadow-xs">
            <div class="flex items-center justify-between pb-2 border-b border-[var(--line)]">
              <h3 class="font-black font-heading text-sm text-[var(--text)]">Security & Activity Audit Ledger</h3>
              <span class="text-xs font-mono font-bold text-[var(--muted)]">${this.auditLogs?.length || 0} audit entries recorded</span>
            </div>
            <div class="overflow-x-auto rounded-[16px] border border-[var(--line)]">
              <table class="min-w-full divide-y divide-[var(--line)]">
                <thead>
                  <tr class="text-left text-[10px] font-black text-[var(--text)] uppercase tracking-wider">
                    <th class="px-4 py-2.5">Timestamp</th>
                    <th class="px-4 py-2.5">Staff User</th>
                    <th class="px-4 py-2.5">Action Event</th>
                    <th class="px-4 py-2.5">Entity / ID</th>
                    <th class="px-4 py-2.5">Audit Payload Details</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[var(--line)]">
                  ${auditRowsHtml || '<tr><td colspan="5" class="text-center py-8 text-xs text-[var(--muted)] font-semibold">No audit logs recorded yet.</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>
        `}
      </div>
    `;
  }

  attachEvents() {
    const finBtn = this.container.querySelector('#tab-financial-btn');
    const auditBtn = this.container.querySelector('#tab-audit-btn');

    if (finBtn && auditBtn) {
      finBtn.addEventListener('click', () => {
        this.activeTab = 'financial';
        this.render();
        this.attachEvents();
      });
      auditBtn.addEventListener('click', () => {
        this.activeTab = 'audit';
        this.render();
        this.attachEvents();
      });
    }

    this.container.querySelectorAll('[data-report-range]').forEach(btn => {
      btn.addEventListener('click', async () => {
        this.selectedRange = btn.getAttribute('data-report-range');
        this.reportData = await reportsService.getSalesReport(this.selectedRange);
        this.render();
        this.attachEvents();
      });
    });

    const exportBtn = this.container.querySelector('#export-report-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const report = this.reportData;
        const csvContent = [
          'Metric,Value',
          `Gross Revenue,${report.totalRevenue}`,
          `Gross Profit,${report.grossProfit}`,
          `Gross Margin,${report.grossMargin}%`,
          `Orders Count,${report.orderCount}`,
          `Items Sold,${report.itemsSold}`,
          `Avg Order Value,${report.averageOrderValue}`,
          `Tax Collected,${report.totalTax}`,
          `Discounts Total,${report.totalDiscount}`
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `flowpos-report-${this.selectedRange}-${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Report exported to CSV!');
      });
    }
  }
}
