import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Ticket, AlertCircle, Check, X, DollarSign } from 'lucide-react';
import { OrderItem, Customer, CouponApplication, AppRole } from '@/types';
import { useCoupons } from '@/hooks/useCoupons';
import { validateCouponEligibility, applyCouponToCart } from '@/lib/couponValidation';
import { formatCurrency } from '@/lib/utils';
import { useAuthContext } from '@/contexts/AuthContext';
import DiscountManager from './DiscountManager';

interface CouponModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (couponApplication: CouponApplication) => void;
  cartItems: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  customer?: Partial<Customer>;
  existingCoupons: CouponApplication[];
  onRemoveCoupon?: (couponId: string) => void;
  manualDiscount?: { type: 'percentage' | 'fixed'; value: number; amount: number } | null;
  onManualDiscountChange?: (discount: { type: 'percentage' | 'fixed'; value: number; amount: number } | null) => void;
}

export const CouponModal = ({
  isOpen,
  onClose,
  onApply,
  cartItems,
  subtotal,
  deliveryFee,
  customer,
  existingCoupons,
  onRemoveCoupon,
  manualDiscount,
  onManualDiscountChange,
}: CouponModalProps) => {
  const { user } = useAuthContext();
  const { fetchCouponByCode } = useCoupons();
  const [couponCode, setCouponCode] = useState('');
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [selectedLines, setSelectedLines] = useState<number[]>([]);

  useEffect(() => {
    if (!isOpen) {
      setCouponCode('');
      setValidationResult(null);
      setSelectedLines([]);
    }
  }, [isOpen]);

  const handleValidate = async () => {
    if (!couponCode.trim()) return;

    setValidating(true);
    try {
      const coupon = await fetchCouponByCode(couponCode.trim());
      
      if (!coupon) {
        setValidationResult({
          valid: false,
          errors: ['Cupón no encontrado'],
        });
        return;
      }

      const result = await validateCouponEligibility(
        coupon,
        cartItems,
        subtotal,
        customer,
        user?.role as AppRole,
        existingCoupons
      );

      setValidationResult(result);
      
      if (result.valid && result.eligible_line_indices) {
        setSelectedLines(result.eligible_line_indices);
      }
    } catch (error) {
      setValidationResult({
        valid: false,
        errors: ['Error al validar el cupón'],
      });
    } finally {
      setValidating(false);
    }
  };

  const handleApply = async () => {
    if (!validationResult?.valid || !validationResult.coupon) return;

    try {
      const application = await applyCouponToCart(
        validationResult.coupon,
        cartItems,
        selectedLines,
        deliveryFee,
        user?.id
      );
      
      onApply(application);
      onClose();
    } catch (error) {
      console.error('Error al aplicar cupón:', error);
    }
  };

  const toggleLineSelection = (index: number) => {
    if (selectedLines.includes(index)) {
      setSelectedLines(selectedLines.filter(i => i !== index));
    } else {
      setSelectedLines([...selectedLines, index]);
    }
  };

  const coupon = validationResult?.coupon;
  const preview = validationResult?.preview;
  const isAdmin = user?.role === 'Administrador';
  const totalCouponDiscount = existingCoupons.reduce((sum, c) => sum + Number(c.discount_products) + Number(c.discount_delivery), 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ticket className="w-5 h-5" />
            Cupones y Descuentos
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="cupones" className="w-full">
          {isAdmin ? (
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="cupones">Cupones</TabsTrigger>
              <TabsTrigger value="descuentos">Desc. Manual</TabsTrigger>
            </TabsList>
          ) : (
            <TabsList className="grid w-full grid-cols-1">
              <TabsTrigger value="cupones">Cupones</TabsTrigger>
            </TabsList>
          )}

          <TabsContent value="cupones" className="space-y-4 mt-4">
            {/* Cupones aplicados */}
            {existingCoupons.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Cupones Aplicados</h4>
                {existingCoupons.map((app) => (
                  <div
                    key={app.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{app.payload.coupon_code}</Badge>
                        {app.payload.coupon_type === 'percent' && (
                          <span className="text-xs text-muted-foreground">Porcentaje</span>
                        )}
                        {app.payload.coupon_type === 'fixed_cart' && (
                          <span className="text-xs text-muted-foreground">Descuento fijo</span>
                        )}
                        {app.payload.coupon_type === 'fixed_product' && (
                          <span className="text-xs text-muted-foreground">Por producto</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm">
                        {app.discount_products > 0 && (
                          <span className="text-green-600">
                            Productos: -{formatCurrency(app.discount_products)}
                          </span>
                        )}
                        {app.discount_delivery > 0 && (
                          <span className="text-green-600">
                            Delivery: -{formatCurrency(app.discount_delivery)}
                          </span>
                        )}
                      </div>
                    </div>
                    {onRemoveCoupon && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveCoupon(app.coupon_id)}
                        className="h-8 w-8 p-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Separator />
              </div>
            )}

            {/* Input de código */}
            <div className="space-y-2">
            <Label htmlFor="coupon-code">Código del Cupón</Label>
            <div className="flex gap-2">
              <Input
                id="coupon-code"
                placeholder="Ej: PAGANOS10"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleValidate();
                }}
              />
              <Button onClick={handleValidate} disabled={validating || !couponCode.trim()}>
                {validating ? 'Validando...' : 'Validar'}
              </Button>
            </div>
          </div>

          {/* Resultado de validación */}
          {validationResult && (
            <>
              {!validationResult.valid ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <ul className="list-disc list-inside space-y-1">
                      {validationResult.errors.map((error: string, i: number) => (
                        <li key={i}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  {/* Información del cupón */}
                  <Card>
                    <CardContent className="pt-6 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-base">
                              {coupon.code}
                            </Badge>
                            <Badge variant="outline">
                              {coupon.type === 'percent' && `${coupon.amount}% descuento`}
                              {coupon.type === 'fixed_cart' && `${formatCurrency(coupon.amount)} descuento`}
                              {coupon.type === 'fixed_product' && `${formatCurrency(coupon.amount)} por producto`}
                            </Badge>
                          </div>
                          {coupon.description && (
                            <p className="text-sm text-muted-foreground mt-2">
                              {coupon.description}
                            </p>
                          )}
                        </div>
                        <Check className="w-5 h-5 text-green-600" />
                      </div>

                      <Separator />

                      {/* Preview de descuento */}
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">Descuento a aplicar:</h4>
                        {preview && (
                          <>
                            {preview.discount_products > 0 && (
                              <div className="flex justify-between text-sm">
                                <span>Descuento en productos:</span>
                                <span className="text-green-600 font-medium">
                                  -{formatCurrency(preview.discount_products)}
                                </span>
                              </div>
                            )}
                            {preview.discount_delivery > 0 && (
                              <div className="flex justify-between text-sm">
                                <span>Descuento en delivery:</span>
                                <span className="text-green-600 font-medium">
                                  -{formatCurrency(preview.discount_delivery)}
                                </span>
                              </div>
                            )}
                            <Separator />
                            <div className="flex justify-between font-medium">
                              <span>Total descuento:</span>
                              <span className="text-green-600">
                                -{formatCurrency(preview.total_discount)}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Selección de líneas (si aplica) */}
                  {coupon.allow_manual_line_selection && validationResult.eligible_line_indices && (
                    <Card>
                      <CardContent className="pt-6 space-y-3">
                        <h4 className="font-medium text-sm">Seleccionar productos:</h4>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {validationResult.eligible_line_indices.map((index: number) => {
                            const item = cartItems[index];
                            return (
                              <div
                                key={index}
                                className="flex items-center gap-3 p-2 rounded border hover:bg-muted/50"
                              >
                                <Checkbox
                                  checked={selectedLines.includes(index)}
                                  onCheckedChange={() => toggleLineSelection(index)}
                                />
                                <div className="flex-1">
                                  <div className="font-medium text-sm">{item.productName}</div>
                                  {item.variant_name && (
                                    <div className="text-xs text-muted-foreground">
                                      {item.variant_name}
                                    </div>
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  x{item.quantity}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Botones de acción */}
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={onClose}>
                      Cancelar
                    </Button>
                    <Button 
                      onClick={handleApply}
                      disabled={selectedLines.length === 0}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Aplicar Cupón
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
          </TabsContent>

          {/* Tab de Descuento Manual (solo admin) */}
          {isAdmin && (
            <TabsContent value="descuentos" className="space-y-4 mt-4">
              <DiscountManager
                discount={manualDiscount || null}
                onDiscountChange={onManualDiscountChange || (() => {})}
                subtotal={subtotal}
              />
              
              {manualDiscount && (
                <div className="p-4 border rounded-lg bg-muted/30">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium">Descuento Aplicado</h4>
                      <p className="text-sm text-muted-foreground">
                        {manualDiscount.type === 'percentage' 
                          ? `${manualDiscount.value}% de descuento` 
                          : `Descuento fijo de ${formatCurrency(manualDiscount.value)}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Total</div>
                      <div className="text-lg font-medium text-orange-600">
                        -{formatCurrency(manualDiscount.amount)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>

        {/* Resumen total */}
        {(existingCoupons.length > 0 || (isAdmin && manualDiscount)) && (
          <div className="pt-4 border-t">
            <div className="space-y-2">
              {existingCoupons.length > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total cupones:</span>
                  <span className="font-medium text-green-600">-{formatCurrency(totalCouponDiscount)}</span>
                </div>
              )}
              {isAdmin && manualDiscount && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Descuento manual:</span>
                  <span className="font-medium text-orange-600">-{formatCurrency(manualDiscount.amount)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-medium">
                <span>Total descuentos:</span>
                <span className="text-primary">
                  -{formatCurrency(totalCouponDiscount + (manualDiscount?.amount || 0))}
                </span>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
