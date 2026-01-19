import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
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
import { Loader2, Pencil, Trash2, Check, CheckCheck, Eye, Calendar, User, Briefcase, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { HRShift, HRShiftFormData, HREmployee, HRShiftType, HRShiftRole, HRShiftStatus } from '@/types/hr';
import { getRoleIcon } from '@/lib/roleIcons';

interface ShiftDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shift: HRShift | null;
  mode: 'view' | 'edit';
  employees: HREmployee[];
  shiftTypes: HRShiftType[];
  roles: HRShiftRole[];
  onUpdate?: (id: string, data: Partial<HRShiftFormData>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onConfirm?: (id: string) => Promise<void>;
  onApprove?: (id: string) => Promise<void>;
}

const statusConfig: Record<HRShiftStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  draft: { label: 'Borrador', variant: 'outline' },
  confirmed: { label: 'Confirmado', variant: 'secondary' },
  approved: { label: 'Aprobado', variant: 'default' },
  paid: { label: 'Pagado', variant: 'destructive' },
};

export function ShiftDetailModal({
  open,
  onOpenChange,
  shift,
  mode: initialMode,
  employees,
  shiftTypes,
  roles,
  onUpdate,
  onDelete,
  onConfirm,
  onApprove,
}: ShiftDetailModalProps) {
  const [mode, setMode] = useState<'view' | 'edit'>(initialMode);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [formData, setFormData] = useState<Partial<HRShiftFormData>>({});

  // Reset mode and form when modal opens/shift changes
  useEffect(() => {
    if (open && shift) {
      setMode(initialMode);
      setFormData({
        employee_id: shift.employee_id || '',
        shift_date: shift.shift_date,
        shift_type_id: shift.shift_type_id,
        role_id: shift.role_id,
        hours_override: shift.hours_override,
        notes: shift.notes || '',
      });
    }
  }, [open, shift, initialMode]);

  const activeEmployees = useMemo(() => employees.filter(e => e.is_active), [employees]);
  const activeShiftTypes = useMemo(() => shiftTypes.filter(t => t.is_active), [shiftTypes]);
  const activeRoles = useMemo(() => roles.filter(r => r.is_active), [roles]);

  if (!shift) return null;

  const canEdit = shift.status === 'draft' || shift.status === 'confirmed';
  const canDelete = shift.status === 'draft' || shift.status === 'confirmed';
  const canConfirm = shift.status === 'draft';
  const canApprove = shift.status === 'confirmed';

  const RoleIcon = getRoleIcon(shift.role?.name || '');

  const handleSave = async () => {
    if (!onUpdate) return;
    setSaving(true);
    try {
      await onUpdate(shift.id, formData);
      setMode('view');
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setSaving(true);
    try {
      await onDelete(shift.id);
      setDeleteOpen(false);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirm = async () => {
    if (!onConfirm) return;
    setSaving(true);
    try {
      await onConfirm(shift.id);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!onApprove) return;
    setSaving(true);
    try {
      await onApprove(shift.id);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {mode === 'view' ? (
                <>
                  <Eye className="h-5 w-5" />
                  Detalle del Turno
                </>
              ) : (
                <>
                  <Pencil className="h-5 w-5" />
                  Editar Turno
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {format(parseISO(shift.shift_date), "EEEE d 'de' MMMM, yyyy", { locale: es })}
            </DialogDescription>
          </DialogHeader>

          {mode === 'view' ? (
            // View Mode
            <div className="space-y-4 py-4">
              {/* Status */}
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Estado</span>
                <Badge variant={statusConfig[shift.status].variant}>
                  {statusConfig[shift.status].label}
                </Badge>
              </div>

              {/* Employee */}
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">Empleado</div>
                  <div className="font-medium">
                    {shift.employee?.full_name || 'Sin asignar'}
                  </div>
                </div>
              </div>

              {/* Role & Type */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <RoleIcon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">Rol</div>
                    <div className="font-medium">{shift.role?.name || '-'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">Tipo</div>
                    <div className="font-medium">{shift.shift_type?.name || '-'}</div>
                  </div>
                </div>
              </div>

              {/* Hours */}
              {shift.hours_override && (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">Horas</div>
                    <div className="font-medium">{shift.hours_override}h</div>
                  </div>
                </div>
              )}

              {/* Notes */}
              {shift.notes && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Notas</div>
                  <div className="text-sm">{shift.notes}</div>
                </div>
              )}
            </div>
          ) : (
            // Edit Mode
            <div className="space-y-4 py-4">
              <div>
                <Label>Empleado</Label>
                <Select
                  value={formData.employee_id || ''}
                  onValueChange={(val) => setFormData(f => ({ ...f, employee_id: val }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sin asignar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin asignar</SelectItem>
                    {activeEmployees.map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={formData.shift_date || ''}
                  onChange={(e) => setFormData(f => ({ ...f, shift_date: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipo de Turno</Label>
                  <Select
                    value={formData.shift_type_id || ''}
                    onValueChange={(val) => setFormData(f => ({ ...f, shift_type_id: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeShiftTypes.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Rol</Label>
                  <Select
                    value={formData.role_id || ''}
                    onValueChange={(val) => setFormData(f => ({ ...f, role_id: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
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
                  value={formData.notes || ''}
                  onChange={(e) => setFormData(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {mode === 'view' ? (
              <>
                {canDelete && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteOpen(true)}
                    className="mr-auto"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Eliminar
                  </Button>
                )}
                <div className="flex gap-2">
                  {canConfirm && (
                    <Button variant="secondary" size="sm" onClick={handleConfirm} disabled={saving}>
                      <Check className="h-4 w-4 mr-1" />
                      Confirmar
                    </Button>
                  )}
                  {canApprove && (
                    <Button variant="default" size="sm" onClick={handleApprove} disabled={saving}>
                      <CheckCheck className="h-4 w-4 mr-1" />
                      Aprobar
                    </Button>
                  )}
                  {canEdit && (
                    <Button variant="outline" size="sm" onClick={() => setMode('edit')}>
                      <Pencil className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setMode('view')} disabled={saving}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={saving || !formData.shift_type_id || !formData.role_id}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Guardar
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar turno?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El turno será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={saving} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
