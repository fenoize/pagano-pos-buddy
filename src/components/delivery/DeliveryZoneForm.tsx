import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DeliveryZone, CreateDeliveryZoneData, UpdateDeliveryZoneData } from '@/hooks/useDeliveryZones';
import { DeliveryZoneMapEditor } from './DeliveryZoneMapEditor';
import { useDeliverySettings } from '@/hooks/useDeliverySettings';

interface DeliveryZoneFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateDeliveryZoneData | UpdateDeliveryZoneData) => Promise<{ success: boolean; error?: string }>;
  zone?: DeliveryZone | null;
  mode: 'create' | 'edit';
}

export function DeliveryZoneForm({ isOpen, onClose, onSubmit, zone, mode }: DeliveryZoneFormProps) {
  const { settings } = useDeliverySettings();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    delivery_fee: 0,
    active: true,
    calculation_mode: 'fixed' as 'fixed' | 'distance',
    price_per_km: 1000,
    min_fee: 2000,
    polygon: null as any,
    // Campos de pago al repartidor
    driver_payment_mode: 'fixed' as 'fixed' | 'percentage' | 'per_km',
    driver_payment_amount: 0,
    driver_payment_percentage: 0,
    driver_payment_per_km: 0
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (mode === 'edit' && zone) {
      setFormData({
        name: zone.name,
        description: zone.description || '',
        delivery_fee: zone.delivery_fee,
        active: zone.active,
        calculation_mode: (zone as any).calculation_mode || 'fixed',
        price_per_km: (zone as any).price_per_km || 1000,
        min_fee: (zone as any).min_fee || 2000,
        polygon: (zone as any).polygon || null,
        driver_payment_mode: zone.driver_payment_mode || 'fixed',
        driver_payment_amount: zone.driver_payment_amount || 0,
        driver_payment_percentage: zone.driver_payment_percentage || 0,
        driver_payment_per_km: zone.driver_payment_per_km || 0
      });
    } else {
      setFormData({
        name: '',
        description: '',
        delivery_fee: 0,
        active: true,
        calculation_mode: 'fixed',
        price_per_km: 1000,
        min_fee: 2000,
        polygon: null,
        driver_payment_mode: 'fixed',
        driver_payment_amount: 0,
        driver_payment_percentage: 0,
        driver_payment_per_km: 0
      });
    }
  }, [mode, zone, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('El nombre de la zona es requerido');
      return;
    }

    if (formData.calculation_mode === 'fixed' && formData.delivery_fee < 0) {
      alert('El costo de delivery no puede ser negativo');
      return;
    }

    setIsSubmitting(true);

    try {
      const submitData = {
        ...formData,
        delivery_fee: formData.calculation_mode === 'fixed' ? formData.delivery_fee : formData.min_fee
      };
      
      const result = await onSubmit(submitData);
      
      if (result.success) {
        onClose();
      } else {
        alert(result.error || 'Error al guardar la zona');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Error al guardar la zona');
    } finally {
      setIsSubmitting(false);
    }
  };

  const storeLocation = settings?.store_lat && settings?.store_lng
    ? { lat: settings.store_lat, lng: settings.store_lng }
    : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Crear Nueva Zona' : 'Editar Zona'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' 
              ? 'Define una nueva zona de delivery con su área de cobertura y tarifa'
              : 'Modifica los datos de la zona de delivery'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre de la Zona *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ej: Zona Centro"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descripción opcional de la zona"
              rows={2}
            />
          </div>

          {/* Calculation Mode */}
          <div className="space-y-2">
            <Label>Modo de Cálculo de Tarifa</Label>
            <Select
              value={formData.calculation_mode}
              onValueChange={(value: 'fixed' | 'distance') => 
                setFormData(prev => ({ ...prev, calculation_mode: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Tarifa Fija</span>
                    <span className="text-xs text-muted-foreground">
                      Mismo precio para toda la zona
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="distance">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Por Distancia</span>
                    <span className="text-xs text-muted-foreground">
                      Precio según kilómetros recorridos
                    </span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Fixed Fee */}
          {formData.calculation_mode === 'fixed' && (
            <div className="space-y-2">
              <Label htmlFor="delivery_fee">Costo de Delivery (CLP) *</Label>
              <Input
                id="delivery_fee"
                type="number"
                min="0"
                step="100"
                value={formData.delivery_fee}
                onChange={(e) => setFormData(prev => ({ ...prev, delivery_fee: parseInt(e.target.value) || 0 }))}
                placeholder="2000"
                required
              />
            </div>
          )}

          {/* Distance-based pricing */}
          {formData.calculation_mode === 'distance' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price_per_km">Precio por KM (CLP)</Label>
                <Input
                  id="price_per_km"
                  type="number"
                  min="0"
                  step="100"
                  value={formData.price_per_km}
                  onChange={(e) => setFormData(prev => ({ ...prev, price_per_km: parseInt(e.target.value) || 0 }))}
                  placeholder="1000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="min_fee">Tarifa Mínima (CLP)</Label>
                <Input
                  id="min_fee"
                  type="number"
                  min="0"
                  step="100"
                  value={formData.min_fee}
                  onChange={(e) => setFormData(prev => ({ ...prev, min_fee: parseInt(e.target.value) || 0 }))}
                  placeholder="2000"
                />
              </div>
            </div>
          )}

          {/* Separator */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold mb-3 text-primary">Pago al Repartidor</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Configura cuánto se le pagará al repartidor por entregar en esta zona
            </p>
          </div>

          {/* Driver Payment Mode */}
          <div className="space-y-2">
            <Label>Modo de Pago al Repartidor</Label>
            <Select
              value={formData.driver_payment_mode}
              onValueChange={(value: 'fixed' | 'percentage' | 'per_km') => 
                setFormData(prev => ({ ...prev, driver_payment_mode: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Monto Fijo</span>
                    <span className="text-xs text-muted-foreground">
                      Mismo pago para toda la zona
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="percentage">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Porcentaje</span>
                    <span className="text-xs text-muted-foreground">
                      % del cobro al cliente
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="per_km">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Por Kilómetro</span>
                    <span className="text-xs text-muted-foreground">
                      Pago según distancia recorrida
                    </span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Driver Payment Fixed */}
          {formData.driver_payment_mode === 'fixed' && (
            <div className="space-y-2">
              <Label htmlFor="driver_payment_amount">Pago Fijo al Repartidor (CLP)</Label>
              <Input
                id="driver_payment_amount"
                type="number"
                min="0"
                step="100"
                value={formData.driver_payment_amount}
                onChange={(e) => setFormData(prev => ({ ...prev, driver_payment_amount: parseInt(e.target.value) || 0 }))}
                placeholder="1000"
              />
            </div>
          )}

          {/* Driver Payment Percentage */}
          {formData.driver_payment_mode === 'percentage' && (
            <div className="space-y-2">
              <Label htmlFor="driver_payment_percentage">Porcentaje del Cobro (%)</Label>
              <Input
                id="driver_payment_percentage"
                type="number"
                min="0"
                max="100"
                step="1"
                value={formData.driver_payment_percentage}
                onChange={(e) => setFormData(prev => ({ ...prev, driver_payment_percentage: parseFloat(e.target.value) || 0 }))}
                placeholder="50"
              />
              <p className="text-xs text-muted-foreground">
                Si el cobro al cliente es ${formData.delivery_fee.toLocaleString('es-CL')}, 
                el repartidor recibirá ${Math.round(formData.delivery_fee * formData.driver_payment_percentage / 100).toLocaleString('es-CL')}
              </p>
            </div>
          )}

          {/* Driver Payment Per KM */}
          {formData.driver_payment_mode === 'per_km' && (
            <div className="space-y-2">
              <Label htmlFor="driver_payment_per_km">Pago por Kilómetro (CLP)</Label>
              <Input
                id="driver_payment_per_km"
                type="number"
                min="0"
                step="100"
                value={formData.driver_payment_per_km}
                onChange={(e) => setFormData(prev => ({ ...prev, driver_payment_per_km: parseFloat(e.target.value) || 0 }))}
                placeholder="500"
              />
            </div>
          )}

          {/* Map Editor */}
          <div className="space-y-2">
            <Label>Área de Cobertura (Polígono)</Label>
            <DeliveryZoneMapEditor
              polygon={formData.polygon}
              onPolygonChange={(polygon) => setFormData(prev => ({ ...prev, polygon }))}
              storeLocation={storeLocation}
              height="250px"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="active"
              checked={formData.active}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
            />
            <Label htmlFor="active">Zona activa</Label>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Guardando...' : mode === 'create' ? 'Crear Zona' : 'Actualizar Zona'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
