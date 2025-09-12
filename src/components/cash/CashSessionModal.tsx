import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { useCashSession } from '@/hooks/useCashSession';
import { useToast } from '@/hooks/use-toast';

interface CashSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'open' | 'close' | 'movement';
  sessionSummary?: any;
}

export function CashSessionModal({ isOpen, onClose, type, sessionSummary }: CashSessionModalProps) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [movementType, setMovementType] = useState<'ingreso' | 'egreso'>('ingreso');
  const [loading, setLoading] = useState(false);
  const { openSession, closeSession, addCashMovement } = useCashSession();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue < 0) {
      toast({
        title: "Error",
        description: "Ingresa un monto válido.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      switch (type) {
        case 'open':
          await openSession(amountValue);
          toast({
            title: "Turno abierto",
            description: `Turno iniciado con ${formatCurrency(amountValue)} en caja.`
          });
          break;
        
        case 'close':
          await closeSession(amountValue);
          toast({
            title: "Turno cerrado",
            description: "El turno ha sido cerrado correctamente."
          });
          break;
        
        case 'movement':
          await addCashMovement(movementType, amountValue, note);
          toast({
            title: "Movimiento registrado",
            description: `${movementType === 'ingreso' ? 'Ingreso' : 'Egreso'} de ${formatCurrency(amountValue)} registrado.`
          });
          break;
      }

      setAmount('');
      setNote('');
      onClose();
    } catch (error: any) {
      console.error('Error in cash session operation:', error);
      toast({
        title: "Error",
        description: error.message || "Ocurrió un error inesperado.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'open':
        return 'Abrir Turno de Caja';
      case 'close':
        return 'Cerrar Turno de Caja';
      case 'movement':
        return 'Registrar Movimiento de Caja';
      default:
        return 'Caja';
    }
  };

  const getDescription = () => {
    switch (type) {
      case 'open':
        return 'Ingresa el monto inicial en efectivo para abrir el turno.';
      case 'close':
        return 'Ingresa el monto final contado en caja para cerrar el turno.';
      case 'movement':
        return 'Registra ingresos o egresos de efectivo adicionales.';
      default:
        return '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

        {type === 'close' && sessionSummary && (
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Resumen del Turno</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Efectivo inicial:</span>
                <span className="font-medium">{formatCurrency(sessionSummary.session.opening_cash)}</span>
              </div>
              <div className="flex justify-between">
                <span>Ventas en efectivo:</span>
                <span className="font-medium">{formatCurrency(sessionSummary.summary.totalCash)}</span>
              </div>
              <div className="flex justify-between">
                <span>Ingresos adicionales:</span>
                <span className="font-medium text-green-600">{formatCurrency(sessionSummary.summary.ingresos)}</span>
              </div>
              <div className="flex justify-between">
                <span>Egresos:</span>
                <span className="font-medium text-red-600">-{formatCurrency(sessionSummary.summary.egresos)}</span>
              </div>
              <hr />
              <div className="flex justify-between font-semibold">
                <span>Efectivo esperado:</span>
                <span>{formatCurrency(sessionSummary.summary.expectedCash)}</span>
              </div>
            </CardContent>
          </Card>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {type === 'movement' && (
            <div className="flex gap-2">
              <Button
                type="button"
                variant={movementType === 'ingreso' ? 'default' : 'outline'}
                onClick={() => setMovementType('ingreso')}
                className="flex-1"
              >
                Ingreso
              </Button>
              <Button
                type="button"
                variant={movementType === 'egreso' ? 'default' : 'outline'}
                onClick={() => setMovementType('egreso')}
                className="flex-1"
              >
                Egreso
              </Button>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="amount">
              {type === 'open' && 'Monto Inicial'}
              {type === 'close' && 'Monto Final Contado'}
              {type === 'movement' && 'Monto'}
            </Label>
            <Input
              id="amount"
              type="number"
              min="0"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              disabled={loading}
              required
            />
          </div>

          {(type === 'movement' || type === 'close') && (
            <div className="space-y-2">
              <Label htmlFor="note">
                {type === 'close' ? 'Observaciones (opcional)' : 'Concepto'}
              </Label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                  type === 'close' 
                    ? "Observaciones sobre el cierre..." 
                    : "Describe el concepto del movimiento..."
                }
                disabled={loading}
                rows={3}
                required={type === 'movement'}
              />
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Procesando...' : (
                type === 'open' ? 'Abrir Turno' : 
                type === 'close' ? 'Cerrar Turno' : 
                'Registrar'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}