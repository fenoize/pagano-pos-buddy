import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Plus, Eye, FileText, DollarSign, Loader2, Download, Send, Trash2, FileDown } from 'lucide-react';
import { useHRPayroll } from '@/hooks/useHRPayroll';
import { useFinanceAccounts } from '@/hooks/useFinanceAccounts';
import { HRPayrollRun, HRPayrollItem, HRPayrollPeriodType, HRPayrollStatus } from '@/types/hr';
import { exportPayrollCSV, exportPayrollPDF } from '@/lib/hrExport';
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

const statusConfig: Record<HRPayrollStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  draft: { label: 'Borrador', variant: 'outline' },
  issued: { label: 'Emitida', variant: 'secondary' },
  paid: { label: 'Pagada', variant: 'default' },
};

const periodTypeLabels: Record<HRPayrollPeriodType, string> = {
  daily: 'Diario',
  weekly: 'Semanal',
  monthly: 'Mensual',
  custom: 'Personalizado',
};

function RRHHLiquidaciones() {
  const { 
    payrollRuns, loading, 
    generatePayroll, issuePayroll, markPayrollPaid, getPayrollItems, deletePayroll,
  } = useHRPayroll();
  const { accounts } = useFinanceAccounts();
  
  // Generate Modal
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [generateForm, setGenerateForm] = useState({
    period_type: 'weekly' as HRPayrollPeriodType,
    start_date: format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    end_date: format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    notes: '',
  });
  const [generating, setGenerating] = useState(false);
  
  // Detail Drawer
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<HRPayrollRun | null>(null);
  const [payrollItems, setPayrollItems] = useState<HRPayrollItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  
  // Pay Modal
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payForm, setPayForm] = useState({
    payment_method: 'Transferencia',
    account_id: '',
  });
  const [paying, setPaying] = useState(false);

  const formatCLP = (amount: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount);
  };

  // Period presets
  const applyPreset = (preset: string) => {
    const now = new Date();
    switch (preset) {
      case 'this_week':
        setGenerateForm(f => ({
          ...f,
          period_type: 'weekly',
          start_date: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
          end_date: format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        }));
        break;
      case 'last_week':
        const lastWeek = subWeeks(now, 1);
        setGenerateForm(f => ({
          ...f,
          period_type: 'weekly',
          start_date: format(startOfWeek(lastWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
          end_date: format(endOfWeek(lastWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        }));
        break;
      case 'this_month':
        setGenerateForm(f => ({
          ...f,
          period_type: 'monthly',
          start_date: format(startOfMonth(now), 'yyyy-MM-dd'),
          end_date: format(endOfMonth(now), 'yyyy-MM-dd'),
        }));
        break;
      case 'last_month':
        const lastMonth = subMonths(now, 1);
        setGenerateForm(f => ({
          ...f,
          period_type: 'monthly',
          start_date: format(startOfMonth(lastMonth), 'yyyy-MM-dd'),
          end_date: format(endOfMonth(lastMonth), 'yyyy-MM-dd'),
        }));
        break;
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const id = await generatePayroll(generateForm);
      if (id) {
        setGenerateModalOpen(false);
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleOpenDetail = async (payroll: HRPayrollRun) => {
    setSelectedPayroll(payroll);
    setDetailDrawerOpen(true);
    setLoadingItems(true);
    try {
      const items = await getPayrollItems(payroll.id);
      setPayrollItems(items);
    } finally {
      setLoadingItems(false);
    }
  };

  const handleIssue = async () => {
    if (!selectedPayroll) return;
    try {
      await issuePayroll(selectedPayroll.id);
      setDetailDrawerOpen(false);
    } catch (e) {}
  };

  const handleOpenPayModal = () => {
    setPayForm({
      payment_method: 'Transferencia',
      account_id: accounts[0]?.id || '',
    });
    setPayModalOpen(true);
  };

  const handlePay = async () => {
    if (!selectedPayroll || !payForm.account_id) return;
    setPaying(true);
    try {
      await markPayrollPaid(selectedPayroll.id, payForm.payment_method, payForm.account_id);
      setPayModalOpen(false);
      setDetailDrawerOpen(false);
    } finally {
      setPaying(false);
    }
  };

  const handleDelete = async (payroll: HRPayrollRun) => {
    if (payroll.status !== 'draft') {
      toast.error('Solo se pueden eliminar liquidaciones en borrador');
      return;
    }
    try {
      await deletePayroll(payroll.id);
    } catch (e) {}
  };

  const handleExportCSV = () => {
    if (!selectedPayroll || payrollItems.length === 0) return;
    exportPayrollCSV(selectedPayroll, payrollItems);
    toast.success('CSV exportado');
  };

  const handleExportPDF = () => {
    if (!selectedPayroll || payrollItems.length === 0) return;
    exportPayrollPDF(selectedPayroll, payrollItems);
    toast.success('PDF exportado');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Liquidaciones</h1>
          <p className="text-muted-foreground">Genera y gestiona liquidaciones de pago</p>
        </div>
        <Button onClick={() => setGenerateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Generar Liquidación
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Período</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Empleados</TableHead>
                  <TableHead>Turnos</TableHead>
                  <TableHead>Total Neto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrollRuns.map((payroll) => (
                  <TableRow key={payroll.id}>
                    <TableCell className="font-medium">
                      {format(parseISO(payroll.period_start), 'dd MMM', { locale: es })} - {format(parseISO(payroll.period_end), 'dd MMM yyyy', { locale: es })}
                    </TableCell>
                    <TableCell>{periodTypeLabels[payroll.period_type]}</TableCell>
                    <TableCell>{payroll.totals?.employees_count || 0}</TableCell>
                    <TableCell>{payroll.totals?.shifts_count || 0}</TableCell>
                    <TableCell className="font-mono">{formatCLP(payroll.totals?.net_total || 0)}</TableCell>
                    <TableCell>
                      <Badge variant={statusConfig[payroll.status].variant}>
                        {statusConfig[payroll.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenDetail(payroll)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {payroll.status === 'draft' && (
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(payroll)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {payrollRuns.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No hay liquidaciones. Genera una nueva.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Generate Modal */}
      <Dialog open={generateModalOpen} onOpenChange={setGenerateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generar Liquidación</DialogTitle>
            <DialogDescription>
              Se incluirán todos los turnos en estado "Aprobado" del período seleccionado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Presets</Label>
              <div className="flex gap-2 mt-1">
                <Button variant="outline" size="sm" onClick={() => applyPreset('this_week')}>Esta semana</Button>
                <Button variant="outline" size="sm" onClick={() => applyPreset('last_week')}>Semana anterior</Button>
                <Button variant="outline" size="sm" onClick={() => applyPreset('this_month')}>Este mes</Button>
                <Button variant="outline" size="sm" onClick={() => applyPreset('last_month')}>Mes anterior</Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Desde</Label>
                <Input 
                  type="date"
                  value={generateForm.start_date}
                  onChange={(e) => setGenerateForm(f => ({ ...f, start_date: e.target.value }))}
                />
              </div>
              <div>
                <Label>Hasta</Label>
                <Input 
                  type="date"
                  value={generateForm.end_date}
                  onChange={(e) => setGenerateForm(f => ({ ...f, end_date: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label>Tipo de Período</Label>
              <Select 
                value={generateForm.period_type} 
                onValueChange={(val) => setGenerateForm(f => ({ ...f, period_type: val as HRPayrollPeriodType }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Diario</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensual</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea 
                value={generateForm.notes}
                onChange={(e) => setGenerateForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleGenerate} disabled={generating}>
              {generating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Generar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Drawer */}
      <Drawer open={detailDrawerOpen} onOpenChange={setDetailDrawerOpen}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle>
              Liquidación: {selectedPayroll && `${format(parseISO(selectedPayroll.period_start), 'dd MMM', { locale: es })} - ${format(parseISO(selectedPayroll.period_end), 'dd MMM yyyy', { locale: es })}`}
            </DrawerTitle>
            <DrawerDescription>
              {selectedPayroll && (
                <div className="flex items-center gap-4">
                  <Badge variant={statusConfig[selectedPayroll.status].variant}>
                    {statusConfig[selectedPayroll.status].label}
                  </Badge>
                  <span>Total: {formatCLP(selectedPayroll.totals?.net_total || 0)}</span>
                </div>
              )}
            </DrawerDescription>
          </DrawerHeader>
          
          <div className="p-4 overflow-auto">
            {loadingItems ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead>RUT</TableHead>
                    <TableHead className="text-right">Turnos</TableHead>
                    <TableHead className="text-right">Base</TableHead>
                    <TableHead className="text-right">Bonos</TableHead>
                    <TableHead className="text-right">Adelantos</TableHead>
                    <TableHead className="text-right">Descuentos</TableHead>
                    <TableHead className="text-right font-semibold">Neto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrollItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.employee?.full_name}</TableCell>
                      <TableCell>{item.employee?.rut || '-'}</TableCell>
                      <TableCell className="text-right">{item.shifts_count}</TableCell>
                      <TableCell className="text-right font-mono">{formatCLP(item.base_amount)}</TableCell>
                      <TableCell className="text-right font-mono text-green-600">+{formatCLP(item.bonuses)}</TableCell>
                      <TableCell className="text-right font-mono text-orange-600">-{formatCLP(item.advances)}</TableCell>
                      <TableCell className="text-right font-mono text-red-600">-{formatCLP(item.discounts)}</TableCell>
                      <TableCell className="text-right font-mono font-semibold">{formatCLP(item.net_pay)}</TableCell>
                    </TableRow>
                  ))}
                  {payrollItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-4 text-muted-foreground">
                        Sin empleados en esta liquidación
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
            
            {/* Actions */}
            <div className="flex flex-wrap justify-end gap-2 mt-6 pt-4 border-t">
              <Button variant="outline" onClick={handleExportCSV}>
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
              <Button variant="outline" onClick={handleExportPDF}>
                <FileDown className="h-4 w-4 mr-2" />
                PDF
              </Button>
              
              {selectedPayroll?.status === 'draft' && (
                <Button onClick={handleIssue}>
                  <Send className="h-4 w-4 mr-2" />
                  Emitir
                </Button>
              )}
              
              {selectedPayroll?.status === 'issued' && (
                <Button onClick={handleOpenPayModal}>
                  <DollarSign className="h-4 w-4 mr-2" />
                  Marcar Pagada
                </Button>
              )}
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Pay Modal */}
      <Dialog open={payModalOpen} onOpenChange={setPayModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar como Pagada</DialogTitle>
            <DialogDescription>
              Selecciona el método de pago y la cuenta desde donde se realizó el pago.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Método de Pago</Label>
              <Select 
                value={payForm.payment_method} 
                onValueChange={(val) => setPayForm(f => ({ ...f, payment_method: val }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Efectivo">Efectivo</SelectItem>
                  <SelectItem value="Transferencia">Transferencia</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cuenta</Label>
              <Select 
                value={payForm.account_id} 
                onValueChange={(val) => setPayForm(f => ({ ...f, account_id: val }))}
              >
                <SelectTrigger><SelectValue placeholder="Seleccionar cuenta" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayModalOpen(false)}>Cancelar</Button>
            <Button onClick={handlePay} disabled={paying || !payForm.account_id}>
              {paying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar Pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default RRHHLiquidaciones;
