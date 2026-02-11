import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Coupon } from '@/types';
import { toast } from '@/hooks/use-toast';

export const useCoupons = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Cargar alcance para cada cupón
      const couponsWithScope = await Promise.all(
        (data || []).map(async (coupon) => {
          const scope = await fetchCouponScope(coupon.id);

          return {
            ...coupon,
            time_windows: coupon.time_windows as Record<string, string[]> | undefined,
            ...scope,
          } as Coupon;
        })
      );

      setCoupons(couponsWithScope);
    } catch (error: any) {
      toast({
        title: 'Error al cargar cupones',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCouponScope = async (couponId: string) => {
    const [
      allowedCategories,
      excludedCategories,
      allowedProducts,
      excludedProducts,
      allowedVariants,
      excludedVariants,
      allowedExtras,
      excludedExtras,
      allowedModifiers,
      excludedModifiers,
    ] = await Promise.all([
      supabase.from('coupon_allowed_categories').select('category_id').eq('coupon_id', couponId),
      supabase.from('coupon_excluded_categories').select('category_id').eq('coupon_id', couponId),
      supabase.from('coupon_allowed_products').select('product_id').eq('coupon_id', couponId),
      supabase.from('coupon_excluded_products').select('product_id').eq('coupon_id', couponId),
      supabase.from('coupon_allowed_variants').select('category_variant_id').eq('coupon_id', couponId),
      supabase.from('coupon_excluded_variants').select('category_variant_id').eq('coupon_id', couponId),
      supabase.from('coupon_allowed_extras').select('extra_id').eq('coupon_id', couponId),
      supabase.from('coupon_excluded_extras').select('extra_id').eq('coupon_id', couponId),
      supabase.from('coupon_allowed_modifiers').select('modifier_id').eq('coupon_id', couponId),
      supabase.from('coupon_excluded_modifiers').select('modifier_id').eq('coupon_id', couponId),
    ]);

    return {
      allowed_categories: allowedCategories.data?.map(r => r.category_id) || [],
      excluded_categories: excludedCategories.data?.map(r => r.category_id) || [],
      allowed_products: allowedProducts.data?.map(r => r.product_id) || [],
      excluded_products: excludedProducts.data?.map(r => r.product_id) || [],
      allowed_variants: allowedVariants.data?.map(r => r.category_variant_id) || [],
      excluded_variants: excludedVariants.data?.map(r => r.category_variant_id) || [],
      allowed_extras: allowedExtras.data?.map(r => r.extra_id) || [],
      excluded_extras: excludedExtras.data?.map(r => r.extra_id) || [],
      allowed_modifiers: allowedModifiers.data?.map(r => r.modifier_id) || [],
      excluded_modifiers: excludedModifiers.data?.map(r => r.modifier_id) || [],
    };
  };

  const fetchCouponByCode = async (code: string): Promise<Coupon | null> => {
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', code.toUpperCase())
        .single();

      if (error || !data) return null;

      const scope = await fetchCouponScope(data.id);
      return { 
        ...data, 
        time_windows: data.time_windows as Record<string, string[]> | undefined,
        ...scope 
      } as Coupon;
    } catch {
      return null;
    }
  };

  const createCoupon = async (couponData: Partial<Coupon>) => {
    try {
      setLoading(true);
      
      // Extraer alcance
      const {
        allowed_categories,
        excluded_categories,
        allowed_products,
        excluded_products,
        allowed_variants,
        excluded_variants,
        allowed_extras,
        excluded_extras,
        allowed_modifiers,
        excluded_modifiers,
        total_used,
        total_discounted,
        total_sales,
        ...couponFields
      } = couponData;

      // Crear cupón
      const { data: coupon, error: couponError } = await supabase
        .from('coupons')
        .insert([{ 
          ...couponFields, 
          code: couponData.code?.toUpperCase(),
          type: couponData.type!,
          amount: couponData.amount!,
          allow_stack: couponData.allow_stack ?? false,
          apply_to_discounted: couponData.apply_to_discounted ?? true,
          apply_to_combo_children: couponData.apply_to_combo_children ?? true,
          allow_manual_line_selection: couponData.allow_manual_line_selection ?? false,
          affects_products: couponData.affects_products ?? true,
          affects_delivery: couponData.affects_delivery ?? false,
          affects_tip: couponData.affects_tip ?? false,
          is_active: couponData.is_active ?? true,
        }])
        .select()
        .single();

      if (couponError) throw couponError;

      // Insertar alcance
      await saveCouponScope(coupon.id, {
        allowed_categories,
        excluded_categories,
        allowed_products,
        excluded_products,
        allowed_variants,
        excluded_variants,
        allowed_extras,
        excluded_extras,
        allowed_modifiers,
        excluded_modifiers,
      });

      toast({
        title: 'Cupón creado',
        description: `El cupón ${coupon.code} ha sido creado exitosamente.`,
      });

      await fetchCoupons();
      return coupon;
    } catch (error: any) {
      toast({
        title: 'Error al crear cupón',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateCoupon = async (id: string, couponData: Partial<Coupon>) => {
    try {
      setLoading(true);

      const {
        allowed_categories,
        excluded_categories,
        allowed_products,
        excluded_products,
        allowed_variants,
        excluded_variants,
        allowed_extras,
        excluded_extras,
        allowed_modifiers,
        excluded_modifiers,
        total_used,
        total_discounted,
        total_sales,
        ...couponFields
      } = couponData;

      // Actualizar cupón
      const { error: couponError } = await supabase
        .from('coupons')
        .update({ ...couponFields, code: couponData.code?.toUpperCase() })
        .eq('id', id);

      if (couponError) throw couponError;

      // Actualizar alcance
      await saveCouponScope(id, {
        allowed_categories,
        excluded_categories,
        allowed_products,
        excluded_products,
        allowed_variants,
        excluded_variants,
        allowed_extras,
        excluded_extras,
        allowed_modifiers,
        excluded_modifiers,
      });

      toast({
        title: 'Cupón actualizado',
        description: 'Los cambios han sido guardados.',
      });

      await fetchCoupons();
    } catch (error: any) {
      toast({
        title: 'Error al actualizar cupón',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const saveCouponScope = async (couponId: string, scope: any) => {
    // Eliminar alcance existente
    await Promise.all([
      supabase.from('coupon_allowed_categories').delete().eq('coupon_id', couponId),
      supabase.from('coupon_excluded_categories').delete().eq('coupon_id', couponId),
      supabase.from('coupon_allowed_products').delete().eq('coupon_id', couponId),
      supabase.from('coupon_excluded_products').delete().eq('coupon_id', couponId),
      supabase.from('coupon_allowed_variants').delete().eq('coupon_id', couponId),
      supabase.from('coupon_excluded_variants').delete().eq('coupon_id', couponId),
      supabase.from('coupon_allowed_extras').delete().eq('coupon_id', couponId),
      supabase.from('coupon_excluded_extras').delete().eq('coupon_id', couponId),
      supabase.from('coupon_allowed_modifiers').delete().eq('coupon_id', couponId),
      supabase.from('coupon_excluded_modifiers').delete().eq('coupon_id', couponId),
    ]);

    // Insertar nuevo alcance
    const inserts = [];
    
    if (scope.allowed_categories?.length) {
      inserts.push(
        supabase.from('coupon_allowed_categories').insert(
          scope.allowed_categories.map((id: string) => ({ coupon_id: couponId, category_id: id }))
        )
      );
    }
    if (scope.excluded_categories?.length) {
      inserts.push(
        supabase.from('coupon_excluded_categories').insert(
          scope.excluded_categories.map((id: string) => ({ coupon_id: couponId, category_id: id }))
        )
      );
    }
    if (scope.allowed_products?.length) {
      inserts.push(
        supabase.from('coupon_allowed_products').insert(
          scope.allowed_products.map((id: string) => ({ coupon_id: couponId, product_id: id }))
        )
      );
    }
    if (scope.excluded_products?.length) {
      inserts.push(
        supabase.from('coupon_excluded_products').insert(
          scope.excluded_products.map((id: string) => ({ coupon_id: couponId, product_id: id }))
        )
      );
    }
    if (scope.allowed_variants?.length) {
      inserts.push(
        supabase.from('coupon_allowed_variants').insert(
          scope.allowed_variants.map((id: string) => ({ coupon_id: couponId, category_variant_id: id }))
        )
      );
    }
    if (scope.excluded_variants?.length) {
      inserts.push(
        supabase.from('coupon_excluded_variants').insert(
          scope.excluded_variants.map((id: string) => ({ coupon_id: couponId, category_variant_id: id }))
        )
      );
    }
    if (scope.allowed_extras?.length) {
      inserts.push(
        supabase.from('coupon_allowed_extras').insert(
          scope.allowed_extras.map((id: string) => ({ coupon_id: couponId, extra_id: id }))
        )
      );
    }
    if (scope.excluded_extras?.length) {
      inserts.push(
        supabase.from('coupon_excluded_extras').insert(
          scope.excluded_extras.map((id: string) => ({ coupon_id: couponId, extra_id: id }))
        )
      );
    }
    if (scope.allowed_modifiers?.length) {
      inserts.push(
        supabase.from('coupon_allowed_modifiers').insert(
          scope.allowed_modifiers.map((id: string) => ({ coupon_id: couponId, modifier_id: id }))
        )
      );
    }
    if (scope.excluded_modifiers?.length) {
      inserts.push(
        supabase.from('coupon_excluded_modifiers').insert(
          scope.excluded_modifiers.map((id: string) => ({ coupon_id: couponId, modifier_id: id }))
        )
      );
    }

    if (inserts.length > 0) {
      await Promise.all(inserts);
    }
  };

  const deleteCoupon = async (id: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.from('coupons').delete().eq('id', id);

      if (error) throw error;

      toast({
        title: 'Cupón eliminado',
        description: 'El cupón ha sido eliminado exitosamente.',
      });

      await fetchCoupons();
    } catch (error: any) {
      toast({
        title: 'Error al eliminar cupón',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const toggleCouponStatus = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('coupons')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: isActive ? 'Cupón activado' : 'Cupón desactivado',
      });

      await fetchCoupons();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  return {
    coupons,
    loading,
    fetchCoupons,
    fetchCouponByCode,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    toggleCouponStatus,
  };
};
