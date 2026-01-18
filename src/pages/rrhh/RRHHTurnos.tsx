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
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, Plus, Check, CheckCheck, Trash2, Loader2, Filter } from 'lucide-react';
import { useHRShifts } from '@/hooks/useHRShifts';
import { useHREmployees } from '@/hooks/useHREmployees';
import { useHRShiftConfig } from '@/hooks/useHRShiftConfig';
import { HRShiftFormData, HRShiftStatus } from '@/types/hr';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const statusConfig: Record<HRShiftStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  draft: { label: 'Borrador', variant: 'outline' },
  confirmed: { label: 'Confirmado', variant: 'secondary' },
  approved: { label: 'Aprobado', variant: 'default' },
  paid: { label: 'Pagado', variant: 'destructive' },
};

function RRHHTurnos() {
  const { 
    shifts, loading, filters, setFilters, 
    createShift, confirmShift, approveShift, deleteShift,
    bulkConfirm, bulkApprove,
  } = useHRShifts();
  const { activeEmployees } = useHREmployees();
  const { activeRoles, activeShiftTypes } = useHRShiftConfig();
  
  const [modalOpen, setModalOpen] = useState(false);
  const [shiftForm, setShiftForm] = useState<HRShiftFormData>({
    employee_id: '',
    shift_date: format(new Date(), 'yyyy-MM-dd'),
    shift_type_id: '',
    role_id: '',
    notes: '',
  });
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const handleOpenModal = () => {
    setShiftForm({
      employee_id: '',
      shift_date: format(new Date(), 'yyyy-MM-dd'),
      shift_type_id: activeShiftTypes[0]?.id || '',
      role_id: activeRoles[0]?.id || '',
      notes: '',
    });
    setModalOpen(true);
  };

  const handleSaveShift = async () => {
    try {
      await createShift(shiftForm);
      setModalOpen(false);
    } catch (e) {}
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const selectableIds = shifts
        .filter(s => s.status === 'draft' || s.status === 'confirmed')
        .map(s => s.id);
      setSelectedIds(selectableIds);
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelect = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(i => i !== id));
    }
  };

  const handleBulkConfirm = async () => {
    const draftIds = selectedIds.filter(id => {
      const shift = shifts.find(s => s.id === id);
      return shift?.status === 'draft';
    });
    if (draftIds.length > 0) {
      await bulkConfirm(draftIds);
      setSelectedIds([]);
    }
  };

  const handleBulkApprove = async () => {
    const confirmedIds = selectedIds.filter(id => {
      const shift = shifts.find(s => s.id === id);
      return shift?.status === 'confirmed';
    });
    if (confirmedIds.length > 0) {
      await bulkApprove(confirmedIds);
      setSelectedIds([]);
    }
  };

  const draftSelected = selectedIds.filter(id => shifts.find(s => s.id === id)?.status === 'draft').length;
  const confirmedSelected = selectedIds.filter(id => shifts.find(s => s.id === id)?.status === 'confirmed').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Gestión de Turnos</h1>
          <p className="text-muted-foreground">Registra y gestiona turnos del personal</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
          <Button onClick={handleOpenModal}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Turno
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <Label>Desde</Label>
                <Input 
                  type="date" 
                  value={filters.dateFrom || ''}
                  onChange={(e) => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
                />
              </div>
              <div>
                <Label>Hasta</Label>
                <Input 
                  type="date" 
                  value={filters.dateTo || ''}
                  onChange={(e) => setFilters(f => ({ ...f, dateTo: e.target.value }))}
                />
              </div>
              <div>
                <Label>Empleado</Label>
                <Select 
                  value={filters.employeeId || ''} 
                  onValueChange={(val) => setFilters(f => ({ ...f, employeeId: val || undefined }))}
                >
                  <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    {activeEmployees.map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo</Label>
                <Select 
                  value={filters.shiftTypeId || ''} 
                  onValueChange={(val) => setFilters(f => ({ ...f, shiftTypeId: val || undefined }))}
                >
                  <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    {activeShiftTypes.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Estado</Label>
                <Select 
                  value={filters.status || ''} 
                  onValueChange={(val) => setFilters(f => ({ ...f, status: (val as HRShiftStatus) || undefined }))}
                >
                  <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    <SelectItem value="draft">Borrador</SelectItem>
                    <SelectItem value="confirmed">Confirmado</SelectItem>
                    <SelectItem value="approved">Aprobado</SelectItem>
                    <SelectItem value="paid">Pagado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <Card className="bg-muted/50">
          <CardContent className="py-3 flex items-center justify-between">
            <span className="text-sm">{selectedIds.length} turno(s) seleccionado(s)</span>
            <div className="flex gap-2">
              {draftSelected > 0 && (
                <Button size="sm" variant="secondary" onClick={handleBulkConfirm}>
                  <Check className="h-4 w-4 mr-1" />
                  Confirmar ({draftSelected})
                </Button>
              )}
              {confirmedSelected > 0 && (
                <Button size="sm" onClick={handleBulkApprove}>
                  <CheckCheck className="h-4 w-4 mr-1" />
                  Aprobar ({confirmedSelected})
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
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
                  <TableHead className="w-12">
                    <Checkbox 
                      checked={selectedIds.length > 0 && selectedIds.length === shifts.filter(s => s.status !== 'paid' && s.status !== 'approved').length}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shifts.map((shift) => {
                  const canSelect = shift.status === 'draft' || shift.status === 'confirmed';
                  return (
                    <TableRow key={shift.id}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedIds.includes(shift.id)}
                          onCheckedChange={(checked) => handleSelect(shift.id, !!checked)}
                          disabled={!canSelect}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {format(parseISO(shift.shift_date), 'EEE dd MMM', { locale: es })}
                      </TableCell>
                      <TableCell>{shift.employee?.full_name || '-'}</TableCell>
                      <TableCell>{shift.shift_type?.name || '-'}</TableCell>
                      <TableCell>{shift.role?.name || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={statusConfig[shift.status].variant}>
                          {statusConfig[shift.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {shift.status === 'draft' && (
                            <Button variant="ghost" size="sm" onClick={() => confirmShift(shift.id)}>
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          {shift.status === 'confirmed' && (
                            <Button variant="ghost" size="sm" onClick={() => approveShift(shift.id)}>
                              <CheckCheck className="h-4 w-4" />
                            </Button>
                          )}
                          {(shift.status === 'draft' || shift.status === 'confirmed') && (
                            <Button variant="ghost" size="sm" onClick={() => deleteShift(shift.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {shifts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No hay turnos en el rango seleccionado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* New Shift Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Turno</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Empleado *</Label>
              <Select 
                value={shiftForm.employee_id} 
                onValueChange={(val) => setShiftForm(f => ({ ...f, employee_id: val }))}
              >
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {activeEmployees.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fecha *</Label>
              <Input 
                type="date"
                value={shiftForm.shift_date}
                onChange={(e) => setShiftForm(f => ({ ...f, shift_date: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo de Turno *</Label>
                <Select 
                  value={shiftForm.shift_type_id} 
                  onValueChange={(val) => setShiftForm(f => ({ ...f, shift_type_id: val }))}
                >
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {activeShiftTypes.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Rol *</Label>
                <Select 
                  value={shiftForm.role_id} 
                  onValueChange={(val) => setShiftForm(f => ({ ...f, role_id: val }))}
                >
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {activeRoles.map(r => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea 
                value={shiftForm.notes || ''}
                onChange={(e) => setShiftForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveShift} disabled={!shiftForm.employee_id || !shiftForm.shift_type_id || !shiftForm.role_id}>
              Crear Turno
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default RRHHTurnos;
