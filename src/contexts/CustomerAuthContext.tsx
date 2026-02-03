import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import type { User, Session } from '@supabase/supabase-js';
import { STORAGE_KEYS, clearCustomerStorage } from '@/lib/storageKeys';
import { setCustomerContext, clearDBContext } from '@/lib/dbContext';
import { logoutOneSignal } from '@/lib/onesignal';

type Customer = Database['public']['Tables']['customers']['Row'];

interface CustomerAuthContextType {
  user: User | null;
  session: Session | null;
  customer: Customer | null;
  loading: boolean;
  needsProfileCompletion: boolean;
  signUp: (email: string, password: string, nombre: string, apellido: string, phone?: string, birthDate?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ error: Error | null }>;
  resetPassword: (newPassword: string) => Promise<{ error: Error | null }>;
  refreshCustomerData: () => Promise<void>;
  completeProfile: (data: { nombres: string; apellidos: string; phone: string; fecha_nacimiento: string }) => Promise<{ error: Error | null }>;
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined);

export const CustomerAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsProfileCompletion, setNeedsProfileCompletion] = useState(false);

  const loadCustomerData = async (userId: string) => {
    try {
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('auth_user_id', userId)
        .maybeSingle();

      if (customerError) throw customerError;
      
      setCustomer(customerData);
      
      // Verificar si necesita completar perfil (Google sign-in sin phone o fecha)
      if (customerData) {
        const missingData = !customerData.phone || !customerData.fecha_nacimiento;
        setNeedsProfileCompletion(missingData);
      }
      
      // CRITICAL: Establecer contexto DB si tenemos datos del customer
      if (customerData && customerData.account_id) {
        try {
          await setCustomerContext(customerData.account_id, customerData.id);
        } catch (contextError) {
          console.error('Failed to set customer DB context:', contextError);
        }
      }
      
      // OneSignal initialization is handled by useCustomerOneSignal hook
      // to keep it decoupled from auth context
    } catch (error) {
      console.error('Error loading customer data:', error);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Store session in localStorage with customer-specific key
        if (session) {
          localStorage.setItem(STORAGE_KEYS.CUSTOMER_SESSION, JSON.stringify(session));
          // Defer customer data loading with setTimeout to avoid deadlock
          setTimeout(() => {
            if (session.user) {
              loadCustomerData(session.user.id);
            }
          }, 0);
        } else {
          clearCustomerStorage();
          setCustomer(null);
          setNeedsProfileCompletion(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session) {
        localStorage.setItem(STORAGE_KEYS.CUSTOMER_SESSION, JSON.stringify(session));
        loadCustomerData(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, nombre: string, apellido: string, phone?: string, birthDate?: string) => {
    try {
      const fullName = [nombre, apellido].filter(Boolean).join(' ');
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: fullName,
            nombre,
            apellido,
            phone,
            birthDate,
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) throw error;

      // Fallback: verificar si se creó el customer, si no, crearlo manualmente
      if (data.user) {
        try {
          // Esperar un momento para que el trigger se ejecute
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Verificar si existe el customer
          const { data: existingCustomer, error: checkError } = await supabase
            .from('customers')
            .select('id')
            .eq('auth_user_id', data.user.id)
            .maybeSingle();

          // Si no existe y no hubo error de permisos, intentar crearlo manualmente
          if (!existingCustomer && !checkError) {
            console.log('Trigger did not create customer, creating manually...');
            const { error: insertError } = await supabase
              .from('customers')
              .insert({
                auth_user_id: data.user.id,
                email: email,
                name: nombre,
                nombres: nombre,
                apellido: apellido,
                apellidos: apellido,
                phone: phone,
                fecha_nacimiento: birthDate || null,
                estado_cliente: 'Activo',
              });

            if (insertError) {
              console.error('Failed to create customer manually:', insertError);
              // No lanzar error, el trigger podría haberlo creado después
            }
          }
        } catch (fallbackError) {
          console.error('Error in customer creation fallback:', fallbackError);
          // No lanzar error, esto no debe bloquear el registro
        }
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/login`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    // Limpiar contexto DB antes del signout
    await clearDBContext();

    // Limpiar OneSignal external user id
    try {
      await logoutOneSignal();
    } catch (err) {
      console.error('[OneSignal] Error removing external user:', err);
    }
    
    await supabase.auth.signOut();
    clearCustomerStorage();
    setSession(null);
    setUser(null);
    setCustomer(null);
    setNeedsProfileCompletion(false);
  };

  const requestPasswordReset = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/customer/reset-password`,
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const resetPassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const refreshCustomerData = async () => {
    if (user?.id) {
      await loadCustomerData(user.id);
    }
  };

  const completeProfile = async (data: { nombres: string; apellidos: string; phone: string; fecha_nacimiento: string }) => {
    try {
      if (!customer?.id) {
        throw new Error('No hay cliente asociado');
      }

      const { error } = await supabase
        .from('customers')
        .update({
          nombres: data.nombres,
          apellidos: data.apellidos,
          name: data.nombres, // mantener legacy sincronizado
          apellido: data.apellidos, // mantener legacy sincronizado
          phone: data.phone,
          fecha_nacimiento: data.fecha_nacimiento,
        })
        .eq('id', customer.id);

      if (error) throw error;

      // Refrescar datos del cliente
      await refreshCustomerData();
      setNeedsProfileCompletion(false);

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const value = {
    user,
    session,
    customer,
    loading,
    needsProfileCompletion,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    requestPasswordReset,
    resetPassword,
    refreshCustomerData,
    completeProfile,
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
