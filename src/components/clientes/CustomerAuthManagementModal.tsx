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
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Copy, RefreshCw, Eye, EyeOff, AlertCircle, Mail, 
  CheckCircle, Shield, KeyRound, Loader2, Send, UserCheck 
} from 'lucide-react';
import { Customer } from '@/types';
import { STORAGE_KEYS } from '@/lib/storageKeys';
import { toast } from "sonner";

interface AuthStatus {
  has_auth_account: boolean;
  email_confirmed: boolean;
  email_confirmed_at?: string;
  email?: string;
  last_sign_in?: string;
  created_at?: string;
  message?: string;
}

type ManageAction = 'resend_verification' | 'confirm_email' | 'update_password' | 'update_email' | 'activate_credentials';

interface CustomerAuthManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  onAuthUpdated?: () => void;
}

export function CustomerAuthManagementModal({ 
  isOpen, 
  onClose, 
  customer,
  onAuthUpdated 
}: CustomerAuthManagementModalProps) {
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [activeTab, setActiveTab] = useState('status');
  const fetchAuthStatus = async () => {
    if (!customer?.id) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem(STORAGE_KEYS.STAFF_TOKEN);
      if (!token) throw new Error('No hay sesión activa');

      const response = await fetch(
        'https://lxxfhayifyiioglfbsyj.supabase.co/functions/v1/admin-manage-customer-auth',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-staff-token': token,
          },
          body: JSON.stringify({
            action: 'get_auth_status',
            customer_id: customer.id,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al obtener estado de autenticación');
      }

      const data = await response.json();
      setAuthStatus(data);
    } catch (error) {
      console.error('Error fetching auth status:', error);
      toast.error("Error", { description: error instanceof Error ? error.message : "Error al obtener estado" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && customer?.id) {
      fetchAuthStatus();
      setActiveTab('status');
      setPassword('');
      setShowPassword(false);
      setNewEmail(customer.email || '');
      setShowEmailForm(false);
    }
  }, [isOpen, customer?.id]);

  const handleAction = async (action: ManageAction) => {
    if (!customer?.id) return;

    setActionLoading(action);
    try {
      const token = localStorage.getItem(STORAGE_KEYS.STAFF_TOKEN);
      if (!token) throw new Error('No hay sesión activa');

      const body: any = {
        action,
        customer_id: customer.id,
      };

      if (action === 'update_password' || action === 'activate_credentials') {
        if (!password || password.length < 6) {
          toast.error("Error", { description: "La contraseña debe tener al menos 6 caracteres" });
          return;
        }
        body.new_password = password;
      }

      if (action === 'update_email' || action === 'activate_credentials') {
        if (!newEmail || !newEmail.includes('@')) {
          toast.error("Error", { description: "Email inválido" });
          return;
        }
        body.new_email = newEmail;
      }

      const response = await fetch(
        'https://lxxfhayifyiioglfbsyj.supabase.co/functions/v1/admin-manage-customer-auth',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-staff-token': token,
          },
          body: JSON.stringify(body),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al ejecutar acción');
      }

      toast.success("Éxito", { description: data.message });

      // Refresh auth status
      await fetchAuthStatus();

      if (action === 'update_password' || action === 'activate_credentials') {
        setPassword('');
        setShowPassword(false);
      }

      if (action === 'update_email' || action === 'activate_credentials') {
        setShowEmailForm(false);
      }

      onAuthUpdated?.();
    } catch (error) {
      console.error('Error executing action:', error);
      toast.error("Error", { description: error instanceof Error ? error.message : "Error al ejecutar acción" });
    } finally {
      setActionLoading(null);
    }
  };

  const generatePassword = () => {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setPassword(result);
    setShowPassword(true);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(password);
      toast.success("Copiado", { description: "Contraseña copiada al portapapeles" });
    } catch (error) {
      toast.error("Error", { description: "No se pudo copiar" });
    }
  };

  const handleClose = () => {
    setAuthStatus(null);
    setPassword('');
    setShowPassword(false);
    setNewEmail(customer?.email || '');
    setShowEmailForm(false);
    onClose();
  };

  const customerName = customer ? 
    `${customer.nombres || customer.name || ''} ${customer.apellidos || customer.apellido || ''}`.trim() || 'Sin nombre' 
    : '';

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Gestionar Cuenta de Cliente
          </DialogTitle>
          <DialogDescription>
            {customer && (
              <>
                Administra la cuenta de autenticación de <strong>{customerName}</strong>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !authStatus?.has_auth_account ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Este cliente no tiene una cuenta de autenticación vinculada. 
              Solo los clientes que se han registrado en el portal pueden tener estas opciones.
            </AlertDescription>
          </Alert>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="status">Estado</TabsTrigger>
              <TabsTrigger value="verification">Verificación</TabsTrigger>
              <TabsTrigger value="password">Acceso</TabsTrigger>
            </TabsList>

            {/* Status Tab */}
            <TabsContent value="status" className="space-y-4 mt-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm font-medium">Email (Auth)</span>
                  <span className="text-sm text-muted-foreground break-all text-right max-w-[60%]">
                    {authStatus.email || 'No disponible'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm font-medium">Email (Cliente)</span>
                  <span className="text-sm text-muted-foreground break-all text-right max-w-[60%]">
                    {customer?.email || 'No disponible'}
                  </span>
                </div>

                {!!authStatus.email && !!customer?.email && authStatus.email.toLowerCase() !== customer.email.toLowerCase() && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Hay una inconsistencia: el email en Auth no coincide con el del cliente. Esto provoca “Invalid login credentials” aunque la contraseña sea correcta.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm font-medium">Estado de verificación</span>
                  {authStatus.email_confirmed ? (
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Verificado
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Pendiente
                    </Badge>
                  )}
                </div>

                {!showEmailForm ? (
                  <Button
                    onClick={() => setShowEmailForm(true)}
                    disabled={actionLoading !== null}
                    className="w-full justify-start"
                    variant="outline"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Corregir email de acceso
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="new-email">Email de acceso</Label>
                    <Input
                      id="new-email"
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="correo@dominio.com"
                      disabled={actionLoading !== null}
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleAction('update_email')}
                        disabled={actionLoading !== null || !newEmail || !newEmail.includes('@')}
                        className="flex-1"
                      >
                        Guardar email
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setNewEmail(customer?.email || '');
                          setShowEmailForm(false);
                        }}
                        disabled={actionLoading !== null}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}

                {authStatus.email_confirmed_at && (
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium">Verificado el</span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(authStatus.email_confirmed_at).toLocaleString('es-CL')}
                    </span>
                  </div>
                )}

                {authStatus.last_sign_in && (
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium">Último acceso</span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(authStatus.last_sign_in).toLocaleString('es-CL')}
                    </span>
                  </div>
                )}

                {authStatus.created_at && (
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium">Cuenta creada</span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(authStatus.created_at).toLocaleString('es-CL')}
                    </span>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Verification Tab */}
            <TabsContent value="verification" className="space-y-4 mt-4">
              {authStatus.email_confirmed ? (
                <Alert>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription>
                    El email de este cliente ya está verificado. No se requieren acciones adicionales.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Este cliente no ha verificado su email. Puedes reenviar el correo de verificación o 
                      activar su cuenta manualmente.
                    </AlertDescription>
                  </Alert>

                  <div className="grid gap-3">
                    <Button
                      onClick={() => handleAction('resend_verification')}
                      disabled={actionLoading !== null}
                      className="w-full justify-start"
                      variant="outline"
                    >
                      {actionLoading === 'resend_verification' ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4 mr-2" />
                      )}
                      Reenviar correo de verificación
                    </Button>

                    <Button
                      onClick={() => handleAction('confirm_email')}
                      disabled={actionLoading !== null}
                      className="w-full justify-start"
                      variant="default"
                    >
                      {actionLoading === 'confirm_email' ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <UserCheck className="w-4 h-4 mr-2" />
                      )}
                      Activar cuenta manualmente
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    <strong>Reenviar correo:</strong> El cliente recibirá un nuevo email con un enlace para verificar su cuenta.
                    <br />
                    <strong>Activar manualmente:</strong> La cuenta quedará verificada inmediatamente sin necesidad de que el cliente haga clic en ningún enlace.
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Password Tab */}
            <TabsContent value="password" className="space-y-4 mt-4">
              <div className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Si el cliente viene de Google y/o el email en Auth está mal, usa “Activar acceso” para dejar email + contraseña + verificación consistentes.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label htmlFor="new-email-inline">Email de acceso</Label>
                  <Input
                    id="new-email-inline"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="correo@dominio.com"
                    disabled={actionLoading !== null}
                    className="bg-muted/50"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={generatePassword}
                    disabled={actionLoading !== null}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Generar contraseña
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password">Contraseña</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Ingresa o genera una contraseña"
                      disabled={actionLoading !== null}
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
                      {password && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={copyToClipboard}
                          className="h-8 w-8 p-0"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    La contraseña debe tener al menos 6 caracteres
                  </p>
                </div>

                <Button
                  onClick={() => handleAction('activate_credentials')}
                  disabled={
                    actionLoading !== null ||
                    !newEmail ||
                    !newEmail.includes('@') ||
                    !password ||
                    password.length < 6
                  }
                  className="w-full"
                >
                  {actionLoading === 'activate_credentials' ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <UserCheck className="w-4 h-4 mr-2" />
                  )}
                  Activar acceso (email + contraseña)
                </Button>

                <div className="grid gap-2">
                  <Button
                    onClick={() => handleAction('update_password')}
                    disabled={actionLoading !== null || !password || password.length < 6}
                    className="w-full"
                    variant="outline"
                  >
                    {actionLoading === 'update_password' ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <KeyRound className="w-4 h-4 mr-2" />
                    )}
                    Solo actualizar contraseña
                  </Button>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Se recomienda comunicar la contraseña de forma segura. 
                    Si el login sigue fallando, revisa que “Email (Auth)” sea el mismo que el email ingresado por el cliente.
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
