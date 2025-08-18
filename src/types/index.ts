export type AppRole = 'Administrador' | 'Caja' | 'Cocina' | 'Reparto' | 'Viewer';

export type OrderStatus = 'Pendiente' | 'En preparación' | 'En pausa' | 'Listo' | 'Entregado' | 'Cancelado';

export type FulfillmentType = 'retiro' | 'delivery';

export type PaymentMethod = 'efectivo' | 'mp' | 'pos' | 'mixto';

export type CashMovementType = 'ingreso' | 'egreso';

export interface User {
  id: string;
  username: string;
  role: AppRole;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  prices: {
    combo: {
      simple: number;
      doble: number;
      triple: number;
    };
    only: {
      simple: number;
      doble: number;
      triple: number;
    };
  };
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  name?: string;
  apellido?: string;
  phone?: string;
  rut?: string;
  email?: string;
  direccion?: string;
  numeracion?: string;
  comuna?: string;
  ultima_compra?: string;
  cantidad_runas?: number;
  valor_cliente?: number;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  size: 'simple' | 'doble' | 'triple';
  priceKind: 'combo' | 'only';
  basePrice: number;
  quantity: number;
  extras: Array<{
    key: string;
    label: string;
    price: number;
  }>;
  modifiers: string[];
  notes?: string;
}

export interface Order {
  id: string;
  order_number: number;
  customer_id?: string;
  customer?: Customer;
  fulfillment: FulfillmentType;
  delivery_address?: string;
  delivery_number?: string;
  delivery_comuna?: string;
  delivery_distance?: number;
  items: OrderItem[];
  subtotal: number;
  delivery_fee: number;
  discount: number;
  total: number;
  payment_efectivo: number;
  payment_mp: number;
  payment_pos: number;
  payment_method: PaymentMethod;
  status: OrderStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CashMovement {
  id: string;
  session_id?: string;
  type: CashMovementType;
  amount: number;
  note?: string;
  created_at: string;
}

export interface CashSession {
  id: string;
  opened_at: string;
  opening_cash: number;
  closed_at?: string;
  closing_cash?: number;
  user_id: string;
}

export interface InventoryItem {
  id: string;
  ingredient: string;
  stock: number;
  updated_at: string;
}

export interface Config {
  id: string;
  key: string;
  value: any;
  updated_at: string;
}

export interface Extra {
  key: string;
  label: string;
  price: number;
  inventory?: Record<string, number>;
}

export interface DeliveryConfig {
  minFee: number;
  perKm: number;
}

export interface Recipe {
  burger: {
    simple: Record<string, number>;
    doble: Record<string, number>;
    triple: Record<string, number>;
  };
  combo: Record<string, number>;
}

// Utility types for forms
export interface LoginForm {
  username: string;
  password: string;
}

export interface NewOrderForm {
  customer?: {
    name?: string;
    phone?: string;
    rut?: string;
    email?: string;
  };
  fulfillment: FulfillmentType;
  delivery?: {
    address: string;
    number: string;
    comuna: string;
    distance: number;
  };
  items: OrderItem[];
  discount: number;
  payments: {
    efectivo: number;
    mp: number;
    pos: number;
  };
  notes?: string;
}