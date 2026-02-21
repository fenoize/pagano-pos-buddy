import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { User, AppRole } from '@/types';
import { useUsers } from '@/hooks/useUsers';

interface UserFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingUser?: User | null;
}

const AVAILABLE_ROLES: { value: AppRole; label: string; description: string }[] = [
  { value: 'Administrador', label: 'Administrador', description: 'Acceso completo al sistema' },
  { value: 'Cajero', label: 'Cajero', description: 'Puede crear ventas y manejar caja' },
  { value: 'Cocinero', label: 'Cocinero', description: 'Acceso solo a la cocina (KDS)' },
  { value: 'Preparador', label: 'Preparador', description: 'Acceso solo a la cocina (KDS)' },
  { value: 'Reparto', label: 'Reparto', description: 'Acceso a módulo de delivery' },
  { value: 'Viewer', label: 'Viewer', description: 'Solo lectura, para casos especiales' },
  { value: 'TV', label: 'TV', description: 'Acceso exclusivo a pantallas TV' },
];

export function UserForm({ isOpen, onClose, onSuccess, editingUser }: UserFormProps) {
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    email: '',
    password: '',
    roles: ['Cajero'] as AppRole[],
    can_do_delivery: false,
  });
  const [loading, setLoading] = useState(false);
  const { createUser, updateUser } = useUsers();
  const { toast } = useToast();

  const isEditing = !!editingUser;

  useEffect(() => {
    if (isOpen) {
      if (editingUser) {
        setFormData({
          username: editingUser.username,
          full_name: editingUser.full_name || '',
          email: editingUser.email || '',
          password: '',
          roles: editingUser.roles?.length ? editingUser.roles : [editingUser.role],
          can_do_delivery: editingUser.can_do_delivery || false,
        });
      } else {
        setFormData({
          username: '',
          full_name: '',
          email: '',
          password: '',
          roles: ['Cajero'],
          can_do_delivery: false,
        });
      }
    }
  }, [isOpen, editingUser]);

  const toggleRole = (role: AppRole) => {
    setFormData(prev => {
      const current = prev.roles;
      if (current.includes(role)) {
        // Don't allow removing the last role
        if (current.length === 1) return prev;
        return { ...prev, roles: current.filter(r => r !== role) };
      } else {
        return { ...prev, roles: [...current, role] };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.username.trim()) {
      toast({ title: "Error", description: "El nombre de usuario es requerido.", variant: "destructive" });
      return;
    }

    if (formData.roles.length === 0) {
      toast({ title: "Error", description: "Debes seleccionar al menos un rol.", variant: "destructive" });
      return;
    }

    if (!isEditing && !formData.password.trim()) {
      toast({ title: "Error", description: "La contraseña es requerida para nuevos usuarios.", variant: "destructive" });
      return;
    }

    if (!isEditing && formData.password.length < 6) {
      toast({ title: "Error", description: "La contraseña debe tener al menos 6 caracteres.", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      if (isEditing && editingUser) {
        await updateUser(editingUser.id, {
          username: formData.username,
          full_name: formData.full_name,
          email: formData.email,
          roles: formData.roles,
          can_do_delivery: formData.can_do_delivery,
        });
        toast({ title: "Usuario actualizado", description: "El usuario ha sido actualizado correctamente." });
      } else {
        await createUser({
          username: formData.username,
          full_name: formData.full_name,
          email: formData.email,
          password: formData.password,
          roles: formData.roles,
          can_do_delivery: formData.can_do_delivery,
        });
        toast({ title: "Usuario creado", description: "El usuario ha sido creado correctamente." });
      }

      onSuccess();
    } catch (error: any) {
      console.error('Error saving user:', error);
      let errorMessage = "Ocurrió un error inesperado.";
      if (error?.message?.includes('users_username_key')) {
        errorMessage = "El nombre de usuario ya existe.";
      }
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Usuario' : 'Crear Usuario'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Modifica la información del usuario.' : 'Completa la información para crear un nuevo usuario.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Nombre de Usuario</Label>
            <Input id="username" value={formData.username} onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))} placeholder="Ingresa el nombre de usuario" disabled={loading} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="full_name">Nombre Completo</Label>
            <Input id="full_name" value={formData.full_name} onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))} placeholder="Ingresa el nombre completo" disabled={loading} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Correo Electrónico</Label>
            <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} placeholder="correo@ejemplo.com" disabled={loading} />
          </div>

          {!isEditing && (
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" type="password" value={formData.password} onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))} placeholder="Ingresa la contraseña (mín. 6 caracteres)" disabled={loading} />
            </div>
          )}

          <div className="space-y-3">
            <Label>Roles</Label>
            <p className="text-sm text-muted-foreground">Selecciona uno o más roles para este usuario.</p>
            <div className="space-y-2 border rounded-lg p-3">
              {AVAILABLE_ROLES.map((role) => (
                <label
                  key={role.value}
                  className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <Checkbox
                    checked={formData.roles.includes(role.value)}
                    onCheckedChange={() => toggleRole(role.value)}
                    disabled={loading}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{role.label}</div>
                    <div className="text-xs text-muted-foreground">{role.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-4 border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="can_do_delivery">Puede hacer Deliveries</Label>
                <p className="text-sm text-muted-foreground">
                  Permitir a este usuario aparecer como repartidor en los pedidos de delivery
                </p>
              </div>
              <Switch
                id="can_do_delivery"
                checked={formData.can_do_delivery}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, can_do_delivery: checked }))}
                disabled={loading}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
