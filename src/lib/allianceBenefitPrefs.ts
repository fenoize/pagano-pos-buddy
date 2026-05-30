// Preferences for alliance benefits opt-in/out, persisted in localStorage.
// Default = enabled (true) when no entry exists.

const COUPON_KEY = (couponId: string) => `alliance_coupon_disabled:${couponId}`;
const FREE_DELIVERY_KEY = (benefitId: string) => `alliance_free_delivery_disabled:${benefitId}`;
// Per-session POS disable (cashier toggles for a single sale)
const POS_COUPON_KEY = (couponId: string) => `pos_alliance_coupon_disabled:${couponId}`;
const POS_FREE_DELIVERY_KEY = (benefitId: string) => `pos_alliance_free_delivery_disabled:${benefitId}`;

export const isAllianceCouponEnabled = (couponId: string | undefined | null): boolean => {
  if (!couponId) return true;
  try {
    return localStorage.getItem(COUPON_KEY(couponId)) !== '1';
  } catch {
    return true;
  }
};

export const setAllianceCouponEnabled = (couponId: string, enabled: boolean) => {
  try {
    if (enabled) localStorage.removeItem(COUPON_KEY(couponId));
    else localStorage.setItem(COUPON_KEY(couponId), '1');
  } catch {}
};

export const isAllianceFreeDeliveryEnabled = (benefitId: string | undefined | null): boolean => {
  if (!benefitId) return true;
  try {
    return localStorage.getItem(FREE_DELIVERY_KEY(benefitId)) !== '1';
  } catch {
    return true;
  }
};

export const setAllianceFreeDeliveryEnabled = (benefitId: string, enabled: boolean) => {
  try {
    if (enabled) localStorage.removeItem(FREE_DELIVERY_KEY(benefitId));
    else localStorage.setItem(FREE_DELIVERY_KEY(benefitId), '1');
  } catch {}
};

// --- POS (per-cashier session) ---
export const isPosAllianceCouponEnabled = (couponId: string | undefined | null): boolean => {
  if (!couponId) return true;
  try {
    return sessionStorage.getItem(POS_COUPON_KEY(couponId)) !== '1';
  } catch {
    return true;
  }
};
export const setPosAllianceCouponEnabled = (couponId: string, enabled: boolean) => {
  try {
    if (enabled) sessionStorage.removeItem(POS_COUPON_KEY(couponId));
    else sessionStorage.setItem(POS_COUPON_KEY(couponId), '1');
  } catch {}
};
export const isPosAllianceFreeDeliveryEnabled = (benefitId: string | undefined | null): boolean => {
  if (!benefitId) return true;
  try {
    return sessionStorage.getItem(POS_FREE_DELIVERY_KEY(benefitId)) !== '1';
  } catch {
    return true;
  }
};
export const setPosAllianceFreeDeliveryEnabled = (benefitId: string, enabled: boolean) => {
  try {
    if (enabled) sessionStorage.removeItem(POS_FREE_DELIVERY_KEY(benefitId));
    else sessionStorage.setItem(POS_FREE_DELIVERY_KEY(benefitId), '1');
  } catch {}
};
