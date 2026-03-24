## Real-Time Delivery Tracking — V1 Implemented ✅

### What was done

1. **Migration**: Added `delivery_lat`/`delivery_lng` to `orders`, created `delivery_tracking` table with RLS + Realtime, created `upsert_delivery_tracking` and `stop_delivery_tracking` RPCs with Haversine distance calculation.

2. **Checkout coords**: `CustomerCheckout.tsx`, `runasPayment.ts`, `mercadopago.ts`, and `customer-create-mp-preference` edge function now pass and persist delivery coordinates.

3. **Rider tracking**: `useDeliveryTracking` hook with `watchPosition`, 20m/15s throttle, auto-sends to RPC. `DeliveryOrderCard` starts tracking on "He retirado" and stops on "Entregado". `LocationPermissionHelper` handles permission states with platform-specific instructions.

4. **Customer tracking**: `useDeliveryTrackingCustomer` hook with Realtime subscription. `DeliveryTrackingMap` component with Mapbox, rider/destination markers, dynamic status messages. Shown in `CustomerOrderTracking` when delivery + "En camino".

5. **Push notifications**: Added `delivery_near` type to notifications system. RPC returns `should_notify_near` when rider is within 500m. Edge function `send-push-notification` handles the new type.

### V1 Limitations
- Foreground-only tracking (iOS background limitation)
- 1 active delivery per rider
- No route history (last position only)
- 500m notification triggered from frontend after RPC response (prepared for V2 backend-only)
