export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  ORDER_MANAGER: 'ORDER_MANAGER',
  INVENTORY_MANAGER: 'INVENTORY_MANAGER',
  CUSTOMER_SUPPORT: 'CUSTOMER_SUPPORT',
  DELIVERY_MANAGER: 'DELIVERY_MANAGER',
  ACCOUNTANT: 'ACCOUNTANT',
} as const;

// Roles that can access each module
export const ROLE_PERMISSIONS = {
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
    delete: ['SUPER_ADMIN','ADMIN'],
    export: ['SUPER_ADMIN','ADMIN','INVENTORY_MANAGER','ACCOUNTANT'],
  },
  customers: {
    view:   ['SUPER_ADMIN','ADMIN','ORDER_MANAGER','CUSTOMER_SUPPORT','ACCOUNTANT'],
    update: ['SUPER_ADMIN','ADMIN','CUSTOMER_SUPPORT'],
    delete: ['SUPER_ADMIN','ADMIN'],
    export: ['SUPER_ADMIN','ADMIN','ACCOUNTANT'],
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
} as const;

export const COURIERS = [
  { name: 'Pathao',     website: 'https://pathao.com' },
  { name: 'SteadFast',  website: 'https://steadfast.com.bd' },
  { name: 'RedX',       website: 'https://redx.com.bd' },
  { name: 'Paperfly',   website: 'https://paperfly.com.bd' },
  { name: 'Sundarban',  website: 'https://www.sundarban.com' },
] as const;

export const DELIVERY_CHARGES = {
  DHAKA_CITY: 80,
  OUTSIDE_DHAKA: 120,
} as const;

export const DHAKA_DISTRICTS = [
  'Dhaka', 'Gazipur', 'Narayanganj', 'Narsingdi',
  'Manikganj', 'Munshiganj', 'Tangail', 'Kishoreganj', 'Faridpur',
];

// Phase 2 §1 — strict order workflow. Every transition not listed here is
// rejected by orderService.updateStatus(). This is the single source of
// truth for what's allowed; do not duplicate this logic elsewhere.
//
//   PENDING -> CUSTOMER_VERIFIED -> CONFIRMED -> PACKING -> PACKED
//            -> COURIER_ASSIGNED -> DISPATCHED -> OUT_FOR_DELIVERY -> DELIVERED
//   PENDING | CUSTOMER_VERIFIED | CONFIRMED | PACKING | PACKED -> CANCELLED
//   DISPATCHED -> RETURN_REQUESTED -> RETURNED -> CLOSED
//
// Phase 2.1 Task 1 — cancellation was widened from "PENDING only" to any
// pre-dispatch stage (PENDING, CUSTOMER_VERIFIED, CONFIRMED, PACKING,
// PACKED), per explicit instruction. Once an order reaches DISPATCHED it
// can no longer be cancelled — only the return workflow applies from
// there. NOTE: the Phase 2.1 brief's explicit list stops at PACKED and
// does not mention COURIER_ASSIGNED, even though COURIER_ASSIGNED also
// sits before DISPATCHED. Implemented literally as written (COURIER_ASSIGNED
// is NOT cancellable) rather than assuming the omission was accidental —
// see the Phase 2.1 report's "Business Logic Updated" section.
//
// REFUNDED is pre-existing functionality (not in the spec's diagram) that
// we were told not to remove — kept as an extra terminal branch off the
// three states where a refund is actually meaningful.
export const ORDER_STATUS_FLOW: Record<string, string[]> = {
  PENDING:           ['CUSTOMER_VERIFIED', 'CANCELLED'],
  CUSTOMER_VERIFIED: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED:         ['PACKING', 'CANCELLED'],
  PACKING:           ['PACKED', 'CANCELLED'],
  PACKED:            ['COURIER_ASSIGNED', 'CANCELLED'],
  COURIER_ASSIGNED:  ['DISPATCHED'],
  DISPATCHED:        ['OUT_FOR_DELIVERY', 'RETURN_REQUESTED'],
  OUT_FOR_DELIVERY:  ['DELIVERED'],
  DELIVERED:         ['REFUNDED'],
  CANCELLED:         [],
  RETURN_REQUESTED:  ['RETURNED'],
  RETURNED:          ['CLOSED', 'REFUNDED'],
  CLOSED:            [],
  REFUNDED:          [],
};

// Phase 2 §11 — only these transitions fire a customer email. Anything not
// in this map (PACKING, PACKED, CUSTOMER_VERIFIED, COURIER_ASSIGNED,
// OUT_FOR_DELIVERY, ...) is intentionally silent.
export const EMAIL_TRIGGER_STATUSES: Record<string, string> = {
  PENDING:    'ORDER_PLACED', // sent right after creation, not a status transition
  CONFIRMED:  'ORDER_CONFIRMED',
  DISPATCHED: 'ORDER_DISPATCHED',
  DELIVERED:  'ORDER_DELIVERED',
  CANCELLED:  'ORDER_CANCELLED',
};

// Phase 2 §16 — fraud detection thresholds. Deliberately simple/explainable
// rules rather than a scored model: an admin needs to be able to look at a
// flag and immediately understand why it's there.
export const FRAUD_THRESHOLDS = {
  MIN_ORDERS_TO_EVALUATE: 3,     // don't flag brand-new customers on 1 bad order
  MAX_CANCELLATIONS: 3,          // 3+ lifetime cancellations
  MAX_RETURNS: 3,                // 3+ lifetime returns
  MAX_CANCELLATION_RATE: 0.5,    // 50%+ of all orders cancelled or returned
} as const;

export const PAGINATION = {
  DEFAULT_PAGE:  1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT:     100,
} as const;
