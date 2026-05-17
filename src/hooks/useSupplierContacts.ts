import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { toast } from "sonner";
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
  created_at: string;
  updated_at: string;
}

export type CreateSupplierContactData = Omit<SupplierContact, 'id' | 'created_at' | 'updated_at'>;

export function useSupplierContacts(supplierId?: string) {
  const [contacts, setContacts] = useState<SupplierContact[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchContacts = useCallback(async () => {
    if (!supplierId) {
      setContacts([]);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('supplier_contacts')
        .select('*')
        .eq('supplier_id', supplierId)
        .eq('is_active', true)
        .order('is_primary', { ascending: false })
        .order('name');

      if (error) throw error;
      setContacts((data || []) as SupplierContact[]);
    } catch (error) {
      console.error('Error fetching supplier contacts:', error);
    } finally {
      setLoading(false);
    }
  }, [supplierId]);

  const createContact = async (data: CreateSupplierContactData) => {
    try {
      // Si es contacto principal, desmarcar otros
      if (data.is_primary) {
        await supabase
          .from('supplier_contacts')
          .update({ is_primary: false })
          .eq('supplier_id', data.supplier_id);
      }

      const { error } = await supabase
        .from('supplier_contacts')
        .insert([data]);

      if (error) throw error;

      toast.success('Contacto creado', { description: 'El contacto se ha registrado exitosamente' });

      await fetchContacts();
      return true;
    } catch (error) {
      console.error('Error creating contact:', error);
      toast.error('Error', { description: 'No se pudo crear el contacto' });
      return false;
    }
  };

  const updateContact = async (id: string, data: Partial<SupplierContact>) => {
    try {
      // Si se marca como principal, desmarcar otros
      if (data.is_primary && supplierId) {
        await supabase
          .from('supplier_contacts')
          .update({ is_primary: false })
          .eq('supplier_id', supplierId)
          .neq('id', id);
      }

      const { error } = await supabase
        .from('supplier_contacts')
        .update(data)
        .eq('id', id);

      if (error) throw error;

      toast.success('Contacto actualizado', { description: 'Los cambios se han guardado correctamente' });

      await fetchContacts();
      return true;
    } catch (error) {
      console.error('Error updating contact:', error);
      toast.error('Error', { description: 'No se pudo actualizar el contacto' });
      return false;
    }
  };

  const deleteContact = async (id: string) => {
    try {
      const { error } = await supabase
        .from('supplier_contacts')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      toast.success('Contacto eliminado', { description: 'El contacto se ha eliminado correctamente' });

      await fetchContacts();
      return true;
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast.error('Error', { description: 'No se pudo eliminar el contacto' });
      return false;
    }
  };

  const getPrimaryContact = () => contacts.find(c => c.is_primary);
  
  const getPORecipients = () => contacts.filter(c => c.receive_purchase_orders);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  return {
    contacts,
    loading,
    createContact,
    updateContact,
    deleteContact,
    getPrimaryContact,
    getPORecipients,
    refetch: fetchContacts,
  };
}
