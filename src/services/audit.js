/**
 * FlowPOS Audit Logging Service
 * Tracks sensitive staff actions: sales, price updates, refunds, register shifts, inventory adjustments.
 */

import { localDB } from '../offline/database.js';
import { sessionManager } from '../store/session.js';

class AuditService {
  constructor() {
    this.logsKey = 'flowpos_audit_logs';
  }

  async log(action, entity, entityId, details = {}) {
    const user = sessionManager.getUser();
    const entry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      user_id: user?.id || 'system',
      user_name: user?.name || 'System',
      user_role: user?.role || 'SYSTEM',
      action,
      entity,
      entity_id: entityId,
      details,
      timestamp: new Date().toISOString()
    };

    try {
      const existing = await this.getLogs();
      existing.unshift(entry);
      // Keep most recent 500 audit logs
      if (existing.length > 500) existing.length = 500;
      this.inMemoryLogs = existing;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.logsKey, JSON.stringify(existing));
      }
    } catch (e) {
      console.error('Failed to save audit log:', e);
    }
    return entry;
  }

  async getLogs() {
    if (typeof localStorage !== 'undefined') {
      try {
        const data = localStorage.getItem(this.logsKey);
        return data ? JSON.parse(data) : (this.inMemoryLogs || []);
      } catch {
        return this.inMemoryLogs || [];
      }
    }
    return this.inMemoryLogs || [];
  }
}

export const auditService = new AuditService();
