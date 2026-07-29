import { useAuthStore } from '@/store/auth.store';

type Module = 'orders' | 'products' | 'inventory' | 'customers' | 'reports' | 'settings' | 'users';
type Action = 'view' | 'create' | 'update' | 'delete' | 'export';

const PERMISSIONS: Record<Module, Partial<Record<Action, string[]>>> = {
  orders: {
    view:   ['SUPER_ADMIN','ADMIN','ORDER_MANAGER','CUSTOMER_SUPPORT','DELIVERY_MANAGER','ACCOUNTANT'],
    create: ['SUPER_ADMIN','ADMIN','ORDER_MANAGER'],
    update: ['SUPER_ADMIN','ADMIN','ORDER_MANAGER','DELIVERY_MANAGER'],
    delete: ['SUPER_ADMIN','ADMIN'],
    export: ['SUPER_ADMIN','ADMIN','ORDER_MANAGER','ACCOUNTANT'],
  },
  products: {
    view:   ['SUPER_ADMIN','ADMIN','ORDER_MANAGER','INVENTORY_MANAGER','CUSTOMER_SUPPORT','ACCOUNTANT'],
    create: ['SUPER_ADMIN','ADMIN','INVENTORY_MANAGER'],
    update: ['SUPER_ADMIN','ADMIN','INVENTORY_MANAGER'],
    delete: ['SUPER_ADMIN','ADMIN'],
    export: ['SUPER_ADMIN','ADMIN','INVENTORY_MANAGER','ACCOUNTANT'],
  },
  inventory: {
    view:   ['SUPER_ADMIN','ADMIN','INVENTORY_MANAGER','ORDER_MANAGER'],
    create: ['SUPER_ADMIN','ADMIN','INVENTORY_MANAGER'],
    update: ['SUPER_ADMIN','ADMIN','INVENTORY_MANAGER'],
  },
  customers: {
    view:   ['SUPER_ADMIN','ADMIN','ORDER_MANAGER','CUSTOMER_SUPPORT','ACCOUNTANT'],
    update: ['SUPER_ADMIN','ADMIN','CUSTOMER_SUPPORT'],
  },
  reports: {
    view:   ['SUPER_ADMIN','ADMIN','ACCOUNTANT'],
    export: ['SUPER_ADMIN','ADMIN','ACCOUNTANT'],
  },
  settings: {
    view:   ['SUPER_ADMIN','ADMIN'],
    update: ['SUPER_ADMIN'],
  },
  users: {
    view:   ['SUPER_ADMIN','ADMIN'],
    create: ['SUPER_ADMIN'],
    update: ['SUPER_ADMIN'],
    delete: ['SUPER_ADMIN'],
  },
};

export function usePermissions() {
  const role = useAuthStore((s) => s.user?.role);

  function can(module: Module, action: Action): boolean {
    if (!role) return false;
    const allowed = PERMISSIONS[module]?.[action];
    return allowed ? allowed.includes(role) : false;
  }

  return { can, role };
}
