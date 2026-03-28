import { Coupon, CouponEligibilityResult, OrderItem, Customer, AppRole, CouponApplication } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from './utils';

const DAYS_MAP: Record<string, string> = {
  '0': 'sun',
  '1': 'mon',
  '2': 'tue',
  '3': 'wed',
  '4': 'thu',
  '5': 'fri',
  '6': 'sat',
};

export const calculateItemTotal = (item: OrderItem): number => {
  let total = item.basePrice * item.quantity;
  
  // Agregar extras
  if (item.extras) {
    item.extras.forEach(extra => {
      total += extra.price * item.quantity;
    });
  }
  
  return total;
};

const isTimeWindowValid = (timeWindows: Record<string, string[]> | undefined, currentDate: Date): boolean => {
  if (!timeWindows || Object.keys(timeWindows).length === 0) return true;

  const dayKey = DAYS_MAP[currentDate.getDay().toString()];
  const windows = timeWindows[dayKey];
  
  if (!windows || windows.length === 0) return false;

  const currentTime = currentDate.getHours() * 60 + currentDate.getMinutes();
  
  return windows.some(window => {
    const [start, end] = window.split('-');
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;
    
    return currentTime >= startTime && currentTime <= endTime;
  });
};

const getEligibleLines = async (
  coupon: Coupon,
  cartItems: OrderItem[]
): Promise<number[]> => {
  const eligibleIndices: number[] = [];

  // Si no hay restricciones de alcance, todas las líneas son elegibles
  const hasAllowedCategories = coupon.allowed_categories && coupon.allowed_categories.length > 0;
  const hasExcludedCategories = coupon.excluded_categories && coupon.excluded_categories.length > 0;
  const hasAllowedProducts = coupon.allowed_products && coupon.allowed_products.length > 0;
  const hasExcludedProducts = coupon.excluded_products && coupon.excluded_products.length > 0;
  const hasAllowedVariants = coupon.allowed_variants && coupon.allowed_variants.length > 0;
  const hasExcludedVariants = coupon.excluded_variants && coupon.excluded_variants.length > 0;

  if (!hasAllowedCategories && !hasExcludedCategories && !hasAllowedProducts && !hasExcludedProducts && !hasAllowedVariants && !hasExcludedVariants) {
    // Sin restricciones, todas las líneas son elegibles
    return cartItems.map((_, index) => index);
  }

  // Cargar relaciones producto-categoría para los productos en el carrito
  const productIds = [...new Set(cartItems.map(item => item.productId))];
  const { data: productCategories } = await supabase
    .from('product_categories')
    .select('product_id, category_id')
    .in('product_id', productIds);

  const productCategoryMap = new Map<string, string[]>();
  productCategories?.forEach(pc => {
    if (!productCategoryMap.has(pc.product_id)) {
      productCategoryMap.set(pc.product_id, []);
    }
    productCategoryMap.get(pc.product_id)!.push(pc.category_id);
  });

  cartItems.forEach((item, index) => {
    let isEligible = true;
    const itemCategories = productCategoryMap.get(item.productId) || [];

    // Lógica de whitelist/blacklist para categorías
    if (hasAllowedCategories) {
      // Si hay categorías permitidas, el producto DEBE estar en al menos una
      const hasAllowedCategory = itemCategories.some(catId => 
        coupon.allowed_categories!.includes(catId)
      );
      if (!hasAllowedCategory) {
        isEligible = false;
      }
    }

    // Las exclusiones tienen prioridad
    if (hasExcludedCategories && isEligible) {
      const hasExcludedCategory = itemCategories.some(catId => 
        coupon.excluded_categories!.includes(catId)
      );
      if (hasExcludedCategory) {
        isEligible = false;
      }
    }

    // Lógica de whitelist/blacklist para productos
    if (hasAllowedProducts && isEligible) {
      if (!coupon.allowed_products!.includes(item.productId)) {
        isEligible = false;
      }
    }

    if (hasExcludedProducts && isEligible) {
      if (coupon.excluded_products!.includes(item.productId)) {
        isEligible = false;
      }
    }

    // Lógica de whitelist/blacklist para variantes
    if (hasAllowedVariants && item.selectedVariant && isEligible) {
      if (!coupon.allowed_variants!.includes(item.selectedVariant.id)) {
        isEligible = false;
      }
    }

    if (hasExcludedVariants && item.selectedVariant && isEligible) {
      if (coupon.excluded_variants!.includes(item.selectedVariant.id)) {
        isEligible = false;
      }
    }

    if (isEligible) {
      eligibleIndices.push(index);
    }
  });

  return eligibleIndices;
};

