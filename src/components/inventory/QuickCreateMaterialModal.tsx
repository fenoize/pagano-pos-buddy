import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUOM } from '@/hooks/useUOM';
import { supabase } from '@/integrations/supabase/client';
import { STORAGE_KEYS } from '@/lib/storageKeys';
import { toast } from '@/hooks/use-toast';
import { toast } from "sonner";
interface QuickCreateMaterialModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (material: { id: string; name: string; base_uom_id?: string; last_cost?: number }) => void;
  createMaterial?: (material: any) => Promise<{ success: boolean; data?: any }>;
}

export function QuickCreateMaterialModal({
  open,
  onOpenChange,
  onCreated,
}: QuickCreateMaterialModalProps) {
  const { uoms } = useUOM();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [baseUomId, setBaseUomId] = useState('');
  const [lastCost, setLastCost] = useState(0);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const staffUser = JSON.parse(localStorage.getItem(STORAGE_KEYS.STAFF_USER) || '{}');
      const userId = staffUser?.id;
      if (!userId) throw new Error('No se encontró sesión de usuario');

      const { data, error } = await supabase.rpc('quick_create_raw_material', {
        p_user_id: userId,
        p_name: name.trim(),
        p_code: code.trim() || null,
        p_base_uom_id: baseUomId || null,
        p_last_cost: lastCost || 0,
      });

      if (error) throw error;

      toast.success('Éxito', { description: 'Material creado correctamente' });
      onCreated(data as any);
      resetForm();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating material:', error);
      toast.error('Error', { description: error.message || 'No se pudo crear el material' });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setName('');
    setCode('');
    setBaseUomId('');
    setLastCost(0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Crear Material Rápido</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre del material"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>Código</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Código (opcional)"
            />
          </div>
          <div className="space-y-2">
            <Label>Unidad base</Label>
            <Select value={baseUomId} onValueChange={setBaseUomId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar unidad" />
              </SelectTrigger>
              <SelectContent>
                {uoms.map((uom) => (
                  <SelectItem key={uom.id} value={uom.id}>
                    {uom.name} ({uom.abbreviation})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Último costo</Label>
            <Input
              type="number"
              min={0}
              value={lastCost}
              onChange={(e) => setLastCost(parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? 'Creando...' : 'Crear Material'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
