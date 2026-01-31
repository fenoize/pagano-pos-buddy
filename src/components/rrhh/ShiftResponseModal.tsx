import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { XCircle } from 'lucide-react';

interface ShiftResponseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'reject';
  count: number;
  onConfirm: (note?: string) => void;
}

export function ShiftResponseModal({
  open,
  onOpenChange,
  mode,
  count,
  onConfirm,
}: ShiftResponseModalProps) {
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(note.trim() || undefined);
      setNote('');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setNote('');
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <XCircle className="h-5 w-5" />
            Rechazar {count === 1 ? 'Turno' : `${count} Turnos`}
          </DialogTitle>
          <DialogDescription>
            {count === 1
              ? '¿Estás seguro de que deseas rechazar este turno?'
              : `¿Estás seguro de que deseas rechazar estos ${count} turnos?`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reject-note">Motivo (opcional)</Label>
            <Textarea
              id="reject-note"
              placeholder="Escribe el motivo del rechazo..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Este motivo será visible para los administradores.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? 'Rechazando...' : 'Confirmar Rechazo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
