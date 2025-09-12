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
  compact?: boolean;
}

export function OrderCard({ order, config, onStatusChange, compact = false }: OrderCardProps) {
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

  const cardMinHeight = compact ? 'min-h-[280px]' : 
    config.cardSize === 'large' ? 'min-h-[400px]' : 'min-h-[320px]';

  return (
    <Card className={`${getCardColor()} ${cardSizeClasses[config.cardSize]} transition-all duration-300 ${cardMinHeight}`}>
      <CardHeader className={compact ? "pb-2 px-3" : "pb-3"}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`font-bold text-primary ${compact ? 'text-lg' : 'text-2xl'}`}>
              #{order.order_number}
            </div>
            {order.fulfillment === 'delivery' && (
              <MapPin className={`text-muted-foreground ${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
            )}
            {order.fulfillment === 'retiro' && (
              <Package className={`text-muted-foreground ${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              variant={getStatusColor(order.status)}
              className={compact ? "text-xs px-2 py-0.5" : ""}
            >
              {order.status}
            </Badge>
            <div className={`flex items-center gap-1 text-muted-foreground ${compact ? 'text-xs' : 'text-xs'}`}>
              <Clock className={`${compact ? 'w-3 h-3' : 'w-3 h-3'}`} />
              <span className="font-mono">{formatElapsedTime()}</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className={`space-y-3 ${compact ? 'px-3 py-2' : 'space-y-4'}`}>
        {/* Customer Info */}
        {order.customer && (
          <div className={`flex items-center gap-2 text-muted-foreground ${compact ? 'text-xs' : 'text-xs'}`}>
            <User className={`${compact ? 'w-3 h-3' : 'w-3 h-3'}`} />
            <span>{order.customer.name} {order.customer.apellido}</span>
            {order.customer.phone && (
              <>
                <Phone className={`${compact ? 'w-3 h-3' : 'w-3 h-3'}`} />
                <span>{order.customer.phone}</span>
              </>
            )}
          </div>
        )}

        {/* Items */}
        <div className={compact ? "space-y-1.5" : "space-y-2"}>
          {order.items.map((item, index) => (
            <div key={index} className={`bg-background/50 rounded border ${compact ? 'p-1.5' : 'p-2'}`}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className={`font-medium ${compact ? 'text-xs' : ''}`}>
                    {item.quantity}x {item.productName} - {item.size}
                  </div>
                  <div className={`text-muted-foreground ${compact ? 'text-xs' : 'text-xs'}`}>
                    {item.priceKind === 'combo' ? 'Combo' : 'Solo'}
                  </div>
                  
                  {/* Extras */}
                  {item.extras.length > 0 && (
                    <div className={`text-muted-foreground mt-1 ${compact ? 'text-xs' : 'text-xs'}`}>
                      Extras: {item.extras.map(extra => 
                        `${extra.quantity || 1}x ${extra.label}`
                      ).join(', ')}
                    </div>
                  )}

                  {/* Modifiers */}
                  {item.modifiers.length > 0 && (
                    <div className={`text-muted-foreground ${compact ? 'text-xs' : 'text-xs'}`}>
                      Modificadores: {item.modifiers.map(mod => mod.name).join(', ')}
                    </div>
                  )}

                  {/* Notes */}
                  {item.notes && (
                    <div className={`flex items-start gap-1 text-muted-foreground mt-1 ${compact ? 'text-xs' : 'text-xs'}`}>
                      <MessageSquare className={`${compact ? 'w-3 h-3' : 'w-3 h-3'} mt-0.5`} />
                      <span className="italic">{item.notes}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className={`flex gap-2 ${compact ? 'gap-1' : 'gap-2'}`}>
          {canPause && (
            <Button
              variant="outline"
              size={compact ? "sm" : "sm"}
              onClick={() => onStatusChange(order.id, 'En pausa')}
            >
              <span className={compact ? 'text-xs' : ''}>Pausar</span>
            </Button>
          )}
          
          {canResume && (
            <Button
              variant="default"
              size={compact ? "sm" : "sm"}
              onClick={() => onStatusChange(order.id, 'En preparación')}
            >
              <span className={compact ? 'text-xs' : ''}>Reanudar</span>
            </Button>
          )}

          {nextStatus && (
            <Button
              variant="default"
              size={compact ? "sm" : "sm"}
              onClick={() => onStatusChange(order.id, nextStatus)}
              className="flex-1"
            >
              <span className={compact ? 'text-xs' : ''}>
                {nextStatus === 'En preparación' && 'Iniciar'}
                {nextStatus === 'Listo' && 'Marcar Listo'}
                {nextStatus === 'Entregado' && 'Entregar'}
              </span>
            </Button>
          )}
        </div>

        {/* Delivery Info */}
        {order.fulfillment === 'delivery' && (order.delivery_address || order.delivery_comuna) && (
          <div className={`text-muted-foreground pt-2 border-t ${compact ? 'text-xs' : 'text-xs'}`}>
            <div className="flex items-start gap-1">
              <MapPin className={`${compact ? 'w-3 h-3' : 'w-3 h-3'} mt-0.5`} />
              <div>
                {order.delivery_address} {order.delivery_number}, {order.delivery_comuna}
              </div>
            </div>
          </div>
        )}

        {/* Timestamp */}
        <div className={`text-muted-foreground text-right pt-2 border-t ${compact ? 'text-xs' : 'text-xs'}`}>
          Creado {formatDistanceToNow(new Date(order.created_at), { 
            addSuffix: true, 
            locale: es 
          })}
        </div>
      </CardContent>
    </Card>
  );
}