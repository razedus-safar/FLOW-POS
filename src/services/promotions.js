/**
 * FlowPOS Smart Promotional & Discount Campaign Service
 * Automated BOGO, Happy Hour time-based rules, and volume bundle discounts
 */

const STORAGE_KEY = 'flowpos_promotions';

export const DEFAULT_PROMOTIONS = [
  {
    id: 'promo-01',
    name: 'Happy Hour Coffee 15% Off',
    type: 'percentage', // 'percentage' | 'fixed_amount' | 'bogo' | 'volume'
    value: 15,
    category_id: 'cat-01', // Coffee
    min_order_amount: 0,
    is_active: true,
    time_restricted: false,
    start_time: '16:00',
    end_time: '19:00',
    badge: '15% OFF'
  },
  {
    id: 'promo-02',
    name: 'Bulk Order Saver (5+ Items)',
    type: 'volume',
    value: 10, // 10% off entire cart
    min_items: 5,
    is_active: true,
    badge: 'BULK 10%'
  },
  {
    id: 'promo-03',
    name: 'Artisan Gourmet VIP Voucher',
    type: 'fixed_amount',
    value: 500, // Rs. 500 off
    min_order_amount: 4000,
    is_active: true,
    badge: 'Rs. 500 OFF'
  }
];

class PromotionsService {
  constructor() {
    this.promotions = this.load();
  }

  load() {
    if (typeof localStorage !== 'undefined') {
      try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) return JSON.parse(data);
      } catch {}
      this.save(DEFAULT_PROMOTIONS);
    }
    return DEFAULT_PROMOTIONS;
  }

  save(promos) {
    this.promotions = promos;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(promos));
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('flowpos:promotions-updated', { detail: promos }));
    }
  }

  getAll() {
    return this.promotions;
  }

  getActive() {
    return this.promotions.filter(p => p.is_active);
  }

  savePromotion(promo) {
    const existingIdx = this.promotions.findIndex(p => p.id === promo.id);
    if (existingIdx >= 0) {
      this.promotions[existingIdx] = promo;
    } else {
      this.promotions.push({ ...promo, id: promo.id || `promo-${Date.now().toString().slice(-4)}` });
    }
    this.save(this.promotions);
    return promo;
  }

  deletePromotion(id) {
    this.promotions = this.promotions.filter(p => p.id !== id);
    this.save(this.promotions);
  }

  toggleActive(id) {
    const p = this.promotions.find(p => p.id === id);
    if (p) {
      p.is_active = !p.is_active;
      this.save(this.promotions);
    }
  }

  /**
   * Evaluates active promotions against current cart
   * @param {Array} items Cart items
   * @param {number} subtotal Cart subtotal
   * @returns {Array} List of applicable discount objects
   */
  evaluateCart(items, subtotal) {
    const applicable = [];
    const active = this.getActive();
    const totalQty = items.reduce((sum, i) => sum + (i.quantity || 1), 0);

    for (const promo of active) {
      if (promo.type === 'volume' && totalQty >= (promo.min_items || 5)) {
        const discountVal = (subtotal * promo.value) / 100;
        applicable.push({
          promoId: promo.id,
          name: promo.name,
          amount: discountVal,
          description: `${promo.value}% Volume discount for ${totalQty} items`
        });
      } else if (promo.type === 'fixed_amount' && subtotal >= (promo.min_order_amount || 0)) {
        applicable.push({
          promoId: promo.id,
          name: promo.name,
          amount: Math.min(subtotal, promo.value),
          description: `Flat discount for orders over ${promo.min_order_amount}`
        });
      } else if (promo.type === 'percentage' && !promo.category_id && subtotal >= (promo.min_order_amount || 0)) {
        applicable.push({
          promoId: promo.id,
          name: promo.name,
          amount: (subtotal * promo.value) / 100,
          description: `${promo.value}% Storewide discount`
        });
      }
    }

    return applicable;
  }
}

export const promotionsService = new PromotionsService();
