/**
 * FlowPOS Loyalty Points & Rules Service
 */

import { customerService } from './customers.js';
import { auditService } from './audit.js';

class LoyaltyService {
  constructor() {
    this.rulesKey = 'flowpos_loyalty_rules';
    this.ensureRules();
  }

  ensureRules() {
    const defaultRules = {
      enabled: true,
      earnRateDollarsPerPoint: 1, // $1 = 1 point
      redemptionPointsPerDollar: 20, // 20 points = $1 discount (100 pts = $5)
      minimumPointsToRedeem: 50,
      tiers: [
        { name: 'Bronze', minSpend: 0, multiplier: 1.0, color: '#94a3b8' },
        { name: 'Silver', minSpend: 200, multiplier: 1.25, color: '#38bdf8' },
        { name: 'Gold', minSpend: 500, multiplier: 1.5, color: '#fbbf24' },
        { name: 'Platinum', minSpend: 1000, multiplier: 2.0, color: '#a855f7' }
      ]
    };

    if (typeof localStorage !== 'undefined') {
      if (!localStorage.getItem(this.rulesKey)) {
        localStorage.setItem(this.rulesKey, JSON.stringify(defaultRules));
      }
    }
    this.cachedRules = defaultRules;
  }

  getRules() {
    this.ensureRules();
    if (typeof localStorage !== 'undefined') {
      try {
        const item = localStorage.getItem(this.rulesKey);
        if (item) return JSON.parse(item);
      } catch {}
    }
    return this.cachedRules;
  }

  saveRules(rules) {
    this.cachedRules = rules;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.rulesKey, JSON.stringify(rules));
    }
    auditService.log('LOYALTY_RULES_UPDATED', 'settings', 'loyalty', rules);
  }

  calculatePointsForSpend(spendAmount, tierName = 'Bronze') {
    const rules = this.getRules();
    if (!rules.enabled) return 0;
    const tier = rules.tiers.find(t => t.name === tierName) || rules.tiers[0];
    const basePoints = Math.floor(spendAmount / rules.earnRateDollarsPerPoint);
    return Math.floor(basePoints * (tier?.multiplier || 1.0));
  }

  calculateDiscountForPoints(points) {
    const rules = this.getRules();
    if (!rules.enabled || points < rules.minimumPointsToRedeem) return 0;
    return Number((points / rules.redemptionPointsPerDollar).toFixed(2));
  }

  async redeemPoints(customerId, pointsToRedeem) {
    const customer = await customerService.getCustomerById(customerId);
    if (!customer) throw new Error('Customer not found');
    if ((customer.loyalty_points || 0) < pointsToRedeem) {
      throw new Error('Insufficient loyalty points balance');
    }
    const discountValue = this.calculateDiscountForPoints(pointsToRedeem);
    customer.loyalty_points -= pointsToRedeem;
    await customerService.saveCustomer(customer);
    return { discountValue, remainingPoints: customer.loyalty_points };
  }
}

export const loyaltyService = new LoyaltyService();
