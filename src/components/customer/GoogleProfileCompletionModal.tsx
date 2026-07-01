import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, User } from 'lucide-react';
import { toast } from 'sonner';

interface GoogleProfileCompletionModalProps {
  isOpen: boolean;
  initialData: {
    nombres: string;
    apellidos: string;
    email: string;
  };
  onComplete: (data: {
    nombres: string;
    apellidos: string;
    phone: string;
    fecha_nacimiento: string;
  }) => Promise<{ error: Error | null }>;
}

export function GoogleProfileCompletionModal({
  isOpen,
  initialData,
  onComplete,
}: GoogleProfileCompletionModalProps) {
  const [nombres, setNombres] = useState(initialData.nombres);
  const [apellidos, setApellidos] = useState(initialData.apellidos);
  const [phone, setPhone] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones
    if (!nombres.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    if (!apellidos.trim()) {
      toast.error('El apellido es obligatorio');
      return;
    }
    if (!phone.trim()) {
      toast.error('El teléfono es obligatorio');
      return;
    }
    if (!fechaNacimiento) {
      toast.error('La fecha de nacimiento es obligatoria');
      return;
    }

    setLoading(true);

    const { error } = await onComplete({
      nombres: nombres.trim(),
      apellidos: apellidos.trim(),
      phone: phone.trim(),
      fecha_nacimiento: fechaNacimiento,
    });

    if (error) {
      toast.error('Error al guardar datos', {
        description: error.message,
      });
    }

    setLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {/* No permitir cerrar */}}>
      <DialogContent 
        className="customer-app sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <User className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Completa tu perfil</DialogTitle>
          <DialogDescription className="text-center">
            ¡Bienvenido! Para continuar, necesitamos algunos datos más.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Email (solo lectura) */}
          <div className="space-y-2">
            <Label htmlFor="google-email">Correo electrónico</Label>
            <Input
              id="google-email"
              type="email"
              value={initialData.email}
              disabled
              className="bg-muted/50 cursor-not-allowed"
            />
          </div>

          {/* Nombres y Apellidos */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="google-nombres">
                Nombres <span className="text-destructive">*</span>
              </Label>
              <Input
                id="google-nombres"
                placeholder="Juan"
                value={nombres}
                onChange={(e) => setNombres(e.target.value)}
                disabled={loading}
                required
                className="bg-muted/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="google-apellidos">
                Apellidos <span className="text-destructive">*</span>
              </Label>
              <Input
                id="google-apellidos"
                placeholder="Pérez"
                value={apellidos}
                onChange={(e) => setApellidos(e.target.value)}
                disabled={loading}
                required
                className="bg-muted/50"
              />
            </div>
          </div>

          {/* Teléfono */}
          <div className="space-y-2">
            <Label htmlFor="google-phone">
              Teléfono <span className="text-destructive">*</span>
            </Label>
            <Input
              id="google-phone"
              type="tel"
              placeholder="+56 9 1234 5678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={loading}
              required
              className="bg-muted/50"
            />
          </div>

          {/* Fecha de nacimiento */}
          <div className="space-y-2">
            <Label htmlFor="google-birthdate">
              Fecha de nacimiento <span className="text-destructive">*</span>
            </Label>
            <Input
              id="google-birthdate"
              type="date"
              value={fechaNacimiento}
              onChange={(e) => setFechaNacimiento(e.target.value)}
              disabled={loading}
              required
              className="bg-muted/50"
              max={new Date().toISOString().split('T')[0]}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            <span className="text-destructive">*</span> Campos obligatorios
          </p>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Completar Registro
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default GoogleProfileCompletionModal;
