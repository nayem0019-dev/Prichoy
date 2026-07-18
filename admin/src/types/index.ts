export type Role =
  | 'SUPER_ADMIN' | 'ADMIN' | 'ORDER_MANAGER'
  | 'INVENTORY_MANAGER' | 'CUSTOMER_SUPPORT'
  | 'DELIVERY_MANAGER' | 'ACCOUNTANT';

export type OrderStatus =
  | 'PENDING' | 'CONFIRMED' | 'PACKED' | 'DISPATCHED'
  | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED'
  | 'RETURNED' | 'REFUNDED';

export type PaymentStatus = 'UNPAID' | 'PAID' | 'PARTIALLY_PAID' | 'REFUNDED' | 'PENDING';
export type PaymentMethod = 'COD' | 'BKASH' | 'NAGAD' | 'CARD' | 'BANK_TRANSFER';
export type CustomerTag = 'VIP' | 'REGULAR' | 'NEW' | 'BLOCKED' | 'FREQUENT' | 'WHOLESALE';
// Phase 3 §16 — the multi-assignment tag set (superset of the legacy single
// CustomerTag column above, used by CustomerTagAssignment / setCustomerTags).
export type MultiCustomerTag =
  | 'VIP' | 'REGULAR' | 'NEW' | 'BLOCKED' | 'FREQUENT' | 'WHOLESALE'
  | 'PRIORITY' | 'HIGH_RETURN_RISK' | 'HIGH_CANCELLATION_RISK';

export type ProductLabel =
  | 'NEW' | 'BEST_SELLER' | 'TRENDING' | 'SALE' | 'LIMITED' | 'PREMIUM' | 'FEATURED';

export interface CustomerNoteEntry {
  id: string; customerId: string; note: string;
  createdById?: string | null; createdBy?: { id: string; name: string } | null;
  createdAt: string; updatedAt: string;
}

export interface CustomerTagAssignment {
  id: string; customerId: string; tag: MultiCustomerTag; createdAt: string;
}

export interface Collection {
  id: string; name: string; slug: string; description?: string | null;
  isActive: boolean; displayOrder: number;
  createdAt: string; updatedAt: string;
  _count?: { products: number };
}

export interface ProductColor {
  id: string; productId: string; name: string; hexCode?: string | null;
  displayOrder: number;
  images: { id: string; url: string; thumbnailUrl?: string | null; isPrimary: boolean; order: number }[];
}

export interface ProductLabelAssignment {
  id: string; productId: string; label: ProductLabel; createdAt: string;
}

export interface ProductCollectionLink {
  id: string; productId: string; collectionId: string;
  collection: { id: string; name: string; slug: string };
}

export interface ProductSizeGuide {
  id: string; productId: string; imageUrl?: string | null;
  measurementTable?: string | null; notes?: string | null;
  createdAt: string; updatedAt: string;
}

export interface StockMovement {
  id: string; inventoryId: string; variantId?: string | null;
  type: string; quantity: number; previousStock: number; newStock: number;
  reason?: string | null; reference?: string | null; adminId?: string | null;
  note?: string | null; createdAt: string;
  inventory?: { product?: { name: string; sku: string } };
  variant?: { name: string; value: string; sku?: string | null } | null;
  admin?: { id: string; name: string } | null;
}

export interface Customer {
  id: string; name: string; phone: string; email?: string | null;
  tag: CustomerTag; isBlocked: boolean; blockReason?: string | null;
  notes?: string | null; totalOrders: number; totalSpent: number;
  averageOrder: number; lastOrderAt?: string | null; createdAt: string;
  addresses?: Address[];
  orders?: Order[];
  tags?: CustomerTagAssignment[];
  customerNotes?: CustomerNoteEntry[];
  cancellationRate?: number;
  returnRate?: number;
  _count?: { orders: number };
}

export interface Address {
  id: string; label?: string | null; line1: string;
  thana: string; district: string; division?: string | null;
  isDefault: boolean;
}

export interface Product {
  id: string; name: string; slug: string; description?: string | null;
  sku: string; barcode?: string | null; gender?: 'MALE'|'FEMALE'|'UNISEX' | null;
  categoryId: string; category: { id:string; name:string; slug:string };
  brandId?: string | null; brand?: { id:string; name:string } | null;
  costPrice: number; sellingPrice: number; salePrice?: number | null;
  profitMargin?: number | null; isActive: boolean; isFeatured: boolean;
  totalSold: number;
  images: { id:string; url:string; isPrimary:boolean }[];
  variants: Variant[];
  inventories: Inventory[];
  colors?: ProductColor[];
  labels?: ProductLabelAssignment[];
  collections?: ProductCollectionLink[];
  sizeGuide?: ProductSizeGuide | null;
  createdAt: string;
}

export interface Variant {
  id: string; productId?: string; name: string; value: string; sku?: string | null;
  barcode?: string | null; price?: number | null; salePrice?: number | null;
  stock: number; reserved: number; lowStockAlert?: number; image?: string | null;
  colorId?: string | null; color?: { id: string; name: string; hexCode?: string | null } | null;
  isActive: boolean;
}

export interface Inventory {
  id: string; productId: string; warehouseId: string;
  quantity: number; reserved: number; lowStockAlert: number;
  product?: Product; warehouse?: { id:string; name:string };
}

export interface OrderItem {
  id: string; productId: string; variantId?: string | null;
  productName: string; variantInfo?: string | null; sku?: string | null;
  image?: string | null; quantity: number; unitPrice: number;
  discount: number; totalPrice: number;
  product?: { id:string; name:string; sku:string };
}

export interface OrderHistoryItem {
  id: string; status: OrderStatus; note?: string | null;
  createdAt: string; admin?: { id:string; name:string } | null;
}

export interface Order {
  id: string; orderNo: string; invoiceNo: string;
  customerId: string; customer: { id:string; name:string; phone:string; email?:string|null };
  shippingName: string; shippingPhone: string; shippingAddress: string;
  shippingThana: string; shippingDistrict: string;
  items: OrderItem[];
  paymentMethod: PaymentMethod; paymentStatus: PaymentStatus; status: OrderStatus;
  subtotal: number; discountAmount: number; couponCode?: string | null;
  shippingCharge: number; taxAmount: number; grandTotal: number;
  courierId?: string | null; courier?: { id:string; name:string; website?:string|null } | null;
  trackingNumber?: string | null;
  dispatchedAt?: string | null; deliveredAt?: string | null;
  cancelledAt?: string | null; cancelReason?: string | null;
  notes?: string | null; adminNotes?: string | null;
  history: OrderHistoryItem[];
  payment?: { status: PaymentStatus; method: PaymentMethod; paidAmount: number } | null;
  createdAt: string; updatedAt: string;
}

export interface DashboardStats {
  orders: {
    total: number; today: number; pending: number; confirmed: number;
    packed: number; dispatched: number; delivered: number;
    cancelled: number; returned: number; refunded: number;
  };
  revenue: { today: number; month: number; year: number; total: number };
}

export interface Courier {
  id: string; name: string; website?: string | null; isActive: boolean; isDefault: boolean;
}

export interface Warehouse {
  id: string; name: string; location?: string | null; isDefault: boolean;
  _count?: { inventories: number };
}

export interface PaginationMeta {
  page: number; limit: number; total: number; totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean; message: string; data: T; meta?: PaginationMeta;
}
