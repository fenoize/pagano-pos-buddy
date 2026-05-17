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
import { supabase } from '@/integrations/supabase/client';
import { STORAGE_KEYS } from '@/lib/storageKeys';
import { toast } from '@/hooks/use-toast';
import { toast } from "sonner";
interface QuickCreateSupplierModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (supplier: { id: string; name: string }) => void;
  createSupplier?: (data: any) => Promise<boolean>;
  refetchSuppliers?: () => Promise<void>;
}

export function QuickCreateSupplierModal({
  open,
  onOpenChange,
  onCreated,
  refetchSuppliers,
}: QuickCreateSupplierModalProps) {
  const [name, setName] = useState('');
  const [rut, setRut] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const staffUser = JSON.parse(localStorage.getItem(STORAGE_KEYS.STAFF_USER) || '{}');
      const userId = staffUser?.id;
      if (!userId) throw new Error('No se encontró sesión de usuario');

      const { data, error } = await supabase.rpc('quick_create_supplier', {
        p_user_id: userId,
        p_name: name.trim(),
        p_rut: rut.trim() || null,
        p_phone: phone.trim() || null,
        p_email: email.trim() || null,
      });

      if (error) throw error;

      toast.success('Éxito', { description: 'Proveedor creado correctamente' });
      if (refetchSuppliers) await refetchSuppliers();
      onCreated(data as any);
      resetForm();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating supplier:', error);
      toast.error('Error', { description: error.message || 'No se pudo crear el proveedor' });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setName('');
    setRut('');
    setPhone('');
    setEmail('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Crear Proveedor Rápido</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre del proveedor"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>RUT</Label>
            <Input
              value={rut}
              onChange={(e) => setRut(e.target.value)}
              placeholder="RUT (opcional)"
            />
          </div>
          <div className="space-y-2">
            <Label>Teléfono</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Teléfono (opcional)"
              type="tel"
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email (opcional)"
              type="email"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? 'Creando...' : 'Crear Proveedor'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
