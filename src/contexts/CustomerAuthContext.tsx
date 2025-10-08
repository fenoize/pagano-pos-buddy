import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type CustomerAccount = Database['public']['Tables']['customer_accounts']['Row'];
type Customer = Database['public']['Tables']['customers']['Row'];

interface AuthResponse {
  success: boolean;
  account_id?: string;
  error?: string;
}

interface CustomerAuthContextType {
  customerAccount: CustomerAccount | null;
  customer: Customer | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string, phone?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ error: Error | null }>;
  resetPassword: (code: string, newPassword: string, email: string) => Promise<{ error: Error | null }>;
  refreshCustomerData: () => Promise<void>;
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined);

export const CustomerAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customerAccount, setCustomerAccount] = useState<CustomerAccount | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  const loadCustomerData = async (accountId: string) => {
    try {
      // Cargar cuenta
      const { data: accountData, error: accountError } = await supabase
        .from('customer_accounts')
        .select('*')
        .eq('id', accountId)
        .single();

      if (accountError) throw accountError;
      setCustomerAccount(accountData);

      // Cargar datos del cliente por account_id
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('account_id', accountId)
        .single();

      if (customerError) throw customerError;
      setCustomer(customerData);
    } catch (error) {
      console.error('Error loading customer data:', error);
    }
  };

  useEffect(() => {
    // Verificar sesión existente en localStorage
    const checkSession = async () => {
      try {
        const sessionData = localStorage.getItem('customer_session');
        if (sessionData) {
          const { account_id, expires_at } = JSON.parse(sessionData);
          
          // Verificar si no ha expirado
          if (new Date(expires_at) > new Date()) {
            await loadCustomerData(account_id);
          } else {
            localStorage.removeItem('customer_session');
          }
        }
      } catch (error) {
        console.error('Error checking session:', error);
        localStorage.removeItem('customer_session');
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  const signUp = async (email: string, password: string, name: string, phone?: string) => {
    try {
      const { data, error } = await supabase.rpc('register_customer', {
        p_email: email,
        p_password: password,
        p_nombres: name,
        p_phone: phone || null,
      });

      if (error) throw error;

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.rpc('authenticate_customer', {
        p_email: email,
        p_password: password,
      });

      if (error) throw error;
      if (!data) throw new Error('Credenciales inválidas');

      // Extraer account_id del objeto JSON devuelto
      const authData = data as unknown as AuthResponse;
      
      if (!authData.success || !authData.account_id) {
        const errorMessage = authData.error === 'INVALID_CREDENTIALS' 
          ? 'Email o contraseña incorrectos'
          : authData.error === 'ACCOUNT_INACTIVE'
          ? 'Esta cuenta está inactiva'
          : 'Error al iniciar sesión';
        throw new Error(errorMessage);
      }

      const accountId = authData.account_id;

      // Guardar sesión en localStorage
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 horas

      localStorage.setItem('customer_session', JSON.stringify({
        account_id: accountId,
        expires_at: expiresAt.toISOString(),
      }));

      // Cargar datos del cliente
      await loadCustomerData(accountId);

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    localStorage.removeItem('customer_session');
    setCustomerAccount(null);
    setCustomer(null);
  };

  const requestPasswordReset = async (email: string) => {
    try {
      const { error } = await supabase.rpc('request_customer_password_reset', {
        p_email: email,
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const resetPassword = async (code: string, newPassword: string, email: string) => {
    try {
      const { error } = await supabase.rpc('reset_customer_password', {
        p_code: code,
        p_email: email,
        p_new_password: newPassword,
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const refreshCustomerData = async () => {
    if (customerAccount?.id) {
      await loadCustomerData(customerAccount.id);
    }
  };

  const value = {
    customerAccount,
    customer,
    loading,
    signUp,
    signIn,
    signOut,
    requestPasswordReset,
    resetPassword,
    refreshCustomerData,
  };

  return (
    <CustomerAuthContext.Provider value={value}>
      {children}
    </CustomerAuthContext.Provider>
  );
};

export const useCustomerAuth = () => {
  const context = useContext(CustomerAuthContext);
  if (context === undefined) {
    throw new Error('useCustomerAuth must be used within CustomerAuthProvider');
  }
  return context;
};
