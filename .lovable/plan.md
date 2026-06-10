# Plan: Sub-flujo "Aplicación" en modal de pago

## 1. Base de datos

Migración que añade a `orders`:
- `external_order_id text` (nullable) — N° de pedido asignado por la app externa (Rappi/Uber/PedidosYa).
- Índice simple `idx_orders_external_order_id` para búsquedas/duplicados.

No se cambia el enum `payment_method` (ya tiene `aplicacion`). No se tocan grants ni RLS (la tabla ya está configurada).

## 2. Modal de pago — Nueva venta (`src/components/pos/PaymentModal.tsx`)

Estado nuevo:
- `selectedAppChannel: SalesChannel | null`
- `externalOrderId: string`
- `appInputRef` para autofocus.

Comportamiento al seleccionar el método "Aplicación":
- **Paso 1**: en lugar de sumar el monto al instante, mostrar dentro del modal un sub-panel con los canales activos `type = 'delivery_app'` (vienen de `useSalesChannels({ onlyActive: true })`). Cada chip usa `channel.color` de borde/fondo y muestra el `name`.
- **Paso 2**: al elegir un canal, aparece un `Input` "Nº de pedido [Nombre]" con `autoFocus`, `inputMode="text"`, `pattern="[A-Za-z0-9\-]+"` y sanitización en `onChange` (regex `/[^A-Za-z0-9-]/g`). Botón "Cambiar app" para volver al paso 1.
- **Paso 3**: mientras haya app seleccionada:
  - Ocultar los demás botones de método de pago y los campos de monto recibido / vuelto / pagos mixtos.
  - El monto de la línea "aplicacion" se fija automáticamente en `total`.
  - El botón principal pasa a decir "Confirmar pedido" (en vez de "Cobrar"); deshabilitado si `externalOrderId.trim() === ''`.
- Al confirmar, el modal devuelve además `{ salesChannelSlug, externalOrderId }` en su payload `onConfirm`.

Si el usuario deselecciona "Aplicación" o cambia a otro método, se limpia `selectedAppChannel` y `externalOrderId`, y reaparece el flujo normal.

## 3. Persistencia en `NewSale.tsx`

En el handler de confirmación de venta:
- Cuando el pago incluye "aplicacion" con sub-canal, sobrescribir:
  - `sales_channel_slug = selectedAppChannel.slug`
  - `external_order_id = externalOrderId.trim()`
  - `payment_method = 'aplicacion'`
- No alterar el cálculo de totales/vuelto/mixtos del resto de métodos.
- Validación de respaldo: si `payment_aplicacion > 0` y el canal elegido por el usuario en el selector general de canal es de tipo `delivery_app`, exigir `external_order_id`.

`CollectPaymentModal.tsx` (cobrar pendientes) recibe el mismo sub-flujo: cuando se elige "Aplicación", pedir canal + `external_order_id`, persistirlos al actualizar la orden (`updates.sales_channel_slug`, `updates.external_order_id`). Esto mantiene consistencia para pedidos que se dejaron "pendiente" y se cobran después como app.

## 4. Visualización en órdenes (KDS / Últimas Órdenes / Historial)

`src/components/kitchen/OrderCard.tsx`, `src/components/sales/RecentOrdersModal.tsx`, `src/components/sales/OrderEditModal.tsx` y `src/pages/Sales.tsx`:
- Si `order.sales_channel_slug` existe y el canal correspondiente tiene `type === 'delivery_app'`:
  - Renderizar un badge con `channel.name` y `channel.color` (background + texto contrastante) **junto al** badge de tipo de entrega actual ("LLEVAR"/"DELIVERY"). No reemplaza; complementa.
  - Si la orden tiene `external_order_id`, mostrarlo como texto pequeño debajo del badge: `#RAP-48291`.
- Para canales no delivery_app o sin slug, comportamiento actual sin cambios.

Reutilizar `OrderSourceBadge` extendiéndolo con una variante "delivery_app" que pinte con `channel.color` cuando aplica; los demás casos siguen igual.

## 5. Versión

Bump `src/config/version.ts` a `1.5.4` con changelog: "Sub-flujo Aplicación (Rappi/Uber/PedidosYa) con N° de pedido externo y badge de canal en órdenes".

## Fuera de alcance
- Integraciones reales con APIs de Rappi/Uber/PedidosYa.
- Cambios al flujo de Efectivo, POS, MercadoPago, Transferencia, Runas, etc.
- Cambios en reportes de caja (la app sigue contabilizándose vía `payment_aplicacion` como hoy).

## Detalles técnicos

- Sanitización del input: `value.replace(/[^A-Za-z0-9\-_ ]/g, '').slice(0, 40)`.
- Autofocus con `useEffect` al cambiar `selectedAppChannel`.
- Carga de canales: `useSalesChannels({ onlyActive: true })`, filtrar `type === 'delivery_app'`. Si la lista está vacía, deshabilitar el botón "Aplicación" con tooltip "No hay apps configuradas".
- Tipos: extender `SaleConfirmPayload` (o equivalente que use `NewSale`) con `salesChannelSlug?: string` y `externalOrderId?: string`.
- En `types/index.ts`/`integrations/supabase/types.ts`: el nuevo campo `external_order_id` quedará reflejado tras la migración (no se edita manualmente).
