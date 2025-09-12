import React, { useState, useEffect } from 'react';
import { FulfillmentType } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Store, Truck, Coffee } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FulfillmentStepProps {
  fulfillment: FulfillmentType;
  onFulfillmentChange: (fulfillment: FulfillmentType, deliveryFee?: number, deliveryZone?: string) => void;
  onNext: () => void;
}

interface DeliveryZone {
  name: string;
  price: number;
}

export default function FulfillmentStep({ fulfillment, onFulfillmentChange, onNext }: FulfillmentStepProps) {
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);
  const [selectedZone, setSelectedZone] = useState<DeliveryZone | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchDeliveryZones();
  }, []);

  const fetchDeliveryZones = async () => {
    try {
      const { data, error } = await supabase
        .from('config')
        .select('value')
        .eq('key', 'delivery_zones')
        .single();

      if (error) throw error;
      
      if (data) {
        setDeliveryZones((data.value as unknown) as DeliveryZone[]);
      }
    } catch (error) {
      console.error('Error fetching delivery zones:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las zonas de delivery",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(price);
  };

  const handleFulfillmentSelect = (type: FulfillmentType) => {
    if (type === 'delivery') {
      // Don't proceed to next step, wait for zone selection
      onFulfillmentChange(type);
    } else {
      onFulfillmentChange(type, 0);
      onNext();
    }
  };

  const handleZoneSelect = (zone: DeliveryZone) => {
    setSelectedZone(zone);
    onFulfillmentChange('delivery', zone.price, zone.name);
  };

  const handleContinue = () => {
    if (fulfillment === 'delivery' && !selectedZone) {
      toast({
        title: "Error",
        description: "Selecciona una zona de delivery",
        variant: "destructive"
      });
      return;
    }
    onNext();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Cargando opciones de entrega...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Modalidad de Entrega</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Retiro */}
            <Button
              variant={fulfillment === 'retiro' ? 'default' : 'outline'}
              className="h-24 flex flex-col gap-2"
              onClick={() => handleFulfillmentSelect('retiro')}
            >
              <Store className="w-8 h-8" />
              <div className="text-center">
                <div className="font-medium">Retiro</div>
                <div className="text-sm opacity-80">En local</div>
              </div>
            </Button>

            {/* Delivery */}
            <Button
              variant={fulfillment === 'delivery' ? 'default' : 'outline'}
              className="h-24 flex flex-col gap-2"
              onClick={() => handleFulfillmentSelect('delivery')}
            >
              <Truck className="w-8 h-8" />
              <div className="text-center">
                <div className="font-medium">Delivery</div>
                <div className="text-sm opacity-80">A domicilio</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delivery Zones */}
      {fulfillment === 'delivery' && deliveryZones.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Zona de Delivery</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {deliveryZones.map((zone, index) => (
                <Button
                  key={index}
                  variant={selectedZone?.name === zone.name ? 'default' : 'outline'}
                  className="h-16 flex flex-col gap-1 justify-center"
                  onClick={() => handleZoneSelect(zone)}
                >
                  <div className="font-medium">{zone.name}</div>
                  <Badge variant="secondary" className="text-xs">
                    {formatPrice(zone.price)}
                  </Badge>
                </Button>
              ))}
            </div>
            
            {selectedZone && (
              <div className="mt-4 p-4 border rounded-lg bg-primary/5">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Zona seleccionada: {selectedZone.name}</span>
                  <Badge variant="default">{formatPrice(selectedZone.price)}</Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Continue Button */}
      {(fulfillment === 'retiro' || 
        (fulfillment === 'delivery' && selectedZone)) && (
        <Button onClick={handleContinue} className="w-full" size="lg">
          Continuar al Menú
        </Button>
      )}
    </div>
  );
}