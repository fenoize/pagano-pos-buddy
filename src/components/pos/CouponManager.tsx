import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Ticket, X, Plus, DollarSign } from 'lucide-react';
import { CouponApplication, OrderItem } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { useAuthContext } from '@/contexts/AuthContext';
import DiscountManager from './DiscountManager';

interface CouponManagerProps {
  appliedCoupons: CouponApplication[];
  onAddCoupon: () => void;
  onRemoveCoupon: (couponId: string) => void;
  subtotal: number;
  cartItems: OrderItem[];
  totalCouponDiscount: number;
  // Props para descuento manual (solo admin)
  manualDiscount: { type: 'percentage' | 'fixed'; value: number; amount: number } | null;
  onManualDiscountChange: (discount: { type: 'percentage' | 'fixed'; value: number; amount: number } | null) => void;
}

export const CouponManager = ({
  appliedCoupons,
  onAddCoupon,
  onRemoveCoupon,
  subtotal,
  cartItems,
  totalCouponDiscount,
  manualDiscount,
  onManualDiscountChange,
}: CouponManagerProps) => {
  const { user } = useAuthContext();
  const isAdmin = user?.role === 'Administrador';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Ticket className="w-4 h-4" />
          Cupones y Descuentos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Lista de cupones aplicados */}
        {appliedCoupons.length > 0 && (
          <div className="space-y-2">
            {appliedCoupons.map((app) => (
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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveCoupon(app.coupon_id)}
                  className="h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Botón agregar cupón */}
        <Button
          variant="outline"
          className="w-full"
          onClick={onAddCoupon}
          disabled={cartItems.length === 0}
        >
          <Plus className="w-4 h-4 mr-2" />
          Agregar Cupón
        </Button>

        {/* Descuento manual (solo admin) */}
        {isAdmin && (
          <>
            <Separator />
            <Accordion type="single" collapsible>
              <AccordionItem value="manual-discount" className="border-none">
                <AccordionTrigger className="py-2 hover:no-underline">
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="w-4 h-4" />
                    <span>Descuento Manual (Admin)</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2">
                  <DiscountManager
                    discount={manualDiscount}
                    onDiscountChange={onManualDiscountChange}
                    subtotal={subtotal}
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </>
        )}

        {/* Resumen de descuentos */}
        {(appliedCoupons.length > 0 || (isAdmin && manualDiscount)) && (
          <>
            <Separator />
            <div className="space-y-1 text-sm">
              {appliedCoupons.length > 0 && (
                <div className="flex justify-between text-green-600 font-medium">
                  <span>Total cupones:</span>
                  <span>-{formatCurrency(totalCouponDiscount)}</span>
                </div>
              )}
              {isAdmin && manualDiscount && (
                <div className="flex justify-between text-orange-600 font-medium">
                  <span>Desc. manual ({manualDiscount.type === 'percentage' ? `${manualDiscount.value}%` : formatCurrency(manualDiscount.value)}):</span>
                  <span>-{formatCurrency(manualDiscount.amount)}</span>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
