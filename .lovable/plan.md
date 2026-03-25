

## Flow Review: Issues Found & Fixes

### Issues Identified

**1. CRITICAL: `app_orders_kitchen` view missing fields for tracking**

`CustomerOrderTracking.tsx` fetches from `app_orders_kitchen`, but this view only returns: `id, order_number, status, created_at, updated_at, fulfillment, items, total, notes, nombre_resumen`.

It does NOT include: `delivery_lat`, `delivery_lng`, `customer_id`, `delivery_address`, `delivery_comuna`, `payment_method`, `payment_runas`.

Result: The `DeliveryTrackingMap` always receives `null` for destination coordinates, and the delivery address section never shows. The map will center on Santiago defaults instead of the actual destination.

**Fix**: Update the `app_orders_kitchen` view via migration to include the missing columns: `delivery_lat`, `delivery_lng`, `customer_id`, `delivery_address`, `delivery_comuna`, `payment_method`, `payment_runas`.

---

**2. CRITICAL: `create_order_with_context` RPC doesn't persist `delivery_lat`/`delivery_lng`**

The latest version of the RPC (migration `20260205042048`) does not include `delivery_lat` or `delivery_lng` in its INSERT statement. Orders created via runas payment pass these values but they are silently dropped.

**Fix**: Update `create_order_with_context` to include `delivery_lat` and `delivery_lng` in the INSERT.

---

**3. MODERATE: RLS on `delivery_tracking` won't work for customer reads**

The RLS policy uses `auth.uid()`:
```sql
USING (order_id IN (SELECT id FROM orders WHERE customer_id = auth.uid()))
```

But customers authenticate via `CustomerAuthContext` which uses a custom token system (not Supabase Auth). `auth.uid()` will be null, so the SELECT will always return empty.

**Fix**: The customer tracking hook should use an RPC (SECURITY DEFINER) to fetch tracking data, or we need to adjust the approach. Since the `useDeliveryTrackingCustomer` hook uses both a direct query and realtime subscription, we should:
- Create an RPC `get_delivery_tracking_for_order(p_order_id uuid)` that validates ownership and returns tracking data
- For realtime, since Supabase Realtime doesn't respect RLS by default on channels with filters, the subscription should still work. But the initial fetch won't. Use the RPC for the initial fetch.

---

**4. MODERATE: Realtime subscription on `app_orders_kitchen` (a VIEW) may not emit events**

`CustomerOrderTracking.tsx` subscribes to realtime changes on `app_orders_kitchen`, which is a VIEW, not a table. Supabase Realtime only works on tables. The subscription likely does nothing.

**Fix**: This is a pre-existing issue, not caused by the tracking feature. No change needed for this plan — the page already does a manual fetch. But worth noting.

---

**5. MINOR: `DeliveryTrackingMap` marker rotation conflicts with Mapbox's marker transform**

Line 93-94: `el.style.transform = \`rotate(${tracking.heading}deg)\`` — but Mapbox's `Marker` class also sets `transform` on the element for positioning. This will overwrite Mapbox's transform and break marker placement.

**Fix**: Wrap the emoji in an inner `<div>` and rotate the inner element instead of the marker's root element.

---

**6. MINOR: Map re-fits bounds on every position update**

Every time the rider's position updates, `fitBounds` runs with animation. This creates a jarring experience if the customer is panning/zooming the map. 

**Fix**: Only fit bounds on first position or when rider marker is first created. Use `flyTo` for subsequent updates with gentler zoom.

---

### Implementation Plan

**Migration (1 file)**:
- Update `app_orders_kitchen` view to include `delivery_lat`, `delivery_lng`, `customer_id`, `delivery_address`, `delivery_comuna`, `payment_method`, `payment_runas`
- Update `create_order_with_context` to include `delivery_lat`, `delivery_lng` in INSERT
- Create RPC `get_delivery_tracking_for_order(p_order_id uuid)` — validates customer ownership, returns tracking row

**Frontend fixes (2 files)**:
- `useDeliveryTrackingCustomer.ts`: Use new RPC for initial fetch instead of direct table query
- `DeliveryTrackingMap.tsx`: Fix marker rotation (use inner element), only fitBounds on first load

| Action | File |
|--------|------|
| Migration | View update, RPC update, new RPC |
| Modify | `src/hooks/useDeliveryTrackingCustomer.ts` |
| Modify | `src/components/customer/DeliveryTrackingMap.tsx` |

