

# Plan: Cobro de pedidos "Pendiente" por el repartidor en Delivery

## Contexto

Actualmente, los pedidos con pago "Pendiente" solo se cobran desde el POS del cajero. Cuando un pedido delivery tiene este estado, el repartidor no ve indicaciones claras de cobro en su tarjeta. Se necesita que el repartidor pueda cobrar estos pedidos al entregar, igual que con los pedidos en efectivo.

## Cambios a realizar

### 1. Actualizar logica de pago en `src/lib/deliveryHelpers.ts`

Modificar `calculateDeliveryPaymentInfo` para reconocer `payment_method = 'pendiente'` (o `Pendiente`) como un caso donde el repartidor debe cobrar el total:

- `isPaidInFull = false` (hasta que se entregue y se registre el pago)
- `amountToCollect = total` (el repartidor debe cobrar el monto completo)
- Mostrar el metodo como "Pendiente de cobro" en la tarjeta

### 2. Actualizar la tarjeta del repartidor en `src/components/delivery/DeliveryOrderCard.tsx`

- Cuando el pedido es "Pendiente", mostrar un banner destacado (similar al de efectivo) indicando que debe cobrar al cliente.
- Agregar un paso de confirmacion de cobro al marcar como "Entregado": antes de confirmar la entrega, pedir al repartidor que seleccione el metodo de cobro utilizado (efectivo, transferencia, POS portatil, etc.).
- Si cobra en efectivo, registrar el monto como "efectivo en transito" en `delivery_cash_pending`, igual que se hace hoy con pedidos en efectivo.

### 3. Actualizar el flujo de entrega en `src/hooks/useDeliveryOrders.ts`

- Al confirmar entrega de un pedido con pago pendiente, actualizar:
  - `payment_method` al metodo real utilizado (ej: "Efectivo")
  - `payment_status` de `unpaid` a `paid`
  - Los campos `payment_efectivo`, `payment_mp`, etc. segun corresponda
- Si el cobro fue en efectivo, crear registro en `delivery_cash_pending` para trazabilidad.

### 4. Sincronizar con el panel de pagos pendientes del cajero

- Cuando el repartidor cobra y marca como entregado, el pedido debe desaparecer automaticamente del panel de "Pagos Pendientes" del cajero (ya que `payment_status` cambia a `paid`).
- El canal realtime `pending-payments-global` ya existente propagara este cambio.

---

## Seccion tecnica

### Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/lib/deliveryHelpers.ts` | Agregar caso `pendiente` en `calculateDeliveryPaymentInfo` |
| `src/components/delivery/DeliveryOrderCard.tsx` | Agregar modal de cobro al confirmar entrega cuando pago es pendiente |
| `src/hooks/useDeliveryOrders.ts` | Agregar funcion `collectAndDeliver` que actualiza pago + estado |
| `src/hooks/useDeliveryPersonCash.ts` | Sin cambios (ya soporta registros de efectivo en transito) |

### Flujo resultante

```text
Pedido Delivery con pago "Pendiente"
    |
    v
Repartidor ve tarjeta con banner "Cobrar $X al cliente"
    |
    v
Repartidor llega y presiona "Marcar como entregado"
    |
    v
Se abre modal: "¿Como cobro el cliente?"
  - Efectivo (con campo "con cuanto paga" + calculo vuelto)
  - Transferencia / MercadoPago
  - POS portatil
    |
    v
Confirma --> Se actualiza:
  - payment_method = metodo real
  - payment_status = 'paid'
  - payment_efectivo / payment_mp / etc.
  - Si efectivo: se crea registro en delivery_cash_pending
  - status = 'Entregado'
    |
    v
Desaparece del panel "Pagos Pendientes" del cajero (realtime)
```

### Consideraciones

- Se reutilizara la lista de metodos de pago activos desde `payment_methods` (excluyendo "pendiente" y "runas")
- El modal de cobro del repartidor sera mas simple que el del POS: un solo metodo por cobro, sin pagos mixtos
- El calculo de vuelto para efectivo usara la misma formula existente

