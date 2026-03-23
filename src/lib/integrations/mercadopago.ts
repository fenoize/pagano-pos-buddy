import { configuredSupabase } from '@/lib/supabaseClient';

export interface CreateMPPreferenceParams {
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    basePrice: number;
    selectedExtras?: any[];
    selectedModifiers?: any[];
    selectedVariant?: any;
    [key: string]: any;
  }>;
  customer_id?: string;
  notes?: string;
  fulfillment?: 'retiro' | 'delivery';
  delivery_address?: string;
  delivery_fee?: number;
  delivery_zone_id?: string;
  delivery_zone_name?: string;
}

export interface CreateMPPreferenceResponse {
  success: boolean;
  order_id: string;
  order_number: string;
  init_point: string;
  sandbox_init_point?: string;
  preference_id: string;
  error?: string;
}

export interface StoreStatus {
  is_open: boolean;
  app_orders_enabled: boolean;
  app_pickup_enabled: boolean;
  app_delivery_enabled: boolean;
  accept_app_orders: boolean;
}

/**
 * Obtiene el estado actual del local para saber si acepta pedidos desde la app
 */
export async function getStoreStatus(): Promise<StoreStatus> {
  const { data, error } = await configuredSupabase.rpc('get_store_status');
  
  if (error) {
    console.error('Error fetching store status:', error);
    throw error;
  }
  
  return data as unknown as StoreStatus;
}

/**
 * Crea una preferencia de pago en MercadoPago y una orden en pending_payment
 */
export async function createMPPreference(
  params: CreateMPPreferenceParams
): Promise<CreateMPPreferenceResponse> {
  // Calcular el total del pedido
  const total = params.items.reduce((sum, item) => {
    return sum + (item.basePrice * item.quantity);
  }, 0);
  
  // Validar que el total no sea cero
  if (total <= 0) {
    throw new Error('No se puede procesar un pago de $0 con MercadoPago. Por favor verifica tu pedido.');
  }
  
  const { data, error } = await configuredSupabase.functions.invoke(
    'customer-create-mp-preference',
    {
      body: params
    }
  );
  
  if (error) {
    console.error('Error creating MP preference:', error);
    throw error;
  }
  
  if (data.error) {
    throw new Error(data.error);
  }
  
  return data;
}

/**
 * Valida si el local está aceptando pedidos desde la app
 * Lanza un error si no está disponible
 */
export async function validateStoreAcceptingOrders(): Promise<void> {
  const status = await getStoreStatus();
  
  if (!status.app_orders_enabled) {
    throw new Error('Los pedidos desde la app están desactivados en este momento.');
  }
  
  if (!status.accept_app_orders) {
    throw new Error('El local no está recibiendo pedidos en este momento. Por favor intenta más tarde.');
  }
  
  if (!status.is_open) {
    throw new Error('El local está cerrado. No hay turnos activos.');
  }
}
