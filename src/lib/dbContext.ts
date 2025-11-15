import { supabase } from '@/integrations/supabase/client';

/**
 * Establece el contexto de sesión para clientes del portal
 * Setea app.customer_account_id y app.customer_id en la sesión DB
 * y limpia cualquier contexto de staff
 */
export async function setCustomerContext(accountId: string, customerId: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('set_customer_context', {
      p_account_id: accountId,
      p_customer_id: customerId
    });

    if (error) {
      console.error('Error setting customer context:', error);
      throw error;
    }
  } catch (error) {
    console.error('Failed to set customer context:', error);
    throw error;
  }
}

/**
 * Establece el contexto de sesión para usuarios del staff/POS
 * Setea app.user_id en la sesión DB y limpia cualquier contexto de customer
 */
export async function setStaffContext(userId: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('set_staff_context', {
      p_user_id: userId
    });

    if (error) {
      console.error('Error setting staff context:', error);
      throw error;
    }
  } catch (error) {
    console.error('Failed to set staff context:', error);
    throw error;
  }
}

/**
 * Limpia cualquier contexto de sesión establecido
 * Útil durante logout
 */
export async function clearDBContext(): Promise<void> {
  try {
    // Limpiar todos los contextos estableciendo valores vacíos
    await supabase.rpc('set_customer_context', {
      p_account_id: '00000000-0000-0000-0000-000000000000',
      p_customer_id: '00000000-0000-0000-0000-000000000000'
    });
  } catch (error) {
    console.error('Failed to clear DB context:', error);
    // No throw - el logout debe continuar incluso si esto falla
  }
}

/**
 * Wrapper para operaciones que requieren contexto de staff
 * Garantiza que el contexto se establezca antes de cada operación
 * 
 * IMPORTANTE: Esto es necesario porque set_config(..., false) solo persiste
 * durante la transacción actual en Supabase con connection pooling.
 */
export async function withStaffContext<T>(
  userId: string,
  operation: () => Promise<T>
): Promise<T> {
  try {
    // Establecer contexto inmediatamente antes de la operación
    await setStaffContext(userId);
    
    // Ejecutar la operación dentro de la misma "sesión lógica"
    return await operation();
  } catch (error) {
    console.error('Error in withStaffContext:', error);
    throw error;
  }
}
