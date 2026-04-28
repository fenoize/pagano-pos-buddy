import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ShoppingCart, Trash2, Plus, Minus, Flame, ArrowRight } from 'lucide-react';
import { CustomerBottomNav } from '@/components/customer/CustomerBottomNav';
import { StoreStatusBanner } from '@/components/customer/StoreStatusBanner';
import { CustomerCouponInput } from '@/components/customer/CustomerCouponInput';
import { useCart } from '@/contexts/CartContext';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { formatCurrency } from '@/lib/utils';
import { CouponApplication, Coupon } from '@/types';
import { loadCartCoupon, saveCartCoupon } from '@/lib/cartCouponStorage';

export default function CustomerCart() {
  const navigate = useNavigate();
  const { items, itemCount, subtotal, removeItem, updateQuantity, getItemTotal } = useCart();
  const { customer } = useCustomerAuth();
  const [canOrder, setCanOrder] = useState(true);
  const stored = loadCartCoupon();
  const [couponApplication, setCouponApplication] = useState<CouponApplication | null>(stored?.application ?? null);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(stored?.coupon ?? null);

  const couponDiscountProducts = couponApplication?.discount_products || 0;
  const totalAfterCoupon = Math.max(0, subtotal - couponDiscountProducts);

  const handleCouponApplied = (application: CouponApplication | null, coupon: Coupon | null) => {
    setCouponApplication(application);
    setAppliedCoupon(coupon);
    saveCartCoupon(coupon, application);
  };

  if (items.length === 0) {
    return (
      <div className="customer-app min-h-screen pb-20 bg-background">
        <div className="max-w-screen-xl mx-auto p-4">
          <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
            <ShoppingCart className="h-8 w-8" />
            Carrito
          </h1>

          <Card>
            <CardContent className="py-16 text-center">
              <ShoppingCart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Tu carrito está vacío</h2>
              <p className="text-muted-foreground mb-6">
                Agrega productos desde el menú
              </p>
              <Button onClick={() => navigate('/menu')}>
                <Flame className="h-4 w-4 mr-2" />
                Ver Menú
              </Button>
            </CardContent>
          </Card>
        </div>
        <CustomerBottomNav />
      </div>
    );
  }

  return (
    <div className="customer-app min-h-screen pb-20 bg-background">
      <div className="max-w-screen-xl mx-auto p-4 space-y-4">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ShoppingCart className="h-8 w-8" />
          Carrito
          <Badge variant="secondary">{itemCount} {itemCount === 1 ? 'item' : 'items'}</Badge>
        </h1>

        {/* Store Status Banner */}
        <StoreStatusBanner onStatusChange={setCanOrder} />

        {/* Cart Items */}
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {/* Image */}
                  <div className="w-20 h-20 bg-muted rounded-lg flex-shrink-0 overflow-hidden">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.productName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Flame className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold mb-1">{item.productName}</h3>
                    
                    {/* Variant - leer de ambos formatos */}
                    {(item.variant_name || item.selectedVariant?.name) && (
                      <p className="text-sm text-muted-foreground">
                        {item.variant_name || item.selectedVariant?.name}
                      </p>
                    )}
                    
                    {/* Extras - leer de ambos formatos */}
                    {((item.extras && item.extras.length > 0) || 
                      (item.selectedExtras && item.selectedExtras.length > 0)) && (
                      <p className="text-sm text-muted-foreground">
                        + {item.extras 
                            ? item.extras.map(e => `${e.quantity && e.quantity > 1 ? e.quantity + 'x ' : ''}${e.label}`).join(', ')
                            : item.selectedExtras?.map(e => e.name).join(', ')}
                      </p>
                    )}
                    
                    {/* Modifiers - leer de ambos formatos */}
                    {((item.modifiers && item.modifiers.length > 0) ||
                      (item.selectedModifiers && item.selectedModifiers.length > 0)) && (
                      <p className="text-xs text-muted-foreground">
                        {(item.modifiers || item.selectedModifiers)?.map(m => m.name).join(', ')}
                      </p>
                    )}

                    {/* Notes */}
                    {item.notes && (
                      <p className="text-xs text-muted-foreground italic mt-1">
                        "{item.notes}"
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-3">
                      {/* Quantity controls */}
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* Price and remove */}
                      <div className="flex items-center gap-3">
                        <span className="font-bold">{formatCurrency(getItemTotal(item))}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Coupon Input */}
        <Card>
          <CardContent className="p-4">
            <CustomerCouponInput
              cartItems={items}
              subtotal={subtotal}
              customerId={customer?.id}
              deliveryFee={0}
              onCouponApplied={handleCouponApplied}
              initialCoupon={appliedCoupon}
              initialApplication={couponApplication}
            />
          </CardContent>
        </Card>

        {/* Summary */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex justify-between text-lg">
              <span>Subtotal</span>
              <span className="font-semibold">{formatCurrency(subtotal)}</span>
            </div>
            {couponDiscountProducts > 0 && (
              <>
                <div className="flex justify-between text-sm text-primary">
                  <span>Cupón ({appliedCoupon?.code})</span>
                  <span>-{formatCurrency(couponDiscountProducts)}</span>
                </div>
              </>
            )}
            <Separator />
            <div className="flex justify-between text-xl font-bold">
              <span>Total</span>
              <span>{formatCurrency(totalAfterCoupon)}</span>
            </div>
            <Button
              size="lg"
              className="w-full"
              onClick={() => navigate('/checkout')}
              disabled={!canOrder}
            >
              Continuar
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
      <CustomerBottomNav />
    </div>
  );
}
