/**
 * FlowPOS Purchasing & Stock Receiving Service
 */

import { localDB } from '../offline/database.js';
import { productService } from './products.js';
import { auditService } from './audit.js';
import { sessionManager } from '../store/session.js';

export const PO_STATUS = {
  DRAFT: 'Draft',
  ORDERED: 'Ordered',
  PARTIALLY_RECEIVED: 'Partially Received',
  RECEIVED: 'Received',
  CANCELLED: 'Cancelled'
};

class PurchasingService {
  constructor() {
    this.storageKey = 'flowpos_purchase_orders';
    this.ensureInitial();
  }

  ensureInitial() {
    const isWiped = typeof localStorage !== 'undefined' && localStorage.getItem('flowpos_db_seeded') === 'wiped';
    if (isWiped) return;

    if (typeof localStorage !== 'undefined') {
      const data = localStorage.getItem(this.storageKey);
      if (!data) {
        const initialPOs = [
          {
            id: 'po-1001',
            po_number: 'PO-2026-001',
            supplier_id: 'sup-01',
            supplier_name: 'Pacific Coast Roasters Inc.',
            status: PO_STATUS.RECEIVED,
            total_cost: 380.00,
            expected_delivery: '2026-08-25',
            items: [
              { product_id: 'prod-001', product_name: 'Ethiopian Yirgacheffe Single Origin 340g', quantity_ordered: 20, quantity_received: 20, unit_cost: 9.50, total_cost: 190.00 },
              { product_id: 'prod-002', product_name: 'Guatemala Antigua Dark Roast 340g', quantity_ordered: 20, quantity_received: 20, unit_cost: 9.50, total_cost: 190.00 }
            ],
            notes: 'Restock seasonal roasts',
            created_at: new Date(Date.now() - 86400000 * 5).toISOString()
          },
          {
            id: 'po-1002',
            po_number: 'PO-2026-002',
            supplier_id: 'sup-02',
            supplier_name: 'Golden Grain Mill & Bakery Supply',
            status: PO_STATUS.ORDERED,
            total_cost: 215.00,
            expected_delivery: '2026-08-31',
            items: [
              { product_id: 'prod-005', product_name: 'French Butter Croissant', quantity_ordered: 50, quantity_received: 0, unit_cost: 1.60, total_cost: 80.00 },
              { product_id: 'prod-013', product_name: 'Organic Maple Pecan Granola 400g', quantity_ordered: 30, quantity_received: 0, unit_cost: 4.50, total_cost: 135.00 }
            ],
            notes: 'Weekly bakery delivery',
            created_at: new Date(Date.now() - 86400000 * 2).toISOString()
          }
        ];
        localStorage.setItem(this.storageKey, JSON.stringify(initialPOs));
      }
    }
  }

  async getAllPOs() {
    const isWiped = typeof localStorage !== 'undefined' && localStorage.getItem('flowpos_db_seeded') === 'wiped';
    if (!isWiped) {
      this.ensureInitial();
    }
    if (typeof localStorage !== 'undefined') {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : [];
    }
    return this.inMemoryPOs || [];
  }

  async getPOById(id) {
    const pos = await this.getAllPOs();
    return pos.find(p => p.id === id);
  }

  async savePO(po) {
    const pos = await this.getAllPOs();
    if (!po.id) {
      po.id = `po-${Date.now()}`;
      po.po_number = `PO-${new Date().getFullYear()}-${String(pos.length + 1).padStart(3, '0')}`;
      po.status = po.status || PO_STATUS.DRAFT;
      po.created_at = new Date().toISOString();
      pos.unshift(po);
    } else {
      const idx = pos.findIndex(p => p.id === po.id);
      if (idx > -1) {
        pos[idx] = { ...pos[idx], ...po, updated_at: new Date().toISOString() };
      }
    }
    this.inMemoryPOs = pos;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.storageKey, JSON.stringify(pos));
    }
    return po;
  }

  async createPurchaseOrder(po) {
    return await this.savePO(po);
  }

  async createPO(po) {
    return await this.savePO(po);
  }

  async receivePurchaseOrder(poId, receivedQuantitiesMap = {}) {
    return await this.receiveStock(poId, receivedQuantitiesMap);
  }

  async receivePO(poId, receivedQuantitiesMap = {}) {
    return await this.receiveStock(poId, receivedQuantitiesMap);
  }

  async receiveStock(poId, receivedQuantitiesMap = {}) {
    const pos = await this.getAllPOs();
    const po = pos.find(p => p.id === poId);
    if (!po) throw new Error('Purchase order not found');

    const user = sessionManager.getUser();

    for (const item of (po.items || [])) {
      const qtyToReceive = receivedQuantitiesMap[item.product_id] !== undefined
        ? Number(receivedQuantitiesMap[item.product_id])
        : (item.quantity_ordered - (item.quantity_received || 0));

      if (qtyToReceive > 0) {
        item.quantity_received = (item.quantity_received || 0) + qtyToReceive;

        // Increment product stock
        let product = await productService.getProductById(item.product_id);
        if (!product) {
          const allProds = await productService.getAllProducts();
          product = allProds.find(p => p.id === item.product_id || p.name.toLowerCase() === (item.product_name || '').toLowerCase() || p.sku === item.product_id);
        }

        if (product) {
          const prev = Number(product.stock_quantity) || 0;
          product.stock_quantity = prev + qtyToReceive;
          await productService.saveProduct(product);

          // Log movement
          await localDB.put('inventory_movements', {
            id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            product_id: product.id,
            product_name: product.name,
            sku: product.sku,
            movement_type: 'receiving',
            quantity: qtyToReceive,
            previous_stock: prev,
            new_stock: product.stock_quantity,
            reference_id: po.po_number,
            reason: `PO Received: ${po.po_number}`,
            performed_by: user?.name || 'Staff',
            created_at: new Date().toISOString()
          });
        }
      }
    }

    const allFulfilled = (po.items || []).every(i => (i.quantity_received || 0) >= i.quantity_ordered);
    po.status = allFulfilled ? PO_STATUS.RECEIVED : PO_STATUS.PARTIALLY_RECEIVED;
    po.updated_at = new Date().toISOString();

    this.inMemoryPOs = pos;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.storageKey, JSON.stringify(pos));
    }
    auditService.log('PO_RECEIVED', 'purchase_orders', po.id, { po_number: po.po_number, status: po.status });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('flowpos:inventory-updated'));
      window.dispatchEvent(new CustomEvent('flowpos:products-updated'));
    }
    return po;
  }
}

export const purchasingService = new PurchasingService();
