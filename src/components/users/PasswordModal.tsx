import React, { useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Copy, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { User } from '@/types';

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string) => Promise<void>;
  user: User | null;
  loading?: boolean;
}

export function PasswordModal({ isOpen, onClose, onConfirm, user, loading = false }: PasswordModalProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<'generate' | 'manual'>('generate');
  const { toast } = useToast();

  const generatePassword = () => {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setPassword(result);
    setShowPassword(true);
  };

  const handleModeChange = (newMode: 'generate' | 'manual') => {
    setMode(newMode);
    setPassword('');
    setShowPassword(false);
  };

  const handleGenerate = () => {
    generatePassword();
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(password);
      toast({
        title: "Contraseña copiada",
        description: "La contraseña ha sido copiada al portapapeles."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo copiar la contraseña.",
        variant: "destructive"
      });
    }
  };

  const handleConfirm = async () => {
    if (!password.trim()) {
      toast({
        title: "Error",
        description: "La contraseña no puede estar vacía.",
        variant: "destructive"
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Error",
        description: "La contraseña debe tener al menos 6 caracteres.",
        variant: "destructive"
      });
      return;
    }

    try {
      await onConfirm(password);
      setPassword('');
      setShowPassword(false);
      setMode('generate');
    } catch (error) {
      // Error handling is done in the parent component
    }
  };

  const handleClose = () => {
    setPassword('');
    setShowPassword(false);
    setMode('generate');
    onClose();
  };

  // Initialize with generated password when dialog opens
  React.useEffect(() => {
    if (isOpen && mode === 'generate' && !password) {
      generatePassword();
    }
  }, [isOpen, mode]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva Contraseña</DialogTitle>
          <DialogDescription>
            {user && (
              <>
                Configura una nueva contraseña para el usuario <strong>{user.username}</strong>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mode Selection */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === 'generate' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleModeChange('generate')}
              disabled={loading}
            >
              Generar
            </Button>
            <Button
              type="button"
              variant={mode === 'manual' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleModeChange('manual')}
              disabled={loading}
            >
              Manual
            </Button>
          </div>

          {mode === 'generate' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Contraseña Generada</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerate}
                  disabled={loading}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Generar Nueva
                </Button>
              </div>
              
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  readOnly
                  className="pr-20"
                />
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPassword(!showPassword)}
                    className="h-8 w-8 p-0"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={copyToClipboard}
                    className="h-8 w-8 p-0"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  8 caracteres
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  Alfanumérico
                </Badge>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <Label htmlFor="manual-password">Contraseña Manual</Label>
              <div className="relative">
                <Input
                  id="manual-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingresa la nueva contraseña"
                  disabled={loading}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                La contraseña debe tener al menos 6 caracteres
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button 
            type="button" 
            onClick={handleConfirm} 
            disabled={loading || !password.trim()}
          >
            {loading ? 'Aplicando...' : 'Aplicar Contraseña'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}