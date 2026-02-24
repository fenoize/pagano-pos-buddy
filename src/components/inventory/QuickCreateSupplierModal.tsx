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

interface QuickCreateSupplierModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (supplier: { id: string; name: string }) => void;
  createSupplier: (data: any) => Promise<boolean>;
  refetchSuppliers: () => Promise<void>;
}

export function QuickCreateSupplierModal({
  open,
  onOpenChange,
  onCreated,
  createSupplier,
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
    const success = await createSupplier({
      name: name.trim(),
      rut: rut.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
    });
    if (success) {
      await refetchSuppliers();
      // We need to find the new supplier after refetch - use name matching
      // The parent will handle selecting the newly created supplier
      onCreated({ id: '', name: name.trim() });
      resetForm();
      onOpenChange(false);
    }
    setSaving(false);
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
