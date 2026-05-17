import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, DollarSign, Plus, Minus, Lock, Unlock } from 'lucide-react';
import { useCashSession } from '@/hooks/useCashSession';
import { CashSessionModal } from './CashSessionModal';
import { formatCurrency } from '@/lib/utils';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from "sonner";

export function CashSessionStatus() {
  const { currentSession, hasActiveSession, checkActiveSession, getSessionSummary } = useCashSession();
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'open' | 'close' | 'movement'>('open');
  const [sessionSummary, setSessionSummary] = useState<any>(null);
  const { user } = useAuthContext();
  // Only show for Cajero/Caja and Administrador roles
  if (!user || !['Cajero', 'Caja', 'Administrador'].includes(user.role)) {
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
      toast.error("Error", { description: "No se pudo cargar el resumen del turno." });
    }
  };

  const handleMovement = () => {
    setModalType('movement');
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setSessionSummary(null);
    checkActiveSession(); // Refresh session state
  };

  if (!hasActiveSession()) {
    return (
      <Card className="mb-4 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-orange-600" />
              <div>
                <p className="font-medium text-orange-800 dark:text-orange-200">
                  Turno Cerrado
                </p>
                <p className="text-sm text-orange-600 dark:text-orange-400">
                  Debes abrir un turno para realizar ventas
                </p>
              </div>
            </div>
            <Button onClick={handleOpenSession} size="sm">
              <Unlock className="w-4 h-4 mr-2" />
              Abrir Turno
            </Button>
          </div>
        </CardContent>

        <CashSessionModal
          isOpen={showModal}
          onClose={handleModalClose}
          type={modalType}
        />
      </Card>
    );
  }

  return (
    <Card className="mb-4 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Unlock className="h-5 w-5 text-green-600" />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="font-medium text-green-800 dark:text-green-200">
                  Turno Abierto
                </p>
                <Badge variant="outline" className="text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  {new Date(currentSession?.opened_at || '').toLocaleTimeString('es-CL', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Badge>
              </div>
              <div className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                <DollarSign className="w-3 h-3" />
                Efectivo inicial: {formatCurrency(currentSession?.opening_cash || 0)}
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={handleMovement} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-1" />
              <Minus className="w-4 h-4 mr-2" />
              Movimiento
            </Button>
            <Button onClick={handleCloseSession} size="sm" variant="destructive">
              <Lock className="w-4 h-4 mr-2" />
              Cerrar Turno
            </Button>
          </div>
        </div>
      </CardContent>

      <CashSessionModal
        isOpen={showModal}
        onClose={handleModalClose}
        type={modalType}
        sessionSummary={sessionSummary}
      />
    </Card>
  );
}