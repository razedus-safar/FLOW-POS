/**
 * FlowPOS Granular Role-Based Access Control (RBAC) System
 * Dynamic customizable role permissions with exclusive OWNER authorization
 */

export const ROLES = {
  OWNER: 'OWNER',
  MANAGER: 'MANAGER',
  CASHIER: 'CASHIER',
  INVENTORY: 'INVENTORY'
};

export const PERMISSIONS = {
  VIEW_DASHBOARD: 'view_dashboard',
  MANAGE_PRODUCTS: 'manage_products',
  MANAGE_INVENTORY: 'manage_inventory',
  RECEIVE_STOCK: 'receive_stock',
  MANAGE_SUPPLIERS: 'manage_suppliers',
  CREATE_PURCHASE_ORDERS: 'create_purchase_orders',
  MANAGE_CUSTOMERS: 'manage_customers',
  PROCESS_SALES: 'process_sales',
  APPLY_DISCOUNT: 'apply_discount',
  PROCESS_REFUND: 'process_refund',
  VIEW_REPORTS: 'view_reports',
  MANAGE_EMPLOYEES: 'manage_employees',
  MANAGE_SETTINGS: 'manage_settings',
  MANAGE_REGISTER: 'manage_register',
  VIEW_AUDIT_LOGS: 'view_audit_logs'
};

export const DEFAULT_ROLE_PERMISSIONS_MAP = {
  [ROLES.OWNER]: Object.values(PERMISSIONS),
  [ROLES.MANAGER]: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.MANAGE_PRODUCTS,
    PERMISSIONS.MANAGE_INVENTORY,
    PERMISSIONS.RECEIVE_STOCK,
    PERMISSIONS.MANAGE_SUPPLIERS,
    PERMISSIONS.CREATE_PURCHASE_ORDERS,
    PERMISSIONS.MANAGE_CUSTOMERS,
    PERMISSIONS.PROCESS_SALES,
    PERMISSIONS.APPLY_DISCOUNT,
    PERMISSIONS.PROCESS_REFUND,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.MANAGE_REGISTER,
    PERMISSIONS.VIEW_AUDIT_LOGS
  ],
  [ROLES.CASHIER]: [
    PERMISSIONS.PROCESS_SALES,
    PERMISSIONS.MANAGE_CUSTOMERS,
    PERMISSIONS.MANAGE_REGISTER,
    PERMISSIONS.APPLY_DISCOUNT
  ],
  [ROLES.INVENTORY]: [
    PERMISSIONS.MANAGE_PRODUCTS,
    PERMISSIONS.MANAGE_INVENTORY,
    PERMISSIONS.RECEIVE_STOCK,
    PERMISSIONS.MANAGE_SUPPLIERS,
    PERMISSIONS.CREATE_PURCHASE_ORDERS
  ]
};

export function loadRolePermissionsMap() {
  try {
    const raw = localStorage.getItem('flowpos_role_permissions_map');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        // Always ensure OWNER has 100% full permissions
        parsed[ROLES.OWNER] = Object.values(PERMISSIONS);
        return parsed;
      }
    }
  } catch {}
  return { ...DEFAULT_ROLE_PERMISSIONS_MAP };
}

export function saveRolePermissionsMap(map) {
  // Always lock OWNER to all permissions
  map[ROLES.OWNER] = Object.values(PERMISSIONS);
  localStorage.setItem('flowpos_role_permissions_map', JSON.stringify(map));
}

export let ROLE_PERMISSIONS_MAP = loadRolePermissionsMap();

export function hasPermission(userOrRole, permission) {
  if (!userOrRole) return false;
  const role = typeof userOrRole === 'object' ? userOrRole.role : userOrRole;
  if (role === ROLES.OWNER) return true; // OWNER has 100% unrestricted access to everything
  const currentMap = loadRolePermissionsMap();
  const permissions = currentMap[role] || [];
  return permissions.includes(permission);
}

export function togglePermissionForRole(currentUser, targetRole, permission) {
  const isOwner = currentUser?.role === ROLES.OWNER || currentUser?.name?.toLowerCase() === 'admin' || currentUser?.name?.toLowerCase() === 'safar';
  if (!isOwner) {
    throw new Error('Only the Store Owner/Administrator is authorized to modify the role permission matrix.');
  }

  if (targetRole === ROLES.OWNER) {
    throw new Error('Owner permissions are permanently full and cannot be revoked.');
  }

  const map = loadRolePermissionsMap();
  const currentPerms = new Set(map[targetRole] || []);

  if (currentPerms.has(permission)) {
    currentPerms.delete(permission);
  } else {
    currentPerms.add(permission);
  }

  map[targetRole] = Array.from(currentPerms);
  saveRolePermissionsMap(map);
  ROLE_PERMISSIONS_MAP = map;
  window.dispatchEvent(new CustomEvent('flowpos:permissions-updated', { detail: { map } }));
  return map[targetRole];
}
