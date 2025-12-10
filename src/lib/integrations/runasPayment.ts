import { supabase } from '@/integrations/supabase/client';
import { CartItem } from '@/contexts/CartContext';

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
 * Obtiene el valor actual de una runa desde la configuración
 */
async function getRunaValue(): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('config')
      .select('value')
      .eq('key', 'runa_value')
      .single();

    if (error) throw error;
    return (data?.value as number) || 2000;
  } catch (error) {
    console.error('Error fetching runa value:', error);
    return 2000; // Valor por defecto
  }
}

/**
 * Calcula cuántas runas se necesitan para cubrir un monto
 * Usa la regla: 3 runas = valor de 1 runa en pesos
 */
export async function calculateRequiredRunas(amount: number): Promise<number> {
  const runaValue = await getRunaValue();
  // Fórmula: Para pagar X pesos, necesitas (X * 3) / runaValue runas
  return Math.ceil((amount * 3) / runaValue);
}

/**
 * Calcula el descuento en pesos que otorgan X runas
 */
export async function calculateRunasDiscount(runas: number): Promise<number> {
  const runaValue = await getRunaValue();
  // Fórmula inversa: runas / 3 * runaValue
  return Math.floor((runas * runaValue) / 3);
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

    // 3. Preparar items para la orden
    const orderItems = items.map(item => ({
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      basePrice: item.basePrice,
      selectedExtras: item.selectedExtras || [],
      selectedModifiers: item.selectedModifiers || [],
      selectedVariant: item.selectedVariant,
      notes: item.notes || ''
    }));

    // 4. Crear la orden con contexto de cliente
    const actualDeliveryFee = delivery_fee || 0;
    const actualFulfillment = fulfillment === 'delivery' ? 'delivery' : 'pickup';
    
    const { data: orderData, error: orderError } = await supabase.rpc(
      'create_order_with_context',
      {
        p_user_id: '00000000-0000-0000-0000-000000000000', // Sin usuario POS
        p_order_data: {
          customer_id,
          fulfillment: actualFulfillment,
          items: orderItems,
          subtotal,
          delivery_fee: actualDeliveryFee,
          delivery_address: delivery_address || null,
          discount: discount_amount,
          total: subtotal + actualDeliveryFee - discount_amount,
          payment_efectivo: 0,
          payment_mp: 0,
          payment_pos: 0,
          payment_aplicacion: 0,
          payment_runas: discount_amount,
          payment_method: 'runas',
          status: 'Pendiente',
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
        referencia: orderId,
        motivo: `Pago de pedido #${orderNumber} con runas`
      }]);

    if (transactionError) throw transactionError;

    // 6. Actualizar saldo de runas del cliente
    const newBalance = validation.currentBalance - runas_to_use;
    const { error: updateError } = await supabase
      .from('customers')
      .update({ cantidad_runas: newBalance })
      .eq('id', customer_id);

    if (updateError) throw updateError;

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
