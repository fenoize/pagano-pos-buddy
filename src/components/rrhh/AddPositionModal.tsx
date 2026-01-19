import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import type { HRShiftRole, HRShiftType, HRSchedulePositionFormData } from '@/types/hr';

interface AddPositionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roles: HRShiftRole[];
  shiftTypes: HRShiftType[];
  onSave: (data: HRSchedulePositionFormData) => Promise<void>;
}

export function AddPositionModal({
  open,
  onOpenChange,
  roles,
  shiftTypes,
  onSave
}: AddPositionModalProps) {
  const [roleId, setRoleId] = useState('');
  const [shiftTypeId, setShiftTypeId] = useState('');
  const [saving, setSaving] = useState(false);

  const activeRoles = roles.filter(r => r.is_active);
  const activeShiftTypes = shiftTypes.filter(st => st.is_active);

  useEffect(() => {
    if (open) {
      setRoleId('');
      setShiftTypeId(activeShiftTypes[0]?.id || '');
    }
  }, [open, activeShiftTypes]);

  const handleSave = async () => {
    if (!roleId || !shiftTypeId) return;

    setSaving(true);
    try {
      await onSave({ role_id: roleId, shift_type_id: shiftTypeId });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const isValid = roleId && shiftTypeId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Agregar Posición</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Role */}
          <div className="space-y-2">
            <Label>Rol requerido</Label>
            <Select value={roleId} onValueChange={setRoleId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar rol" />
              </SelectTrigger>
              <SelectContent>
                {activeRoles.map(role => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {activeRoles.length === 0 && (
              <p className="text-sm text-destructive">
                No hay roles activos. Crea uno en la pestaña "Roles".
              </p>
            )}
          </div>

          {/* Shift Type */}
          <div className="space-y-2">
            <Label>Tipo de turno</Label>
            <Select value={shiftTypeId} onValueChange={setShiftTypeId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                {activeShiftTypes.map(st => (
                  <SelectItem key={st.id} value={st.id}>
                    {st.name} ({st.default_hours}h)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {activeShiftTypes.length === 0 && (
              <p className="text-sm text-destructive">
                No hay tipos de turno activos. Crea uno en la pestaña "Tipos de Turno".
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!isValid || saving}>
            {saving ? 'Agregando...' : 'Agregar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
