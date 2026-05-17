import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, CheckCircle2, Loader2, DollarSign } from 'lucide-react';
import { useSupplierPayables, SupplierPayable } from '@/hooks/useSupplierPayables';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from "sonner";

interface SupplierPayablesTableProps {
  supplierId: string;
  showSupplierColumn?: boolean;
}

export function SupplierPayablesTable({ supplierId, showSupplierColumn }: SupplierPayablesTableProps) {
  const { payables, loading, totalPending, registerPayment } = useSupplierPayables(supplierId);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayable, setSelectedPayable] = useState<SupplierPayable | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return format(new Date(dateStr), 'dd/MM/yyyy', { locale: es });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pagado':
        return <Badge className="bg-green-100 text-green-700"><CheckCircle2 className="h-3 w-3 mr-1" />Pagado</Badge>;
      case 'vencido':
        return <Badge className="bg-red-100 text-red-700"><AlertTriangle className="h-3 w-3 mr-1" />Vencido</Badge>;
      case 'parcial':
        return <Badge className="bg-amber-100 text-amber-700"><Clock className="h-3 w-3 mr-1" />Parcial</Badge>;
      default:
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pendiente</Badge>;
    }
  };

  const handleOpenPayment = (payable: SupplierPayable) => {
    setSelectedPayable(payable);
    setPaymentAmount(String(payable.amount_total - payable.amount_paid));
    setPaymentNotes('');
    setShowPaymentModal(true);
  };

  const handleRegisterPayment = async () => {
    if (!selectedPayable) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Error', { description: 'Ingrese un monto válido' });
      return;
    }

    const pending = selectedPayable.amount_total - selectedPayable.amount_paid;
    if (amount > pending) {
      toast.error('Error', { description: 'El monto no puede superar el saldo pendiente' });
      return;
    }

    setSaving(true);
    const success = await registerPayment(selectedPayable.id, amount, paymentNotes || undefined);
    setSaving(false);

    if (success) {
      setShowPaymentModal(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (payables.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
        <p>No hay cuentas por pagar registradas</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
        <div>
          <p className="text-sm text-muted-foreground">Total Pendiente</p>
          <p className="text-2xl font-bold text-destructive">{formatCurrency(totalPending)}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">{payables.filter(p => p.status !== 'pagado').length} documentos</p>
          <p className="text-sm text-red-600">
            {payables.filter(p => p.status === 'vencido').length} vencidos
          </p>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            {showSupplierColumn && <TableHead>Proveedor</TableHead>}
            <TableHead>Documento</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Vencimiento</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Pagado</TableHead>
            <TableHead className="text-right">Pendiente</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="w-[80px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payables.map((payable) => (
            <TableRow key={payable.id}>
              {showSupplierColumn && (
                <TableCell className="font-medium">{payable.supplier?.name}</TableCell>
              )}
              <TableCell>
                <div>
                  <p className="font-medium">
                    {payable.document_type || 'Factura'} {payable.document_number || ''}
                  </p>
                  {payable.purchase_order && (
                    <p className="text-xs text-muted-foreground">
                      OC: {payable.purchase_order.po_number}
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDate(payable.document_date)}
              </TableCell>
              <TableCell className={payable.status === 'vencido' ? 'text-red-600 font-medium' : ''}>
                {formatDate(payable.due_date)}
              </TableCell>
              <TableCell className="text-right">{formatCurrency(payable.amount_total)}</TableCell>
              <TableCell className="text-right text-green-600">
                {formatCurrency(payable.amount_paid)}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(payable.amount_total - payable.amount_paid)}
              </TableCell>
              <TableCell>{getStatusBadge(payable.status)}</TableCell>
              <TableCell>
                {payable.status !== 'pagado' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenPayment(payable)}
                  >
                    <DollarSign className="h-4 w-4 mr-1" />
                    Pagar
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
          </DialogHeader>

          {selectedPayable && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Documento</p>
                <p className="font-medium">
                  {selectedPayable.document_type || 'Factura'} {selectedPayable.document_number}
                </p>
                <p className="text-sm mt-2">
                  Saldo pendiente: <span className="font-medium">{formatCurrency(selectedPayable.amount_total - selectedPayable.amount_paid)}</span>
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment-amount">Monto del Pago</Label>
                <Input
                  id="payment-amount"
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment-notes">Notas (opcional)</Label>
                <Textarea
                  id="payment-notes"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Ej: Transferencia N° 12345"
                  rows={2}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRegisterPayment} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Registrando...
                </>
              ) : (
                'Registrar Pago'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
