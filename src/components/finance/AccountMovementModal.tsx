import { useState, useEffect } from 'react';
import { useFinanceAccounts } from '@/hooks/useFinanceAccounts';
import { useAccountMovements, AccountMovementType } from '@/hooks/useAccountMovements';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowDownCircle, ArrowUpCircle, ArrowLeftRight } from 'lucide-react';
import { FinanceAccount } from '@/types/finance';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: FinanceAccount[];
  defaultAccountId?: string;
  onSuccess?: () => void;
}

export function AccountMovementModal({ open, onOpenChange, accounts, defaultAccountId, onSuccess }: Props) {
  const { registerMovement, submitting } = useAccountMovements();
  const [type, setType] = useState<AccountMovementType>('ingreso');
  const [accountId, setAccountId] = useState<string>('');
  const [toAccountId, setToAccountId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [note, setNote] = useState<string>('');

  const activeAccounts = accounts.filter(a => a.is_active);

  useEffect(() => {
    if (open) {
      setAccountId(defaultAccountId || activeAccounts[0]?.id || '');
      setToAccountId('');
      setAmount('');
      setCategory('');
      setNote('');
      setType('ingreso');
    }
  }, [open, defaultAccountId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseInt(amount, 10);
    if (!accountId || !numAmount || numAmount <= 0) return;
    if (type === 'transferencia' && (!toAccountId || toAccountId === accountId)) return;

    const ok = await registerMovement({
      accountId,
      type,
      amount: numAmount,
      note,
      category,
      toAccountId: type === 'transferencia' ? toAccountId : undefined,
    });

    if (ok) {
      onSuccess?.();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo Movimiento de Cuenta</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <Button
              type="button"
              variant={type === 'ingreso' ? 'default' : 'outline'}
              onClick={() => setType('ingreso')}
              className="flex flex-col gap-1 h-auto py-3"
            >
              <ArrowDownCircle className="h-5 w-5" />
              <span className="text-xs">Ingreso</span>
            </Button>
            <Button
              type="button"
              variant={type === 'egreso' ? 'default' : 'outline'}
              onClick={() => setType('egreso')}
              className="flex flex-col gap-1 h-auto py-3"
            >
              <ArrowUpCircle className="h-5 w-5" />
              <span className="text-xs">Egreso</span>
            </Button>
            <Button
              type="button"
              variant={type === 'transferencia' ? 'default' : 'outline'}
              onClick={() => setType('transferencia')}
              className="flex flex-col gap-1 h-auto py-3"
            >
              <ArrowLeftRight className="h-5 w-5" />
              <span className="text-xs">Movimiento</span>
            </Button>
          </div>

          <div>
            <Label>{type === 'transferencia' ? 'Cuenta origen' : 'Cuenta'} *</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger><SelectValue placeholder="Selecciona una cuenta" /></SelectTrigger>
              <SelectContent>
                {activeAccounts.map(acc => (
                  <SelectItem key={acc.id} value={acc.id}>{acc.name} ({acc.type})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {type === 'transferencia' && (
            <div>
              <Label>Cuenta destino *</Label>
              <Select value={toAccountId} onValueChange={setToAccountId}>
                <SelectTrigger><SelectValue placeholder="Selecciona cuenta destino" /></SelectTrigger>
                <SelectContent>
                  {activeAccounts.filter(a => a.id !== accountId).map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>{acc.name} ({acc.type})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Monto *</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              required
              min={1}
            />
          </div>

          <div>
            <Label>Categoría / Concepto</Label>
            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Ej: Pago proveedor, Depósito banco"
            />
          </div>

          <div>
            <Label>Nota</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Registrando...' : 'Registrar Movimiento'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
