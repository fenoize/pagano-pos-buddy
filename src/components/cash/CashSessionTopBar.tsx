import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Lock, Unlock, Plus, Minus, DollarSign, Smartphone } from 'lucide-react';
import { useCashSession } from '@/hooks/useCashSession';
import { CashSessionModal } from './CashSessionModal';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { setStaffContext } from '@/lib/dbContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function CashSessionTopBar() {
  const { 
    currentSession, 
    hasActiveSession, 
    checkActiveSession, 
    getSessionSummary,
    updateCurrentSessionLocally 
  } = useCashSession();
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'open' | 'close' | 'movement'>('open');
  const [sessionSummary, setSessionSummary] = useState<any>(null);
  const [acceptAppOrders, setAcceptAppOrders] = useState(false);
  const { user } = useAuthContext();
  const { toast } = useToast();

  // Sync accept_app_orders with current session
  React.useEffect(() => {
    if (currentSession) {
      setAcceptAppOrders(currentSession.accept_app_orders || false);
    }
  }, [currentSession]);

  // Only show for Cajero and Administrador roles
  if (!user || !['Cajero', 'Administrador'].includes(user.role)) {
    return null;
  }

  const handleOpenSession = () => {
    setModalType('open');
    setShowModal(true);
  };

  const handleCloseSession = async () => {
    if (!currentSession) return;
    
    try {
      const summary = await getSessionSummary();
      setSessionSummary(summary);
      setModalType('close');
      setShowModal(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo cargar el resumen del turno.",
        variant: "destructive"
      });
    }
  };

  const handleMovement = () => {
    setModalType('movement');
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setSessionSummary(null);
    checkActiveSession();
  };

  const handleToggleAppOrders = async (checked: boolean) => {
    if (!currentSession || !user) return;

    try {
      // Establecer contexto de staff antes de actualizar
      await setStaffContext(user.id);

      const { error } = await supabase
        .from('cash_sessions')
        .update({ accept_app_orders: checked })
        .eq('id', currentSession.id);

      if (error) throw error;

      // Actualizar ambos estados locales inmediatamente
      // para evitar loop de sincronización
      setAcceptAppOrders(checked);
      updateCurrentSessionLocally({ accept_app_orders: checked });
      
      toast({
        title: checked ? "✅ Recibiendo pedidos desde app" : "⏸️ App pausada",
        description: checked 
          ? "Los clientes pueden hacer pedidos desde la app"
          : "Los pedidos desde la app están pausados temporalmente"
      });
    } catch (error: any) {
      console.error('Error toggling app orders:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de pedidos desde app",
        variant: "destructive"
      });
    }
  };

  if (!hasActiveSession()) {
    return (
      <>
        <Button onClick={handleOpenSession} variant="outline" size="sm" className="gap-2">
          <Lock className="h-4 w-4" />
          <span className="hidden md:inline">Abrir Turno</span>
        </Button>

        <CashSessionModal
          isOpen={showModal}
          onClose={handleModalClose}
          type={modalType}
        />
      </>
    );
  }

  return (
    <>
      <div className="flex items-center gap-3">
        {/* Switch de pedidos desde app */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-md">
          <Smartphone className={`h-4 w-4 ${acceptAppOrders ? 'text-green-600' : 'text-muted-foreground'}`} />
          <span className="text-xs text-muted-foreground hidden md:inline">
            {acceptAppOrders ? 'App activa' : 'App pausada'}
          </span>
          <Switch
            checked={acceptAppOrders}
            onCheckedChange={handleToggleAppOrders}
            disabled={!currentSession}
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Unlock className="h-4 w-4 text-green-600" />
              <Badge variant="outline" className="hidden md:flex text-xs">
                Turno Abierto
              </Badge>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Gestión de Turno</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-sm">
              <div className="flex items-center gap-1 text-muted-foreground">
                <DollarSign className="h-3 w-3" />
                <span className="text-xs">
                  Efectivo inicial: {formatCurrency(currentSession?.opening_cash || 0)}
                </span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Inicio: {new Date(currentSession?.opened_at || '').toLocaleTimeString('es-CL', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleMovement}>
              <Plus className="h-4 w-4 mr-2" />
              <Minus className="h-4 w-4 mr-2" />
              Registrar Movimiento
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleCloseSession} className="text-destructive focus:text-destructive">
              <Lock className="h-4 w-4 mr-2" />
              Cerrar Turno
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CashSessionModal
        isOpen={showModal}
        onClose={handleModalClose}
        type={modalType}
        sessionSummary={sessionSummary}
      />
    </>
  );
}
