import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Coins } from 'lucide-react';

interface RunasCalculatorProps {
  totalAmount: number;
  runaValue: number;
  customerRunas?: number;
  className?: string;
}

export default function RunasCalculator({ 
  totalAmount, 
  runaValue, 
  customerRunas = 0,
  className = ""
}: RunasCalculatorProps) {
  
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(price);
  };

  const formatRunas = (runas: number) => {
    return new Intl.NumberFormat('es-CL').format(runas);
  };

  const runasToEarn = Math.floor(totalAmount / runaValue);
  const maxRunasToUse = Math.min(
    customerRunas,
    Math.floor(totalAmount / runaValue)
  );

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Current Runas */}
      {customerRunas > 0 && (
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Runas disponibles</span>
          </div>
          <div className="text-right">
            <Badge variant="secondary">
              {formatRunas(customerRunas)} Runas
            </Badge>
            <div className="text-xs text-muted-foreground mt-1">
              Valor: {formatPrice(customerRunas * runaValue)}
            </div>
          </div>
        </div>
      )}

      {/* Runas to Earn */}
      {runasToEarn > 0 && (
        <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Runas a ganar</span>
          </div>
          <Badge variant="default">
            +{formatRunas(runasToEarn)} Runas
          </Badge>
        </div>
      )}

      {/* Max Runas Available to Use */}
      {maxRunasToUse > 0 && (
        <div className="text-xs text-muted-foreground text-center">
          Puedes usar hasta {formatRunas(maxRunasToUse)} Runas 
          ({formatPrice(maxRunasToUse * runaValue)}) en este pedido
        </div>
      )}

      {/* Runa Value Reference */}
      <div className="text-xs text-muted-foreground text-center">
        1 Runa = {formatPrice(runaValue)}
      </div>
    </div>
  );
}