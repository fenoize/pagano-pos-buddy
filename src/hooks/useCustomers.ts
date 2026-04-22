import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Customer, EstadoCliente } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from './usePermissions';
import { STORAGE_KEYS, clearStaffStorage } from '@/lib/storageKeys';
import { withStaffContext } from '@/lib/dbContext';

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
  const fetchRequestIdRef = useRef(0);

  // Actualiza solo un cliente específico en la lista (útil para refrescar runas sin recargar todo)
  const updateCustomerInList = (customerId: string, updates: Partial<Customer>) => {
    setCustomers(prev => prev.map(c => 
      c.id === customerId ? { ...c, ...updates } : c
    ));
  };
  const { toast } = useToast();
  const { user } = useAuth();

  // Usar hook de permisos centralizado
  const { canManageCustomers, canViewCustomers, canExportCustomers } = usePermissions();

  const fetchCustomers = async (
    filters: CustomerFilters = {},
    page = 0,
    limit = 50
  ) => {
    const requestId = ++fetchRequestIdRef.current;

    if (!canViewCustomers) {
      if (requestId === fetchRequestIdRef.current) {
        setCustomers([]);
        setTotalCount(0);
        setLoading(false);
      }
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
      if (requestId === fetchRequestIdRef.current) {
        setCustomers(result.data || []);
        setTotalCount(result.count || 0);
      }
      
    } catch (error) {
      if (requestId !== fetchRequestIdRef.current) return;

      console.error('Error fetching customers:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudieron cargar los clientes",
        variant: "destructive"
      });
    } finally {
      if (requestId === fetchRequestIdRef.current) {
        setLoading(false);
      }
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

    if (!user?.id) {
      toast({
        title: "Error",
        description: "No hay sesión de usuario activa",
        variant: "destructive"
      });
      return null;
    }

    // Normalizar strings vacíos para evitar violaciones de UNIQUE (p.ej. rut = '')
    const normalized: CustomerFormData = {
      ...customerData,
      nombres: customerData.nombres?.trim() || undefined,
      apellidos: customerData.apellidos?.trim() || undefined,
      phone: customerData.phone?.trim() ? customerData.phone.trim() : undefined,
      email: customerData.email?.trim() ? customerData.email.trim() : undefined,
      rut: customerData.rut?.trim() ? customerData.rut.trim().toUpperCase() : undefined,
      fecha_nacimiento: customerData.fecha_nacimiento?.trim() ? customerData.fecha_nacimiento.trim() : undefined,
      estado_cliente: customerData.estado_cliente || 'Activo',
      motivo_estado: customerData.motivo_estado?.trim() ? customerData.motivo_estado.trim() : undefined,
    };

    try {
      // Usar withStaffContext para establecer el contexto de sesión
      const data = await withStaffContext(user.id, async () => {
        // Validaciones
        if (normalized.email) {
          const { data: existingEmail, error } = await supabase
            .from('customers')
            .select('id')
            .eq('email', normalized.email)
            .maybeSingle();

          if (error) throw error;
          if (existingEmail) throw new Error('Ya existe un cliente con ese email');
        }

        if (normalized.rut) {
          const { data: existingRut, error } = await supabase
            .from('customers')
            .select('id')
            .eq('rut', normalized.rut)
            .maybeSingle();

          if (error) throw error;
          if (existingRut) throw new Error('Ya existe un cliente con ese RUT');
        }

        const { data, error } = await supabase
          .from('customers')
          .insert({
            ...normalized,
            // convertir undefined/'' a null para columnas con UNIQUE
            email: normalized.email ?? null,
            phone: normalized.phone ?? null,
            rut: normalized.rut ?? null,
            fecha_nacimiento: normalized.fecha_nacimiento ?? null,
            estado_cliente: normalized.estado_cliente || 'Activo',
            motivo_estado: normalized.motivo_estado ?? null,
            created_by_user_id: user.id,
            updated_by_user_id: user.id
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      });

      toast({
        title: "Éxito",
        description: "Cliente creado correctamente",
      });

      return data;
    } catch (error) {
      console.error('Error creating customer:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al crear el cliente",
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

    if (!user?.id) {
      toast({
        title: "Error",
        description: "No hay sesión de usuario activa",
        variant: "destructive"
      });
      return null;
    }

    // Normalizar strings vacíos para evitar violaciones de UNIQUE (p.ej. rut = '')
    const normalized: Partial<CustomerFormData> = {
      ...customerData,
      nombres: customerData.nombres?.trim() || undefined,
      apellidos: customerData.apellidos?.trim() || undefined,
      phone: customerData.phone?.trim() ? customerData.phone.trim() : undefined,
      email: customerData.email?.trim() ? customerData.email.trim() : undefined,
      rut: customerData.rut?.trim() ? customerData.rut.trim().toUpperCase() : undefined,
      fecha_nacimiento: customerData.fecha_nacimiento?.trim() ? customerData.fecha_nacimiento.trim() : undefined,
      motivo_estado: customerData.motivo_estado?.trim() ? customerData.motivo_estado.trim() : undefined,
    };

    try {
      // Usar withStaffContext para establecer el contexto de sesión
      const data = await withStaffContext(user.id, async () => {
        // Validaciones
        if (normalized.email) {
          const { data: existingEmail, error } = await supabase
            .from('customers')
            .select('id')
            .eq('email', normalized.email)
            .neq('id', id)
            .maybeSingle();

          if (error) throw error;
          if (existingEmail) throw new Error('Ya existe otro cliente con ese email');
        }

        if (normalized.rut) {
          const { data: existingRut, error } = await supabase
            .from('customers')
            .select('id')
            .eq('rut', normalized.rut)
            .neq('id', id)
            .maybeSingle();

          if (error) throw error;
          if (existingRut) throw new Error('Ya existe otro cliente con ese RUT');
        }

        const { data, error } = await supabase
          .from('customers')
          .update({
            ...normalized,
            // convertir undefined/'' a null para columnas con UNIQUE
            email: normalized.email ?? null,
            phone: normalized.phone ?? null,
            rut: normalized.rut ?? null,
            fecha_nacimiento: normalized.fecha_nacimiento === '' ? null : (normalized.fecha_nacimiento ?? null),
            motivo_estado: normalized.motivo_estado ?? null,
            updated_by_user_id: user.id
          })
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return data;
      });

      toast({
        title: "Éxito",
        description: "Cliente actualizado correctamente",
      });

      return data;
    } catch (error) {
      console.error('Error updating customer:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al actualizar el cliente",
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

    if (!user?.id) {
      toast({
        title: "Error",
        description: "No hay sesión de usuario activa",
        variant: "destructive"
      });
      return false;
    }

    try {
      await withStaffContext(user.id, async () => {
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
      });

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

    if (!user?.id) {
      toast({
        title: "Error",
        description: "No hay sesión de usuario activa",
        variant: "destructive"
      });
      return false;
    }

    try {
      await withStaffContext(user.id, async () => {
        // Proceder con la eliminación definitiva del cliente
        const { error } = await supabase
          .from('customers')
          .delete()
          .eq('id', id);

        if (error) throw error;
      });

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

  const updateCustomerPassword = async (customerId: string, newPassword: string): Promise<boolean> => {
    if (user?.role !== 'Administrador') {
      toast({
        title: "Error",
        description: "Solo los administradores pueden cambiar contraseñas",
        variant: "destructive"
      });
      return false;
    }

    try {
      // Obtener el customer para verificar que tiene auth_user_id
      const { data: customer, error: fetchError } = await supabase
        .from('customers')
        .select('auth_user_id')
        .eq('id', customerId)
        .single();

      if (fetchError) throw fetchError;

      if (!customer?.auth_user_id) {
        toast({
          title: "Error",
          description: "Este cliente no tiene una cuenta de autenticación vinculada",
          variant: "destructive"
        });
        return false;
      }

      // Llamar al RPC para cambiar la contraseña
      const { error } = await supabase.rpc('set_user_password', {
        user_uuid: customer.auth_user_id,
        new_password: newPassword
      });

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Contraseña actualizada correctamente",
      });

      return true;
    } catch (error) {
      console.error('Error updating customer password:', error);
      toast({
        title: "Error",
        description: "Error al actualizar la contraseña",
        variant: "destructive"
      });
      return false;
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
    updateCustomerInList,
    deleteCustomer,
    deleteCustomerPermanently,
    searchCustomers,
    exportCustomersCSV,
    updateCustomerPassword
  };
}