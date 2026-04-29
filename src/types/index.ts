export type AppRole = 'Administrador' | 'Cajero' | 'Cocinero' | 'Preparador' | 'Reparto' | 'Viewer' | 'TV' | 'Leer QR';

 export type OrderStatus = 'PendientePago' | 'PendienteAceptacion' | 'Pendiente' | 'En preparación' | 'En pausa' | 'Listo' | 'En camino' | 'Entregado' | 'Cancelado';

export type FulfillmentType = 'retiro' | 'delivery';

export type PickupMode = 'servir' | 'llevar' | null;

export type PaymentMethod = 'efectivo' | 'mp' | 'pos' | 'aplicacion' | 'runas' | 'mixto' | 'pendiente' | 'transferencia' | 'colacion' | 'canje';

export type PaymentStatus = 'paid' | 'unpaid' | 'partial';

export type CashMovementType = 'ingreso' | 'egreso' | 'transferencia';

export interface User {
  id: string;
  username: string;
  full_name?: string;
  email?: string;
  role: AppRole;
  roles?: AppRole[];
  active: boolean;
  can_do_delivery: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id?: string;
  name: string;
  description?: string;
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
  display_order: number;
  is_default: boolean;
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

export type OrigenMovimiento = 'POS' | 'Web' | 'Manual' | 'Edición';

// Cupones
export type CouponType = 'percent' | 'fixed_cart' | 'fixed_product';
export type DeliveryMode = 'free' | 'fixed' | 'percent';

// Inventario y Recetas - Nueva estructura (Fase 1 completada)

// Unidades de medida (UOM)
export interface UnitOfMeasure {
  id: string;
  code: string;
  name: string;
  abbreviation: string;
  is_base_unit: boolean;
  conversion_factor?: number;
  base_unit_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Relación
  base_unit?: UnitOfMeasure;
}

// Materias primas
export interface RawMaterial {
  id: string;
  code?: string;
  name: string;
  description?: string;
  category?: string;
  base_uom_id?: string;
  conversion_to_base?: number;
  min_stock?: number;
  last_cost?: number;
  avg_cost?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Relación
  base_uom?: UnitOfMeasure;
}

// Recetas (cabecera)
export interface Recipe {
  id: string;
  product_id: string;
  category_variant_id?: string;
  name: string;
  description?: string;
  yield_quantity: number;
  yield_uom_id?: string;
  preparation_notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Relaciones
  product?: { name: string; id: string };
  category_variant?: { name: string; id: string };
  yield_uom?: UnitOfMeasure;
  ingredients?: RecipeIngredient[];
}

// Ingredientes de recetas (detalle)
export interface RecipeIngredient {
  id: string;
  recipe_id: string;
  raw_material_id: string;
  quantity_per_unit: number;
  uom_id: string;
  is_optional: boolean;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Relaciones
  raw_material?: RawMaterial;
  uom?: UnitOfMeasure;
}

// Mantener para compatibilidad con código legacy
export interface InventoryRecipe extends Recipe {
  variant_id?: string;
  qty_required?: number;
}

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

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
  auth_user_id?: string;
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
  comuna_id?: string; // FK a tabla comunas
  ciudad: string;
  observaciones?: string;
  is_default: boolean;
  latitude?: number;
  longitude?: number;
  formatted_address?: string;
  created_at: string;
  updated_at: string;
}

export interface Comuna {
  id: string;
  name: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DeliveryZone {
  id: string;
  name: string;
  description?: string;
  delivery_fee: number;
  active: boolean;
  polygon?: any;
  price_per_km?: number;
  min_fee?: number;
  calculation_mode?: 'fixed' | 'distance';
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
  selectedVariant?: {
    id: string;
    name: string;
    price: number;
  };
  
  // Para combos
  is_combo_item?: boolean;
  combo_parent_id?: string;
  combo_slot_id?: string;
  combo_selections?: any[];
  
  // Variant group selections (multi-dimensional)
  variant_group_selections?: Array<{
    group_id: string;
    group_name: string;
    option_id: string;
    option_name: string;
  }>;
}

// Variant Groups (multi-dimensional variants)
export interface VariantGroup {
  id: string;
  name: string;
  display_order: number;
  active: boolean;
  // Metadatos de selección (migración 2026-04-22)
  min_select?: number;
  max_select?: number;
  is_required?: boolean;
  created_at: string;
  updated_at: string;
  options?: VariantGroupOption[];
}

export interface VariantGroupOption {
  id: string;
  group_id: string;
  name: string;
  display_order: number;
  image_url?: string;
  is_default: boolean;
  active: boolean;
  // Recargo en CLP sobre el precio base del tamaño (migración 2026-04-22)
  price_delta?: number;
  created_at: string;
  updated_at: string;
}

export interface ProductVariantGroup {
  id: string;
  product_id: string;
  group_id: string;
  created_at: string;
  group?: VariantGroup;
}

export interface Order {
  id: string;
  order_number: number;
  customer_id?: string;
  customer?: Customer;
  fulfillment: FulfillmentType;
  pickup_mode?: PickupMode | string | null; // 'servir' = para servir en local, 'llevar' = para llevar
  delivery_zone_id?: string;
  delivery_zone_name?: string;
  delivery_address?: string;
  delivery_number?: string;
  delivery_comuna?: string;
  delivery_comuna_id?: string;
  delivery_reference?: string;
  delivery_person_id?: string;
  delivery_person_name?: string;
  delivery_distance?: number;
  delivery_assigned_at?: string;
  delivery_delivered_at?: string;
  items: OrderItem[];
  subtotal: number;
  delivery_fee: number;
  discount: number;
  total: number;
  payment_efectivo: number;
  payment_mp: number;
  payment_pos: number;
  payment_aplicacion: number;
  payment_runas: number;
  payment_method: PaymentMethod;
  status: OrderStatus;
  notes?: string;
  nombre_resumen?: string;
  
