export interface Supplier {
  id: string;
  name: string;
  rut?: string;
  email?: string;
  phone?: string;
  address?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  
  // Nuevos campos de facturación
  razon_social?: string;
  giro?: string;
  direccion_fiscal?: string;
  comuna_fiscal?: string;
  ciudad_fiscal?: string;
  
  // Datos bancarios
  bank_name?: string;
  bank_account_type?: string;
  bank_account_number?: string;
  bank_account_holder?: string;
  bank_account_holder_rut?: string;
  
  // Condiciones de pago
  payment_terms_days?: number;
  payment_terms_type?: 'contado' | 'credito' | 'por_factura';
  
  // Otros
  notes?: string;
  preferred_contact_method?: 'email' | 'whatsapp' | 'phone';
}

export type CreateSupplierData = Omit<Supplier, 'id' | 'created_at' | 'updated_at' | 'is_active'>;

export interface SupplierContact {
  id: string;
  supplier_id: string;
  name: string;
  position?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  is_primary: boolean;
  receive_purchase_orders: boolean;
  receive_payments: boolean;
  notes?: string;
  is_active: boolean;
}

export interface SupplierPayable {
  id: string;
  supplier_id: string;
  purchase_order_id?: string;
  amount_total: number;
  amount_paid: number;
  document_type?: string;
  document_number?: string;
  document_date?: string;
  due_date?: string;
  status: 'pendiente' | 'parcial' | 'pagado' | 'vencido';
  notes?: string;
}
