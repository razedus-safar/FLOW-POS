/**
 * FlowPOS Executive Admin Dashboard View - Liquid Glass Edition
 * High-Contrast Legibility & Saturated Inks in Light & Dark Mode
 */

import { reportsService } from '../services/reports.js';
import { ordersService } from '../services/orders.js';
import { productService } from '../services/products.js';
import { registerService } from '../services/registers.js';
import { formatCurrency } from '../utils/currency.js';
import { formatDate } from '../utils/dates.js';
import { renderIcon } from '../utils/icons.js';

export class DashboardPage {
  constructor(container) {
    this.container = container;
    this.init();
  }

  async init() {
    const [report, orders, products, activeSession] = await Promise.all([
      reportsService.getSalesReport('7days'),
      orderService.getAllOrders(),
      productService.getAllProducts(),
      Promise.resolve(registerService.getActiveSession())
    ]);

    this.report = report;
    this.orders = orders;
    this.products = products;
    this.activeSession = activeSession;
    this.render();
    this.drawSalesChart();
  }

  render() {
    const lowStock = this.products.filter(p => Number(p.stock_quantity) <= (Number(p.reorder_level) || 5));
    const recentOrders = this.orders.slice(0, 6);

    const recentOrdersHtml = recentOrders.map(o => `
      <div class="flex items-center justify-between p-3 rounded-[15px] glass-card border border-[var(--line)] shadow-xs transition">
        <div class="flex items-center space-x-2.5">
          <div class="p-2 rounded-[10px] bg-[var(--accent)]/15 text-[var(--accent)] text-xs font-black">
            ${renderIcon('receipt', 'w-3.5 h-3.5')}
          </div>
          <div>
            <p class="text-xs font-black font-mono text-[var(--text)]">${o.order_number}</p>
            <p class="text-[10px] text-[var(--muted)] font-medium">${o.customer_name || 'Guest'} &bull; ${o.items?.length || 0} item(s)</p>
          </div>
        </div>
        <div class="text-right">
          <p class="text-xs font-black font-mono text-[var(--text)]">${formatCurrency(o.total_amount)}</p>
          <p class="text-[9px] text-[var(--muted)] font-mono font-medium mt-0.5">${formatDate(o.created_at, 'time')}</p>
        </div>
      </div>
    `).join('');

    const topProductsHtml = this.report.topProducts.slice(0, 5).map((p, idx) => `
      <div class="flex items-center justify-between p-2.5 rounded-[12px] hover:bg-white/40 dark:hover:bg-white/[0.05] transition">
        <div class="flex items-center space-x-2.5 min-w-0">
          <span class="w-5 text-center text-xs font-black text-[var(--accent)] font-mono">#${idx + 1}</span>
          <div class="truncate">
            <p class="text-xs font-black text-[var(--text)] truncate">${p.name}</p>
            <p class="text-[9px] text-[var(--muted)] font-mono font-medium">${p.quantity} units sold</p>
          </div>
        </div>
        <span class="text-xs font-black font-mono text-[var(--text)]">${formatCurrency(p.revenue)}</span>
      </div>
    `).join('');

    this.container.innerHTML = `
      <div class="h-full overflow-y-auto p-4 sm:p-6 space-y-5">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 class="text-xl sm:text-2xl font-black font-heading text-[var(--text)] tracking-tight">Executive Dashboard</h1>
            <p class="text-xs text-[var(--muted)] font-medium">Real-time overview of revenue performance, profit margins, and stock health.</p>
          </div>
          <div class="flex items-center space-x-2">
            <a href="#/pos" class="px-3.5 py-2 rounded-[14px] text-xs font-black glass-btn-primary flex items-center space-x-1.5 shadow-md active:scale-98 transition">
              ${renderIcon('shopping-bag', 'w-4 h-4')}
              <span>Open POS Counter</span>
            </a>
          </div>
        </div>

        <!-- 4 Core Metric KPI Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
          <!-- Total Revenue -->
          <div class="glass-card p-4 rounded-[20px] border border-[var(--line)] shadow-xs">
            <div class="flex items-center justify-between mb-2">
              <span class="text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">7-Day Revenue</span>
              <span class="p-2 rounded-[10px] bg-[var(--accent)]/15 text-[var(--accent)]">${renderIcon('banknote', 'w-4 h-4')}</span>
            </div>
            <p class="text-xl sm:text-2xl font-black font-mono text-[var(--text)] tracking-tight">${formatCurrency(this.report.totalRevenue)}</p>
            <div class="mt-1.5 flex items-center space-x-1 text-[10px] text-[var(--green)] font-bold">
              <span>↑ ${this.report.orderCount} orders processed</span>
            </div>
          </div>

          <!-- Total Profit -->
          <div class="glass-card p-4 rounded-[20px] border border-[var(--line)] shadow-xs">
            <div class="flex items-center justify-between mb-2">
              <span class="text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">Gross Profit</span>
              <span class="p-2 rounded-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">${renderIcon('trending-up', 'w-4 h-4')}</span>
            </div>
            <p class="text-xl sm:text-2xl font-black font-mono text-[var(--text)] tracking-tight">${formatCurrency(this.report.totalProfit)}</p>
            <div class="mt-1.5 flex items-center space-x-1 text-[10px] text-[var(--green)] font-bold">
              <span>↑ ${this.report.profitMargin}% Margin</span>
            </div>
          </div>

          <!-- Average Ticket -->
          <div class="glass-card p-4 rounded-[20px] border border-[var(--line)] shadow-xs">
            <div class="flex items-center justify-between mb-2">
              <span class="text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">Average Order</span>
              <span class="p-2 rounded-[10px] bg-purple-500/15 text-purple-600 dark:text-purple-400">${renderIcon('shopping-cart', 'w-4 h-4')}</span>
            </div>
            <p class="text-xl sm:text-2xl font-black font-mono text-[var(--text)] tracking-tight">${formatCurrency(this.report.averageOrderValue)}</p>
            <div class="mt-1.5 flex items-center space-x-1 text-[10px] text-[var(--muted)] font-medium">
              <span>Per transaction</span>
            </div>
          </div>

          <!-- Low Stock Alert -->
          <div class="glass-card p-4 rounded-[20px] border border-[var(--line)] shadow-xs">
            <div class="flex items-center justify-between mb-2">
              <span class="text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">Low Stock Alerts</span>
              <span class="p-2 rounded-[10px] bg-amber-500/15 text-amber-600 dark:text-amber-400">${renderIcon('alert-triangle', 'w-4 h-4')}</span>
            </div>
            <p class="text-xl sm:text-2xl font-black font-mono text-[var(--text)] tracking-tight">${lowStock.length}</p>
            <div class="mt-1.5 flex items-center space-x-1 text-[10px] ${lowStock.length > 0 ? 'text-[var(--amber)]' : 'text-[var(--green)]'} font-bold">
              <span>${lowStock.length > 0 ? 'Action required' : 'Inventory healthy'}</span>
            </div>
          </div>
        </div>

        <!-- 2 Column Chart & Leaderboards Layout -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <!-- Sales Trend Chart Canvas -->
          <div class="lg:col-span-8 glass-panel-heavy p-4 sm:p-5 rounded-[24px] border border-[var(--line)] shadow-lg space-y-3">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-sm font-black font-heading text-[var(--text)]">Daily Revenue Trend</h3>
                <p class="text-[10px] text-[var(--muted)] font-medium">7-day performance curve</p>
              </div>
            </div>
            <div class="h-64 w-full relative">
              <canvas id="dashboard-sales-chart" class="w-full h-full"></canvas>
            </div>
          </div>

          <!-- Top Selling Products -->
          <div class="lg:col-span-4 glass-panel-heavy p-4 sm:p-5 rounded-[24px] border border-[var(--line)] shadow-lg flex flex-col justify-between space-y-3">
            <div>
              <div class="flex items-center justify-between pb-2 border-b border-[var(--line)]">
                <h3 class="text-sm font-black font-heading text-[var(--text)]">Top Products</h3>
                <span class="text-[9px] font-black uppercase text-[var(--muted)]">Volume</span>
              </div>
              <div class="space-y-1 mt-2">
                ${topProductsHtml || '<p class="text-xs text-[var(--muted)] text-center py-8 font-medium">No sales recorded yet.</p>'}
              </div>
            </div>

            <a href="#/reports" class="w-full py-2 rounded-[12px] text-xs font-black glass-btn-secondary flex items-center justify-center space-x-1 text-[var(--accent)]">
              <span>View Full Analytics</span>
              <span>→</span>
            </a>
          </div>
        </div>

        <!-- Recent Transactions Ledger -->
        <div class="glass-panel-heavy p-4 sm:p-5 rounded-[24px] border border-[var(--line)] shadow-lg space-y-3">
          <div class="flex items-center justify-between pb-2 border-b border-[var(--line)]">
            <div>
              <h3 class="text-sm font-black font-heading text-[var(--text)]">Recent Transactions</h3>
              <p class="text-[10px] text-[var(--muted)] font-medium">Latest sales processed at POS</p>
            </div>
            <a href="#/orders" class="text-xs text-[var(--accent)] font-bold hover:underline">View All Orders →</a>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            ${recentOrdersHtml || '<p class="text-xs text-[var(--muted)] col-span-full py-6 text-center font-medium">No orders recorded.</p>'}
          </div>
        </div>
      </div>
    `;
  }