export const validateCouponEligibility = async (
  coupon: Coupon,
  cartItems: OrderItem[],
  subtotal: number,
  customer?: Partial<Customer>,
  userRole?: AppRole,
  existingCoupons?: CouponApplication[],
  deliveryFee: number = 0
): Promise<CouponEligibilityResult> => {
  const errors: string[] = [];
  const now = new Date();

  // Verificar si el cupón está activo
  if (!coupon.is_active) {
    errors.push('Este cupón no está activo');
  }

  // Verificar fecha de inicio
  if (coupon.date_start && new Date(coupon.date_start) > now) {
    errors.push('Este cupón aún no está vigente');
  }

  // Verificar fecha de fin
  if (coupon.date_end && new Date(coupon.date_end) < now) {
    errors.push('Este cupón ha vencido');
  }

  // Verificar ventana horaria
  if (!isTimeWindowValid(coupon.time_windows, now)) {
    errors.push('Este cupón no está disponible en este horario');
  }

  // Verificar roles permitidos
  if (coupon.roles_allowed && coupon.roles_allowed.length > 0 && userRole) {
    if (!coupon.roles_allowed.includes(userRole)) {
      errors.push('No tienes permiso para usar este cupón');
    }
  }

  // Verificar gasto mínimo
  if (coupon.min_spend && subtotal < coupon.min_spend) {
    errors.push(`Compra mínima de ${formatCurrency(coupon.min_spend)} requerida`);
  }

  // Verificar gasto máximo
  if (coupon.max_spend && subtotal > coupon.max_spend) {
    errors.push(`Este cupón solo aplica para compras hasta ${formatCurrency(coupon.max_spend)}`);
  }

  // Verificar límite total de uso
  if (coupon.usage_limit_total) {
    const { count } = await supabase
      .from('coupon_applications')
      .select('*', { count: 'exact', head: true })
      .eq('coupon_id', coupon.id);

    if (count && count >= coupon.usage_limit_total) {
      errors.push('Este cupón ha alcanzado su límite de uso');
    }
  }

  // Verificar límite por cliente
  if (coupon.usage_limit_per_customer && customer?.id) {
    const { data } = await supabase
      .from('coupon_redemptions')
      .select('used_count')
      .eq('coupon_id', coupon.id)
      .eq('customer_id', customer.id)
      .single();

    if (data && data.used_count >= coupon.usage_limit_per_customer) {
      errors.push('Has alcanzado el límite de uso de este cupón');
    }
  }

  // Verificar stacking
  if (!coupon.allow_stack && existingCoupons && existingCoupons.length > 0) {
    errors.push('Este cupón no se puede combinar con otros cupones');
  }

  // Si hay errores, retornar
  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Calcular líneas elegibles (ahora es async)
  const eligibleLineIndices = await getEligibleLines(coupon, cartItems);

  if (eligibleLineIndices.length === 0) {
    return {
      valid: false,
      errors: ['No hay productos elegibles para este cupón'],
    };
  }

  // Calcular preview del descuento
  const preview = calculateCouponDiscount(
    coupon,
    cartItems,
    eligibleLineIndices,
    eligibleLineIndices, // Por defecto, todas las líneas elegibles
    0
  );

  return {
    valid: true,
    errors: [],
    coupon,
    eligible_line_indices: eligibleLineIndices,
    preview: {
      discount_products: preview.discount_products,
      discount_delivery: preview.discount_delivery,
      total_discount: preview.discount_products + preview.discount_delivery,
    },
  };
};

