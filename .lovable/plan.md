

## Floating Order Tracker Bubble (estilo Uber)

### Objetivo
Mostrar un "globo" flotante persistente en toda la app del cliente cuando hay un pedido activo (estados: Pendiente, En preparacion, En pausa, Listo, En camino). Al tocarlo, navega a `/track/{orderId}`. Desaparece cuando el pedido es Entregado o Cancelado.

### Arquitectura

**1. Nuevo hook: `src/hooks/useCustomerActiveOrder.ts`**
- Consulta `app_orders_kitchen` filtrando por `customer_id` del customer autenticado y estados activos (no Entregado, no Cancelado).
- Suscripcion Realtime a la tabla `orders` filtrada por `customer_id` para detectar cambios de estado y nuevos pedidos.
- Retorna: `{ activeOrder: { id, order_number, status, fulfillment } | null, loading }`.
- Usa el customer del `CustomerAuthContext`.

**2. Nuevo componente: `src/components/customer/ActiveOrderBubble.tsx`**
- Globo flotante posicionado `fixed` encima del bottom nav (`bottom: 5rem`), centrado horizontalmente.
- Muestra: icono de estado animado, `#order_number`, estado actual, tipo (delivery/retiro).
- Animacion de entrada (scale-in + fade-in). Pulso suave continuo para llamar la atencion.
- Al tocar: `navigate('/track/{orderId}')`.
- Boton de minimizar (X) que lo colapsa a un mini-circulo con el icono de estado. Tocar el mini-circulo lo expande de nuevo.
- Tema oscuro (hereda `.customer-app`).

**3. Integrar en `CustomerAppWrapper.tsx`**
- Renderizar `<ActiveOrderBubble />` dentro del wrapper, despues de `{children}`, para que aparezca en todas las paginas del cliente.
- Solo se renderiza si hay un pedido activo y el customer esta autenticado.

### Diseno del bubble

```text
┌─────────────────────────────────┐
│  🔥  Pedido #2130               │
│  En preparacion · Delivery      │
│  Toca para ver detalle →        │
└─────────────────────────────────┘
```

- Fondo `bg-primary` con texto `primary-foreground`.
- Bordes redondeados (`rounded-2xl`), sombra elevada.
- Icono segun estado: Clock (Pendiente), ChefHat (En preparacion), Package (Listo), Truck (En camino).
- Animacion pulse en el icono cuando esta "En preparacion".

### Archivos

| Accion | Archivo |
|--------|---------|
| Nuevo | `src/hooks/useCustomerActiveOrder.ts` |
| Nuevo | `src/components/customer/ActiveOrderBubble.tsx` |
| Modificar | `src/components/customer/CustomerAppWrapper.tsx` — agregar bubble |

