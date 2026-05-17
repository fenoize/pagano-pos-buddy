import { useState, useMemo, useEffect } from 'react';
import { useFinanceExpenses } from '@/hooks/useFinanceExpenses';
import { useFinanceAccounts } from '@/hooks/useFinanceAccounts';
import { useRecurringExpenses } from '@/hooks/useRecurringExpenses';
import { useAuth } from '@/hooks/useAuth';
import { SupplierSelect } from '@/components/finance/SupplierSelect';
import { ExpenseSettingsModal } from '@/components/finance/ExpenseSettingsModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, CalendarIcon, Paperclip, FileText, Download, CheckCircle2, XCircle, ChevronLeft, ChevronRight, FileSpreadsheet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { FinanceExpense } from '@/types/finance';
import { cn } from '@/lib/utils';
import { formatDateShort } from '@/lib/dateUtils';
import { Badge } from '@/components/ui/badge';
import * as XLSX from 'xlsx';
import { BranchFilter } from '@/components/branches/BranchFilter';
import { toast } from "sonner";

const EXPENSE_TYPES = ['Variable', 'Fijo', 'Inversión', 'Otro'];

const DOCUMENT_TYPES = ['Boleta', 'Factura', 'Recibo', 'Otro'];

export default function FinanceExpenses() {
  const { user } = useAuth();
  const { expenses, loading: loadingExpenses, createExpense, updateExpense, deleteExpense } = useFinanceExpenses();
  const { accounts } = useFinanceAccounts();
  const { activeRecurringExpenses } = useRecurringExpenses();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<FinanceExpense | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Categorías y métodos de pago dinámicos
  const [expenseCategories, setExpenseCategories] = useState<string[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  
  // Documentación opcional
  const [includeDocumentation, setIncludeDocumentation] = useState(false);
  
  // Filters
  const [filterStartDate, setFilterStartDate] = useState<Date | undefined>();
  const [filterEndDate, setFilterEndDate] = useState<Date | undefined>();
  const [filterAccount, setFilterAccount] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterBranch, setFilterBranch] = useState<string>('all');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [monthInitialized, setMonthInitialized] = useState(false);

  // Si hoy es un mes “nuevo” (p.ej. día 1) y los egresos están en el mes anterior,
  // el filtro mensual puede dar la impresión de que “no hay egresos”.
  // Por eso, al cargar, seteamos el mes al del egreso más reciente.
  useEffect(() => {
    if (monthInitialized) return;
    if (!expenses) return;

    if (expenses.length === 0) {
      setMonthInitialized(true);
      return;
    }

    const latest = expenses.reduce((acc, e) => {
      // expense_date viene como 'YYYY-MM-DD'
      const d = new Date(`${e.expense_date}T00:00:00`);
      return d > acc ? d : acc;
    }, new Date('1970-01-01T00:00:00'));

    setCurrentMonth(latest);
    setMonthInitialized(true);
  }, [expenses, monthInitialized]);

  const [formData, setFormData] = useState({
    expense_date: format(new Date(), 'yyyy-MM-dd'),
    account_id: '',
    amount: '',
    expense_type: 'Variable' as 'Variable' | 'Fijo' | 'Inversión' | 'Otro',
    category: '',
    supplier: '',
    payment_method: '',
    document_type: '',
    document_number: '',
    attachment_url: '',
    notes: '',
    recurring_id: '' as string,
    fixed_subtype: '' as 'simple' | 'recurrente' | '',
  });

  const isAdmin = user?.role === 'Administrador';
  const activeAccounts = accounts.filter(a => a.is_active);

  // Cargar categorías desde localStorage o usar las predeterminadas
  useEffect(() => {
    const savedCategories = localStorage.getItem('expense_categories');
    if (savedCategories) {
      setExpenseCategories(JSON.parse(savedCategories));
    } else {
      const defaultCategories = [
        'Insumos',
        'Arriendo',
        'Servicios',
        'Mantención',
        'Marketing',
        'Sueldos',
        'Impuestos',
        'Otros'
      ];
      setExpenseCategories(defaultCategories);
      localStorage.setItem('expense_categories', JSON.stringify(defaultCategories));
    }

    const savedMethods = localStorage.getItem('expense_payment_methods');
    if (savedMethods) {
      setPaymentMethods(JSON.parse(savedMethods));
    } else {
      const defaultMethods = ['Efectivo', 'Transferencia', 'App / Link', 'Tarjeta Débito', 'Tarjeta Crédito'];
      setPaymentMethods(defaultMethods);
      localStorage.setItem('expense_payment_methods', JSON.stringify(defaultMethods));
    }
  }, []);

  // Guardar categorías en localStorage cuando cambien
  const handleCategoriesChange = (categories: string[]) => {
    setExpenseCategories(categories);
    localStorage.setItem('expense_categories', JSON.stringify(categories));
  };

  // Guardar métodos de pago en localStorage cuando cambien
  const handlePaymentMethodsChange = (methods: string[]) => {
    setPaymentMethods(methods);
    localStorage.setItem('expense_payment_methods', JSON.stringify(methods));
  };

  // Formatear monto con separador de miles
  const formatAmount = (value: string) => {
    const numericValue = value.replace(/\D/g, '');
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\./g, '');
    setFormData({ ...formData, amount: rawValue });
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => {
      const expenseDate = new Date(expense.expense_date);
      
      // Filtro por mes actual (siempre aplicado)
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      if (expenseDate < monthStart || expenseDate > monthEnd) return false;
      
      // Filtros adicionales
      if (filterStartDate && expenseDate < filterStartDate) return false;
      if (filterEndDate && expenseDate > filterEndDate) return false;
      if (filterAccount !== 'all' && expense.account_id !== filterAccount) return false;
      if (filterType !== 'all' && expense.expense_type !== filterType) return false;
      if (filterCategory !== 'all' && expense.category !== filterCategory) return false;
      if (filterBranch !== 'all' && (expense as any).branch_id !== filterBranch) return false;
      
      return true;
    });
  }, [expenses, currentMonth, filterStartDate, filterEndDate, filterAccount, filterType, filterCategory, filterBranch]);

  const kpis = useMemo(() => {
    const total = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const count = filteredExpenses.length;
    const average = count > 0 ? total / count : 0;
    return { total, count, average };
  }, [filteredExpenses]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
    }).format(amount);
  };

  const handleOpenDialog = (expense?: FinanceExpense) => {
    if (expense) {
      setEditingExpense(expense);
      setFormData({
        expense_date: expense.expense_date,
        account_id: expense.account_id,
        amount: expense.amount.toString(),
        expense_type: expense.expense_type as 'Variable' | 'Fijo' | 'Inversión' | 'Otro',
        category: expense.category,
        supplier: expense.supplier || '',
        payment_method: expense.payment_method || paymentMethods[0] || '',
        document_type: expense.document_type || '',
        document_number: expense.document_number || '',
        attachment_url: expense.attachment_url || '',
        notes: expense.notes || '',
        recurring_id: expense.recurring_id || '',
        fixed_subtype: expense.fixed_subtype || '',
      });
      setIncludeDocumentation(!!expense.document_type);
    } else {
      setEditingExpense(null);
      setFormData({
        expense_date: format(new Date(), 'yyyy-MM-dd'),
        account_id: activeAccounts[0]?.id || '',
        amount: '',
        expense_type: 'Variable',
        category: '',
        supplier: '',
        payment_method: paymentMethods[0] || '',
        document_type: '',
        document_number: '',
        attachment_url: '',
        notes: '',
        recurring_id: '',
        fixed_subtype: '',
      });
      setIncludeDocumentation(false);
    }
    setSelectedFile(null);
    setIsDialogOpen(true);
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones de documentación
    if (includeDocumentation) {
      if (!formData.document_type) {
        toast.error('Error', { description: 'Selecciona un tipo de documento' });
        return;
      }
      if (!formData.document_number) {
        toast.error('Error', { description: 'Ingresa el número de documento' });
        return;
      }
    }
    
    const data = {
      expense_date: formData.expense_date,
      account_id: formData.account_id,
      amount: parseFloat(formData.amount),
      currency: 'CLP',
      expense_type: formData.expense_type,
      category: formData.category,
      supplier: formData.supplier || null,
      payment_method: formData.payment_method || null,
      document_type: includeDocumentation ? formData.document_type : null,
      document_number: includeDocumentation ? formData.document_number : null,
      notes: formData.notes || null,
      attachment_url: formData.attachment_url || null,
      recurring_id: formData.expense_type === 'Fijo' && formData.recurring_id ? formData.recurring_id : null,
      fixed_subtype: formData.expense_type === 'Fijo' 
        ? (formData.recurring_id ? 'recurrente' : 'simple') as 'simple' | 'recurrente'
        : null,
    };

    const success = editingExpense
      ? await updateExpense(editingExpense.id, data, selectedFile || undefined)
      : await createExpense(data, selectedFile || undefined);

    if (success) {
      setIsDialogOpen(false);
      setSelectedFile(null);
    }
  };

  const handleDelete = async (id: string) => {
    const success = await deleteExpense(id);
    if (success) {
      setDeleteConfirm(null);
    }
  };

  const canEdit = (expense: FinanceExpense) => {
    return isAdmin || expense.registered_by === user?.id;
  };

  const handleExportToExcel = () => {
    if (filteredExpenses.length === 0) {
      toast.error('No hay datos', { description: 'No hay egresos para exportar en este mes' });
      return;
    }

    // Preparar datos para Excel
    const excelData = filteredExpenses.map(expense => ({
      'Fecha': formatDateShort(expense.expense_date),
      'Cuenta': expense.account?.name || '—',
      'Monto': Number(expense.amount),
      'Tipo': expense.expense_type,
      'Categoría': expense.category,
      'Proveedor': expense.supplier || '—',
      'Método de Pago': expense.payment_method || '—',
      'Notas': expense.notes || '—',
      'Tipo Documento': expense.document_type || 'Sin documento',
      'Nº Documento': expense.document_number || '—',
      'Documento Adjunto': expense.attachment_url ? 'Sí' : 'No',
    }));

    // Crear workbook y worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Ajustar anchos de columnas
    const colWidths = [
      { wch: 12 }, // Fecha
      { wch: 20 }, // Cuenta
      { wch: 15 }, // Monto
      { wch: 12 }, // Tipo
      { wch: 15 }, // Categoría
      { wch: 25 }, // Proveedor
      { wch: 18 }, // Método de Pago
      { wch: 40 }, // Notas
      { wch: 15 }, // Tipo Documento
      { wch: 15 }, // Nº Documento
      { wch: 15 }, // Documento Adjunto
    ];
    ws['!cols'] = colWidths;

    // Agregar hoja al workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Egresos');

    // Generar nombre del archivo
    const monthName = format(currentMonth, 'MMMM_yyyy', { locale: es });
    const fileName = `egresos_${monthName}.xlsx`;

    // Descargar archivo
    XLSX.writeFile(wb, fileName);

    toast.success('Exportación exitosa', { description: `Se descargó ${fileName} con ${filteredExpenses.length} registros` });
  };

  if (loadingExpenses) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gastos Variables</h1>
            <p className="text-muted-foreground mt-1">
              Registra los gastos operativos diarios del restaurant (insumos, mantenciones, compras, etc.). 
              Estos gastos se incluyen automáticamente en los cierres financieros.
            </p>
          </div>
          <ExpenseSettingsModal
            categories={expenseCategories}
            paymentMethods={paymentMethods}
            onCategoriesChange={handleCategoriesChange}
            onPaymentMethodsChange={handlePaymentMethodsChange}
          />
        </div>
      </div>

      {/* Paginador Mensual */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newMonth = new Date(currentMonth);
                newMonth.setMonth(newMonth.getMonth() - 1);
                setCurrentMonth(newMonth);
              }}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Mes anterior
            </Button>
            
            <div className="text-center flex-1">
              <p className="text-lg font-semibold capitalize">
                {format(currentMonth, 'MMMM yyyy', { locale: es })}
              </p>
              <p className="text-sm text-muted-foreground">
                {filteredExpenses.length} egreso{filteredExpenses.length !== 1 ? 's' : ''} • Total: {formatCurrency(kpis.total)}
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportToExcel}
                disabled={filteredExpenses.length === 0}
              >
                <FileSpreadsheet className="h-4 w-4 mr-1" />
                Exportar Excel
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newMonth = new Date(currentMonth);
                  newMonth.setMonth(newMonth.getMonth() + 1);
                  setCurrentMonth(newMonth);
                }}
                disabled={currentMonth >= startOfMonth(new Date())}
              >
                Mes siguiente
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog Modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingExpense ? 'Editar Egreso' : 'Nuevo Egreso'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="expense_date">Fecha *</Label>
                  <Input
                    id="expense_date"
                    type="date"
                    value={formData.expense_date}
                    onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="account_id">Cuenta *</Label>
                  <Select
                    value={formData.account_id}
                    onValueChange={(accountId) => setFormData({ ...formData, account_id: accountId })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cuenta" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name} ({account.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="amount">Monto (CLP) *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      id="amount"
                      type="text"
                      value={formatAmount(formData.amount)}
                      onChange={handleAmountChange}
                      placeholder="0"
                      className="pl-8"
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Formato automático con separador de miles
                  </p>
                </div>

                <div>
                  <Label htmlFor="expense_type">Tipo de Gasto *</Label>
                  <Select
                    value={formData.expense_type}
                    onValueChange={(value: any) => setFormData({ ...formData, expense_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSE_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Campo condicional: Gasto Recurrente (solo si tipo = Fijo) */}
              {formData.expense_type === 'Fijo' && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                  <Label htmlFor="recurring_id" className="text-blue-700 dark:text-blue-300">
                    ¿Es un gasto recurrente? (opcional)
                  </Label>
                  <Select
                    value={formData.recurring_id}
                    onValueChange={(value) => setFormData({ ...formData, recurring_id: value })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Seleccionar gasto recurrente..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Ninguno (gasto fijo puntual)</SelectItem>
                      {activeRecurringExpenses.map((re) => (
                        <SelectItem key={re.id} value={re.id}>
                          {re.name} ({re.category})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    Si vinculas a un gasto recurrente, aparecerá agrupado en los cierres financieros.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Categoría *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {expenseCategories.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="payment_method">Método de Pago *</Label>
                  <Select
                    value={formData.payment_method}
                    onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar método" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map((method) => (
                        <SelectItem key={method} value={method}>{method}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="supplier">Proveedor</Label>
                <SupplierSelect
                  value={formData.supplier}
                  onValueChange={(supplierId, supplierName) =>
                    setFormData({ ...formData, supplier: supplierName })
                  }
                />
              </div>

              {/* Switch de Documentación */}
              <div className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="documentation-switch" className="text-base font-medium flex items-center">
                      <Paperclip className="h-4 w-4 mr-2" />
                      Incluir Documentación
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Agrega información sobre boleta, factura o documento de respaldo
                    </p>
                  </div>
                  <Switch
                    id="documentation-switch"
                    checked={includeDocumentation}
                    onCheckedChange={setIncludeDocumentation}
                  />
                </div>

                {includeDocumentation && (
                  <div className="space-y-4 pt-4 border-t">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="document_type">Tipo de Documento *</Label>
                        <Select
                          value={formData.document_type}
                          onValueChange={(value) => setFormData({ ...formData, document_type: value })}
                          required={includeDocumentation}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            {DOCUMENT_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="document_number">Nº de Boleta / Factura *</Label>
                        <Input
                          id="document_number"
                          value={formData.document_number}
                          onChange={(e) => setFormData({ ...formData, document_number: e.target.value })}
                          placeholder="ej: 12345678"
                          required={includeDocumentation}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="attachment">Adjuntar Documento (Opcional)</Label>
                      <Input
                        id="attachment"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            // Validar tamaño (5MB)
                            if (file.size > 5 * 1024 * 1024) {
                              toast.error('Error', { description: 'El archivo no puede superar 5MB' });
                              e.target.value = '';
                              return;
                            }
                            setSelectedFile(file);
                            toast.success('Archivo seleccionado', { description: file.name });
                          }
                        }}
                      />
                      {selectedFile && (
                        <p className="text-sm text-green-600 mt-1">
                          📎 {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                        </p>
                      )}
                      {formData.attachment_url && !selectedFile && (
                        <p className="text-sm text-blue-600 mt-1">
                          📎 Documento actual adjunto
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Formatos: PDF, JPG, PNG (máx 5MB)
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  placeholder="Detalles adicionales del gasto..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingExpense ? 'Guardar Cambios' : 'Registrar Egreso'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="md:col-span-1 flex items-end">
              <BranchFilter value={filterBranch} onChange={setFilterBranch} className="w-full" alwaysShow />
            </div>
            <div>
              <Label>Desde</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !filterStartDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filterStartDate ? format(filterStartDate, 'dd/MM/yyyy') : 'Seleccionar'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={filterStartDate} onSelect={setFilterStartDate} locale={es} />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Hasta</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !filterEndDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filterEndDate ? format(filterEndDate, 'dd/MM/yyyy') : 'Seleccionar'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={filterEndDate} onSelect={setFilterEndDate} locale={es} />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Cuenta</Label>
              <Select value={filterAccount} onValueChange={setFilterAccount}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tipo</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {EXPENSE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Categoría</Label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {expenseCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Egresos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpis.total)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cantidad</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.count}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Promedio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpis.average)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Nuevo Egreso Button */}
      <div className="flex justify-end">
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Egreso
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Listado de Egresos</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredExpenses.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No hay egresos registrados
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Cuenta</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Método Pago</TableHead>
                    <TableHead>Notas</TableHead>
                    <TableHead className="text-center">Doc</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="font-medium">{formatDateShort(expense.expense_date)}</TableCell>
                      <TableCell>{expense.account?.name || '—'}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(Number(expense.amount))}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {expense.expense_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {expense.category}
                        </Badge>
                      </TableCell>
                      <TableCell>{expense.supplier || '—'}</TableCell>
                      <TableCell className="text-sm">{expense.payment_method || '—'}</TableCell>
                      <TableCell className="max-w-[200px]">
                        {expense.notes ? (
                          <p className="text-sm text-muted-foreground truncate" title={expense.notes}>
                            {expense.notes}
                          </p>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {expense.attachment_url ? (
                          <div className="flex gap-1 justify-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                try {
                                  // Verificar si la URL sigue siendo válida
                                  const response = await fetch(expense.attachment_url!);
                                  if (response.ok) {
                                    window.open(expense.attachment_url!, '_blank');
                                  } else {
                                    // Re-generar signedURL si expiró
                                    const pathMatch = expense.attachment_url!.match(/finance-documents\/(.+)\?/);
                                    if (pathMatch) {
                                      const { data } = await supabase.storage
                                        .from('finance-documents')
                                        .createSignedUrl(pathMatch[1], 3600);
                                      
                                      if (data?.signedUrl) {
                                        window.open(data.signedUrl, '_blank');
                                      }
                                    }
                                  }
                                } catch (error) {
                                  toast.error('Error', { description: 'No se pudo abrir el documento' });
                                }
                              }}
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                try {
                                  // Extraer el path del archivo
                                  const pathMatch = expense.attachment_url!.match(/finance-documents\/(.+)\?/);
                                  if (!pathMatch) {
                                    toast.error('Error', { description: 'No se pudo obtener el archivo' });
                                    return;
                                  }

                                  const filePath = pathMatch[1];
                                  
                                  // Obtener nueva URL firmada
                                  const { data: urlData } = await supabase.storage
                                    .from('finance-documents')
                                    .createSignedUrl(filePath, 60); // 1 minuto es suficiente para descarga

                                  if (!urlData?.signedUrl) {
                                    throw new Error('No se pudo generar URL de descarga');
                                  }

                                  // Descargar archivo
                                  const response = await fetch(urlData.signedUrl);
                                  if (!response.ok) throw new Error('Error al descargar');
                                  
                                  const blob = await response.blob();
                                  
                                  // Extraer extensión original
                                  const fileExt = filePath.split('.').pop() || 'pdf';
                                  
                                  // Generar nombre descriptivo
                                  const docType = expense.document_type ? 
                                    expense.document_type.toLowerCase().replace(/\s+/g, '_') : 
                                    'documento';
                                  const expenseId = expense.id.slice(0, 8);
                                  const fileName = `egreso_${expenseId}_${docType}.${fileExt}`;
                                  
                                  // Crear link temporal y descargar
                                  const url = window.URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = fileName;
                                  document.body.appendChild(a);
                                  a.click();
                                  window.URL.revokeObjectURL(url);
                                  document.body.removeChild(a);
                                  
                                  toast.success('Descarga iniciada', { description: fileName });
                                } catch (error) {
                                  console.error('Error downloading:', error);
                                  toast.error('Error', { description: 'No se pudo descargar el documento' });
                                }
                              }}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground mx-auto" />
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {canEdit(expense) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenDialog(expense)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {isAdmin && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDeleteConfirm(expense.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El egreso será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
