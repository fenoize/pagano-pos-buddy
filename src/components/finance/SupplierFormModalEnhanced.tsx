import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Building2, CreditCard, Users } from 'lucide-react';
import { Supplier } from '@/types/supplier';
import { SupplierContactsList } from './SupplierContactsList';

interface SupplierFormModalEnhancedProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier?: Supplier | null;
  onSave: (data: Partial<Supplier>) => Promise<boolean>;
}

interface SupplierFormData {
  // Datos generales
  name: string;
  rut: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  preferred_contact_method: 'email' | 'whatsapp' | 'phone';
  
  // Datos de facturación
  razon_social: string;
  giro: string;
  direccion_fiscal: string;
  comuna_fiscal: string;
  ciudad_fiscal: string;
  
  // Datos bancarios
  bank_name: string;
  bank_account_type: string;
  bank_account_number: string;
  bank_account_holder: string;
  bank_account_holder_rut: string;
  
  // Condiciones de pago
  payment_terms_type: 'contado' | 'credito' | 'por_factura';
  payment_terms_days: number;
}

const emptyFormData: SupplierFormData = {
  name: '',
  rut: '',
  email: '',
  phone: '',
  address: '',
  notes: '',
  preferred_contact_method: 'email',
  razon_social: '',
  giro: '',
  direccion_fiscal: '',
  comuna_fiscal: '',
  ciudad_fiscal: '',
  bank_name: '',
  bank_account_type: '',
  bank_account_number: '',
  bank_account_holder: '',
  bank_account_holder_rut: '',
  payment_terms_type: 'contado',
  payment_terms_days: 0,
};

