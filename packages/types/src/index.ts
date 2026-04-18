export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'staff' | 'retailer';
  partyId?: string;
  isActive: boolean;
}

export interface Party {
  id: string;
  name: string;
  type: 'customer' | 'supplier';
  gstin?: string;
  pan?: string;
  stateCode: string;
  stateName: string;
  address?: string;
  city?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  creditDays?: number;
  creditLimit?: string;
  openingBalance?: string;
}

export interface Category {
  id: string;
  name: string;
  parentId?: string;
  description?: string;
}

export interface Product {
  id: string;
  name: string;
  categoryId?: string;
  description?: string;
  hsnCode: string;
  baseUnit: string;
}

export interface Variant {
  id: string;
  productId: string;
  sku: string;
  name: string;
  mrp: string;
  purchaseRate?: string;
  gstRate: string;
  minStock?: string;
}

export interface OrderItem {
  variantId: string;
  quantity: string;
  rate: string;
  gstRate: string;
}

export interface CreateOrderInput {
  type: 'sales' | 'purchase';
  partyId: string;
  items: OrderItem[];
  remarks?: string;
  shippingAddress?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
