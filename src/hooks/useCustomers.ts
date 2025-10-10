import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Customer, EstadoCliente } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from './usePermissions';
import { STORAGE_KEYS, clearStaffStorage } from '@/lib/storageKeys';

export interface CustomerFilters {
  search?: string;
  estado?: EstadoCliente;
  comuna?: string;
  hasRunas?: boolean;
}

export interface CustomerFormData {
  nombres?: string;
  apellidos?: string;
  phone?: string;
  rut?: string;
  email?: string;
  fecha_nacimiento?: string;
  estado_cliente?: EstadoCliente;
  motivo_estado?: string;
}

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const { toast } = useToast();
  const { user } = useAuth();

  // Usar hook de permisos centralizado
  const { canManageCustomers, canViewCustomers, canExportCustomers } = usePermissions();

  const fetchCustomers = async (
    filters: CustomerFilters = {},
    page = 0,
    limit = 50
  ) => {
    if (!canViewCustomers) {
      setCustomers([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // 1. Obtener token de sesión
      const token = localStorage.getItem(STORAGE_KEYS.STAFF_TOKEN);
      if (!token) {
        throw new Error('No hay sesión activa');
      }

      // 2. Construir query params
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: (page * limit).toString(),
      });

      if (filters.search) {
        params.append('q', filters.search);
      }
      if (filters.estado) {
        params.append('estado', filters.estado);
      }
      if (filters.hasRunas !== undefined) {
        params.append('hasRunas', filters.hasRunas.toString());
      }

      // 3. Llamar Edge Function
      const response = await fetch(
        `https://lxxfhayifyiioglfbsyj.supabase.co/functions/v1/staff-list-customers?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          // Token inválido/expirado - forzar logout
          clearStaffStorage();
          window.location.href = '/pos/login';
          return;
        }
        throw new Error(`Error ${response.status}: ${await response.text()}`);
      }

      const result = await response.json();

      // 4. Los clientes ya vienen con cantidad_runas desde el backend
      setCustomers(result.data || []);
      setTotalCount(result.count || 0);
      
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudieron cargar los clientes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };


  const getCustomerById = async (id: string): Promise<Customer | null> => {
    if (!canViewCustomers) return null;

    try {
      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          addresses (
            id,
            customer_id,
            alias,
            calle,
            numero,
            depto,
            comuna,
            ciudad,
            observaciones,
            is_default,
            created_at,
            updated_at
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      return data || null;
    } catch (error) {
      console.error('Error fetching customer by id:', error);
      return null;
    }
  };

  const createCustomer = async (customerData: CustomerFormData): Promise<Customer | null> => {
    if (!canManageCustomers) {
      toast({
        title: "Error",
        description: "No tienes permisos para crear clientes",
        variant: "destructive"
      });
      return null;
    }

    try {
      // Validaciones
      if (customerData.email) {
        const { data: existingEmail } = await supabase
          .from('customers')
          .select('id')
          .eq('email', customerData.email)
          .single();

        if (existingEmail) {
          toast({
            title: "Error",
            description: "Ya existe un cliente con ese email",
            variant: "destructive"
          });
          return null;
        }
      }

      if (customerData.rut) {
        const { data: existingRut } = await supabase
          .from('customers')
          .select('id')
          .eq('rut', customerData.rut)
          .single();

        if (existingRut) {
          toast({
            title: "Error", 
            description: "Ya existe un cliente con ese RUT",
            variant: "destructive"
          });
          return null;
        }
      }

      const { data, error } = await supabase
        .from('customers')
        .insert({
          ...customerData,
          fecha_nacimiento: customerData.fecha_nacimiento || null,
          estado_cliente: customerData.estado_cliente || 'Activo',
          created_by_user_id: user?.id,
          updated_by_user_id: user?.id
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Cliente creado correctamente",
      });

      return data;
    } catch (error) {
      console.error('Error creating customer:', error);
      toast({
        title: "Error",
        description: "Error al crear el cliente",
        variant: "destructive"
      });
      return null;
    }
  };

  const updateCustomer = async (id: string, customerData: Partial<CustomerFormData>): Promise<Customer | null> => {
    if (!canManageCustomers) {
      toast({
        title: "Error",
        description: "No tienes permisos para editar clientes",
        variant: "destructive"
      });
      return null;
    }

    try {
      // Validaciones
      if (customerData.email) {
        const { data: existingEmail } = await supabase
          .from('customers')
          .select('id')
          .eq('email', customerData.email)
          .neq('id', id)
          .single();

        if (existingEmail) {
          toast({
            title: "Error",
            description: "Ya existe otro cliente con ese email",
            variant: "destructive"
          });
          return null;
        }
      }

      if (customerData.rut) {
        const { data: existingRut } = await supabase
          .from('customers')
          .select('id')
          .eq('rut', customerData.rut)
          .neq('id', id)
          .single();

        if (existingRut) {
          toast({
            title: "Error",
            description: "Ya existe otro cliente con ese RUT",
            variant: "destructive"
          });
          return null;
        }
      }

      const { data, error } = await supabase
        .from('customers')
        .update({
          ...customerData,
          fecha_nacimiento: customerData.fecha_nacimiento === '' ? null : customerData.fecha_nacimiento,
          updated_by_user_id: user?.id
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Cliente actualizado correctamente",
      });

      return data;
    } catch (error) {
      console.error('Error updating customer:', error);
      toast({
        title: "Error",
        description: "Error al actualizar el cliente",
        variant: "destructive"
      });
      return null;
    }
  };

  const deleteCustomer = async (id: string): Promise<boolean> => {
    if (user?.role !== 'Administrador') {
      toast({
        title: "Error",
        description: "Solo los administradores pueden eliminar clientes",
        variant: "destructive"
      });
      return false;
    }

    try {
      // En lugar de eliminar físicamente, cambiamos el estado a "Inactivo"
      const { error } = await supabase
        .from('customers')
        .update({ 
          estado_cliente: 'Inactivo' as EstadoCliente,
          motivo_estado: 'Cliente eliminado por administrador',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Cliente marcado como inactivo correctamente",
      });

      return true;
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast({
        title: "Error",
        description: "Error al desactivar el cliente",
        variant: "destructive"
      });
      return false;
    }
  };

  const deleteCustomerPermanently = async (id: string): Promise<boolean> => {
    if (user?.role !== 'Administrador') {
      toast({
        title: "Error",
        description: "Solo los administradores pueden eliminar clientes definitivamente",
        variant: "destructive"
      });
      return false;
    }

    try {
      // Proceder con la eliminación definitiva del cliente
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Cliente eliminado definitivamente. Los datos históricos en órdenes se preservan.",
      });

      return true;
    } catch (error) {
      console.error('Error permanently deleting customer:', error);
      toast({
        title: "Error",
        description: "Error al eliminar definitivamente el cliente",
        variant: "destructive"
      });
      return false;
    }
  };

  const searchCustomers = async (searchTerm: string): Promise<Customer[]> => {
    if (!canViewCustomers || searchTerm.length < 3) return [];

    try {
      const searchPattern = `%${searchTerm}%`;
      const { data, error } = await supabase
        .from('customers')
        .select(`
          id,
          nombres,
          apellidos,
          name,
          apellido,
          phone,
          rut,
          email,
          cantidad_runas,
          valor_cliente,
          estado_cliente,
          created_at,
          updated_at
        `)
        .or(`nombres.ilike.${searchPattern},apellidos.ilike.${searchPattern},name.ilike.${searchPattern},apellido.ilike.${searchPattern},email.ilike.${searchPattern},phone.ilike.${searchPattern},rut.ilike.${searchPattern}`)
        .eq('estado_cliente', 'Activo')
        .limit(10);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error searching customers:', error);
      return [];
    }
  };

  // Auto-fetch al cargar
  useEffect(() => {
    fetchCustomers();
  }, [canViewCustomers]);

  const exportCustomersCSV = async () => {
    if (!canViewCustomers) {
      toast({
        title: "Error",
        description: "No tienes permisos para exportar clientes",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('customers')
        .select(`
          nombres,
          apellidos,
          email,
          phone,
          rut,
          fecha_nacimiento,
          estado_cliente,
          valor_cliente,
          cantidad_runas,
          ultima_compra,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Crear CSV content
      const headers = ['Nombres', 'Apellidos', 'Email', 'Teléfono', 'RUT', 'Fecha Nacimiento', 'Estado', 'Valor Cliente', 'Runas', 'Última Compra', 'Fecha Registro'];
      const csvContent = [
        headers.join(','),
        ...data.map(customer => [
          customer.nombres || '',
          customer.apellidos || '',
          customer.email || '',
          customer.phone || '',
          customer.rut || '',
          customer.fecha_nacimiento || '',
          customer.estado_cliente || '',
          customer.valor_cliente || '0',
          customer.cantidad_runas || '0',
          customer.ultima_compra ? new Date(customer.ultima_compra).toLocaleDateString() : '',
          customer.created_at ? new Date(customer.created_at).toLocaleDateString() : ''
        ].join(','))
      ].join('\n');

      // Descargar archivo
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `clientes_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      toast({
        title: "Éxito",
        description: "Clientes exportados correctamente",
      });
    } catch (error) {
      console.error('Error exporting customers:', error);
      toast({
        title: "Error",
        description: "Error al exportar clientes",
        variant: "destructive"
      });
    }
  };

  return {
    customers,
    loading,
    totalCount,
    canManageCustomers,
    canViewCustomers,
    fetchCustomers,
    getCustomerById,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    deleteCustomerPermanently,
    searchCustomers,
    calculateRunasSaldo,
    exportCustomersCSV
  };
}