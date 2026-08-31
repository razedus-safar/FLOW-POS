/**
 * FlowPOS Orders & Returns Service
 */

import { localDB } from '../offline/database.js';
import { productService } from './products.js';
import { customerService } from './customers.js';
import { auditService } from './audit.js';
import { sessionManager } from '../store/session.js';

class OrdersService {
  async getAllOrders() {
    const orders = await localDB.getAll('orders');
    return orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  async getOrderById(id) {
    return await localDB.getById('orders', id);
  }

  async processRefund({ orderId, itemsToRefund, refundMethod = 'cash', reason = 'Customer return' }) {
    const order = await this.getOrderById(orderId);
    if (!order) throw new Error('Order not found');

    const user = sessionManager.getUser();
    let totalRefundAmount = 0;
    const refundedItemsSummary = [];

    for (const item of itemsToRefund) {
      const orderItem = order.items.find(i => i.product_id === item.product_id);
      if (orderItem) {
        const qty = Math.min(item.quantity, orderItem.quantity);
        const lineRefund = qty * orderItem.unit_price;
        totalRefundAmount += lineRefund;

        refundedItemsSummary.push({
          product_id: item.product_id,
          product_name: orderItem.product_name,
          quantity: qty,
          amount: lineRefund,
          restocked: item.restock !== false
        });

        // Restock inventory if requested
        if (item.restock !== false) {
          const product = await productService.getProductById(item.product_id);
          if (product) {
            const prev = Number(product.stock_quantity) || 0;
            product.stock_quantity = prev + qty;
            await productService.saveProduct(product);

            // Log movement
            await localDB.put('inventory_movements', {
              id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              product_id: item.product_id,
              product_name: product.name,
              sku: product.sku,
              movement_type: 'refund',
              quantity: qty,
              previous_stock: prev,
              new_stock: product.stock_quantity,
              reference_id: order.order_number,
              reason: `Refund: ${reason}`,
              performed_by: user?.name || 'Staff',
              created_at: new Date().toISOString()
            });
          }
        }
      }
    }

    // Update order status
    order.payment_status = totalRefundAmount >= order.total_amount ? 'refunded' : 'partially_refunded';
    order.refund_amount = (order.refund_amount || 0) + totalRefundAmount;
    order.updated_at = new Date().toISOString();
    await localDB.put('orders', order);

    // If customer was attached, adjust spend & loyalty points
    if (order.customer_id) {
      const customer = await customerService.getCustomerById(order.customer_id);
      if (customer) {
        customer.total_spend = Math.max(0, (customer.total_spend || 0) - totalRefundAmount);
        customer.loyalty_points = Math.max(0, (customer.loyalty_points || 0) - Math.floor(totalRefundAmount));
        await customerService.saveCustomer(customer);
      }
    }

    // Log audit
    auditService.log('REFUND_PROCESSED', 'orders', order.id, {
      order_number: order.order_number,
      refund_amount: totalRefundAmount,
      refund_method: refundMethod,
      reason,
      items: refundedItemsSummary
    });

    return {
      success: true,
      refundAmount: totalRefundAmount,
      order
    };
  }
}

export const ordersService = new OrdersService();
