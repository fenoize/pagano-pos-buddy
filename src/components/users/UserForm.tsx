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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { User, AppRole } from '@/types';
import { useUsers } from '@/hooks/useUsers';

interface UserFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingUser?: User | null;
}

export function UserForm({ isOpen, onClose, onSuccess, editingUser }: UserFormProps) {
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    email: '',
    password: '',
    role: 'Cajero' as AppRole,
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
          role: editingUser.role,
        });
      } else {
        setFormData({
          username: '',
          full_name: '',
          email: '',
          password: '',
          role: 'Cajero',
        });
      }
    }
  }, [isOpen, editingUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.username.trim()) {
      toast({
        title: "Error",
        description: "El nombre de usuario es requerido.",
        variant: "destructive"
      });
      return;
    }

    if (!isEditing && !formData.password.trim()) {
      toast({
        title: "Error",
        description: "La contraseña es requerida para nuevos usuarios.",
        variant: "destructive"
      });
      return;
    }

    if (!isEditing && formData.password.length < 6) {
      toast({
        title: "Error",
        description: "La contraseña debe tener al menos 6 caracteres.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      if (isEditing && editingUser) {
        // Update user
        await updateUser(editingUser.id, {
          username: formData.username,
          full_name: formData.full_name,
          email: formData.email,
          role: formData.role,
        });
        toast({
          title: "Usuario actualizado",
          description: "El usuario ha sido actualizado correctamente."
        });
      } else {
        // Create new user
        await createUser({
          username: formData.username,
          full_name: formData.full_name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
        });
        toast({
          title: "Usuario creado",
          description: "El usuario ha sido creado correctamente."
        });
      }

      onSuccess();
    } catch (error: any) {
      console.error('Error saving user:', error);
      
      let errorMessage = "Ocurrió un error inesperado.";
      if (error?.message?.includes('users_username_key')) {
        errorMessage = "El nombre de usuario ya existe.";
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const roles: { value: AppRole; label: string; description: string }[] = [
    { 
      value: 'Administrador', 
      label: 'Administrador', 
      description: 'Acceso completo al sistema' 
    },
    { 
      value: 'Cajero', 
      label: 'Cajero', 
      description: 'Puede crear ventas y manejar caja' 
    },
    { 
      value: 'Cocinero', 
      label: 'Cocinero', 
      description: 'Acceso solo a la cocina (KDS)' 
    },
    { 
      value: 'Preparador', 
      label: 'Preparador', 
      description: 'Acceso solo a la cocina (KDS)' 
    },
    { 
      value: 'Repartidor', 
      label: 'Repartidor', 
      description: 'Acceso a módulo de delivery (próximamente)' 
    },
    { 
      value: 'Viewer', 
      label: 'Viewer', 
      description: 'Solo lectura, para casos especiales' 
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Usuario' : 'Crear Usuario'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Modifica la información del usuario.' 
              : 'Completa la información para crear un nuevo usuario.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Nombre de Usuario</Label>
            <Input
              id="username"
              value={formData.username}
              onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
              placeholder="Ingresa el nombre de usuario"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="full_name">Nombre Completo</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
              placeholder="Ingresa el nombre completo"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Correo Electrónico</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="correo@ejemplo.com"
              disabled={loading}
            />
          </div>

          {!isEditing && (
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Ingresa la contraseña (mín. 6 caracteres)"
                disabled={loading}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="role">Rol</Label>
            <Select 
              value={formData.role} 
              onValueChange={(value: AppRole) => setFormData(prev => ({ ...prev, role: value }))}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un rol" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    <div>
                      <div className="font-medium">{role.label}</div>
                      <div className="text-xs text-muted-foreground">{role.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}