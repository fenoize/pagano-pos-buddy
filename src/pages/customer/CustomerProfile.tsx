import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  ShoppingBag, 
  MapPin, 
  Flame, 
  Award, 
  Lock, 
  Settings, 
  RefreshCw, 
  ChevronRight,
  ArrowLeft,
  Save,
  CheckCircle,
  LogOut,
  QrCode
} from 'lucide-react';
import { CustomerBottomNav } from '@/components/customer/CustomerBottomNav';
import { configuredSupabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { APP_VERSION, APP_BUILD_DATE } from '@/config/version';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { CustomerQRModal } from '@/components/customer/CustomerQRModal';

export default function CustomerProfile() {
  const navigate = useNavigate();
  const { customer, refreshCustomerData, signOut } = useCustomerAuth();
  
  // Profile edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editNombre, setEditNombre] = useState(customer?.name || customer?.nombres || '');
  const [editApellido, setEditApellido] = useState(customer?.apellido || customer?.apellidos || '');
  const [editPhone, setEditPhone] = useState(customer?.phone || '');
  const [editEmail, setEditEmail] = useState(customer?.email || '');
  const [editFechaNacimiento, setEditFechaNacimiento] = useState(customer?.fecha_nacimiento || '');
  const [isSaving, setIsSaving] = useState(false);
  
  // Password change state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  // Update check state
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateChecked, setUpdateChecked] = useState(false);
  
  // QR Modal state
  const [showQRModal, setShowQRModal] = useState(false);

  const quickLinks = [
    { label: 'Mis Pedidos', icon: ShoppingBag, path: '/my-orders' },
    { label: 'Mis Direcciones', icon: MapPin, path: '/my-addresses' },
    { label: 'Mis Runas', icon: Flame, path: '/my-runes' },
    { label: 'Mis Insignias', icon: Award, path: '/my-badges' },
  ];

  const handleSaveProfile = async () => {
    if (!customer?.id) return;
    
    setIsSaving(true);
    try {
      const { error } = await configuredSupabase
        .from('customers')
        .update({
          name: editNombre,
          nombres: editNombre,
          apellido: editApellido,
          apellidos: editApellido,
          phone: editPhone,
          email: editEmail,
          fecha_nacimiento: editFechaNacimiento || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', customer.id);

      if (error) throw error;
      
      await refreshCustomerData();
      setIsEditing(false);
      toast.success('Perfil actualizado correctamente');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error('Error al actualizar el perfil');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setIsChangingPassword(true);
    try {
      // Use the edge function to generate password hash
      const { data: hashData, error: hashError } = await configuredSupabase.functions.invoke('generate-password-hash', {
        body: { password: newPassword }
      });
      
      if (hashError) throw hashError;
      
      // Update customer_accounts with new hash
      const { error: updateError } = await configuredSupabase
        .from('customer_accounts')
        .update({ pass_hash: hashData.hash })
        .eq('id', customer?.account_id);
        
      if (updateError) throw updateError;
      
      toast.success('Contraseña actualizada correctamente');
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error('Error al cambiar la contraseña');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const checkForUpdates = async () => {
    setIsUpdating(true);
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await registration.update();
          
          if (registration.waiting) {
            toast.info('Actualización disponible. Instalando...');
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            setTimeout(() => window.location.reload(), 1000);
            return;
          }
        }
      }

      setUpdateChecked(true);
      toast.success('Tu app está actualizada');
      
      setTimeout(() => setUpdateChecked(false), 3000);
    } catch (error) {
      console.error('Error al verificar actualizaciones:', error);
      toast.error('Error al verificar actualizaciones');
    } finally {
      setIsUpdating(false);
    }
  };

  const forceUpdate = async () => {
    setIsUpdating(true);
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations.map((registration) => registration.unregister())
        );
      }

      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      }

      const keysToKeep = ['customer_session', 'customer_token'];
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(key => {
        if (!keysToKeep.some(keep => key.includes(keep))) {
          if (key.includes('pwa') || key.includes('cache') || key.includes('version')) {
            localStorage.removeItem(key);
          }
        }
      });

      toast.success('Actualización encontrada. Recargando...');
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error al actualizar:', error);
      toast.error('Error al buscar actualizaciones');
      setIsUpdating(false);
    }
  };

  return (
    <div className="customer-app min-h-screen pb-20 bg-background">
      <div className="max-w-screen-xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/portal')}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Mi Perfil</h1>
        </div>

        {/* Profile Info */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Información Personal
              </CardTitle>
              {!isEditing ? (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  Editar
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      setIsEditing(false);
                      setEditNombre(customer?.name || customer?.nombres || '');
                      setEditApellido(customer?.apellido || customer?.apellidos || '');
                      setEditPhone(customer?.phone || '');
                      setEditEmail(customer?.email || '');
                      setEditFechaNacimiento(customer?.fecha_nacimiento || '');
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre</Label>
                    <Input 
                      id="nombre"
                      value={editNombre}
                      onChange={(e) => setEditNombre(e.target.value)}
                      placeholder="Tu nombre"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="apellido">Apellido</Label>
                    <Input 
                      id="apellido"
                      value={editApellido}
                      onChange={(e) => setEditApellido(e.target.value)}
                      placeholder="Tu apellido"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input 
                    id="phone"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="+56 9 1234 5678"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Correo Electrónico</Label>
                  <Input 
                    id="email"
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="correo@ejemplo.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fecha_nacimiento">Fecha de Nacimiento</Label>
                  <Input 
                    id="fecha_nacimiento"
                    type="date"
                    value={editFechaNacimiento}
                    onChange={(e) => setEditFechaNacimiento(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center ring-2 ring-primary/30">
                    <User className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">
                      {[customer?.name || customer?.nombres, customer?.apellido || customer?.apellidos].filter(Boolean).join(' ') || 'Usuario'}
                    </h2>
                    <p className="text-sm text-muted-foreground">{customer?.email || 'Sin correo'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Teléfono</p>
                    <p className="text-sm font-medium text-foreground">{customer?.phone || 'No registrado'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Fecha de Nacimiento</p>
                    <p className="text-sm font-medium text-foreground">
                      {customer?.fecha_nacimiento 
                        ? new Date(customer.fecha_nacimiento + 'T00:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })
                        : 'No registrada'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* QR Code Button */}
        <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardContent className="p-0">
            <button
              onClick={() => setShowQRModal(true)}
              className="w-full flex items-center justify-between p-4 hover:bg-primary/10 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <QrCode className="h-6 w-6 text-primary" />
                </div>
                <div className="text-left">
                  <span className="font-semibold text-foreground block">Mi Código QR</span>
                  <span className="text-xs text-muted-foreground">Identifícate en caja sin dar datos</span>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-primary" />
            </button>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <Card className="border-border bg-card">
          <CardContent className="p-0">
            {quickLinks.map((link, index) => (
              <div key={link.path}>
                <button
                  onClick={() => navigate(link.path)}
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <link.icon className="h-5 w-5 text-primary" />
                    </div>
                    <span className="font-medium text-foreground">{link.label}</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </button>
                {index < quickLinks.length - 1 && <Separator />}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Security */}
        <Card className="border-border bg-card">
          <CardContent className="p-0">
            <button
              onClick={() => setShowPasswordModal(true)}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Lock className="h-5 w-5 text-primary" />
                </div>
                <span className="font-medium text-foreground">Cambiar Contraseña</span>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          </CardContent>
        </Card>

        {/* Settings / Updates */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings className="h-5 w-5 text-muted-foreground" />
              Configuración
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Versión de la App</p>
                <p className="text-xs text-muted-foreground">v{APP_VERSION} • {APP_BUILD_DATE}</p>
              </div>
              {updateChecked && (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={checkForUpdates}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Buscar Actualizaciones
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={forceUpdate}
                disabled={isUpdating}
                className="text-muted-foreground hover:text-foreground"
              >
                Forzar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Cerrar Sesión */}
        <Card className="border-destructive/30 bg-card">
          <CardContent className="p-0">
            <button
              onClick={async () => {
                await signOut();
                navigate('/login');
              }}
              className="w-full flex items-center justify-between p-4 hover:bg-destructive/10 transition-colors text-destructive"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                  <LogOut className="h-5 w-5 text-destructive" />
                </div>
                <span className="font-medium">Cerrar Sesión</span>
              </div>
              <ChevronRight className="h-5 w-5" />
            </button>
          </CardContent>
        </Card>
      </div>

      {/* Password Change Modal */}
      <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar Contraseña</DialogTitle>
            <DialogDescription>
              Ingresa tu contraseña actual y la nueva contraseña
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Contraseña Actual</Label>
              <Input 
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Nueva Contraseña</Label>
              <Input 
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar Contraseña</Label>
              <Input 
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleChangePassword} disabled={isChangingPassword}>
              {isChangingPassword ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Cambiar Contraseña
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Modal */}
      {customer && (
        <CustomerQRModal
          isOpen={showQRModal}
          onClose={() => setShowQRModal(false)}
          customerId={customer.id}
          customerName={[customer.name || customer.nombres, customer.apellido || customer.apellidos].filter(Boolean).join(' ')}
        />
      )}

      <CustomerBottomNav />
    </div>
  );
}
