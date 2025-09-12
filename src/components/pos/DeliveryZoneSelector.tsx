import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { MapPin } from 'lucide-react';
import { useDeliveryZones } from '@/hooks/useDeliveryZones';

interface DeliveryZoneSelectorProps {
  selectedZoneId?: string;
  onZoneChange: (zoneId: string, deliveryFee: number) => void;
  disabled?: boolean;
}

export function DeliveryZoneSelector({ selectedZoneId, onZoneChange, disabled }: DeliveryZoneSelectorProps) {
  const { getActiveZones, loading } = useDeliveryZones();
  const activeZones = getActiveZones();

  const handleZoneChange = (zoneId: string) => {
    const selectedZone = activeZones.find(zone => zone.id === zoneId);
    if (selectedZone) {
      onZoneChange(zoneId, selectedZone.delivery_fee);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          Zona de Delivery
        </Label>
        <div className="h-10 bg-muted animate-pulse rounded-md"></div>
      </div>
    );
  }

  if (activeZones.length === 0) {
    return (
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="w-4 h-4" />
          Zona de Delivery
        </Label>
        <div className="text-sm text-muted-foreground">
          No hay zonas de delivery configuradas
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <MapPin className="w-4 h-4" />
        Zona de Delivery *
      </Label>
      <Select
        value={selectedZoneId}
        onValueChange={handleZoneChange}
        disabled={disabled}
      >
        <SelectTrigger>
          <SelectValue placeholder="Seleccionar zona de delivery" />
        </SelectTrigger>
        <SelectContent>
          {activeZones.map((zone) => (
            <SelectItem key={zone.id} value={zone.id}>
              <div className="flex justify-between items-center w-full">
                <span>{zone.name}</span>
                <span className="text-muted-foreground ml-2">
                  {formatPrice(zone.delivery_fee)}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedZoneId && (
        <div className="text-sm text-muted-foreground">
          Costo: {formatPrice(activeZones.find(z => z.id === selectedZoneId)?.delivery_fee || 0)}
        </div>
      )}
    </div>
  );
}