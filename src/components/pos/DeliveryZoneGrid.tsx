import React from 'react';
import { Button } from '@/components/ui/button';
import { MapPin } from 'lucide-react';
import { useDeliveryZones } from '@/hooks/useDeliveryZones';

interface DeliveryZoneGridProps {
  selectedZoneId?: string;
  onZoneChange: (zoneId: string, deliveryFee: number) => void;
  disabled?: boolean;
}

export function DeliveryZoneGrid({ selectedZoneId, onZoneChange, disabled }: DeliveryZoneGridProps) {
  const { getActiveZones, loading } = useDeliveryZones();
  const activeZones = getActiveZones();

  const handleZoneSelect = (zoneId: string) => {
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-muted animate-pulse rounded-lg"></div>
        ))}
      </div>
    );
  }

  if (activeZones.length === 0) {
    return (
      <div className="text-center py-8">
        <MapPin className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <div className="text-muted-foreground">
          No hay zonas de delivery configuradas
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {activeZones.map((zone) => (
        <Button
          key={zone.id}
          variant={selectedZoneId === zone.id ? 'default' : 'outline'}
          disabled={disabled}
          onClick={() => handleZoneSelect(zone.id)}
          className="h-auto p-4 flex flex-col items-center gap-2 text-center"
        >
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span className="font-medium">{zone.name}</span>
          </div>
          <div className="text-sm opacity-80">
            {formatPrice(zone.delivery_fee)}
          </div>
        </Button>
      ))}
    </div>
  );
}