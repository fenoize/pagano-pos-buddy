import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useFinanceAccounts } from '@/hooks/useFinanceAccounts';
import { useAuthContext } from '@/contexts/AuthContext';
import { DeliveryPayment, ProcessPaymentData } from '@/hooks/useDeliveryPayments';
import { DollarSign, Receipt, Building2, User, AlertCircle } from 'lucide-react';

interface DeliveryPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPayments: DeliveryPayment[];
  onConfirm: (data: ProcessPaymentData) => Promise<boolean>;
}

export function DeliveryPaymentModal({ isOpen, onClose, selectedPayments, onConfirm }: DeliveryPaymentModalProps) {
  const { accounts, loading: accountsLoading } = useFinanceAccounts();
  const { user } = useAuthContext();
  
  const [accountId, setAccountId] = useState<string>('');
  const [includeShiftBonus, setIncludeShiftBonus] = useState(false);
  const [shiftBonus, setShiftBonus] = useState(0);
  const [hasInvoice, setHasInvoice] = useState(false);
  const [companyPaysTax, setCompanyPaysTax] = useState(true);
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const TAX_PERCENTAGE = 13.5;

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setAccountId('');
      setIncludeShiftBonus(false);
      setShiftBonus(0);
      setHasInvoice(false);
      setCompanyPaysTax(true);
      setNotes('');
    }
  }, [isOpen]);

  // Set default account
  useEffect(() => {
    if (accounts.length > 0 && !accountId) {
      const defaultAccount = accounts.find(a => a.is_active);
      if (defaultAccount) {
        setAccountId(defaultAccount.id);
      }
    }
  }, [accounts, accountId]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(value);
  };

  // Calculate totals
  const baseTotal = selectedPayments.reduce((sum, p) => sum + p.base_amount, 0);
  const shiftBonusAmount = includeShiftBonus ? shiftBonus : 0;
  const grossTotal = baseTotal + shiftBonusAmount;
  const taxAmount = hasInvoice && companyPaysTax ? Math.round(grossTotal * TAX_PERCENTAGE / 100) : 0;
  const netTotal = grossTotal - taxAmount;
  const totalExpense = hasInvoice && companyPaysTax ? grossTotal : netTotal;

  // Get delivery person name
  const deliveryPersonName = selectedPayments[0]?.delivery_person?.full_name || 'Repartidor';

  const handleConfirm = async () => {
    if (!accountId) {
      return;
    }

    setIsProcessing(true);
    try {
      const success = await onConfirm({
        payment_ids: selectedPayments.map(p => p.id),
        account_id: accountId,
        shift_bonus: shiftBonusAmount,
        has_invoice: hasInvoice,
        company_pays_tax: companyPaysTax,
        notes: notes || undefined
      });

      if (success) {
        onClose();
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const activeAccounts = accounts.filter(a => a.is_active);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Procesar Pago a Repartidor
          </DialogTitle>
          <DialogDescription>
            Confirma los detalles del pago para {deliveryPersonName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Payment Source */}
          <div className="space-y-2">
            <Label>Cuenta de Origen *</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar cuenta" />
              </SelectTrigger>
              <SelectContent>
                {activeAccounts.map(account => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name} ({account.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Who is paying */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4" />
            <span>Pagado por: <strong className="text-foreground">{user?.full_name}</strong></span>
          </div>

          <Separator />

          {/* Shift Bonus */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Incluir pago de turno</Label>
                <p className="text-xs text-muted-foreground">
                  Monto adicional por el turno trabajado
                </p>
              </div>
              <Switch
                checked={includeShiftBonus}
                onCheckedChange={setIncludeShiftBonus}
              />
            </div>
            
            {includeShiftBonus && (
              <div className="space-y-2">
                <Label htmlFor="shiftBonus">Valor del turno (CLP)</Label>
                <Input
                  id="shiftBonus"
                  type="number"
                  min="0"
                  step="1000"
                  value={shiftBonus}
                  onChange={(e) => setShiftBonus(parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
            )}
          </div>

          <Separator />

          {/* Invoice / Tax Options */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  Con boleta de honorarios
                </Label>
                <p className="text-xs text-muted-foreground">
                  Aplica retención de impuestos ({TAX_PERCENTAGE}%)
                </p>
              </div>
              <Switch
                checked={hasInvoice}
                onCheckedChange={setHasInvoice}
              />
            </div>

            {hasInvoice && (
              <div className="space-y-3 pl-4 border-l-2 border-primary/20">
                <Label>¿Quién paga el impuesto?</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={companyPaysTax ? 'default' : 'outline'}
                    size="sm"
                    className="justify-start"
                    onClick={() => setCompanyPaysTax(true)}
                  >
                    <Building2 className="h-4 w-4 mr-2" />
                    Empresa
                  </Button>
                  <Button
                    type="button"
                    variant={!companyPaysTax ? 'default' : 'outline'}
                    size="sm"
                    className="justify-start"
                    onClick={() => setCompanyPaysTax(false)}
                  >
                    <User className="h-4 w-4 mr-2" />
                    Delivery
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {companyPaysTax 
                    ? 'La empresa retiene y paga el impuesto. El repartidor recibe el neto.'
                    : 'El repartidor recibe el 100% y gestiona el pago del impuesto.'}
                </p>
              </div>
            )}
          </div>

          <Separator />

          {/* Payment Summary */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <h4 className="font-semibold text-sm mb-3">Resumen del Pago</h4>
            
            <div className="flex justify-between text-sm">
              <span>Deliverys seleccionados:</span>
              <span className="font-medium">{selectedPayments.length}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span>Subtotal deliverys:</span>
              <span className="font-medium">{formatCurrency(baseTotal)}</span>
            </div>
            
            {shiftBonusAmount > 0 && (
              <div className="flex justify-between text-sm text-primary">
                <span>+ Valor del turno:</span>
                <span className="font-medium">{formatCurrency(shiftBonusAmount)}</span>
              </div>
            )}
            
            <Separator className="my-2" />
            
            <div className="flex justify-between text-sm font-medium">
              <span>TOTAL BRUTO:</span>
              <span>{formatCurrency(grossTotal)}</span>
            </div>

            {hasInvoice && companyPaysTax && (
              <>
                <div className="flex justify-between text-sm text-destructive">
                  <span>- Impuesto ({TAX_PERCENTAGE}%):</span>
                  <span>{formatCurrency(taxAmount)}</span>
                </div>
                
                <Separator className="my-2" />
                
                <div className="flex justify-between text-sm">
                  <span>Neto al repartidor:</span>
                  <span className="font-bold text-primary">{formatCurrency(netTotal)}</span>
                </div>
                
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Egreso impuestos:</span>
                  <span>{formatCurrency(taxAmount)}</span>
                </div>
              </>
            )}

            <Separator className="my-2" />
            
            <div className="flex justify-between font-bold">
              <span>Total egreso empresa:</span>
              <span className="text-lg">{formatCurrency(totalExpense)}</span>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observaciones del pago..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={isProcessing || !accountId}
          >
            {isProcessing ? 'Procesando...' : 'Confirmar Pago'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
