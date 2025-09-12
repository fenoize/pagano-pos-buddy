import React, { useState, useEffect } from 'react';
import { Order, OrderStatus } from '@/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, MapPin, Phone, User, Package, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface KDSConfig {
  timeGreen: number;
  timeYellow: number;
  timeRed: number;
  columns: number;
  cardSize: 'small' | 'medium' | 'large';
  soundEnabled: boolean;
}

interface OrderCardProps {
  order: Order;
  config: KDSConfig;
  onStatusChange: (orderId: string, status: OrderStatus) => void;
}

export function OrderCard({ order, config, onStatusChange }: OrderCardProps) {
  const [elapsedMinutes, setElapsedMinutes] = useState(0);

  useEffect(() => {
    const updateElapsedTime = () => {
      const now = new Date();
      const created = new Date(order.created_at);
      const minutes = Math.floor((now.getTime() - created.getTime()) / 60000);
      setElapsedMinutes(minutes);
    };

    updateElapsedTime();
    const interval = setInterval(updateElapsedTime, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [order.created_at]);

  const getCardColor = () => {
    if (order.status === 'Listo') return 'bg-green-100 border-green-300';
    if (order.status === 'En pausa') return 'bg-yellow-100 border-yellow-300';
    
    if (elapsedMinutes <= config.timeGreen) {
      return 'bg-green-50 border-green-200';
    } else if (elapsedMinutes <= config.timeYellow) {
      return 'bg-yellow-50 border-yellow-200';
    } else {
      return 'bg-red-50 border-red-200';
    }
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'Pendiente': return 'secondary';
      case 'En preparación': return 'default';
      case 'En pausa': return 'outline';
      case 'Listo': return 'destructive';
      default: return 'secondary';
    }
  };

  const getNextStatus = (currentStatus: OrderStatus): OrderStatus | null => {
    switch (currentStatus) {
      case 'Pendiente': return 'En preparación';
      case 'En preparación': return 'Listo';
      case 'En pausa': return 'En preparación';
      case 'Listo': return 'Entregado';
      default: return null;
    }
  };

  const canPause = order.status === 'En preparación';
  const canResume = order.status === 'En pausa';
  const nextStatus = getNextStatus(order.status);

  const cardSizeClasses = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-base'
  };

  const formatElapsedTime = () => {
    const hours = Math.floor(elapsedMinutes / 60);
    const mins = elapsedMinutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <Card className={`${getCardColor()} ${cardSizeClasses[config.cardSize]}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold text-primary">#{order.order_number}</div>
            {order.fulfillment === 'delivery' && (
              <MapPin className="w-4 h-4 text-muted-foreground" />
            )}
            {order.fulfillment === 'retiro' && (
              <Package className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getStatusColor(order.status)}>
              {order.status}
            </Badge>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span className="font-mono">{formatElapsedTime()}</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Customer Info */}
        {order.customer && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <User className="w-3 h-3" />
            <span>{order.customer.name} {order.customer.apellido}</span>
            {order.customer.phone && (
              <>
                <Phone className="w-3 h-3" />
                <span>{order.customer.phone}</span>
              </>
            )}
          </div>
        )}

        {/* Items */}
        <div className="space-y-2">
          {order.items.map((item, index) => (
            <div key={index} className="bg-background/50 p-2 rounded border">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-medium">
                    {item.quantity}x {item.productName} - {item.size}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {item.priceKind === 'combo' ? 'Combo' : 'Solo'}
                  </div>
                  
                  {/* Extras */}
                  {item.extras.length > 0 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Extras: {item.extras.map(extra => 
                        `${extra.quantity || 1}x ${extra.label}`
                      ).join(', ')}
                    </div>
                  )}

                  {/* Modifiers */}
                  {item.modifiers.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Modificadores: {item.modifiers.map(mod => mod.name).join(', ')}
                    </div>
                  )}

                  {/* Notes */}
                  {item.notes && (
                    <div className="flex items-start gap-1 text-xs text-muted-foreground mt-1">
                      <MessageSquare className="w-3 h-3 mt-0.5" />
                      <span className="italic">{item.notes}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {canPause && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onStatusChange(order.id, 'En pausa')}
            >
              Pausar
            </Button>
          )}
          
          {canResume && (
            <Button
              variant="default"
              size="sm"
              onClick={() => onStatusChange(order.id, 'En preparación')}
            >
              Reanudar
            </Button>
          )}

          {nextStatus && (
            <Button
              variant="default"
              size="sm"
              onClick={() => onStatusChange(order.id, nextStatus)}
              className="flex-1"
            >
              {nextStatus === 'En preparación' && 'Iniciar'}
              {nextStatus === 'Listo' && 'Marcar Listo'}
              {nextStatus === 'Entregado' && 'Entregar'}
            </Button>
          )}
        </div>

        {/* Delivery Info */}
        {order.fulfillment === 'delivery' && (order.delivery_address || order.delivery_comuna) && (
          <div className="text-xs text-muted-foreground pt-2 border-t">
            <div className="flex items-start gap-1">
              <MapPin className="w-3 h-3 mt-0.5" />
              <div>
                {order.delivery_address} {order.delivery_number}, {order.delivery_comuna}
              </div>
            </div>
          </div>
        )}

        {/* Timestamp */}
        <div className="text-xs text-muted-foreground text-right pt-2 border-t">
          Creado {formatDistanceToNow(new Date(order.created_at), { 
            addSuffix: true, 
            locale: es 
          })}
        </div>
      </CardContent>
    </Card>
  );
}