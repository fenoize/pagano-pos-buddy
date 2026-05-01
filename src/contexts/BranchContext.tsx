import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

export interface Branch {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  is_active: boolean;
  is_default: boolean;
  accepts_online_orders: boolean;
  timezone: string;
  opening_hours: Record<string, { open: string; close: string; closed: boolean }>;
  cash_account_id: string | null;
  notes: string | null;
}

interface BranchContextType {
  branches: Branch[];
  activeBranch: Branch | null;
  loading: boolean;
  setActiveBranchId: (id: string) => void;
  refreshBranches: () => Promise<void>;
  needsBranchSelection: boolean;
}

const STORAGE_KEY = 'paganos_active_branch_id';
const BranchContext = createContext<BranchContextType | undefined>(undefined);

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthContext();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeBranchId, setActiveBranchIdState] = useState<string | null>(
    () => (typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null)
  );
  const [loading, setLoading] = useState(true);

  const refreshBranches = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .order('is_default', { ascending: false })
        .order('name');
      if (error) throw error;
      setBranches((data || []) as unknown as Branch[]);
    } catch (e) {
      console.error('[BranchContext] refresh error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.id) {
      refreshBranches();
    } else {
      setBranches([]);
      setLoading(false);
    }
  }, [user?.id, refreshBranches]);

  // Validar/auto-seleccionar local activo
  useEffect(() => {
    if (loading || branches.length === 0) return;
    const activeBranches = branches.filter((b) => b.is_active);

    // Si el id guardado ya no es válido, limpiarlo
    if (activeBranchId && !activeBranches.find((b) => b.id === activeBranchId)) {
      setActiveBranchIdState(null);
      localStorage.removeItem(STORAGE_KEY);
    }

    // Si hay solo un local activo, seleccionarlo automáticamente
    if (!activeBranchId && activeBranches.length === 1) {
      setActiveBranchIdState(activeBranches[0].id);
      localStorage.setItem(STORAGE_KEY, activeBranches[0].id);
    }
  }, [branches, activeBranchId, loading]);

  const setActiveBranchId = useCallback((id: string) => {
    setActiveBranchIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

  const activeBranch = branches.find((b) => b.id === activeBranchId) || null;
  const activeBranches = branches.filter((b) => b.is_active);
  const needsBranchSelection =
    !!user?.id && !loading && activeBranches.length > 1 && !activeBranch;

  return (
    <BranchContext.Provider
      value={{
        branches,
        activeBranch,
        loading,
        setActiveBranchId,
        refreshBranches,
        needsBranchSelection,
      }}
    >
      {children}
    </BranchContext.Provider>
  );
}

export function useBranchContext(): BranchContextType {
  const ctx = useContext(BranchContext);
  if (!ctx) throw new Error('useBranchContext must be used within BranchProvider');
  return ctx;
}
