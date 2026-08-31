/**
 * FlowPOS Gift Cards & Digital Vouchers Service
 * Issue, track balances, top-up, and redeem gift cards across physical & online registers
 */

const STORAGE_KEY = 'flowpos_gift_cards';

export const INITIAL_GIFT_CARDS = [
  {
    id: 'gc-01',
    code: 'GIFT-7782-9011',
    initial_balance: 5000,
    current_balance: 3800,
    customer_name: 'Amara Fernando',
    customer_phone: '+94 77 123 4567',
    status: 'ACTIVE', // 'ACTIVE' | 'DEPLETED' | 'EXPIRED'
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    expires_at: new Date(Date.now() + 86400000 * 360).toISOString(),
    history: [
      { type: 'ISSUED', amount: 5000, date: new Date(Date.now() - 86400000 * 5).toISOString() },
      { type: 'REDEEMED', amount: 1200, order_ref: 'REC-1002', date: new Date(Date.now() - 86400000 * 2).toISOString() }
    ]
  },
  {
    id: 'gc-02',
    code: 'GIFT-3341-8890',
    initial_balance: 10000,
    current_balance: 10000,
    customer_name: 'Kavinda Perera',
    customer_phone: '+94 71 987 6543',
    status: 'ACTIVE',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    expires_at: new Date(Date.now() + 86400000 * 360).toISOString(),
    history: [
      { type: 'ISSUED', amount: 10000, date: new Date(Date.now() - 86400000 * 2).toISOString() }
    ]
  }
];

class GiftCardsService {
  constructor() {
    this.cards = this.load();
  }

  load() {
    if (typeof localStorage !== 'undefined') {
      const isWiped = localStorage.getItem('flowpos_db_seeded') === 'wiped';
      try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data !== null) return JSON.parse(data);
      } catch {}
      if (isWiped) return [];
      this.save(INITIAL_GIFT_CARDS);
    }
    return [];
  }

  save(cards) {
    this.cards = cards;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('flowpos:giftcards-updated', { detail: cards }));
    }
  }

  getAll() {
    return this.cards;
  }

  getByCode(code) {
    if (!code) return null;
    const clean = code.trim().toUpperCase();
    return this.cards.find(c => c.code.toUpperCase() === clean);
  }

  issue({ code, amount, customer_name, customer_phone, expires_at }) {
    const newCard = {
      id: `gc-${Date.now().toString().slice(-6)}`,
      code: (code || `GIFT-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`).toUpperCase(),
      initial_balance: Number(amount) || 0,
      current_balance: Number(amount) || 0,
      customer_name: customer_name || 'Gift Card Guest',
      customer_phone: customer_phone || '',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      expires_at: expires_at || new Date(Date.now() + 86400000 * 365).toISOString(),
      history: [
        { type: 'ISSUED', amount: Number(amount) || 0, date: new Date().toISOString() }
      ]
    };

    this.cards.unshift(newCard);
    this.save(this.cards);
    return newCard;
  }

  redeem(code, amountToRedeem, orderRef = '') {
    const card = this.getByCode(code);
    if (!card) throw new Error('Gift Card code not found');
    if (card.status !== 'ACTIVE') throw new Error('Gift Card is inactive or expired');
    if (card.current_balance <= 0) throw new Error('Gift Card balance is zero');

    const redeemAmount = Math.min(card.current_balance, Number(amountToRedeem));
    card.current_balance -= redeemAmount;

    if (card.current_balance <= 0) {
      card.status = 'DEPLETED';
    }

    card.history.push({
      type: 'REDEEMED',
      amount: redeemAmount,
      order_ref: orderRef,
      date: new Date().toISOString()
    });

    this.save(this.cards);
    return {
      success: true,
      redeemed: redeemAmount,
      remainingBalance: card.current_balance,
      card
    };
  }

  topUp(code, topUpAmount) {
    const card = this.getByCode(code);
    if (!card) throw new Error('Gift Card not found');

    const amt = Number(topUpAmount) || 0;
    card.current_balance += amt;
    card.status = 'ACTIVE';

    card.history.push({
      type: 'TOPUP',
      amount: amt,
      date: new Date().toISOString()
    });

    this.save(this.cards);
    return card;
  }

  getBalance(code) {
    const card = this.getByCode(code);
    return card ? card.current_balance : 0;
  }

  issueGiftCard(amount, customerName = 'Guest') {
    return this.issue({ amount, customer_name: customerName });
  }
}

export const giftCardsService = new GiftCardsService();
