import React, { useState } from 'react';
import { FulfillmentType } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Store, Truck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DeliveryZoneSelector } from './DeliveryZoneSelector';

interface FulfillmentStepProps {
  fulfillment: FulfillmentType;
  onFulfillmentChange: (fulfillment: FulfillmentType, deliveryFee?: number, deliveryZoneId?: string) => void;
  onNext: () => void;
}

export default function FulfillmentStep({ fulfillment, onFulfillmentChange, onNext }: FulfillmentStepProps) {
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const { toast } = useToast();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
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

  const handleZoneChange = (zoneId: string, fee: number) => {
    setSelectedZoneId(zoneId);
    setDeliveryFee(fee);
    onFulfillmentChange('delivery', fee, zoneId);
  };

  const handleContinue = () => {
    if (fulfillment === 'delivery' && !selectedZoneId) {
      toast({
        title: "Error",
        description: "Selecciona una zona de delivery",
        variant: "destructive"
      });
      return;
    }
    onNext();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Modalidad de Entrega</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

      {/* Delivery Zone Selection */}
      {fulfillment === 'delivery' && (
        <Card>
          <CardHeader>
            <CardTitle>Zona de Delivery</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DeliveryZoneSelector
              selectedZoneId={selectedZoneId}
              onZoneChange={handleZoneChange}
            />
            
            {selectedZoneId && deliveryFee > 0 && (
              <div className="p-4 border rounded-lg bg-primary/5">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Costo de delivery:</span>
                  <Badge variant="default">{formatPrice(deliveryFee)}</Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Continue Button */}
      {(fulfillment === 'retiro' || 
        (fulfillment === 'delivery' && selectedZoneId)) && (
        <Button onClick={handleContinue} className="w-full" size="lg">
          Continuar al Menú
        </Button>
      )}
    </div>
  );
}