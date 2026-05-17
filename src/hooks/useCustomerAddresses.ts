import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Address } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { toast } from "sonner";

export interface AddressFormData {
  alias: string;
  calle: string;
  numero: string;
  depto?: string;
  comuna: string;
  ciudad?: string;
  observaciones?: string;
  is_default?: boolean;
}

export function useCustomerAddresses() {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const canManageAddresses = user?.role === 'Administrador' || user?.role === 'Cajero';

  const getCustomerAddresses = async (customerId: string): Promise<Address[]> => {
    try {
      // Usar RPC para evitar problemas de RLS con el contexto de staff
      const { data: rpcResult, error } = await supabase.rpc('get_customer_addresses_with_context', {
        p_user_id: user?.id || null,
        p_customer_id: customerId
      });

      if (error) throw error;

      const result = rpcResult as unknown as { success: boolean; addresses?: Address[]; error?: string } | null;

      if (!result?.success) {
        throw new Error(result?.error || 'Error desconocido');
      }

      return result.addresses || [];
    } catch (error) {
      console.error('Error fetching addresses:', error);
      return [];
    }
  };

  const getDefaultAddress = async (customerId: string): Promise<Address | null> => {
    try {
      const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('customer_id', customerId)
        .eq('is_default', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned

      return data || null;
    } catch (error) {
      console.error('Error fetching default address:', error);
      return null;
    }
  };

  const createAddress = async (customerId: string, addressData: AddressFormData): Promise<Address | null> => {
    if (!canManageAddresses) {
      toast.error("Error", { description: "No tienes permisos para gestionar direcciones" });
      return null;
    }

    try {
      setLoading(true);

      // Si es la primera dirección, siempre será default
      const existingAddresses = await getCustomerAddresses(customerId);
      const isFirstAddress = existingAddresses.length === 0;
      const willBeDefault = isFirstAddress || addressData.is_default;

      // Si se marca como default, desmarcar las demás
      if (willBeDefault) {
        await supabase
          .from('addresses')
          .update({ is_default: false })
          .eq('customer_id', customerId);
      }

      const { data, error } = await supabase
        .from('addresses')
        .insert({
          customer_id: customerId,
          ...addressData,
          ciudad: addressData.ciudad || 'Santiago',
          is_default: willBeDefault
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Éxito", { description: "Dirección creada correctamente" });

      return data;
    } catch (error) {
      console.error('Error creating address:', error);
      toast.error("Error", { description: "Error al crear la dirección" });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateAddress = async (addressId: string, addressData: Partial<AddressFormData>): Promise<Address | null> => {
    if (!canManageAddresses) {
      toast.error("Error", { description: "No tienes permisos para gestionar direcciones" });
      return null;
    }

    try {
      setLoading(true);

      // Obtener la dirección actual para saber el customer_id
      const { data: currentAddress, error: fetchError } = await supabase
        .from('addresses')
        .select('customer_id, is_default')
        .eq('id', addressId)
        .single();

      if (fetchError) throw fetchError;

      // Si se marca como default, desmarcar las demás del mismo cliente
      if (addressData.is_default && !currentAddress.is_default) {
        await supabase
          .from('addresses')
          .update({ is_default: false })
          .eq('customer_id', currentAddress.customer_id);
      }

      // Si es la única dirección, no puede dejar de ser default
      if (addressData.is_default === false && currentAddress.is_default) {
        const addresses = await getCustomerAddresses(currentAddress.customer_id);
        if (addresses.length === 1) {
          toast.error("Error", { description: "Debe haber al menos una dirección principal por cliente" });
          return null;
        }
      }

      const { data, error } = await supabase
        .from('addresses')
        .update(addressData)
        .eq('id', addressId)
        .select()
        .single();

      if (error) throw error;

      // Si se desmarcó como default, asignar a otra dirección
      if (addressData.is_default === false && currentAddress.is_default) {
        const addresses = await getCustomerAddresses(currentAddress.customer_id);
        const firstNonDefault = addresses.find(addr => addr.id !== addressId);
        
        if (firstNonDefault) {
          await supabase
            .from('addresses')
            .update({ is_default: true })
            .eq('id', firstNonDefault.id);
        }
      }

      toast.success("Éxito", { description: "Dirección actualizada correctamente" });

      return data;
    } catch (error) {
      console.error('Error updating address:', error);
      toast.error("Error", { description: "Error al actualizar la dirección" });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteAddress = async (addressId: string): Promise<boolean> => {
    if (!canManageAddresses) {
      toast.error("Error", { description: "No tienes permisos para gestionar direcciones" });
      return false;
    }

    try {
      setLoading(true);

      // Obtener la dirección y verificar si es la única
      const { data: addressToDelete, error: fetchError } = await supabase
        .from('addresses')
        .select('customer_id, is_default')
        .eq('id', addressId)
        .single();

      if (fetchError) throw fetchError;

      const addresses = await getCustomerAddresses(addressToDelete.customer_id);
      
      if (addresses.length === 1) {
        toast.error("Error", { description: "No se puede eliminar la única dirección del cliente" });
        return false;
      }

      // Si es la dirección default, asignar default a otra
      if (addressToDelete.is_default) {
        const newDefault = addresses.find(addr => addr.id !== addressId);
        if (newDefault) {
          await supabase
            .from('addresses')
            .update({ is_default: true })
            .eq('id', newDefault.id);
        }
      }

      const { error } = await supabase
        .from('addresses')
        .delete()
        .eq('id', addressId);

      if (error) throw error;

      toast.success("Éxito", { description: "Dirección eliminada correctamente" });

      return true;
    } catch (error) {
      console.error('Error deleting address:', error);
      toast.error("Error", { description: "Error al eliminar la dirección" });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const setDefaultAddress = async (addressId: string): Promise<boolean> => {
    if (!canManageAddresses) {
      toast.error("Error", { description: "No tienes permisos para gestionar direcciones" });
      return false;
    }

    try {
      setLoading(true);

      // Obtener customer_id de la dirección
      const { data: address, error: fetchError } = await supabase
        .from('addresses')
        .select('customer_id')
        .eq('id', addressId)
        .single();

      if (fetchError) throw fetchError;

      // Desmarcar todas las direcciones del cliente
      await supabase
        .from('addresses')
        .update({ is_default: false })
        .eq('customer_id', address.customer_id);

      // Marcar la nueva como default
      const { error } = await supabase
        .from('addresses')
        .update({ is_default: true })
        .eq('id', addressId);

      if (error) throw error;

      toast.success("Éxito", { description: "Dirección principal actualizada" });

      return true;
    } catch (error) {
      console.error('Error setting default address:', error);
      toast.error("Error", { description: "Error al cambiar la dirección principal" });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    canManageAddresses,
    getCustomerAddresses,
    getDefaultAddress,
    createAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress
  };
}