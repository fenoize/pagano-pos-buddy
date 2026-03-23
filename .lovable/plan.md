

## Problem

Orders paid with non-real payment methods (runas, colación, canje, etc.) are being counted as real revenue in several parts of the system. The `counts_as_real_sale` flag on `payment_methods` exists but isn't consistently applied everywhere.

### Where it's already working
- `Dashboard.tsx` — uses `getNonRealSaleMethods()` + `getOrderRealRevenue()`
- `CajeroDashboard.tsx` — same
- `useActiveShiftStats.ts` — same
- `useAllActiveShifts.ts` — same
- `useCashSession.ts` — partially (uses nonRealMethods for some calcs but `totalSales` still sums all `order.total`)

### Where it's NOT filtering (the bugs)

1. **`CashSessionReport.tsx`** (Cierres Diarios list) — line 127: `totalSales = orders.reduce(sum + order.total)` counts ALL orders including runas/colación/canje
2. **`useCashSession.ts`** — line 316: same issue, `totalSales` sums all totals, then subtracts runas separately but doesn't subtract colación/canje
3. **`useProductSalesAnalytics.ts`** — line 122-127: fetches all non-cancelled orders without filtering by payment method, counts revenue from runas/colación orders
4. **`finance_get_kpis` RPC** — SQL function sums all non-cancelled orders' totals without checking `counts_as_real_sale`
5. **`finance_get_daily_data` RPC** — same issue

## Plan

### 1. Fix `CashSessionReport.tsx` — filter totalSales

Import and use `getNonRealSaleMethods` + `getOrderRealRevenue`. Fetch `payment_method` in the orders query. Calculate `totalSales` using only real revenue.

### 2. Fix `useCashSession.ts` — use getOrderRealRevenue for totalSales

Replace the current manual subtraction logic (totalSales - totalRunasAmount - nonRealTotal) with the standard `getOrderRealRevenue` utility for consistency.

### 3. Fix `useProductSalesAnalytics.ts` — exclude non-real orders

Fetch `payment_method` in the orders query. Use `getNonRealSaleMethods()` to filter out orders paid entirely with non-real methods. For mixto orders, keep the items but note the revenue is already item-level (so this mostly means excluding full runas/colación/canje orders).

### 4. Fix `finance_get_kpis` RPC — JOIN with payment_methods

Update the SQL to LEFT JOIN `payment_methods` and exclude orders where `counts_as_real_sale = false`. For `mixto` orders, subtract `payment_runas` from the total. This requires a new migration.

### 5. Fix `finance_get_daily_data` RPC — same JOIN

Apply the same filter to the daily data function.

### Files to modify

| File | Change |
|------|--------|
| `src/components/cash/CashSessionReport.tsx` | Use `getNonRealSaleMethods` + `getOrderRealRevenue` for totalSales |
| `src/hooks/useCashSession.ts` | Replace manual subtraction with `getOrderRealRevenue` |
| `src/hooks/useProductSalesAnalytics.ts` | Filter out non-real payment orders |
| New migration SQL | Update `finance_get_kpis` and `finance_get_daily_data` to exclude non-real payment methods |

