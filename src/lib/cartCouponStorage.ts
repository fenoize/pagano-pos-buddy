import { Coupon, CouponApplication } from '@/types';

const KEY = 'customer_cart_coupon';

export interface StoredCartCoupon {
  coupon: Coupon;
  application: CouponApplication;
}

export function saveCartCoupon(coupon: Coupon | null, application: CouponApplication | null) {
  try {
    if (coupon && application) {
      sessionStorage.setItem(KEY, JSON.stringify({ coupon, application }));
    } else {
      sessionStorage.removeItem(KEY);
    }
  } catch (e) {
    console.warn('saveCartCoupon failed', e);
  }
}

export function loadCartCoupon(): StoredCartCoupon | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredCartCoupon;
  } catch {
    return null;
  }
}

export function clearCartCoupon() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}
