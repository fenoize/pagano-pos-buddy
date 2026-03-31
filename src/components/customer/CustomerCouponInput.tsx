import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Ticket, X, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { validateCouponEligibility } from '@/lib/couponValidation';
import { formatCurrency } from '@/lib/utils';
import { Coupon, CouponEligibilityResult, CouponApplication } from '@/types';
import { CartItem } from '@/contexts/CartContext';
import { toast } from 'sonner';

interface CustomerCouponInputProps {
  cartItems: CartItem[];
  subtotal: number;
  customerId?: string;
  deliveryFee: number;
  onCouponApplied: (application: CouponApplication | null, coupon: Coupon | null) => void;
}

export function CustomerCouponInput({
  cartItems,
  subtotal,
  customerId,
  deliveryFee,
  onCouponApplied,
}: CustomerCouponInputProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [preview, setPreview] = useState<CouponEligibilityResult['preview'] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleApply = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch coupon by code
      const { data, error: fetchError } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', trimmed)
        .eq('is_active', true)
        .single();

      if (fetchError || !data) {
        setError('Cupón no encontrado o no está activo');
        setLoading(false);
        return;
      }

      // Load scope relations
      const [
        { data: allowedCats },
        { data: excludedCats },
        { data: allowedProds },
        { data: excludedProds },
        { data: allowedVars },
        { data: excludedVars },
      ] = await Promise.all([
        supabase.from('coupon_allowed_categories').select('category_id').eq('coupon_id', data.id),
        supabase.from('coupon_excluded_categories').select('category_id').eq('coupon_id', data.id),
        supabase.from('coupon_allowed_products').select('product_id').eq('coupon_id', data.id),
        supabase.from('coupon_excluded_products').select('product_id').eq('coupon_id', data.id),
        supabase.from('coupon_allowed_variants').select('category_variant_id').eq('coupon_id', data.id),
        supabase.from('coupon_excluded_variants').select('category_variant_id').eq('coupon_id', data.id),
      ]);

      const coupon: Coupon = {
        ...data,
        time_windows: data.time_windows as Record<string, string[]> | undefined,
        allowed_categories: allowedCats?.map(c => c.category_id) || [],
        excluded_categories: excludedCats?.map(c => c.category_id) || [],
        allowed_products: allowedProds?.map(p => p.product_id) || [],
        excluded_products: excludedProds?.map(p => p.product_id) || [],
        allowed_variants: allowedVars?.map(v => v.category_variant_id) || [],
        excluded_variants: excludedVars?.map(v => v.category_variant_id) || [],
      } as Coupon;

      // Map CartItem[] to OrderItem-like for validation
      const orderItems = cartItems.map(item => ({
        productId: item.productId,
        productName: item.productName,
        categoryId: item.categoryId || '',
        basePrice: item.basePrice,
        quantity: item.quantity,
        extras: item.extras || item.selectedExtras?.map(e => ({
          key: e.id, label: e.name, price: e.price, quantity: 1
        })) || [],
        modifiers: item.modifiers || item.selectedModifiers || [],
        selectedVariant: item.selectedVariant,
        variant_name: item.variant_name,
        category_variant_id: item.category_variant_id,
        size: item.size,
        priceKind: item.priceKind,
      }));

      const result = await validateCouponEligibility(
        coupon,
        orderItems as any,
        subtotal,
        customerId ? { id: customerId } : undefined,
        undefined, // no staff role
        [], // no existing coupons
        deliveryFee
      );

      if (!result.valid) {
        setError(result.errors.join('. '));
        setLoading(false);
        return;
      }

      // Build application
      const application: CouponApplication = {
        id: crypto.randomUUID(),
        order_id: '',
        coupon_id: coupon.id,
        applied_at: new Date().toISOString(),
        discount_products: result.preview?.discount_products || 0,
        discount_delivery: result.preview?.discount_delivery || 0,
        payload: {
          coupon_code: coupon.code,
          coupon_type: coupon.type,
          affected_lines: [],
          delivery_original: deliveryFee,
          delivery_final: deliveryFee - (result.preview?.discount_delivery || 0),
        },
      };

      setAppliedCoupon(coupon);
      setPreview(result.preview || null);
      onCouponApplied(application, coupon);
      toast.success(`¡Cupón "${coupon.code}" aplicado!`);
    } catch (err) {
      console.error('Error applying coupon:', err);
      setError('Error al validar el cupón');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = () => {
    setAppliedCoupon(null);
    setPreview(null);
    setCode('');
    setError(null);
    onCouponApplied(null, null);
    toast.info('Cupón removido');
  };

  if (appliedCoupon && preview) {
    return (
      <div className="rounded-lg border-2 border-emerald-500/30 bg-emerald-500/10 p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            <span className="font-semibold text-emerald-200">
              {appliedCoupon.code}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={handleRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        {appliedCoupon.description && (
          <p className="text-sm text-emerald-300/80">{appliedCoupon.description}</p>
        )}
        <div className="text-sm font-medium text-emerald-300/80">
          {preview.discount_products > 0 && (
            <span>Descuento: -{formatCurrency(preview.discount_products)}</span>
          )}
          {preview.discount_delivery > 0 && (
            <span className="ml-2">· Delivery: -{formatCurrency(preview.discount_delivery)}</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Código de cupón"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setError(null);
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleApply()}
            className="pl-9 uppercase"
            disabled={loading}
            maxLength={30}
          />
        </div>
        <Button
          variant="outline"
          onClick={handleApply}
          disabled={loading || !code.trim()}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Aplicar'}
        </Button>
      </div>
      {error && (
        <Alert variant="destructive" className="py-2">
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
