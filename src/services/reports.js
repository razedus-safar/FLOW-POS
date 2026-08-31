/**
 * FlowPOS Comprehensive Reporting & Analytics Service
 */

import { ordersService } from './orders.js';
import { productService } from './products.js';
import { formatCurrency } from '../utils/currency.js';

class ReportsService {
  filterOrdersByRange(orders, rangeKey, customStart = null, customEnd = null) {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return orders.filter(order => {
      const orderDate = new Date(order.created_at);
      if (rangeKey === 'today') {
        return orderDate >= startOfToday;
      }
      if (rangeKey === 'yesterday') {
        const startOfYesterday = new Date(startOfToday);
        startOfYesterday.setDate(startOfYesterday.getDate() - 1);
        return orderDate >= startOfYesterday && orderDate < startOfToday;
      }
      if (rangeKey === '7days') {
        const past7 = new Date(now.getTime() - 7 * 86400000);
        return orderDate >= past7;
      }
      if (rangeKey === '30days') {
        const past30 = new Date(now.getTime() - 30 * 86400000);
        return orderDate >= past30;
      }
      if (rangeKey === 'month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return orderDate >= startOfMonth;
      }
      if (rangeKey === 'custom' && customStart && customEnd) {
        return orderDate >= new Date(customStart) && orderDate <= new Date(customEnd);
      }
      return true;
    });
  }

  async getFinancialSummary(rangeKey = 'today', customStart = null, customEnd = null) {
    return this.getSalesReport(rangeKey, customStart, customEnd);
  }

  async getSalesReport(rangeKey = '7days', customStart = null, customEnd = null) {
    const allOrders = await ordersService.getAllOrders();
    const orders = this.filterOrdersByRange(allOrders, rangeKey, customStart, customEnd);
    const products = await productService.getAllProducts();

    const productMap = new Map(products.map(p => [p.id, p]));

    let totalRevenue = 0;
    let totalTax = 0;
    let totalDiscount = 0;
    let totalCost = 0;
    let itemsSold = 0;
    const paymentBreakdown = { cash: 0, card: 0, mobile: 0 };
    const productSalesMap = new Map();
    const categorySalesMap = new Map();

    orders.forEach(order => {
      totalRevenue += Number(order.total_amount) || 0;
      totalTax += Number(order.tax_amount) || 0;
      totalDiscount += Number(order.discount_amount) || 0;

      if (order.payments) {
        order.payments.forEach(p => {
          const method = p.payment_method || 'card';
          paymentBreakdown[method] = (paymentBreakdown[method] || 0) + (Number(p.amount) || 0);
        });
      }

      if (order.items) {
        order.items.forEach(item => {
          itemsSold += Number(item.quantity) || 0;
          const prod = productMap.get(item.product_id);
          const unitCost = prod ? Number(prod.cost_price) || 0 : 0;
          totalCost += unitCost * (Number(item.quantity) || 0);

          // By Product
          const existingProd = productSalesMap.get(item.product_id) || {
            name: item.product_name,
            sku: item.sku,
            quantity: 0,
            revenue: 0
          };
          existingProd.quantity += Number(item.quantity) || 0;
          existingProd.revenue += Number(item.line_total) || (Number(item.quantity) * Number(item.unit_price));
          productSalesMap.set(item.product_id, existingProd);

          // By Category
          const catId = prod?.category_id || 'Other';
          const existingCat = categorySalesMap.get(catId) || 0;
          categorySalesMap.set(catId, existingCat + (Number(item.line_total) || 0));
        });
      }
    });

    const grossProfit = totalRevenue - totalTax - totalCost;
    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const aov = orders.length > 0 ? totalRevenue / orders.length : 0;

    const topProducts = Array.from(productSalesMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);

    return {
      orderCount: orders.length,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      grossProfit: Number(grossProfit.toFixed(2)),
      grossMargin: Number(grossMargin.toFixed(1)),
      averageOrderValue: Number(aov.toFixed(2)),
      totalTax: Number(totalTax.toFixed(2)),
      totalDiscount: Number(totalDiscount.toFixed(2)),
      itemsSold,
      paymentBreakdown,
      topProducts,
      categorySales: Array.from(categorySalesMap.entries()).map(([catId, amount]) => ({ catId, amount }))
    };
  }

  exportReportCSV(reportData, title = 'Sales_Report') {
    const headers = ['Metric', 'Value'];
    const rows = [
      ['Total Orders', reportData.orderCount],
      ['Total Revenue', `"${formatCurrency(reportData.totalRevenue)}"`],
      ['Gross Profit', `"${formatCurrency(reportData.grossProfit)}"`],
      ['Gross Margin', `${reportData.grossMargin}%`],
      ['Average Order Value', `"${formatCurrency(reportData.averageOrderValue)}"`],
      ['Total Tax Collected', `"${formatCurrency(reportData.totalTax)}"`],
      ['Total Discounts', `"${formatCurrency(reportData.totalDiscount)}"`],
      ['Total Items Sold', reportData.itemsSold],
      ['Cash Payments', `"${formatCurrency(reportData.paymentBreakdown.cash || 0)}"`],
      ['Card Payments', `"${formatCurrency(reportData.paymentBreakdown.card || 0)}"`],
      ['Mobile Payments', `"${formatCurrency(reportData.paymentBreakdown.mobile || 0)}"`]
    ];

    if (typeof document === 'undefined') return;

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `flowpos_${title.toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export const reportsService = new ReportsService();
