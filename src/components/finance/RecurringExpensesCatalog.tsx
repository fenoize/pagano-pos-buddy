import { useState, useMemo } from 'react';
import { useRecurringExpenses, RecurringExpense } from '@/hooks/useRecurringExpenses';
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
import { Plus, Pencil, Trash2, RefreshCw } from 'lucide-react';

const CATEGORIES = [
  'Servicios Básicos',
  'Arriendo',
  'Internet y Telefonía',
  'Seguros',
  'Mantención',
  'Software',
  'Patentes',
  'Otros',
];

export function RecurringExpensesCatalog() {
  const {
    recurringExpenses,
    loading,
    createRecurringExpense,
    updateRecurringExpense,
    deleteRecurringExpense,
  } = useRecurringExpenses();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<RecurringExpense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<RecurringExpense | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    notes: '',
    is_active: true,
  });

  const filteredExpenses = useMemo(() => {
    return recurringExpenses.filter((expense) => {
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
  }, [recurringExpenses, filterStatus, searchTerm]);

  const handleOpenDialog = (expense?: RecurringExpense) => {
    if (expense) {
      setEditingExpense(expense);
      setFormData({
        name: expense.name,
        category: expense.category,
        notes: expense.notes || '',
        is_active: expense.is_active,
      });
    } else {
      setEditingExpense(null);
      setFormData({
        name: '',
        category: '',
        notes: '',
        is_active: true,
      });
    }
    setDialogOpen(true);
  };

  const handleSaveExpense = async () => {
    if (!formData.name || !formData.category) {
      return;
    }

    const payload = {
      name: formData.name,
      category: formData.category,
      notes: formData.notes || null,
      is_active: formData.is_active,
    };

    try {
      if (editingExpense) {
        await updateRecurringExpense(editingExpense.id, payload);
      } else {
        await createRecurringExpense(payload);
      }
      setDialogOpen(false);
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleDeleteClick = (expense: RecurringExpense) => {
    setExpenseToDelete(expense);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (expenseToDelete) {
      await deleteRecurringExpense(expenseToDelete.id);
      setDeleteDialogOpen(false);
      setExpenseToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Cargando catálogo...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Catálogo de Gastos Recurrentes</h2>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Gasto Recurrente
          </Button>
        </div>
        <p className="text-muted-foreground text-sm">
          Define aquí los tipos de gastos recurrentes (luz, agua, arriendo, etc.). Luego podrás
          vincularlos al registrar egresos fijos cada mes.
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <CardTitle>Gastos Recurrentes ({filteredExpenses.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredExpenses.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No hay gastos recurrentes configurados
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Notas</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="font-medium">{expense.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{expense.category}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {expense.notes || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={expense.is_active ? 'default' : 'secondary'}>
                        {expense.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingExpense ? 'Editar Gasto Recurrente' : 'Nuevo Gasto Recurrente'}
            </DialogTitle>
            <DialogDescription>
              Define un tipo de gasto fijo recurrente para poder vincularlo a los egresos mensuales.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Nombre <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Ej: Cuenta de Luz, Agua Potable, Arriendo..."
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">
                Categoría <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.category}
                onValueChange={(v) => setFormData({ ...formData, category: v })}
              >
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

            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                placeholder="Observaciones adicionales..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Activo</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveExpense} disabled={!formData.name || !formData.category}>
              {editingExpense ? 'Guardar Cambios' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar gasto recurrente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará "{expenseToDelete?.name}" del catálogo. Los egresos ya
              registrados con este tipo se mantendrán, pero perderán la vinculación.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
