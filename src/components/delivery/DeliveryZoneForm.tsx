import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { DeliveryZone, CreateDeliveryZoneData, UpdateDeliveryZoneData } from '@/hooks/useDeliveryZones';

interface DeliveryZoneFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateDeliveryZoneData | UpdateDeliveryZoneData) => Promise<{ success: boolean; error?: string }>;
  zone?: DeliveryZone;
  mode: 'create' | 'edit';
}

export function DeliveryZoneForm({ isOpen, onClose, onSubmit, zone, mode }: DeliveryZoneFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    delivery_fee: 0,
    active: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (mode === 'edit' && zone) {
      setFormData({
        name: zone.name,
        description: zone.description || '',
        delivery_fee: zone.delivery_fee,
        active: zone.active
      });
    } else {
      setFormData({
        name: '',
        description: '',
        delivery_fee: 0,
        active: true
      });
    }
  }, [mode, zone, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('El nombre de la zona es requerido');
      return;
    }

    if (formData.delivery_fee < 0) {
      alert('El costo de delivery no puede ser negativo');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await onSubmit(formData);
      
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Crear Nueva Zona' : 'Editar Zona'}
          </DialogTitle>
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
              rows={3}
            />
          </div>

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