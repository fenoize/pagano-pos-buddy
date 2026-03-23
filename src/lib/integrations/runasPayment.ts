import { supabase } from '@/integrations/supabase/client';
import type { CartItem } from '@/contexts/CartContext';

export interface CreateRunasOrderParams {
  items: CartItem[];
  customer_id: string;
  notes: string;
  runas_to_use: number;
  discount_amount: number;
  fulfillment?: 'retiro' | 'delivery';
  delivery_address?: string;
  delivery_fee?: number;
}

export interface CreateRunasOrderResponse {
  success: boolean;
  order_id: string;
  order_number: number;
  runas_used: number;
  remaining_runas: number;
}

/**
 * Valida que el cliente tenga suficientes runas para pagar
 */
export async function validateRunasBalance(
  customerId: string,
  requiredRunas: number
): Promise<{ valid: boolean; currentBalance: number; message?: string }> {
  try {
    const { data: customer, error } = await supabase
      .from('customers')
      .select('cantidad_runas')
      .eq('id', customerId)
      .single();

    if (error) throw error;

    const currentBalance = customer?.cantidad_runas || 0;

    if (currentBalance < requiredRunas) {
      return {
        valid: false,
        currentBalance,
        message: `No tienes suficientes runas. Necesitas ${requiredRunas} pero solo tienes ${currentBalance}`
      };
    }

    return { valid: true, currentBalance };
  } catch (error) {
    console.error('Error validating runas balance:', error);
    return { valid: false, currentBalance: 0, message: 'Error al validar saldo de runas' };
  }
}

/**
 * Obtiene el valor de redención de una runa desde la configuración
 * runa_reward_value = cuántos pesos vale 1 runa al canjear (ej: 600)
 */
async function getRunaRewardValue(): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('config')
      .select('value')
      .eq('key', 'runa_reward_value')
      .single();

    if (error) throw error;
    return (data?.value as number) || 600;
  } catch (error) {
    console.error('Error fetching runa reward value:', error);
    return 600; // Valor por defecto
  }
}

/**
 * Calcula cuántas runas se necesitan para cubrir un monto
 * Fórmula: monto / valor_runa_reward = runas necesarias
 * Ej: $24,000 / $600 = 40 runas
 */
export async function calculateRequiredRunas(amount: number): Promise<number> {
  const runaRewardValue = await getRunaRewardValue();
  return Math.ceil(amount / runaRewardValue);
}

/**
 * Calcula el descuento en pesos que otorgan X runas
 * Fórmula: runas * valor_runa_reward = descuento
 * Ej: 40 runas * $600 = $24,000
 */
export async function calculateRunasDiscount(runas: number): Promise<number> {
  const runaRewardValue = await getRunaRewardValue();
  return runas * runaRewardValue;
}

/**
 * Crea una orden pagada completamente con runas
 */
export async function createRunasOrder(
  params: CreateRunasOrderParams
): Promise<CreateRunasOrderResponse> {
  const { items, customer_id, notes, runas_to_use, discount_amount, fulfillment, delivery_address, delivery_fee } = params;

  try {
    // 1. Validar saldo de runas
    const validation = await validateRunasBalance(customer_id, runas_to_use);
    if (!validation.valid) {
      throw new Error(validation.message || 'Saldo de runas insuficiente');
    }

    // 2. Calcular subtotal
    const subtotal = items.reduce((sum, item) => {
      const itemTotal = item.basePrice * item.quantity;
      const extrasTotal = item.selectedExtras?.reduce((extraSum, extra) => 
        extraSum + extra.price, 0) || 0;
      return sum + itemTotal + extrasTotal;
    }, 0);

    // 3. Preparar items para la orden (usar estructura de OrderItem)
    const orderItems = items.map(item => ({
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      basePrice: item.basePrice,
      // Usar estructura de OrderItem
      extras: item.extras || item.selectedExtras?.map(e => ({
        key: e.id,
        label: e.name,
        price: e.price,
        quantity: 1
      })) || [],
      modifiers: item.modifiers || item.selectedModifiers || [],
      variant_name: item.variant_name || item.selectedVariant?.name,
      category_variant_id: item.category_variant_id,
      product_variant_option_id: item.product_variant_option_id,
      size: item.size,
      priceKind: item.priceKind,
      is_combo_item: item.is_combo_item,
      combo_selections: item.combo_selections,
      notes: item.notes || ''
    }));

    // 4. Crear la orden con contexto de cliente
    const actualDeliveryFee = delivery_fee || 0;
    // IMPORTANTE: el enum en la DB es 'retiro' no 'pickup'
    const actualFulfillment = fulfillment === 'delivery' ? 'delivery' : 'retiro';
    
    const { data: orderData, error: orderError } = await supabase.rpc(
      'create_order_with_context',
      {
        p_user_id: null, // Sin usuario POS - dejar null para pedidos de clientes
        p_order_data: {
          customer_id,
          fulfillment: actualFulfillment,
          items: orderItems,
          subtotal,
          delivery_fee: actualDeliveryFee,
          delivery_address: delivery_address || null,
          discount: discount_amount,
          total: 0, // Pago 100% con runas = $0 para el cliente
          payment_efectivo: 0,
          payment_mp: 0,
          payment_pos: 0,
          payment_aplicacion: 0,
          payment_runas: discount_amount,
          payment_method: 'runas',
         status: 'PendienteAceptacion',
          notes: notes || 'Pedido pagado con runas desde app cliente',
          source: 'customer_app'
        }
      }
    );

    if (orderError) throw orderError;

    // orderData es un JSONB, necesitamos parsearlo
    const order = typeof orderData === 'string' ? JSON.parse(orderData) : orderData;
    const orderId = order.id;
    const orderNumber = order.order_number;

    // 5. Registrar transacción de redención de runas
    const { error: transactionError } = await supabase
      .from('runas_transactions')
      .insert([{
        customer_id: customer_id,
        type: 'canje',
        runas: -runas_to_use,
        amount: discount_amount,
        origen: 'Web',
        order_id: orderId,
        motivo: `Pago de pedido #${orderNumber} con runas`
      }]);

    if (transactionError) throw transactionError;

    // El trigger sync_customer_runas_on_transaction actualiza automáticamente cantidad_runas
    const newBalance = validation.currentBalance - runas_to_use;

    return {
      success: true,
      order_id: orderId,
      order_number: orderNumber,
      runas_used: runas_to_use,
      remaining_runas: newBalance
    };
  } catch (error: any) {
    console.error('Error creating runas order:', error);
    throw new Error(error.message || 'Error al crear pedido con runas');
  }
}
