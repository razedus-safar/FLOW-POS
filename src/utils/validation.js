/**
 * Validation Utility for FlowPOS
 */

export function validateProduct(product) {
  const errors = [];
  if (!product.name || product.name.trim().length === 0) {
    errors.push('Product name is required.');
  }
  if (!product.sku || product.sku.trim().length === 0) {
    errors.push('SKU is required.');
  }
  if (product.selling_price === undefined || Number(product.selling_price) < 0) {
    errors.push('Selling price must be a valid positive number.');
  }
  if (product.cost_price !== undefined && Number(product.cost_price) < 0) {
    errors.push('Cost price cannot be negative.');
  }
  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateCustomer(customer) {
  const errors = [];
  if (!customer.name || customer.name.trim().length === 0) {
    errors.push('Customer name is required.');
  }
  if (customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
    errors.push('Invalid email address format.');
  }
  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validatePayment(totalDue, payments) {
  if (!payments || payments.length === 0) {
    return { isValid: false, message: 'At least one payment method is required.' };
  }
  const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const diff = Math.abs(totalPaid - totalDue);
  if (diff > 0.01 && totalPaid < totalDue) {
    return { isValid: false, message: `Payment total ($${totalPaid.toFixed(2)}) is less than total due ($${totalDue.toFixed(2)}).` };
  }
  return { isValid: true };
}