  // Cupones y descuentos
  applied_coupons?: CouponApplication[];
  manual_discount?: number;
  manual_discount_type?: 'percentage' | 'fixed';
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
  accept_app_orders?: boolean;
}

export interface CashSessionAudit {
  id: string;
  cash_session_id: string;
  order_id: string;
  changed_by_user_id?: string;
  changed_at: string;
  field_name: string;
  old_value?: string;
  new_value?: string;
  reason?: string;
  old_totals?: any;
  new_totals?: any;
}

export interface SessionSummary {
  session: CashSession;
  orders: Order[];
  cashMovements: CashMovement[];
  runasTransactions: RunasTransaction[];
  summary: {
    totalEfectivo: number;
    totalMP: number;
    totalPOS: number;
    totalAplicacion: number;
    totalRunas: number;
    totalSales: number;
    totalIngresos: number;
    totalEgresos: number;
    expectedCash: number;
    cashDifference: number;
  };
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

export interface Coupon {
  id: string;
  code: string;
  type: CouponType;
  amount: number;
  description?: string;
  
  // Vigencia
  date_start?: string;
  date_end?: string;
  time_windows?: Record<string, string[]>; // {"mon": ["12:00-16:00"]}
  
  // Condiciones
  min_spend?: number;
  max_spend?: number;
  
  // Límites
  usage_limit_total?: number;
  usage_limit_per_customer?: number;
  
  // Reglas
  allow_stack: boolean;
  apply_to_discounted: boolean;
  apply_to_combo_children: boolean;
  allow_manual_line_selection: boolean;
  roles_allowed?: AppRole[];
  
  // Áreas afectadas
  affects_products: boolean;
  affects_delivery: boolean;
  delivery_mode?: DeliveryMode;
  delivery_amount?: number;
  affects_tip: boolean;
  
  // Comisión
  commission_enabled?: boolean;
  commission_type?: 'percentage' | 'fixed';
  commission_value?: number;
  commission_contact?: string;
  
  // Alcance (cargar dinámicamente)
  allowed_categories?: string[];
  excluded_categories?: string[];
  allowed_products?: string[];
  excluded_products?: string[];
  allowed_variants?: string[];
  excluded_variants?: string[];
  allowed_extras?: string[];
  excluded_extras?: string[];
  allowed_modifiers?: string[];
  excluded_modifiers?: string[];
  
  // Auditoría
  created_at: string;
  created_by?: string;
  is_active: boolean;
  
  // Stats (calculados)
  total_used?: number;
  total_discounted?: number;
  total_sales?: number;
}

export interface CouponApplication {
  id: string;
  order_id: string;
  coupon_id: string;
  applied_by?: string;
  applied_at: string;
  discount_products: number;
  discount_delivery: number;
  payload: {
    coupon_code: string;
    coupon_type: CouponType;
    affected_lines: Array<{
      item_index: number;
      product_id: string;
      product_name: string;
      base_amount: number;
      discount_amount: number;
    }>;
    delivery_original?: number;
    delivery_final?: number;
  };
}

export interface CouponEligibilityResult {
  valid: boolean;
  errors: string[];
  coupon?: Coupon;
  eligible_line_indices?: number[];
  preview?: {
    discount_products: number;
    discount_delivery: number;
    total_discount: number;
  };
}

// DEPRECATED: Esta interfaz ya no se usa, reemplazada por Recipe + RecipeIngredient
export interface LegacyInventoryRecipe {
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
  image_url?: string;
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
  pricing_mode: PricingMode;
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
  lock_product?: boolean;
  allow_multiple_variants?: boolean;
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