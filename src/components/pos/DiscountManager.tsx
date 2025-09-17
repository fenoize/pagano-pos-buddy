import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Percent, DollarSign, X } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export interface DiscountData {
  type: 'percentage' | 'fixed';
  value: number;
  amount: number; // Calculated discount amount in CLP
}

interface DiscountManagerProps {
  subtotal: number;
  discount: DiscountData | null;
  onDiscountChange: (discount: DiscountData | null) => void;
}

export default function DiscountManager({ subtotal, discount, onDiscountChange }: DiscountManagerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState<string>('');

  useEffect(() => {
    if (discount) {
      setDiscountType(discount.type);
      setDiscountValue(discount.value.toString());
      setIsEditing(true);
    }
  }, [discount]);

  const calculateDiscountAmount = (type: 'percentage' | 'fixed', value: number): number => {
    if (type === 'percentage') {
      return Math.round(subtotal * (value / 100));
    } else {
      return Math.min(value, subtotal);
    }
  };

  const validateDiscountValue = (type: 'percentage' | 'fixed', value: number): boolean => {
    if (value < 0) return false;
    if (type === 'percentage') {
      return value <= 100;
    } else {
      return value <= subtotal;
    }
  };

  const handleApplyDiscount = () => {
    const value = parseFloat(discountValue);
    
    if (isNaN(value) || !validateDiscountValue(discountType, value)) {
      return;
    }

    const amount = calculateDiscountAmount(discountType, value);
    
    onDiscountChange({
      type: discountType,
      value,
      amount
    });
    
    setIsEditing(false);
  };

  const handleRemoveDiscount = () => {
    onDiscountChange(null);
    setDiscountValue('');
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    if (discount) {
      setDiscountType(discount.type);
      setDiscountValue(discount.value.toString());
    } else {
      setDiscountValue('');
      setDiscountType('percentage');
    }
    setIsEditing(false);
  };

  const isValidValue = () => {
    const value = parseFloat(discountValue);
    return !isNaN(value) && validateDiscountValue(discountType, value) && value > 0;
  };

  const previewAmount = () => {
    const value = parseFloat(discountValue);
    if (isNaN(value)) return 0;
    return calculateDiscountAmount(discountType, value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span>Descuento Manual</span>
          {discount && !isEditing && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {discount.type === 'percentage' ? `${discount.value}%` : formatCurrency(discount.value)}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="h-6 w-6 p-0"
              >
                <DollarSign className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveDiscount}
                className="h-6 w-6 p-0"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select
                  value={discountType}
                  onValueChange={(value: 'percentage' | 'fixed') => setDiscountType(value)}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">
                      <div className="flex items-center gap-2">
                        <Percent className="w-3 h-3" />
                        Porcentaje
                      </div>
                    </SelectItem>
                    <SelectItem value="fixed">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-3 h-3" />
                        Monto Fijo
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Valor</Label>
                <Input
                  type="number"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder={discountType === 'percentage' ? '0-100' : '0'}
                  className="h-8"
                  max={discountType === 'percentage' ? 100 : subtotal}
                  min={0}
                />
              </div>
            </div>

            {discountValue && isValidValue() && (
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">
                  Subtotal: {formatCurrency(subtotal)}
                </div>
                <div className="flex justify-between items-center p-2 bg-muted rounded text-sm">
                  <span>Descuento:</span>
                  <span className="font-medium text-destructive">
                    -{formatCurrency(previewAmount())}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-primary/10 rounded text-sm">
                  <span>Nuevo subtotal:</span>
                  <span className="font-bold">
                    {formatCurrency(Math.max(0, subtotal - previewAmount()))}
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelEdit}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleApplyDiscount}
                disabled={!isValidValue()}
                className="flex-1"
              >
                Aplicar
              </Button>
            </div>
          </>
        ) : (
          <>
            {discount ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Tipo:</span>
                  <span className="text-sm font-medium">
                    {discount.type === 'percentage' ? 'Porcentaje' : 'Monto Fijo'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Valor:</span>
                  <span className="text-sm font-medium">
                    {discount.type === 'percentage' ? `${discount.value}%` : formatCurrency(discount.value)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-destructive/10 rounded">
                  <span className="text-sm">Descuento aplicado:</span>
                  <span className="text-sm font-bold text-destructive">
                    -{formatCurrency(discount.amount)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-3">
                  No hay descuento aplicado
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Aplicar Descuento
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}