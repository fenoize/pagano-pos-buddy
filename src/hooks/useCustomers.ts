import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Customer, EstadoCliente } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

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

  // Verificar permisos
  const canManageCustomers = user?.role === 'Administrador' || user?.role === 'Cajero';
  const canViewCustomers = canManageCustomers || user?.role === 'Repartidor';

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
      
      let query = supabase
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
        `, { count: 'exact' });

      // Aplicar filtros
      if (filters.search) {
        const searchTerm = `%${filters.search}%`;
        query = query.or(`nombres.ilike.${searchTerm},apellidos.ilike.${searchTerm},name.ilike.${searchTerm},apellido.ilike.${searchTerm},email.ilike.${searchTerm},phone.ilike.${searchTerm},rut.ilike.${searchTerm}`);
      }

      if (filters.estado) {
        query = query.eq('estado_cliente', filters.estado);
      }

      if (filters.comuna) {
        query = query.eq('addresses.comuna', filters.comuna);
      }

      if (filters.hasRunas) {
        query = query.gt('cantidad_runas', 0);
      }

      // Paginación
      query = query
        .order('created_at', { ascending: false })
        .range(page * limit, (page + 1) * limit - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      // Calcular saldo real de runas para cada cliente
      const customersWithRunas = await Promise.all(
        (data || []).map(async (customer) => {
          const runasSaldo = await calculateRunasSaldo(customer.id);
          return {
            ...customer,
            cantidad_runas: runasSaldo
          };
        })
      );

      setCustomers(customersWithRunas);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los clientes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateRunasSaldo = async (customerId: string): Promise<number> => {
    try {
      const { data, error } = await supabase
        .from('runas_transactions')
        .select('runas')
        .eq('customer_id', customerId);

      if (error) throw error;

      return data?.reduce((total, transaction) => total + transaction.runas, 0) || 0;
    } catch (error) {
      console.error('Error calculating runas saldo:', error);
      return 0;
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

      if (data) {
        const runasSaldo = await calculateRunasSaldo(data.id);
        return {
          ...data,
          cantidad_runas: runasSaldo
        };
      }

      return null;
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
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Cliente eliminado correctamente",
      });

      return true;
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast({
        title: "Error",
        description: "Error al eliminar el cliente",
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
    searchCustomers,
    calculateRunasSaldo
  };
}