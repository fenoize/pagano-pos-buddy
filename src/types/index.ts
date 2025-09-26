export type AppRole = 'Administrador' | 'Cajero' | 'Cocinero' | 'Preparador' | 'Repartidor' | 'Viewer';

export type OrderStatus = 'Pendiente' | 'En preparación' | 'En pausa' | 'Listo' | 'Entregado' | 'Cancelado';

export type FulfillmentType = 'retiro' | 'delivery';

export type PaymentMethod = 'efectivo' | 'mp' | 'pos' | 'mixto';

export type CashMovementType = 'ingreso' | 'egreso';

export interface User {
  id: string;
  username: string;
  full_name?: string;
  email?: string;
  role: AppRole;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id?: string;
  name: string;
  category?: string;
  image_url?: string;
  prices: {
    combo: {
      simple: number;
      doble: number;
      triple: number;
      cuadruple?: number;
    };
    only: {
      simple: number;
      doble: number;
      triple: number;
      cuadruple?: number;
    };
  };
  active: boolean;
  created_at?: string;
  updated_at?: string;
  categories?: Category[];
  // Nuevos campos para sistema de variantes y combos
  variants?: ProductVariantOption[];
  combo_config?: ComboProduct;
  combo_items?: ComboItem[];
  is_combo?: boolean;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ProductExtra {
  id: string;
  name: string;
  price: number;
  category_id?: string;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ProductModifier {
  id: string;
  name: string;
  price: number;
  product_id?: string;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export type EstadoCliente = 'Activo' | 'Inactivo' | 'Bloqueado';

export type RunaMovementType = 'acumulacion' | 'canje' | 'ajuste' | 'promo';

export type OrigenMovimiento = 'POS' | 'Web' | 'Manual';

export interface Customer {
  id: string;
  nombres?: string;
  apellidos?: string;
  name?: string; // Mantenido para compatibilidad con POS
  apellido?: string; // Mantenido para compatibilidad con POS
  phone?: string;
  rut?: string;
  email?: string;
  fecha_nacimiento?: string;
  estado_cliente?: EstadoCliente;
  motivo_estado?: string;
  ultima_compra?: string;
  cantidad_runas?: number;
  valor_cliente?: number;
  created_at: string;
  updated_at: string;
  created_by_user_id?: string;
  updated_by_user_id?: string;
  addresses?: Address[];
  // Campos mantenidos para compatibilidad con POS existente
  direccion?: string;
  numeracion?: string;
  comuna?: string;
}

export interface Address {
  id: string;
  customer_id: string;
  alias: string;
  calle: string;
  numero: string;
  depto?: string;
  comuna: string;
  ciudad: string;
  observaciones?: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface RunasTransaction {
  id: string;
  customer_id?: string;
  type: RunaMovementType;
  runas: number;
  amount: number;
  origen: OrigenMovimiento;
  referencia?: string;
  motivo?: string;
  responsable_id?: string;
  order_id?: string;
  created_at: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  
  // Legacy system fields - now optional
  size?: 'simple' | 'doble' | 'triple' | 'cuádruple';
  priceKind?: 'combo' | 'only';
  
  basePrice: number;
  quantity: number;
  extras: Array<{
    key: string;
    label: string;
    price: number;
    quantity?: number;
  }>;
  modifiers: Array<{
    id: string;
    name: string;
  }>;
  notes?: string;
  
  // New variant system fields
  category_variant_id?: string;
  variant_name?: string;
  product_variant_option_id?: string; // Added this field
  variant_price?: number;
  
  // Para combos
  is_combo_item?: boolean;
  combo_parent_id?: string;
  combo_slot_id?: string;
  combo_selections?: any[];
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
  created_by_user_id?: string;
  created_by_user?: User;
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
  observaciones?: string;
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

// Nuevas interfaces para el sistema de variantes y combos
export interface CategoryVariant {
  id: string;
  category_id: string;
  name: string;
  display_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductVariantOption {
  id: string;
  product_id: string;
  category_variant_id: string;
  price: number;
  sku?: string;
  stock: number;
  is_default: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
  // Populated from joins
  variant?: CategoryVariant;
}

export interface ComboProduct {
  id: string;
  product_id: string;
  pricing_mode: 'fixed' | 'individual'; // Changed from 'dynamic' to 'individual'
  base_price: number;
  combo_discount: number;
  included_variants: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ComboItem {
  id: string;
  combo_product_id: string;
  category_id: string;
  quantity: number;
  default_product_id?: string;
  default_variant_id?: string;
  allow_customization: boolean;
  allow_variant_change?: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  // Populated from joins
  category?: Category;
  default_product?: Product;
  default_variant?: CategoryVariant;
}

export type PricingMode = 'fixed' | 'dynamic';

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