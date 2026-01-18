import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Trash2, Loader2, TrendingUp, TrendingDown, MinusCircle } from 'lucide-react';
import { useHRPayAdjustments } from '@/hooks/useHRPayAdjustments';
import { useHREmployees } from '@/hooks/useHREmployees';
import { HRPayAdjustmentFormData, HRAdjustmentType } from '@/types/hr';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

const typeConfig: Record<HRAdjustmentType, { label: string; color: string; icon: typeof TrendingUp }> = {
  bonus: { label: 'Bono', color: 'text-green-600', icon: TrendingUp },
  advance: { label: 'Adelanto', color: 'text-orange-600', icon: MinusCircle },
  discount: { label: 'Descuento', color: 'text-red-600', icon: TrendingDown },
};

function RRHHAjustes() {
  const { adjustments, loading, createAdjustment, updateAdjustment, deleteAdjustment } = useHRPayAdjustments();
  const { activeEmployees } = useHREmployees();
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<HRPayAdjustmentFormData>({
    employee_id: '',
    type: 'bonus',
    amount: 0,
    description: '',
    period_start: null,
    period_end: null,
  });

  const formatCLP = (amount: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount);
  };

  const handleOpen = (adjustment?: any) => {
    if (adjustment) {
      setEditing(adjustment);
      setForm({
        employee_id: adjustment.employee_id,
        type: adjustment.type,
        amount: adjustment.amount,
        description: adjustment.description || '',
        period_start: adjustment.period_start,
        period_end: adjustment.period_end,
      });
    } else {
      setEditing(null);
      setForm({
        employee_id: activeEmployees[0]?.id || '',
        type: 'bonus',
        amount: 0,
        description: '',
        period_start: null,
        period_end: null,
      });
    }
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.employee_id || form.amount <= 0) {
      toast.error('Completa todos los campos requeridos');
      return;
    }
    
    try {
      if (editing) {
        await updateAdjustment(editing.id, form);
      } else {
        await createAdjustment(form);
      }
      setModalOpen(false);
    } catch (e) {}
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este ajuste?')) return;
    try {
      await deleteAdjustment(id);
    } catch (e) {}
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Ajustes de Pago</h1>
          <p className="text-muted-foreground">Gestiona bonos, adelantos y descuentos</p>
        </div>
        <Button onClick={() => handleOpen()}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Ajuste
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
                  <TableHead>Empleado</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adjustments.map((adj) => {
                  const config = typeConfig[adj.type as HRAdjustmentType];
                  const Icon = config?.icon || TrendingUp;
                  return (
                    <TableRow key={adj.id}>
                      <TableCell className="font-medium">{adj.employee?.full_name}</TableCell>
                      <TableCell>
                        <div className={`flex items-center gap-1 ${config?.color}`}>
                          <Icon className="h-4 w-4" />
                          <span>{config?.label}</span>
                        </div>
                      </TableCell>
                      <TableCell className={`text-right font-mono ${config?.color}`}>
                        {adj.type === 'bonus' ? '+' : '-'}{formatCLP(adj.amount)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {adj.period_start && adj.period_end ? (
                          <>
                            {format(parseISO(adj.period_start), 'dd/MM', { locale: es })} - {format(parseISO(adj.period_end), 'dd/MM/yy', { locale: es })}
                          </>
                        ) : (
                          <span className="text-muted-foreground">Sin período</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{adj.description || '-'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(parseISO(adj.created_at), 'dd/MM/yy', { locale: es })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleOpen(adj)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(adj.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {adjustments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No hay ajustes registrados
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Ajuste' : 'Nuevo Ajuste'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Empleado *</Label>
              <Select value={form.employee_id} onValueChange={(val) => setForm(f => ({ ...f, employee_id: val }))}>
                <SelectTrigger><SelectValue placeholder="Selecciona empleado" /></SelectTrigger>
                <SelectContent>
                  {activeEmployees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo *</Label>
                <Select value={form.type} onValueChange={(val) => setForm(f => ({ ...f, type: val as HRAdjustmentType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bonus">Bono</SelectItem>
                    <SelectItem value="advance">Adelanto</SelectItem>
                    <SelectItem value="discount">Descuento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Monto (CLP) *</Label>
                <Input 
                  type="number"
                  min={0}
                  value={form.amount}
                  onChange={(e) => setForm(f => ({ ...f, amount: Number(e.target.value) }))}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Período Desde</Label>
                <Input 
                  type="date"
                  value={form.period_start || ''}
                  onChange={(e) => setForm(f => ({ ...f, period_start: e.target.value || null }))}
                />
              </div>
              <div>
                <Label>Período Hasta</Label>
                <Input 
                  type="date"
                  value={form.period_end || ''}
                  onChange={(e) => setForm(f => ({ ...f, period_end: e.target.value || null }))}
                />
              </div>
            </div>
            
            <div>
              <Label>Descripción</Label>
              <Textarea 
                value={form.description}
                onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Motivo del ajuste..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default RRHHAjustes;
