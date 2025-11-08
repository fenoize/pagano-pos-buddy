import { useState, useMemo } from 'react';
import { useFinanceExpenses } from '@/hooks/useFinanceExpenses';
import { useFinanceAccounts } from '@/hooks/useFinanceAccounts';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { FinanceExpense } from '@/types/finance';
import { cn } from '@/lib/utils';

const EXPENSE_CATEGORIES = [
  'Insumos',
  'Arriendo',
  'Servicios',
  'Mantención',
  'Marketing',
  'Sueldos',
  'Impuestos',
  'Otros'
];

const EXPENSE_TYPES = ['Fijo', 'Variable', 'Inversión', 'Otro'];

export default function FinanceExpenses() {
  const { user } = useAuth();
  const { expenses, loading: loadingExpenses, createExpense, updateExpense, deleteExpense } = useFinanceExpenses();
  const { accounts } = useFinanceAccounts();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<FinanceExpense | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  
  // Filters
  const [filterStartDate, setFilterStartDate] = useState<Date | undefined>();
  const [filterEndDate, setFilterEndDate] = useState<Date | undefined>();
  const [filterAccount, setFilterAccount] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const [formData, setFormData] = useState({
    expense_date: format(new Date(), 'yyyy-MM-dd'),
    account_id: '',
    amount: '',
    expense_type: 'Variable' as 'Fijo' | 'Variable' | 'Inversión' | 'Otro',
    category: '',
    supplier: '',
    payment_method: '',
    notes: '',
  });

  const isAdmin = user?.role === 'Administrador';
  const activeAccounts = accounts.filter(a => a.is_active);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => {
      const expenseDate = new Date(expense.expense_date);
      
      if (filterStartDate && expenseDate < filterStartDate) return false;
      if (filterEndDate && expenseDate > filterEndDate) return false;
      if (filterAccount !== 'all' && expense.account_id !== filterAccount) return false;
      if (filterType !== 'all' && expense.expense_type !== filterType) return false;
      if (filterCategory !== 'all' && expense.category !== filterCategory) return false;
      
      return true;
    });
  }, [expenses, filterStartDate, filterEndDate, filterAccount, filterType, filterCategory]);

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
        expense_type: expense.expense_type,
        category: expense.category,
        supplier: expense.supplier || '',
        payment_method: expense.payment_method || '',
        notes: expense.notes || '',
      });
    } else {
      setEditingExpense(null);
      setFormData({
        expense_date: format(new Date(), 'yyyy-MM-dd'),
        account_id: activeAccounts[0]?.id || '',
        amount: '',
        expense_type: 'Variable',
        category: '',
        supplier: '',
        payment_method: '',
        notes: '',
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      expense_date: formData.expense_date,
      account_id: formData.account_id,
      amount: parseFloat(formData.amount),
      currency: 'CLP',
      expense_type: formData.expense_type,
      category: formData.category,
      supplier: formData.supplier || null,
      payment_method: formData.payment_method || null,
      notes: formData.notes || null,
      attachment_url: null,
    };

    const success = editingExpense
      ? await updateExpense(editingExpense.id, data)
      : await createExpense(data);

    if (success) {
      setIsDialogOpen(false);
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

  if (loadingExpenses) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Egresos</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Egreso
            </Button>
          </DialogTrigger>
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
                    onValueChange={(value) => setFormData({ ...formData, account_id: value })}
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
                  <Input
                    id="amount"
                    type="number"
                    min="1"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                  />
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
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="supplier">Proveedor</Label>
                  <Input
                    id="supplier"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="payment_method">Método de Pago</Label>
                  <Input
                    id="payment_method"
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
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
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
                  {EXPENSE_CATEGORIES.map((cat) => (
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
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>{format(new Date(expense.expense_date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{expense.account?.name || '—'}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(Number(expense.amount))}</TableCell>
                      <TableCell>{expense.expense_type}</TableCell>
                      <TableCell>{expense.category}</TableCell>
                      <TableCell>{expense.supplier || '—'}</TableCell>
                      <TableCell>{expense.payment_method || '—'}</TableCell>
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
