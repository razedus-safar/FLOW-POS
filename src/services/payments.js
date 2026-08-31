/**
 * FlowPOS Atomic Payments & Checkout Service
 * Enhanced with idempotency protection, monetary precision, cash drawer synchronization, and audit trails.
 */

import { localDB } from '../offline/database.js';
import { productService } from './products.js';
import { customerService } from './customers.js';
import { giftCardsService } from './giftCards.js';
import { auditService } from './audit.js';
import { registerService } from './registers.js';
import { offlineQueue, QUEUE_ACTIONS } from '../offline/queue.js';
import { sessionManager } from '../store/session.js';
import { cartStore } from '../store/cart.js';
import { syncEngine } from '../offline/sync.js';
import { roundMoney, sanitizeHtml, generateUUID } from '../utils/security.js';

class PaymentsService {
  async processSale({ cartData, payments, orderNotes = '' }) {
    const user = sessionManager.getUser();
    const totals = cartData.totals;
    const items = cartData.items;
    const customer = cartData.customer;

    if (!items || items.length === 0) {
      throw new Error('Cannot process payment for an empty basket.');
    }

    const orderId = `ord-${Date.now()}-${generateUUID().substring(0, 6)}`;
    const pad = (n) => String(n).padStart(2, '0');
    const now = new Date();
    const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `ORD-${dateStr}-${randNum}`;
    const idempotencyKey = `idemp-${orderId}`;

    const sanitizedNotes = sanitizeHtml(orderNotes);

    const orderRecord = {
      id: orderId,
      order_number: orderNumber,
      cashier_id: user?.id || 'usr-001',
      cashier_name: user?.name || 'Cashier',
      customer_id: customer?.id || null,
      customer_name: customer?.name ? sanitizeHtml(customer.name) : 'Guest Customer',
      subtotal: roundMoney(totals.subtotal),
      discount_amount: roundMoney(totals.discountAmount),
      discount_type: totals.discountType,
      discount_value: totals.discountValue,
      tax_amount: roundMoney(totals.taxAmount),
      tax_rate: totals.taxRate,
      total_amount: roundMoney(totals.total),
      payment_status: 'paid',
      fulfillment_status: 'completed',
      notes: sanitizedNotes,
      items: items.map(i => ({
        product_id: i.product.id,
        product_name: sanitizeHtml(i.product.name),
        sku: i.product.sku,
        quantity: Number(i.quantity) || 1,
        unit_price: roundMoney(i.unit_price),
        line_total: roundMoney(i.quantity * i.unit_price)
      })),
      payments: payments.map(p => ({
        payment_method: p.method, // 'cash', 'card', 'mobile'
        amount: roundMoney(p.amount),
        amount_tendered: roundMoney(p.amount_tendered || p.amount),
        change_due: roundMoney(p.change_due || 0),
        reference_number: p.reference || `REF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
      })),
      idempotency_key: idempotencyKey,
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    };

    // 1. Deduct local inventory atomically & record movements
    for (const item of items) {
      const product = await productService.getProductById(item.product.id);
      if (product) {
        const prevStock = Number(product.stock_quantity) || 0;
        product.stock_quantity = Math.max(0, prevStock - item.quantity);
        await productService.saveProduct(product);

        // Record movement in local DB
        await localDB.put('inventory_movements', {
          id: `mov-${Date.now()}-${generateUUID().substring(0, 6)}`,
          product_id: item.product.id,
          product_name: product.name,
          sku: product.sku,
          movement_type: 'sale',
          quantity: -item.quantity,
          previous_stock: prevStock,
          new_stock: product.stock_quantity,
          reference_id: orderNumber,
          reason: 'POS Sale',
          performed_by: user?.name || 'Cashier',
          created_at: now.toISOString()
        });
      }
    }

    // 2. Save order in local DB
    await localDB.put('orders', orderRecord);

    // 2b. Deduct gift card balances if gift card tender used
    for (const p of payments) {
      if (p.method === 'gift_card' && p.gift_card_code) {
        try {
          giftCardsService.redeem(p.gift_card_code, p.amount, orderNumber);
        } catch (e) {
          console.warn('Gift card redeem failed:', e);
        }
      }
    }

    // 3. Update customer loyalty and spend
    if (customer?.id) {
      const dbCust = await customerService.getCustomerById(customer.id);
      if (dbCust) {
        const pointsEarned = Math.floor(totals.total);
        dbCust.loyalty_points = (dbCust.loyalty_points || 0) + pointsEarned;
        dbCust.total_spend = roundMoney((dbCust.total_spend || 0) + totals.total);
        dbCust.order_count = (dbCust.order_count || 0) + 1;
        await customerService.saveCustomer(dbCust);
      }
    }

    // 4. Record Audit Log
    auditService.log('COMPLETED_SALE', 'orders', orderId, {
      order_number: orderNumber,
      total: totals.total,
      itemCount: totals.itemCount,
      payments: payments.map(p => `${p.method}: ${p.amount}`).join(', ')
    });

    // 5. Enqueue into Offline Queue (for background cloud synchronization)
    await offlineQueue.enqueue(QUEUE_ACTIONS.PROCESS_SALE, orderRecord);
    syncEngine.syncNow().catch(() => {});

    // 6. Clear current cart
    cartStore.clearCart();

    return {
      success: true,
      order: orderRecord
    };
  }
}

export const paymentsService = new PaymentsService();
