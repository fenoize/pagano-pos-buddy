import { useState, useMemo, useEffect } from 'react';
import { useFinanceExpenses } from '@/hooks/useFinanceExpenses';
import { useFinanceAccounts } from '@/hooks/useFinanceAccounts';
import { useAuth } from '@/hooks/useAuth';
import { SupplierSelect } from '@/components/finance/SupplierSelect';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, CalendarIcon, Paperclip, FileText, Settings } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { FinanceExpense } from '@/types/finance';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const EXPENSE_TYPES = ['Variable', 'Inversión', 'Otro'];

const DOCUMENT_TYPES = ['Boleta', 'Factura', 'Recibo', 'Otro'];

export default function FinanceExpenses() {
  const { user } = useAuth();
  const { expenses, loading: loadingExpenses, createExpense, updateExpense, deleteExpense } = useFinanceExpenses();
  const { accounts } = useFinanceAccounts();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<FinanceExpense | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('form');
  
  // Categorías dinámicas
  const [expenseCategories, setExpenseCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [editingCategoryIndex, setEditingCategoryIndex] = useState<number | null>(null);
  
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
    expense_type: 'Variable' as 'Variable' | 'Inversión' | 'Otro',
    category: '',
    supplier: '',
    payment_method: '',
    document_type: '',
    document_number: '',
    notes: '',
  });

  // Función para auto-calcular método de pago según tipo de cuenta
  const getPaymentMethodFromAccount = (accountId: string): string => {
    const selectedAccount = accounts.find((a) => a.id === accountId);
    if (!selectedAccount) return '';

    const methodMap: Record<string, string> = {
      'Banco': 'Transferencia',
      'Efectivo': 'Efectivo',
      'Digital': 'App / Link',
    };

    return methodMap[selectedAccount.type] || 'Efectivo';
  };

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
  }, []);

  // Guardar categorías en localStorage cuando cambien
  const saveCategories = (categories: string[]) => {
    setExpenseCategories(categories);
    localStorage.setItem('expense_categories', JSON.stringify(categories));
  };

  const addCategory = () => {
    if (!newCategory.trim()) return;
    if (expenseCategories.includes(newCategory.trim())) {
      toast({
        title: 'Error',
        description: 'Esta categoría ya existe',
        variant: 'destructive',
      });
      return;
    }
    const updated = [...expenseCategories, newCategory.trim()];
    saveCategories(updated);
    setNewCategory('');
    toast({
      title: 'Categoría agregada',
      description: `La categoría "${newCategory.trim()}" se agregó correctamente`,
    });
  };

  const deleteCategory = (index: number) => {
    const categoryToDelete = expenseCategories[index];
    if (!confirm(`¿Eliminar la categoría "${categoryToDelete}"?`)) return;
    
    const updated = expenseCategories.filter((_, i) => i !== index);
    saveCategories(updated);
    toast({
      title: 'Categoría eliminada',
      description: `La categoría "${categoryToDelete}" se eliminó correctamente`,
    });
  };

  const updateCategory = (index: number, newName: string) => {
    if (!newName.trim()) return;
    const updated = [...expenseCategories];
    updated[index] = newName.trim();
    saveCategories(updated);
    setEditingCategoryIndex(null);
    toast({
      title: 'Categoría actualizada',
      description: 'La categoría se actualizó correctamente',
    });
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
    setActiveTab('form');
    if (expense) {
      setEditingExpense(expense);
      const autoPaymentMethod = expense.account_id 
        ? getPaymentMethodFromAccount(expense.account_id)
        : '';
      
      setFormData({
        expense_date: expense.expense_date,
        account_id: expense.account_id,
        amount: expense.amount.toString(),
        expense_type: expense.expense_type,
        category: expense.category,
        supplier: expense.supplier || '',
        payment_method: autoPaymentMethod,
        document_type: '',
        document_number: '',
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
        document_type: '',
        document_number: '',
        notes: '',
      });
    }
    setIsDialogOpen(true);
  };

  const handleAccountChange = (accountId: string) => {
    const autoMethod = getPaymentMethodFromAccount(accountId);
    setFormData({
      ...formData,
      account_id: accountId,
      payment_method: autoMethod,
    });
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
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Egreso
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingExpense ? 'Editar Egreso' : 'Nuevo Egreso'}
              </DialogTitle>
            </DialogHeader>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="form">
                  <FileText className="h-4 w-4 mr-2" />
                  Formulario
                </TabsTrigger>
                <TabsTrigger value="categories">
                  <Settings className="h-4 w-4 mr-2" />
                  Gestionar Categorías
                </TabsTrigger>
              </TabsList>

              <TabsContent value="form" className="space-y-4 mt-4">
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
                        onValueChange={handleAccountChange}
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
                    <p className="text-xs text-muted-foreground mt-1">
                      ¿No encuentras tu categoría? Agrégala en la pestaña "Gestionar Categorías"
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="supplier">Proveedor</Label>
                      <SupplierSelect
                        value={formData.supplier}
                        onValueChange={(supplierId, supplierName) =>
                          setFormData({ ...formData, supplier: supplierName })
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor="payment_method">Método de Pago</Label>
                      <Input
                        id="payment_method"
                        value={formData.payment_method}
                        readOnly
                        disabled
                        className="bg-muted cursor-not-allowed"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Auto-asignado según la cuenta seleccionada
                      </p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3 flex items-center">
                      <Paperclip className="h-4 w-4 mr-2" />
                      Documentación
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="document_type">Tipo de Documento</Label>
                        <Select
                          value={formData.document_type}
                          onValueChange={(value) => setFormData({ ...formData, document_type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Opcional" />
                          </SelectTrigger>
                          <SelectContent>
                            {DOCUMENT_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="document_number">Nº de Boleta / Factura</Label>
                        <Input
                          id="document_number"
                          value={formData.document_number}
                          onChange={(e) => setFormData({ ...formData, document_number: e.target.value })}
                          placeholder="ej: 12345678"
                        />
                      </div>
                    </div>
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
              </TabsContent>

              <TabsContent value="categories" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Agregar Nueva Categoría</h4>
                    <div className="flex gap-2">
                      <Input
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        placeholder="Nombre de la categoría"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addCategory();
                          }
                        }}
                      />
                      <Button type="button" onClick={addCategory}>
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar
                      </Button>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Categorías Existentes</h4>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {expenseCategories.map((category, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                          {editingCategoryIndex === index ? (
                            <Input
                              value={category}
                              onChange={(e) => {
                                const updated = [...expenseCategories];
                                updated[index] = e.target.value;
                                setExpenseCategories(updated);
                              }}
                              onBlur={() => updateCategory(index, category)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  updateCategory(index, category);
                                }
                                if (e.key === 'Escape') {
                                  setEditingCategoryIndex(null);
                                }
                              }}
                              autoFocus
                              className="flex-1 mr-2"
                            />
                          ) : (
                            <span className="flex-1">{category}</span>
                          )}
                          <div className="flex gap-1">
                            {editingCategoryIndex === index ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => updateCategory(index, category)}
                              >
                                Guardar
                              </Button>
                            ) : (
                              <>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingCategoryIndex(index)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteCategory(index)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t">
                    <Button type="button" variant="outline" onClick={() => setActiveTab('form')}>
                      Volver al Formulario
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>

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
