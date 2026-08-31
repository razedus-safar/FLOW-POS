/**
 * FlowPOS Real-Time Cart Store
 */

import { globalStore } from './state.js';
import { customerDisplayService } from '../services/customerDisplay.js';

class CartStore {
  constructor() {
    this.items = [];
    this.customer = null;
    this.discount = { type: 'percentage', value: 0 }; // e.g. 10% or $5
    this.taxRate = 8.5; // default 8.5%
    this.orderNotes = '';
    this.suspendedCarts = this.loadSuspendedCarts();

    this.notify();
  }

  loadSuspendedCarts() {
    if (typeof localStorage === 'undefined') return [];
    try {
      const data = localStorage.getItem('flowpos_suspended_carts');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  saveSuspendedCarts() {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('flowpos_suspended_carts', JSON.stringify(this.suspendedCarts));
      } catch {}
    }
    globalStore.set('suspendedCarts', this.suspendedCarts);
  }

  addItem(product, qty = 1) {
    const existingIndex = this.items.findIndex(item => item.product.id === product.id);
    if (existingIndex > -1) {
      this.items[existingIndex].quantity += qty;
    } else {
      this.items.push({
        id: `cart-item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        product: { ...product },
        quantity: qty,
        unit_price: Number(product.selling_price) || 0,
        discount_pct: 0
      });
    }
    this.notify();
  }

  updateQuantity(productId, newQty) {
    const index = this.items.findIndex(item => item.product.id === productId);
    if (index > -1) {
      const num = Number(newQty);
      if (num <= 0) {
        this.items.splice(index, 1);
      } else {
        this.items[index].quantity = num;
      }
      this.notify();
    }
  }

  incrementQuantity(productId, delta = 1) {
    const index = this.items.findIndex(item => item.product.id === productId);
    if (index > -1) {
      const current = Number(this.items[index].quantity) || 1;
      const next = current + delta;
      if (next <= 0) {
        this.items.splice(index, 1);
      } else {
        this.items[index].quantity = next;
      }
      this.notify();
    }
  }

  removeItem(productId) {
    this.items = this.items.filter(item => item.product.id !== productId);
    this.notify();
  }

  setCustomer(customer) {
    this.customer = customer;
    this.notify();
  }

  setDiscount(type, value) {
    this.discount = {
      type: type === 'fixed' ? 'fixed' : 'percentage',
      value: Math.max(0, Number(value) || 0)
    };
    this.notify();
  }

  setTaxRate(rate) {
    this.taxRate = Math.max(0, Number(rate) || 0);
    this.notify();
  }

  setOrderNotes(notes) {
    this.orderNotes = notes;
    this.notify();
  }

  clearCart() {
    this.items = [];
    this.customer = null;
    this.discount = { type: 'percentage', value: 0 };
    this.orderNotes = '';
    this.notify();
  }

  suspendCurrentCart(note = '') {
    if (this.items.length === 0) return false;
    const suspended = {
      id: `susp-${Date.now()}`,
      timestamp: new Date().toISOString(),
      customer: this.customer ? { ...this.customer } : null,
      items: JSON.parse(JSON.stringify(this.items)),
      discount: { ...this.discount },
      note: note || (this.customer ? `Hold for ${this.customer.name}` : `Hold #${this.suspendedCarts.length + 1}`),
      totals: this.getTotals()
    };
    this.suspendedCarts.push(suspended);
    this.saveSuspendedCarts();
    this.clearCart();
    return true;
  }

  resumeCart(cartId) {
    const idx = this.suspendedCarts.findIndex(c => c.id === cartId);
    if (idx > -1) {
      const suspended = this.suspendedCarts[idx];
      this.items = suspended.items || [];
      this.customer = suspended.customer || null;
      this.discount = suspended.discount || { type: 'percentage', value: 0 };
      this.suspendedCarts.splice(idx, 1);
      this.saveSuspendedCarts();
      this.notify();
      return true;
    }
    return false;
  }

  deleteSuspendedCart(cartId) {
    this.suspendedCarts = this.suspendedCarts.filter(c => c.id !== cartId);
    this.saveSuspendedCarts();
  }

  getTotals() {
    const subtotal = this.items.reduce((sum, item) => {
      const price = Number(item.unit_price) || 0;
      const qty = Number(item.quantity) || 0;
      return sum + (price * qty);
    }, 0);

    let discountAmount = 0;
    if (this.discount.type === 'percentage') {
      discountAmount = (subtotal * (this.discount.value / 100));
    } else {
      discountAmount = Math.min(subtotal, this.discount.value);
    }

    const discountedSubtotal = Math.max(0, subtotal - discountAmount);
    const taxAmount = (discountedSubtotal * (this.taxRate / 100));
    const total = discountedSubtotal + taxAmount;
    const itemCount = this.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

    return {
      subtotal: Number(subtotal.toFixed(2)),
      discountAmount: Number(discountAmount.toFixed(2)),
      discountType: this.discount.type,
      discountValue: this.discount.value,
      discountedSubtotal: Number(discountedSubtotal.toFixed(2)),
      taxRate: this.taxRate,
      taxAmount: Number(taxAmount.toFixed(2)),
      total: Number(total.toFixed(2)),
      itemCount
    };
  }

  getCart() {
    return {
      items: this.items,
      customer: this.customer,
      discount: this.discount,
      taxRate: this.taxRate,
      orderNotes: this.orderNotes,
      totals: this.getTotals(),
      suspendedCarts: this.suspendedCarts
    };
  }

  notify() {
    const payload = this.getCart();
    globalStore.set('cart', payload);
    customerDisplayService.broadcast('CART_UPDATED', payload);
  }
}

export const cartStore = new CartStore();