export const calculateCouponDiscount = (
  coupon: Coupon,
  cartItems: OrderItem[],
  eligibleLineIndices: number[],
  selectedLineIndices: number[],
  deliveryFee: number
): {
  discount_products: number;
  discount_delivery: number;
  affected_lines: Array<{
    item_index: number;
    product_id: string;
    product_name: string;
    base_amount: number;
    discount_amount: number;
  }>;
} => {
  let discount_products = 0;
  const affected_lines: Array<{
    item_index: number;
    product_id: string;
    product_name: string;
    base_amount: number;
    discount_amount: number;
  }> = [];

  // Filtrar líneas a aplicar (intersección de elegibles y seleccionadas)
  const linesToApply = eligibleLineIndices.filter(idx => selectedLineIndices.includes(idx));

  if (coupon.type === 'percent') {
    // Porcentaje sobre cada línea elegible
    linesToApply.forEach(index => {
      const item = cartItems[index];
      const itemTotal = calculateItemTotal(item);
      const itemDiscount = Math.round(itemTotal * (coupon.amount / 100));
      
      discount_products += itemDiscount;
      affected_lines.push({
        item_index: index,
        product_id: item.productId,
        product_name: item.productName,
        base_amount: itemTotal,
        discount_amount: itemDiscount,
      });
    });
  } else if (coupon.type === 'fixed_product') {
    // Monto fijo por producto
    linesToApply.forEach(index => {
      const item = cartItems[index];
      const itemTotal = calculateItemTotal(item);
      const itemDiscount = Math.min(coupon.amount * item.quantity, itemTotal);
      
      discount_products += itemDiscount;
      affected_lines.push({
        item_index: index,
        product_id: item.productId,
        product_name: item.productName,
        base_amount: itemTotal,
        discount_amount: itemDiscount,
      });
    });
  } else if (coupon.type === 'fixed_cart') {
    // Monto fijo prorrateado entre líneas elegibles
    const totalEligible = linesToApply.reduce((sum, index) => {
      return sum + calculateItemTotal(cartItems[index]);
    }, 0);

    let remainingDiscount = Math.min(coupon.amount, totalEligible);

    linesToApply.forEach((index, i) => {
      const item = cartItems[index];
      const itemTotal = calculateItemTotal(item);
      
      // Prorratear el descuento
      let itemDiscount: number;
      if (i === linesToApply.length - 1) {
        // Última línea: asignar el resto para evitar errores de redondeo
        itemDiscount = remainingDiscount;
      } else {
        itemDiscount = Math.round((itemTotal / totalEligible) * coupon.amount);
        remainingDiscount -= itemDiscount;
      }
      
      discount_products += itemDiscount;
      affected_lines.push({
        item_index: index,
        product_id: item.productId,
        product_name: item.productName,
        base_amount: itemTotal,
        discount_amount: itemDiscount,
      });
    });
  }

  // Calcular descuento en delivery
  let discount_delivery = 0;
  if (coupon.affects_delivery && deliveryFee > 0) {
    if (coupon.delivery_mode === 'free') {
      discount_delivery = deliveryFee;
    } else if (coupon.delivery_mode === 'fixed' && coupon.delivery_amount !== undefined) {
      discount_delivery = Math.max(0, deliveryFee - coupon.delivery_amount);
    } else if (coupon.delivery_mode === 'percent' && coupon.delivery_amount !== undefined) {
      discount_delivery = Math.round(deliveryFee * (coupon.delivery_amount / 100));
    }
  }

  return {
    discount_products: Math.round(discount_products),
    discount_delivery: Math.round(discount_delivery),
    affected_lines,
  };
};

export const applyCouponToCart = async (
  coupon: Coupon,
  cartItems: OrderItem[],
  selectedLineIndices: number[],
  deliveryFee: number,
  userId?: string
): Promise<CouponApplication> => {
  const eligibleLineIndices = await getEligibleLines(coupon, cartItems);
  const discountDetails = calculateCouponDiscount(
    coupon,
    cartItems,
    eligibleLineIndices,
    selectedLineIndices,
    deliveryFee
  );

  return {
    id: crypto.randomUUID(),
    order_id: '', // Se asignará al crear la orden
    coupon_id: coupon.id,
    applied_by: userId,
    applied_at: new Date().toISOString(),
    discount_products: discountDetails.discount_products,
    discount_delivery: discountDetails.discount_delivery,
    payload: {
      coupon_code: coupon.code,
      coupon_type: coupon.type,
      affected_lines: discountDetails.affected_lines,
      delivery_original: deliveryFee,
      delivery_final: deliveryFee - discountDetails.discount_delivery,
    },
  };
};
