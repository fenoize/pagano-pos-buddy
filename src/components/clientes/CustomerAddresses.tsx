import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, MapPin, Home } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useCustomerAddresses, AddressFormData } from '@/hooks/useCustomerAddresses';
import { Address } from '@/types';

interface CustomerAddressesProps {
  customerId: string;
}

export default function CustomerAddresses({ customerId }: CustomerAddressesProps) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [formData, setFormData] = useState<AddressFormData>({
    alias: '',
    calle: '',
    numero: '',
    depto: '',
    comuna: '',
    ciudad: 'Santiago',
    observaciones: '',
    is_default: false
  });
  const [loading, setLoading] = useState(false);

  const {
    getCustomerAddresses,
    createAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress
  } = useCustomerAddresses();

  const loadAddresses = async () => {
    const data = await getCustomerAddresses(customerId);
    setAddresses(data);
  };

  useEffect(() => {
    loadAddresses();
  }, [customerId]);

  const handleOpenModal = (address?: Address) => {
    if (address) {
      setEditingAddress(address);
      setFormData({
        alias: address.alias,
        calle: address.calle,
        numero: address.numero,
        depto: address.depto || '',
        comuna: address.comuna,
        ciudad: address.ciudad,
        observaciones: address.observaciones || '',
        is_default: address.is_default
      });
    } else {
      setEditingAddress(null);
      setFormData({
        alias: addresses.length === 0 ? 'Principal' : '',
        calle: '',
        numero: '',
        depto: '',
        comuna: '',
        ciudad: 'Santiago',
        observaciones: '',
        is_default: addresses.length === 0
      });
    }
    setIsAddressModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let success;
      if (editingAddress) {
        success = await updateAddress(editingAddress.id, formData);
      } else {
        success = await createAddress(customerId, formData);
      }

      if (success) {
        setIsAddressModalOpen(false);
        loadAddresses();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (address: Address) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar la dirección "${address.alias}"?`)) {
      const success = await deleteAddress(address.id);
      if (success) {
        loadAddresses();
      }
    }
  };

  const handleSetDefault = async (address: Address) => {
    if (!address.is_default) {
      const success = await setDefaultAddress(address.id);
      if (success) {
        loadAddresses();
      }
    }
  };

  const handleInputChange = (field: keyof AddressFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Direcciones</h3>
          <p className="text-sm text-muted-foreground">
            Gestiona las direcciones de entrega del cliente
          </p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Dirección
        </Button>
      </div>

      {/* Addresses List */}
      {addresses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <MapPin className="w-12 h-12 text-muted-foreground mb-4" />
            <h4 className="text-lg font-semibold mb-2">Sin direcciones registradas</h4>
            <p className="text-muted-foreground text-center mb-4">
              Agrega la primera dirección de entrega para este cliente
            </p>
            <Button onClick={() => handleOpenModal()}>
              <Plus className="w-4 h-4 mr-2" />
              Agregar Dirección
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((address) => (
            <Card key={address.id} className={address.is_default ? 'ring-2 ring-primary' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center">
                    <Home className="w-4 h-4 mr-2" />
                    {address.alias}
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    {address.is_default && (
                      <Badge variant="default">Principal</Badge>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => handleOpenModal(address)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDelete(address)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm">
                    <strong>Dirección:</strong> {address.calle} {address.numero}
                    {address.depto && `, Depto ${address.depto}`}
                  </p>
                  <p className="text-sm">
                    <strong>Comuna:</strong> {address.comuna}, {address.ciudad}
                  </p>
                  {address.observaciones && (
                    <p className="text-sm">
                      <strong>Observaciones:</strong> {address.observaciones}
                    </p>
                  )}
                  {!address.is_default && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleSetDefault(address)}
                      className="mt-2"
                    >
                      Marcar como Principal
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Address Form Modal */}
      <Dialog open={isAddressModalOpen} onOpenChange={setIsAddressModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingAddress ? 'Editar Dirección' : 'Nueva Dirección'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Alias */}
            <div className="space-y-2">
              <Label htmlFor="alias">Alias *</Label>
              <Input
                id="alias"
                value={formData.alias}
                onChange={(e) => handleInputChange('alias', e.target.value)}
                placeholder="Ej: Casa, Trabajo, etc."
                required
              />
            </div>

            {/* Calle */}
            <div className="space-y-2">
              <Label htmlFor="calle">Calle *</Label>
              <Input
                id="calle"
                value={formData.calle}
                onChange={(e) => handleInputChange('calle', e.target.value)}
                placeholder="Ej: Av. Las Condes"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Número */}
              <div className="space-y-2">
                <Label htmlFor="numero">Número *</Label>
                <Input
                  id="numero"
                  value={formData.numero}
                  onChange={(e) => handleInputChange('numero', e.target.value)}
                  placeholder="123"
                  required
                />
              </div>

              {/* Depto */}
              <div className="space-y-2">
                <Label htmlFor="depto">Depto</Label>
                <Input
                  id="depto"
                  value={formData.depto}
                  onChange={(e) => handleInputChange('depto', e.target.value)}
                  placeholder="A, 402, etc."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Comuna */}
              <div className="space-y-2">
                <Label htmlFor="comuna">Comuna *</Label>
                <Input
                  id="comuna"
                  value={formData.comuna}
                  onChange={(e) => handleInputChange('comuna', e.target.value)}
                  placeholder="Las Condes"
                  required
                />
              </div>

              {/* Ciudad */}
              <div className="space-y-2">
                <Label htmlFor="ciudad">Ciudad</Label>
                <Input
                  id="ciudad"
                  value={formData.ciudad}
                  onChange={(e) => handleInputChange('ciudad', e.target.value)}
                  placeholder="Santiago"
                />
              </div>
            </div>

            {/* Observaciones */}
            <div className="space-y-2">
              <Label htmlFor="observaciones">Observaciones</Label>
              <Textarea
                id="observaciones"
                value={formData.observaciones}
                onChange={(e) => handleInputChange('observaciones', e.target.value)}
                placeholder="Instrucciones especiales, referencias, etc."
                rows={3}
              />
            </div>

            {/* Es dirección principal */}
            {addresses.length > 0 && (
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_default"
                  checked={formData.is_default}
                  onChange={(e) => handleInputChange('is_default', e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="is_default">Marcar como dirección principal</Label>
              </div>
            )}

            {/* Buttons */}
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsAddressModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {editingAddress ? 'Actualizando...' : 'Creando...'}
                  </>
                ) : (
                  editingAddress ? 'Actualizar' : 'Crear'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}