import React, { useState, useMemo } from 'react';
import { useFixedExpenses } from '@/hooks/useFixedExpenses';
import { useFinanceAccounts } from '@/hooks/useFinanceAccounts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Building2, Plus, Pencil, Trash2, TrendingUp, Hash, DollarSign } from 'lucide-react';
import type { FixedExpense } from '@/types/finance';

const DEPARTMENTS = ['Operativo', 'Administración', 'Boss', 'Digital'];
const CATEGORIES = [
  'Arriendo',
  'Sueldo',
  'Servicios Básicos',
  'Internet y Telefonía',
  'Seguros',
  'Mantención',
  'Patentes',
  'Asesorías',
  'Software',
  'Otros',
];
const FREQUENCIES = [
  { value: 'monthly', label: 'Mensual' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'yearly', label: 'Anual' },
];
const DOCUMENT_TYPES = ['Factura', 'Boleta', 'Sin documento', 'Otros'];

export default function FixedExpenses() {
  const { fixedExpenses, loading, createFixedExpense, updateFixedExpense, deleteFixedExpense } =
    useFixedExpenses();
  const { accounts } = useFinanceAccounts();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<FixedExpense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<FixedExpense | null>(null);

  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    department: '',
    category: '',
    amount: '',
    frequency: 'monthly',
    payment_day: '',
    account_id: '',
    document_type: '',
    notes: '',
    is_active: true,
    start_date: '',
    end_date: '',
  });

  const filteredExpenses = useMemo(() => {
    return fixedExpenses.filter((expense) => {
      if (filterDepartment !== 'all' && expense.department !== filterDepartment) return false;
      if (filterStatus === 'active' && !expense.is_active) return false;
      if (filterStatus === 'inactive' && expense.is_active) return false;
      if (
        searchTerm &&
        !expense.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !expense.category.toLowerCase().includes(searchTerm.toLowerCase())
      )
        return false;
      return true;
    });
  }, [fixedExpenses, filterDepartment, filterStatus, searchTerm]);

  const kpis = useMemo(() => {
    const activeExpenses = fixedExpenses.filter((e) => e.is_active);
    const totalAmount = activeExpenses.reduce((sum, e) => {
      // Convertir todo a monto mensual para KPI
      let monthlyAmount = Number(e.amount);
      if (e.frequency === 'weekly') monthlyAmount = monthlyAmount * 4.33;
      if (e.frequency === 'yearly') monthlyAmount = monthlyAmount / 12;
      return sum + monthlyAmount;
    }, 0);

    return {
      total: totalAmount,
      count: activeExpenses.length,
      average: activeExpenses.length > 0 ? totalAmount / activeExpenses.length : 0,
    };
  }, [fixedExpenses]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);
  };

  const handleOpenDialog = (expense?: FixedExpense) => {
    if (expense) {
      setEditingExpense(expense);
      setFormData({
        name: expense.name,
        department: expense.department,
        category: expense.category,
        amount: expense.amount.toString(),
        frequency: expense.frequency,
        payment_day: expense.payment_day?.toString() || '',
        account_id: expense.account_id || '',
        document_type: expense.document_type || '',
        notes: expense.notes || '',
        is_active: expense.is_active,
        start_date: expense.start_date || '',
        end_date: expense.end_date || '',
      });
    } else {
      setEditingExpense(null);
      setFormData({
        name: '',
        department: '',
        category: '',
        amount: '',
        frequency: 'monthly',
        payment_day: '',
        account_id: '',
        document_type: '',
        notes: '',
        is_active: true,
        start_date: '',
        end_date: '',
      });
    }
    setDialogOpen(true);
  };

  const handleSaveExpense = async () => {
    if (!formData.name || !formData.department || !formData.category || !formData.amount) {
      return;
    }

    const payload: any = {
      name: formData.name,
      department: formData.department,
      category: formData.category,
      amount: parseFloat(formData.amount),
      frequency: formData.frequency,
      payment_day: formData.payment_day ? parseInt(formData.payment_day) : null,
      account_id: formData.account_id || null,
      document_type: formData.document_type || null,
      notes: formData.notes || null,
      is_active: formData.is_active,
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
    };

    try {
      if (editingExpense) {
        await updateFixedExpense(editingExpense.id, payload);
      } else {
        await createFixedExpense(payload);
      }
      setDialogOpen(false);
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleDeleteClick = (expense: FixedExpense) => {
    setExpenseToDelete(expense);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (expenseToDelete) {
      await deleteFixedExpense(expenseToDelete.id);
      setDeleteDialogOpen(false);
      setExpenseToDelete(null);
    }
  };

  const getFrequencyLabel = (freq: string) => {
    return FREQUENCIES.find((f) => f.value === freq)?.label || freq;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Cargando gastos fijos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Gastos Fijos</h1>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Gasto Fijo
          </Button>
        </div>
        <p className="text-muted-foreground">
          Aquí configuras los gastos fijos del restaurant (arriendo, sueldos, servicios, etc.). El
          sistema los incluye automáticamente en los cierres financieros.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Mensual (Activos)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpis.total)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos Activos</CardTitle>
            <Hash className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.count}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promedio por Gasto</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpis.average)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Departamento</Label>
              <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {DEPARTMENTS.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Estado</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Activos</SelectItem>
                  <SelectItem value="inactive">Inactivos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Buscar</Label>
              <Input
                placeholder="Nombre o categoría..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Gastos Fijos ({filteredExpenses.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredExpenses.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No hay gastos fijos registrados
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Frecuencia</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Vigencia</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>
                      <Badge variant="outline">{expense.department}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{expense.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {expense.category}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(Number(expense.amount))}
                    </TableCell>
                    <TableCell>{getFrequencyLabel(expense.frequency)}</TableCell>
                    <TableCell>
                      <Badge variant={expense.is_active ? 'default' : 'secondary'}>
                        {expense.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {expense.start_date || '-'} {expense.end_date && `→ ${expense.end_date}`}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(expense)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(expense)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingExpense ? 'Editar Gasto Fijo' : 'Nuevo Gasto Fijo'}
            </DialogTitle>
            <DialogDescription>
              Configura un gasto fijo recurrente que se incluirá automáticamente en los cierres.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="department">
                  Departamento <span className="text-destructive">*</span>
                </Label>
                <Select value={formData.department} onValueChange={(v) => setFormData({ ...formData, department: v })}>
                  <SelectTrigger id="department">
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">
                  Categoría <span className="text-destructive">*</span>
                </Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">
                Nombre <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Ej: Arriendo Local Centro"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">
                  Monto <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="frequency">
                  Frecuencia <span className="text-destructive">*</span>
                </Label>
                <Select value={formData.frequency} onValueChange={(v) => setFormData({ ...formData, frequency: v })}>
                  <SelectTrigger id="frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map((freq) => (
                      <SelectItem key={freq.value} value={freq.value}>
                        {freq.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment_day">Día de Pago (1-31)</Label>
                <Input
                  id="payment_day"
                  type="number"
                  min="1"
                  max="31"
                  placeholder="Opcional"
                  value={formData.payment_day}
                  onChange={(e) => setFormData({ ...formData, payment_day: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="account_id">Cuenta</Label>
                <Select value={formData.account_id} onValueChange={(v) => setFormData({ ...formData, account_id: v })}>
                  <SelectTrigger id="account_id">
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin cuenta</SelectItem>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="document_type">Tipo Doc</Label>
                <Select value={formData.document_type} onValueChange={(v) => setFormData({ ...formData, document_type: v })}>
                  <SelectTrigger id="document_type">
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin tipo</SelectItem>
                    {DOCUMENT_TYPES.map((doc) => (
                      <SelectItem key={doc} value={doc}>
                        {doc}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Fecha Inicio</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_date">Fecha Fin</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                placeholder="Observaciones adicionales..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Gasto activo</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveExpense}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar gasto fijo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El gasto "{expenseToDelete?.name}" será eliminado
              permanentemente y no aparecerá en futuros cierres.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
