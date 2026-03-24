

## Plan Final: Tracking en Tiempo Real para Delivery

### Resumen

Permitir al cliente ver la ubicación del repartidor en un mapa en tiempo real cuando el pedido está "En camino", y enviar una notificación push automática cuando el repartidor esté a 500m del destino.

---

### 1. Base de datos (1 migración)

- **Agregar `delivery_lat` / `delivery_lng`** a la tabla `orders` para guardar coordenadas del destino.
- **Crear tabla `delivery_tracking`** (solo última posición conocida, sin historial en V1):
  - `order_id` (unique), `delivery_person_id`, `latitude`, `longitude`, `heading`, `accuracy`, `tracking_active`, `near_destination_notified`, timestamps.
  - RLS: clientes solo leen tracking de sus propios pedidos.
  - Realtime habilitado.
- **RPC `upsert_delivery_tracking`** (SECURITY DEFINER): Upsert posición + cálculo Haversine de distancia al destino. Si <= 500m y no notificado, marca flag y retorna `should_notify_near = true`.
- **RPC `stop_delivery_tracking`** (SECURITY DEFINER): Desactiva tracking al entregar.

### 2. Checkout: guardar coordenadas destino (3 archivos)

- **`CustomerCheckout.tsx`**: Pasar `delivery_lat`/`delivery_lng` del address seleccionado.
- **`runasPayment.ts`**: Aceptar y guardar coords. Fallback: si no hay coords, geocodificar via `mapbox-geocode` edge function.
- **`mercadopago.ts` + edge function `customer-create-mp-preference`**: Idem, aceptar y persistir coords.

### 3. Lado repartidor (3 archivos)

- **`useDeliveryTracking.ts`** (nuevo hook):
  - `startTracking(orderId)`: Verifica permisos → `watchPosition` con `enableHighAccuracy`.
  - Envía al RPC solo si desplazamiento >= **20m** o han pasado **15 segundos**.
  - Si RPC retorna `should_notify_near = true` → dispara push `delivery_near`.
  - `stopTracking()`: Limpia watch + llama `stop_delivery_tracking`.

- **`DeliveryOrderCard.tsx`** (modificar):
  - Al presionar "He retirado este pedido" → `startTracking(order.id)`.
  - Al entregar → `stopTracking()`.
  - Indicador visual de estado del tracking (verde = compartiendo, rojo = error).
  - Mensaje: "Mantén la app abierta para compartir tu ubicación".

- **`LocationPermissionHelper.tsx`** (nuevo):
  - Detecta estado real del permiso con `navigator.permissions.query` + fallback `getCurrentPosition`.
  - Si denegado: instrucciones específicas por plataforma (iOS Safari / Android Chrome / genérico).
  - Si prompt: botón "Activar ubicación".

### 4. Lado cliente (3 archivos)

- **`useDeliveryTrackingCustomer.ts`** (nuevo hook):
  - Fetch inicial + suscripción Realtime a `delivery_tracking` filtrado por `order_id`.
  - Retorna: posición rider, última actualización, isActive, isNear, isStale (>60s).

- **`DeliveryTrackingMap.tsx`** (nuevo componente):
  - Mapa Mapbox con marker del repartidor (rotado por heading) y marker destino.
  - Auto-fit bounds.
  - Mensajes dinámicos (sin ETA exacto):
    - "Tu repartidor va en camino 🛵"
    - "¡Estamos muy cerca! Prepárate 📍"
    - "Última ubicación disponible · hace X min" (si stale)
  - UI premium, mobile-first.

- **`CustomerOrderTracking.tsx`** (modificar):
  - Mostrar `DeliveryTrackingMap` cuando el pedido es delivery y está "En camino".

### 5. Notificaciones push (3 archivos)

- **`src/types/notifications.ts`**: Agregar `'delivery_near'` al type union.
- **`src/lib/notificationTriggers.ts`**: Nueva función `triggerDeliveryNearNotification` — titulo: "¡Tu pedido está muy cerca! 📍", body: "Prepárate, tu repartidor llegará en minutos."
- **`send-push-notification/index.ts`**: Agregar caso `delivery_near` en `generateClickUrl` → `/track/{order_id}`.

### 6. Limitaciones V1 (explícitas en UI)

- Tracking solo funciona con la app del repartidor en primer plano.
- En iPhone/iOS, la ubicación no se comparte si la app entra en background.
- Diseñado para 1 pedido activo por repartidor.
- No hay historial de recorrido (solo última posición conocida).
- La notificación de 500m se dispara desde el frontend del rider tras respuesta del RPC (preparado para migrar a 100% backend en V2).

---

### Archivos totales

| Acción | Archivo |
|--------|---------|
| Migración | Tabla `delivery_tracking`, columnas `delivery_lat/lng` en orders, 2 RPCs, Realtime |
| Modificar | `CustomerCheckout.tsx` — pasar lat/lng |
| Modificar | `runasPayment.ts` — aceptar lat/lng + geocode fallback |
| Modificar | `mercadopago.ts` — aceptar lat/lng |
| Modificar | `customer-create-mp-preference/index.ts` — persistir lat/lng |
| Nuevo | `src/hooks/useDeliveryTracking.ts` (rider) |
| Nuevo | `src/hooks/useDeliveryTrackingCustomer.ts` (customer) |
| Nuevo | `src/components/delivery/LocationPermissionHelper.tsx` |
| Nuevo | `src/components/customer/DeliveryTrackingMap.tsx` |
| Modificar | `src/components/delivery/DeliveryOrderCard.tsx` |
| Modificar | `src/pages/customer/CustomerOrderTracking.tsx` |
| Modificar | `src/types/notifications.ts` |
| Modificar | `src/lib/notificationTriggers.ts` |
| Modificar | `supabase/functions/send-push-notification/index.ts` |

