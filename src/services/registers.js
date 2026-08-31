/**
 * FlowPOS Register Management Service
 */

import { localDB } from '../offline/database.js';
import { auditService } from './audit.js';
import { sessionManager } from '../store/session.js';

class RegisterService {
  constructor() {
    this.sessionKey = 'flowpos_active_register_session';
  }

  getActiveSession() {
    if (typeof localStorage === 'undefined') return this.inMemorySession || null;
    try {
      const data = localStorage.getItem(this.sessionKey);
      return data ? JSON.parse(data) : (this.inMemorySession || null);
    } catch {
      return this.inMemorySession || null;
    }
  }

  async openSession(openingCash = 200.00, notes = '') {
    const user = sessionManager.getUser();
    const session = {
      id: `reg-sess-${Date.now()}`,
      register_id: 'REG-MAIN-01',
      register_name: 'Main Terminal #1',
      user_id: user?.id || 'usr-001',
      user_name: user?.name || 'Cashier',
      opening_cash: Number(openingCash) || 0,
      total_cash_sales: 0,
      total_card_sales: 0,
      total_mobile_sales: 0,
      cash_in_total: 0,
      cash_out_total: 0,
      cash_movements: [],
      status: 'open',
      notes,
      opened_at: new Date().toISOString(),
      closed_at: null
    };

    this.inMemorySession = session;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.sessionKey, JSON.stringify(session));
    }
    await localDB.put('register_sessions', session);
    auditService.log('REGISTER_OPENED', 'registers', session.id, { opening_cash: session.opening_cash });
    return session;
  }

  async recordCashMovement(type, amount, reason) {
    const session = this.getActiveSession();
    if (!session) throw new Error('No active register session');

    const user = sessionManager.getUser();
    const movement = {
      id: `cmov-${Date.now()}`,
      type: type === 'in' ? 'in' : 'out',
      amount: Number(amount) || 0,
      reason,
      performed_by: user?.name || 'Staff',
      timestamp: new Date().toISOString()
    };

    session.cash_movements.push(movement);
    if (movement.type === 'in') {
      session.cash_in_total += movement.amount;
    } else {
      session.cash_out_total += movement.amount;
    }

    this.inMemorySession = session;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.sessionKey, JSON.stringify(session));
    }
    await localDB.put('register_sessions', session);
    auditService.log('CASH_MOVEMENT', 'registers', session.id, { type: movement.type, amount: movement.amount, reason });
    return session;
  }

  getExpectedCash() {
    const session = this.getActiveSession();
    if (!session) return 0;
    return (
      (session.opening_cash || 0) +
      (session.total_cash_sales || 0) +
      (session.cash_in_total || 0) -
      (session.cash_out_total || 0)
    );
  }

  async closeSession(actualCash, notes = '') {
    const session = this.getActiveSession();
    if (!session) throw new Error('No active register session');

    const expectedCash = this.getExpectedCash();
    const difference = Number(actualCash) - expectedCash;

    session.status = 'closed';
    session.closing_cash_expected = expectedCash;
    session.closing_cash_actual = Number(actualCash);
    session.cash_difference = difference;
    session.closing_notes = notes;
    session.closed_at = new Date().toISOString();

    await localDB.put('register_sessions', session);
    this.inMemorySession = null;
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.sessionKey);
    }
    auditService.log('REGISTER_CLOSED', 'registers', session.id, {
      expected: expectedCash,
      actual: Number(actualCash),
      variance: difference
    });

    return session;
  }

  async getSessionHistory() {
    const sessions = await localDB.getAll('register_sessions');
    return sessions.sort((a, b) => new Date(b.opened_at) - new Date(a.opened_at));
  }
}

export const registerService = new RegisterService();