export function SupplierFormModalEnhanced({
  open,
  onOpenChange,
  supplier,
  onSave,
}: SupplierFormModalEnhancedProps) {
  const [formData, setFormData] = useState<SupplierFormData>(emptyFormData);
  const [activeTab, setActiveTab] = useState('general');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name || '',
        rut: supplier.rut || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        address: supplier.address || '',
        notes: supplier.notes || '',
        preferred_contact_method: supplier.preferred_contact_method || 'email',
        razon_social: supplier.razon_social || '',
        giro: supplier.giro || '',
        direccion_fiscal: supplier.direccion_fiscal || '',
        comuna_fiscal: supplier.comuna_fiscal || '',
        ciudad_fiscal: supplier.ciudad_fiscal || '',
        bank_name: supplier.bank_name || '',
        bank_account_type: supplier.bank_account_type || '',
        bank_account_number: supplier.bank_account_number || '',
        bank_account_holder: supplier.bank_account_holder || '',
        bank_account_holder_rut: supplier.bank_account_holder_rut || '',
        payment_terms_type: supplier.payment_terms_type || 'contado',
        payment_terms_days: supplier.payment_terms_days || 0,
      });
      setActiveTab('general');
    } else {
      setFormData(emptyFormData);
      setActiveTab('general');
    }
  }, [supplier, open]);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setActiveTab('general');
      return;
    }

    setSaving(true);
    const success = await onSave({
      ...formData,
      payment_terms_days: Number(formData.payment_terms_days) || 0,
    });
    setSaving(false);

    if (success) {
      onOpenChange(false);
    }
  };

  const isEditing = !!supplier?.id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Proveedor' : 'Nuevo Proveedor'}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Facturación
            </TabsTrigger>
            <TabsTrigger value="contacts" className="flex items-center gap-2" disabled={!isEditing}>
              <Users className="h-4 w-4" />
              Contactos
            </TabsTrigger>
          </TabsList>

          {/* Tab: Datos Generales */}
          <TabsContent value="general" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre Comercial *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Distribuidora ABC"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rut">RUT</Label>
                <Input
                  id="rut"
                  value={formData.rut}
                  onChange={(e) => setFormData({ ...formData, rut: e.target.value })}
                  placeholder="76.123.456-7"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="contacto@proveedor.cl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+56 9 1234 5678"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Dirección</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Av. Principal 123, Santiago"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="preferred_contact">Método de contacto preferido</Label>
              <Select
                value={formData.preferred_contact_method}
                onValueChange={(value: 'email' | 'whatsapp' | 'phone') => 
                  setFormData({ ...formData, preferred_contact_method: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="phone">Teléfono</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas internas</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notas adicionales sobre el proveedor..."
                rows={3}
              />
            </div>
          </TabsContent>

          {/* Tab: Facturación y Pago */}
          <TabsContent value="billing" className="space-y-6 mt-4">
            {/* Datos Fiscales */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">Datos Fiscales</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="razon_social">Razón Social</Label>
                  <Input
                    id="razon_social"
                    value={formData.razon_social}
                    onChange={(e) => setFormData({ ...formData, razon_social: e.target.value })}
                    placeholder="Distribuidora ABC SpA"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="giro">Giro</Label>
                  <Input
                    id="giro"
                    value={formData.giro}
                    onChange={(e) => setFormData({ ...formData, giro: e.target.value })}
                    placeholder="Venta de alimentos"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="direccion_fiscal">Dirección Fiscal</Label>
                <Input
                  id="direccion_fiscal"
                  value={formData.direccion_fiscal}
                  onChange={(e) => setFormData({ ...formData, direccion_fiscal: e.target.value })}
                  placeholder="Av. Fiscal 456"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="comuna_fiscal">Comuna</Label>
                  <Input
                    id="comuna_fiscal"
                    value={formData.comuna_fiscal}
                    onChange={(e) => setFormData({ ...formData, comuna_fiscal: e.target.value })}
                    placeholder="Santiago"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ciudad_fiscal">Ciudad</Label>
                  <Input
                    id="ciudad_fiscal"
                    value={formData.ciudad_fiscal}
                    onChange={(e) => setFormData({ ...formData, ciudad_fiscal: e.target.value })}
                    placeholder="Santiago"
                  />
                </div>
              </div>
            </div>

            {/* Datos Bancarios */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-medium text-sm text-muted-foreground">Datos Bancarios</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bank_name">Banco</Label>
                  <Input
                    id="bank_name"
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                    placeholder="Banco Estado"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bank_account_type">Tipo de Cuenta</Label>
                  <Select
                    value={formData.bank_account_type}
                    onValueChange={(value) => setFormData({ ...formData, bank_account_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="corriente">Cuenta Corriente</SelectItem>
                      <SelectItem value="vista">Cuenta Vista</SelectItem>
                      <SelectItem value="ahorro">Cuenta de Ahorro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bank_account_number">Número de Cuenta</Label>
                <Input
                  id="bank_account_number"
                  value={formData.bank_account_number}
                  onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })}
                  placeholder="123456789"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bank_account_holder">Titular</Label>
                  <Input
                    id="bank_account_holder"
                    value={formData.bank_account_holder}
                    onChange={(e) => setFormData({ ...formData, bank_account_holder: e.target.value })}
                    placeholder="Nombre del titular"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bank_account_holder_rut">RUT del Titular</Label>
                  <Input
                    id="bank_account_holder_rut"
                    value={formData.bank_account_holder_rut}
                    onChange={(e) => setFormData({ ...formData, bank_account_holder_rut: e.target.value })}
                    placeholder="12.345.678-9"
                  />
                </div>
              </div>
            </div>

            {/* Condiciones de Pago */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-medium text-sm text-muted-foreground">Condiciones de Pago</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="payment_terms_type">Tipo de Pago</Label>
                  <Select
                    value={formData.payment_terms_type}
                    onValueChange={(value: 'contado' | 'credito' | 'por_factura') => 
                      setFormData({ ...formData, payment_terms_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contado">Contado</SelectItem>
                      <SelectItem value="credito">Crédito</SelectItem>
                      <SelectItem value="por_factura">Por Factura</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.payment_terms_type === 'credito' && (
                  <div className="space-y-2">
                    <Label htmlFor="payment_terms_days">Días de Crédito</Label>
                    <Input
                      id="payment_terms_days"
                      type="number"
                      value={formData.payment_terms_days}
                      onChange={(e) => setFormData({ ...formData, payment_terms_days: parseInt(e.target.value) || 0 })}
                      placeholder="30"
                    />
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Tab: Contactos */}
          <TabsContent value="contacts" className="mt-4">
            {isEditing ? (
              <SupplierContactsList supplierId={supplier.id} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Guarda el proveedor primero para agregar contactos</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
