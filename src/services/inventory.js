/**
 * FlowPOS Inventory & Stock Ledger Service
 */

import { localDB } from '../offline/database.js';
import { productService } from './products.js';
import { auditService } from './audit.js';
import { sessionManager } from '../store/session.js';

class InventoryService {
  async getInventorySummary() {
    const products = await productService.getAllProducts();
    let totalStock = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let totalCostValuation = 0;
    let totalRetailValuation = 0;

    products.forEach(p => {
      const stock = Number(p.stock_quantity) || 0;
      const cost = Number(p.cost_price) || 0;
      const price = Number(p.selling_price) || 0;
      const reorder = Number(p.reorder_level) || 5;

      totalStock += stock;
      totalCostValuation += (stock * cost);
      totalRetailValuation += (stock * price);

      if (stock === 0) {
        outOfStockCount++;
      } else if (stock <= reorder) {
        lowStockCount++;
      }
    });

    return {
      totalProducts: products.length,
      totalStock,
      lowStockCount,
      outOfStockCount,
      totalCostValuation,
      totalRetailValuation,
      projectedProfit: totalRetailValuation - totalCostValuation
    };
  }

  async adjustStock(productId, newQuantity, reason = 'Count adjustment') {
    const product = await productService.getProductById(productId);
    if (!product) throw new Error('Product not found');

    const previousStock = Number(product.stock_quantity) || 0;
    const diff = Number(newQuantity) - previousStock;
    product.stock_quantity = Math.max(0, Number(newQuantity));
    await productService.saveProduct(product);

    const user = sessionManager.getUser();
    const movement = {
      id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      product_id: productId,
      product_name: product.name,
      sku: product.sku,
      movement_type: diff >= 0 ? 'adjustment_in' : 'adjustment_out',
      quantity: diff,
      previous_stock: previousStock,
      new_stock: product.stock_quantity,
      reason,
      performed_by: user?.name || 'Staff',
      created_at: new Date().toISOString()
    };

    await localDB.put('inventory_movements', movement);
    auditService.log('STOCK_ADJUSTMENT', 'inventory', productId, {
      product: product.name,
      previousStock,
      newStock: product.stock_quantity,
      reason
    });

    return movement;
  }

  async getMovements() {
    const movements = await localDB.getAll('inventory_movements');
    return movements.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
}

export const inventoryService = new InventoryService();
