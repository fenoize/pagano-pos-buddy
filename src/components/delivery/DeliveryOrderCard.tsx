import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Phone, Map, TruckIcon, CheckCircle2, Clock, User, MapPin, 
  MessageSquare, DollarSign, Wallet, CreditCard, Loader2, Package,
  Navigation
} from 'lucide-react';
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
import { calculateDeliveryPaymentInfo } from '@/lib/deliveryHelpers';
import { DeliveryCollectPaymentModal } from './DeliveryCollectPaymentModal';
import { LocationPermissionHelper } from './LocationPermissionHelper';
import { useDeliveryTracking } from '@/hooks/useDeliveryTracking';

interface DeliveryOrderCardProps {
  order: DeliveryOrder;
  isUpdating: boolean;
  mapProvider: MapProvider;
  onMarkAsOnTheWay: (orderId: string) => void;
  onMarkAsDelivered: (orderId: string) => void;
  onCollectAndDeliver?: (orderId: string, method: string, cashGiven?: number) => Promise<boolean>;
  showInPreparation?: boolean;
}

export const DeliveryOrderCard: React.FC<DeliveryOrderCardProps> = ({
  order,
  isUpdating,
  mapProvider,
  onMarkAsOnTheWay,
  onMarkAsDelivered,
  onCollectAndDeliver,
  showInPreparation = false
}) => {
  const [showDeliveredConfirm, setShowDeliveredConfirm] = useState(false);
  const [showCollectModal, setShowCollectModal] = useState(false);

  const isPendingPayment = order.payment_method?.toLowerCase() === 'pendiente';

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(price);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'En preparación':
        return 'secondary';
      case 'Listo': 
        return 'default';
      case 'En camino': 
        return 'destructive';
      default: 
        return 'outline';
    }
  };

  const getFullAddress = () => {
    const parts = [
      order.delivery_address,
      order.delivery_number ? `#${order.delivery_number}` : '',
      order.delivery_comuna
    ].filter(Boolean);
    
    let address = parts.join(', ');
    
    if (order.delivery_reference) {
      address += ` (${order.delivery_reference})`;
    }
    
    return address;
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

  const handleDeliveredConfirm = () => {
    onMarkAsDelivered(order.id);
    setShowDeliveredConfirm(false);
  };

  const handleDeliveredClick = () => {
    if (isPendingPayment && onCollectAndDeliver) {
      setShowCollectModal(true);
    } else {
      setShowDeliveredConfirm(true);
    }
  };

  const handleCollectConfirm = async (method: string, cashGiven?: number) => {
    if (onCollectAndDeliver) {
      const success = await onCollectAndDeliver(order.id, method, cashGiven);
      if (success) setShowCollectModal(false);
    }
  };

  // Calcular información de pago
  const paymentInfo = calculateDeliveryPaymentInfo(order);

  const getPaymentMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case 'efectivo':
        return <DollarSign className="w-4 h-4" />;
      case 'mercadopago':
      case 'app':
        return <Wallet className="w-4 h-4" />;
      case 'pos':
      case 'runas':
        return <CreditCard className="w-4 h-4" />;
      default:
        return <DollarSign className="w-4 h-4" />;
    }
  };

  return (
    <>
      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-primary">#{order.order_number}</span>
              <Badge variant={getStatusBadgeVariant(order.status)}>
                {order.status}
              </Badge>
              {showInPreparation && (
                <Badge variant="outline" className="bg-yellow-50">
                  <Package className="w-3 h-3 mr-1" />
                  En cocina
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Hace {order.minutes_since_created}min</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Cliente */}
          <div className="flex items-start gap-2">
            <User className="w-4 h-4 mt-1 text-muted-foreground flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium">{order.customer_name || 'Cliente sin nombre'}</p>
              {order.customer_phone && (
                <p className="text-sm text-muted-foreground">{order.customer_phone}</p>
              )}
            </div>
          </div>

          {/* Dirección */}
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 mt-1 text-muted-foreground flex-shrink-0" />
            <p className="text-sm flex-1">{getFullAddress() || 'Sin dirección'}</p>
          </div>

          {/* Fee de delivery */}
          <div className="flex items-center justify-between py-2 px-3 bg-muted rounded-md">
            <span className="text-sm font-medium">Fee de delivery</span>
            <span className="font-bold text-green-600">{formatPrice(order.delivery_fee || 0)}</span>
          </div>

          {/* Información de pago */}
          <div className="border-t pt-3 space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              Información de pago
            </h4>
            
            {/* Métodos de pago */}
            {paymentInfo.methods.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {paymentInfo.methods.map((method, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {getPaymentMethodIcon(method)}
                    <span className="ml-1">{method}</span>
                  </Badge>
                ))}
              </div>
            )}

            {/* Caso A: Pagado completamente */}
            {paymentInfo.isPaidInFull && (
              <div className="bg-green-50 border border-green-200 rounded-md p-3">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-semibold">Pedido pagado. No cobrar al cliente.</span>
                </div>
              </div>
            )}

            {/* Caso B/C: Pago pendiente (total o parcial) */}
            {!paymentInfo.isPaidInFull && (
              <div className="space-y-2">
                {/* Si hay pago parcial, mostrar cuánto está pagado */}
                {paymentInfo.hasPartialPayment && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Ya pagado:</span>
                    <span className="font-medium">{formatPrice(paymentInfo.paidAmount)}</span>
                  </div>
                )}

                {/* Monto a cobrar */}
                <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-900">
                      <DollarSign className="w-5 h-5" />
                      <span className="font-semibold">
                        {paymentInfo.hasPartialPayment ? 'Pendiente en efectivo:' : 'Cobrar:'}
                      </span>
                    </div>
                    <span className="text-lg font-bold text-amber-900">
                      {formatPrice(paymentInfo.amountToCollect)}
                    </span>
                  </div>

                  {/* Vuelto estimado si existe */}
                  {paymentInfo.estimatedChange !== undefined && paymentInfo.estimatedChange > 0 && (
                    <div className="mt-2 pt-2 border-t border-amber-200">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-amber-700">Vuelto estimado:</span>
                        <span className="font-semibold text-amber-900">
                          {formatPrice(paymentInfo.estimatedChange)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Notas del pedido */}
          {order.notes && (
            <div className="flex items-start gap-2 p-2 bg-muted rounded-md">
              <MessageSquare className="w-4 h-4 mt-1 text-muted-foreground flex-shrink-0" />
              <p className="text-sm">{order.notes}</p>
            </div>
          )}

          {/* Botones de acción */}
          {!showInPreparation && (
            <div className="grid grid-cols-2 gap-2 pt-2">
              {/* Botón Mapa */}
              <Button
                variant="outline"
                onClick={handleMapClick}
                disabled={!order.delivery_address}
              >
                <Map className="w-4 h-4 mr-2" />
                Mapa
              </Button>

              {/* Botón Llamar */}
              <Button
                variant="outline"
                onClick={handleCallClick}
                disabled={!order.customer_phone}
              >
                <Phone className="w-4 h-4 mr-2" />
                {order.customer_phone ? 'Llamar' : 'Sin teléfono'}
              </Button>

              {/* Botón "He retirado este pedido" - solo si está Listo */}
              {order.status === 'Listo' && (
                <Button
                  className="col-span-2"
                  onClick={() => onMarkAsOnTheWay(order.id)}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <TruckIcon className="w-4 h-4 mr-2" />
                      He retirado este pedido
                    </>
                  )}
                </Button>
              )}

              {/* Botón "Marcar como entregado" - solo si está En camino */}
              {order.status === 'En camino' && (
                <Button
                  className="col-span-2"
                  variant="default"
                  onClick={handleDeliveredClick}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Marcar como entregado
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de confirmación para entregado */}
      <AlertDialog open={showDeliveredConfirm} onOpenChange={setShowDeliveredConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Entregado el pedido #{order.order_number}?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Confirmas que has entregado este pedido al cliente?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeliveredConfirm}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de cobro para pagos pendientes */}
      <DeliveryCollectPaymentModal
        open={showCollectModal}
        onOpenChange={setShowCollectModal}
        orderNumber={order.order_number || 0}
        amountToCollect={paymentInfo.amountToCollect}
        onConfirm={handleCollectConfirm}
        isProcessing={isUpdating}
      />
    </>
  );
};