  drawSalesChart() {
    const canvas = this.container.querySelector('#dashboard-sales-chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const data = this.report.dailySales || [];
    if (data.length === 0) return;

    const padding = { top: 20, right: 20, bottom: 30, left: 50 };
    const chartW = rect.width - padding.left - padding.right;
    const chartH = rect.height - padding.top - padding.bottom;

    const maxVal = Math.max(...data.map(d => d.revenue), 100) * 1.15;
    const stepX = chartW / (data.length - 1 || 1);

    // Background horizontal grid lines
    ctx.strokeStyle = 'rgba(124, 135, 153, 0.15)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartW, y);
      ctx.stroke();

      const val = maxVal * (1 - i / 4);
      ctx.fillStyle = 'rgba(124, 135, 153, 0.8)';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(formatCurrency(val), padding.left - 8, y + 3);
    }

    // Points
    const points = data.map((d, idx) => {
      const x = padding.left + idx * stepX;
      const y = padding.top + chartH - (d.revenue / maxVal) * chartH;
      return { x, y, label: d.date?.slice(5) || `D${idx + 1}` };
    });

    // Area Fill Gradient
    const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
    gradient.addColorStop(0, 'rgba(52, 120, 246, 0.35)');
    gradient.addColorStop(1, 'rgba(52, 120, 246, 0.00)');

    ctx.beginPath();
    ctx.moveTo(points[0].x, padding.top + chartH);
    points.forEach((p, idx) => {
      if (idx === 0) ctx.lineTo(p.x, p.y);
      else {
        const prev = points[idx - 1];
        const cx1 = prev.x + (p.x - prev.x) / 2;
        const cy1 = prev.y;
        const cx2 = prev.x + (p.x - prev.x) / 2;
        const cy2 = p.y;
        ctx.bezierCurveTo(cx1, cy1, cx2, cy2, p.x, p.y);
      }
    });
    ctx.lineTo(points[points.length - 1].x, padding.top + chartH);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Line Path
    ctx.beginPath();
    points.forEach((p, idx) => {
      if (idx === 0) ctx.moveTo(p.x, p.y);
      else {
        const prev = points[idx - 1];
        const cx1 = prev.x + (p.x - prev.x) / 2;
        const cy1 = prev.y;
        const cx2 = prev.x + (p.x - prev.x) / 2;
        const cy2 = p.y;
        ctx.bezierCurveTo(cx1, cy1, cx2, cy2, p.x, p.y);
      }
    });
    ctx.strokeStyle = '#3478f6';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Dot Nodes & Labels
    points.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#3478f6';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = 'rgba(124, 135, 153, 0.9)';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(p.label, p.x, padding.top + chartH + 18);
    });
  }
}
