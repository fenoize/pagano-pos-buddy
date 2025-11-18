import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Phone, Map, TruckIcon, CheckCircle2, Clock } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DeliveryOrder } from '@/hooks/useDeliveryOrders';
import { MapProvider } from '@/hooks/useDeliverySettings';

interface DeliveryOrderCardProps {
  order: DeliveryOrder;
  isUpdating: boolean;
  mapProvider: MapProvider;
  onMarkAsOnTheWay: (orderId: string) => void;
  onMarkAsDelivered: (orderId: string) => void;
}

export const DeliveryOrderCard: React.FC<DeliveryOrderCardProps> = ({
  order,
  isUpdating,
  mapProvider,
  onMarkAsOnTheWay,
  onMarkAsDelivered
}) => {
  const [showDeliveredConfirm, setShowDeliveredConfirm] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(price);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Listo': return 'default';
      case 'En camino': return 'secondary';
      case 'Entregado': return 'outline';
      default: return 'outline';
    }
  };

  const getFullAddress = () => {
    const parts = [
      order.delivery_address,
      order.delivery_number ? `#${order.delivery_number}` : '',
      order.delivery_comuna
    ].filter(Boolean);
    return parts.join(', ');
  };

  const handleMapClick = () => {
    const address = getFullAddress();
    let mapUrl = '';

    if (mapProvider === 'google_maps') {
      mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    } else if (mapProvider === 'waze') {
      mapUrl = `https://waze.com/ul?q=${encodeURIComponent(address)}`;
    }

    if (mapUrl) {
      window.open(mapUrl, '_blank');
    }
  };

  const handleCallClick = () => {
    if (order.customer_phone) {
      const cleanPhone = order.customer_phone.replace(/[^0-9+]/g, '');
      window.location.href = `tel:${cleanPhone}`;
    }
  };

  const isAssigned = !!order.delivery_person_id;

  return (
    <>
      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        <CardContent className="p-4 space-y-3">
          {/* Header: Número de pedido y estado */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-primary">#{order.order_number}</span>
              {!isAssigned && (
                <Badge variant="outline" className="text-xs">Disponible</Badge>
              )}
            </div>
            <Badge variant={getStatusBadgeVariant(order.status)}>
              {order.status}
            </Badge>
          </div>

          {/* Cliente y dirección */}
          <div className="space-y-1">
            <p className="font-semibold text-base">{order.customer_name || 'Cliente'}</p>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {getFullAddress() || 'Sin dirección'}
            </p>
          </div>

          {/* Información adicional */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Hace {order.minutes_since_created} min</span>
            </div>
            <div className="font-semibold text-green-600">
              {formatPrice(order.delivery_fee || 0)}
            </div>
          </div>

          {/* Nota del pedido */}
          {order.notes && (
            <div className="text-sm p-2 bg-muted rounded-md">
              <p className="text-muted-foreground line-clamp-2">{order.notes}</p>
            </div>
          )}

          {/* Botones de acción */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleMapClick}
              disabled={!order.delivery_address}
              className="w-full"
            >
              <Map className="w-4 h-4 mr-1" />
              Mapa
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleCallClick}
              disabled={!order.customer_phone}
              className="w-full"
            >
              <Phone className="w-4 h-4 mr-1" />
              {order.customer_phone ? 'Llamar' : 'Sin teléfono'}
            </Button>

            {order.status === 'Listo' && (
              <Button
                variant="default"
                size="sm"
                onClick={() => onMarkAsOnTheWay(order.id)}
                disabled={isUpdating}
                className="col-span-2"
              >
                <TruckIcon className="w-4 h-4 mr-2" />
                En camino
              </Button>
            )}

            {(order.status === 'En camino' || order.status === 'Listo') && (
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowDeliveredConfirm(true)}
                disabled={isUpdating}
                className="col-span-2 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Entregado
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal de confirmación de entrega */}
      <AlertDialog open={showDeliveredConfirm} onOpenChange={setShowDeliveredConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Marcar como entregado?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Confirmas que el pedido #{order.order_number} ha sido entregado al cliente?
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onMarkAsDelivered(order.id);
                setShowDeliveredConfirm(false);
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
