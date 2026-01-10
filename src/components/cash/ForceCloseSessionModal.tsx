import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';

interface ForceCloseSessionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: {
    id: string;
    user_id: string;
    opening_cash: number;
    opened_at: string;
    observaciones?: string | null;
    user?: {
      username: string;
    };
  } | null;
  onSuccess: () => void;
}

export function ForceCloseSessionModal({
  open,
  onOpenChange,
  session,
  onSuccess,
}: ForceCloseSessionModalProps) {
  const [closingCash, setClosingCash] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleForceClose = async () => {
    if (!session) return;

    const closingCashNum = parseFloat(closingCash) || 0;
    
    if (!reason.trim()) {
      toast.error('Debe ingresar un motivo para el cierre forzado');
      return;
    }

    setLoading(true);
    try {
      // Update the session to close it
      const { error } = await supabase
        .from('cash_sessions')
        .update({
          closed_at: new Date().toISOString(),
          closing_cash: closingCashNum,
          observaciones: `[CIERRE FORZADO POR ADMIN] ${reason}${session.observaciones ? `\n\nObservaciones anteriores: ${session.observaciones}` : ''}`,
        })
        .eq('id', session.id);

      if (error) throw error;

      toast.success('Caja cerrada exitosamente');
      onOpenChange(false);
      setClosingCash('');
      setReason('');
      onSuccess();
    } catch (error) {
      console.error('Error closing session:', error);
      toast.error('Error al cerrar la caja');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setClosingCash('');
    setReason('');
    onOpenChange(false);
  };

  if (!session) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-destructive">
            Forzar Cierre de Caja
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                Está a punto de cerrar forzadamente la caja de{' '}
                <strong>{session.user?.username || 'Usuario desconocido'}</strong>.
              </p>
              
              <div className="bg-muted p-3 rounded-md text-sm space-y-1">
                <p><strong>Efectivo inicial:</strong> {formatCurrency(session.opening_cash)}</p>
                <p><strong>Abierta desde:</strong> {new Date(session.opened_at).toLocaleString('es-CL')}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="closingCash">Efectivo al cierre</Label>
                <Input
                  id="closingCash"
                  type="number"
                  placeholder="0"
                  value={closingCash}
                  onChange={(e) => setClosingCash(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Ingrese el monto de efectivo en caja. Déjelo en 0 si no tiene información.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Motivo del cierre forzado *</Label>
                <Textarea
                  id="reason"
                  placeholder="Ej: Usuario no disponible, cierre de turno olvidado, etc."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                />
              </div>

              <p className="text-destructive text-sm font-medium">
                ⚠️ Esta acción no se puede deshacer y quedará registrada en el sistema.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleClose} disabled={loading}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleForceClose}
            disabled={loading || !reason.trim()}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? 'Cerrando...' : 'Forzar Cierre'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
