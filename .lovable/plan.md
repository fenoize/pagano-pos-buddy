
# Plan: Sistema de Aceptacion de Pedidos Remotos + Asignacion de Repartidor

## Objetivo

Implementar un sistema donde los pedidos realizados desde la app del cliente (pagados online) queden "en espera de aceptacion" por parte del cajero. El cajero podra:
- **Retiro**: Aceptar directamente y el pedido pasa a cocina
- **Delivery**: Asignar un repartidor antes de que pase a cocina (si esta en modo manual)

---

## Diagnostico del Sistema Actual

### Flujo actual (problema)
1. Cliente paga con MercadoPago → webhook actualiza orden a `Pendiente`
2. Cliente paga con Runas → orden se crea con `status: 'Pendiente'`
3. La orden aparece **inmediatamente** en Cocina (KDS)
4. El cajero no tiene control sobre cuando entra el pedido

### Flujo deseado (solucion)
1. Cliente paga → orden queda en estado `PendienteAceptacion`
2. Cajero ve alerta visual (banner + sonido)
3. Si es **Retiro**: Cajero acepta → pasa a `Pendiente` → Cocina
4. Si es **Delivery**:
   - Modo Manual: Cajero asigna repartidor → Acepta → pasa a `Pendiente`
   - Modo Pool: Acepta directamente → repartidores ven el pedido en su lista

---

## Configuracion de Delivery

El sistema ya tiene `assignment_mode` en la tabla `delivery_settings`:
- `'assigned'` (manual): El cajero debe seleccionar un repartidor al aceptar
- `'pool'`: Los repartidores "toman" pedidos de un pool comun

---

## Cambios a Implementar

### 1. Migracion SQL: Nuevo Estado

Se agrega `'PendienteAceptacion'` al enum `order_status`:

```text
Enum order_status (despues del cambio):
  PendientePago → PendienteAceptacion → Pendiente → En preparacion → ...
```

La migracion:
- Agrega el nuevo valor al enum
- No afecta ordenes existentes (son estados diferentes)

---

### 2. Modificar Destino de Pagos Aprobados

**Webhook MercadoPago** (`supabase/functions/mp-webhook/index.ts`)
- Cambiar: `status: 'Pendiente'` → `status: 'PendienteAceptacion'`
- Solo para pagos aprobados desde customer_app (source = 'customer_app')

**Pagos con Runas** (`src/lib/integrations/runasPayment.ts`)
- Cambiar: `status: 'Pendiente'` → `status: 'PendienteAceptacion'`

---

### 3. Actualizar Tipos TypeScript

**Archivo:** `src/types/index.ts`

Agregar `'PendienteAceptacion'` al tipo `OrderStatus`:
```typescript
export type OrderStatus = 
  | 'PendientePago' 
  | 'PendienteAceptacion'  // ← NUEVO
  | 'Pendiente' 
  | 'En preparacion' 
  | ... 
```

**Archivo:** `src/types/staffNotifications.ts`

Agregar nuevo tipo de notificacion:
```typescript
export type StaffNotificationType = 
  | ...existing...
  | 'incoming_app_order';  // ← NUEVO
```

---

### 4. Hook: useIncomingOrders

**Archivo nuevo:** `src/hooks/useIncomingOrders.ts`

Responsabilidades:
- Suscripcion realtime a orders con `status = 'PendienteAceptacion'`
- Solo activo si el usuario tiene sesion de caja con `accept_app_orders = true`
- Consulta `delivery_settings.assignment_mode` para saber si requiere asignacion manual
- Expone:
  - `orders`: lista de pedidos pendientes de aceptacion
  - `deliveryAssignmentMode`: 'assigned' | 'pool'
  - `repartidores`: lista de repartidores disponibles (para asignacion)
  - `acceptOrder(orderId, deliveryPersonId?)`: funcion para aceptar
  - `loading`

Logica de `acceptOrder`:
```text
1. Si es DELIVERY y assignment_mode === 'assigned':
   - Requiere delivery_person_id
   - UPDATE orders SET 
       status = 'Pendiente', 
       delivery_person_id = X,
       delivery_person_name = Y,
       cash_session_id = current_session_id

2. Si es RETIRO o assignment_mode === 'pool':
   - UPDATE orders SET 
       status = 'Pendiente',
       cash_session_id = current_session_id

3. Enviar notificacion push al cliente: "Tu pedido fue aceptado"
```

---

### 5. Componente: IncomingOrderBanner

**Archivo nuevo:** `src/components/pos/IncomingOrderBanner.tsx`

Diseño del banner (parte superior del layout, debajo del header):

```text
+----------------------------------------------------------+
|  🟢 NUEVO PEDIDO #1234  |  RETIRO  |  3 items  |  $12.500 |
|                        [VER DETALLES]     [ACEPTAR]       |
+----------------------------------------------------------+
```

Caracteristicas:
- Fondo verde con animacion de pulso
- Posicion: debajo del header, encima del contenido principal
- Si hay multiples pedidos: mostrar el mas reciente con contador "+X mas"
- No bloquea la interfaz: el cajero puede seguir trabajando
- Sonido distintivo al aparecer nuevo pedido
- Boton "ACEPTAR" visible solo si:
  - Es RETIRO, o
  - Es DELIVERY pero assignment_mode === 'pool'
- Si es DELIVERY con assignment_mode === 'assigned':
  - Boton dice "ASIGNAR Y ACEPTAR" y abre modal

---

### 6. Componente: IncomingOrderModal

**Archivo nuevo:** `src/components/pos/IncomingOrderModal.tsx`

Modal con detalles completos del pedido:

```text
+------------------------------------------+
|         NUEVO PEDIDO #1234               |
|                                          |
|   +----------------------------------+   |
|   |          RETIRO                  |   |   ← En verde grande
|   |       Para Llevar                |   |
|   +----------------------------------+   |
|                                          |
|   Cliente: Juan Perez                    |
|   Telefono: +56 9 1234 5678              |
|                                          |
|   +----------------------------------+   |
|   | 2x Smash Doble Combo     $15.000 |   |
|   |    + Extra Tocino         $1.500 |   |
|   |    - Sin cebolla                 |   |
|   | 1x Papas Fritas           $3.500 |   |
|   +----------------------------------+   |
|                                          |
|   Subtotal:              $20.000         |
|   Total:                 $20.000         |
|   Pago: MercadoPago (pagado)             |
|                                          |
|   [MINIMIZAR]            [ACEPTAR]       |
+------------------------------------------+
```

Para pedidos DELIVERY con asignacion manual:

```text
+------------------------------------------+
|         NUEVO PEDIDO #1234               |
|                                          |
|   +----------------------------------+   |
|   |        🚚 DELIVERY               |   |   ← En azul grande
|   |   Av. Providencia 1234, Nunoa    |   |
|   +----------------------------------+   |
|                                          |
|   Cliente: Juan Perez                    |
|   Telefono: +56 9 1234 5678              |
|                                          |
|   ... items ...                          |
|                                          |
|   +----------------------------------+   |
|   | Asignar Repartidor:              |   |
|   | [▾ Seleccionar repartidor     ]  |   |
|   +----------------------------------+   |
|                                          |
|   Subtotal:      $18.000                 |
|   Delivery:       $2.000 (Zona Centro)   |
|   Total:         $20.000                 |
|   Pago: Runas (pagado)                   |
|                                          |
|   [MINIMIZAR]     [ACEPTAR Y ASIGNAR]    |
+------------------------------------------+
```

Comportamiento:
- "MINIMIZAR": Cierra el modal pero deja el banner visible
- "ACEPTAR": 
  - Si delivery con modo manual y sin repartidor: mostrar error "Debes asignar un repartidor"
  - Si valido: ejecutar `acceptOrder()` y cerrar

---

### 7. Componente: IncomingOrderSound

**Archivo nuevo:** `src/components/pos/IncomingOrderSound.tsx`

Similar a `KitchenSounds.tsx` pero con sonido distintivo:
- Frecuencia mas baja y doble beep para diferenciarse de cocina
- Se activa cuando aparece un nuevo pedido en `PendienteAceptacion`
- Configurable (on/off) desde el banner

---

### 8. Integracion en StaffLayout

**Archivo:** `src/App.tsx`

Agregar el banner en `StaffLayout`, justo despues del header:

```tsx
<header>...</header>

{/* Banner de pedidos entrantes - solo visible si hay sesion activa */}
<IncomingOrderBanner />

<main>...</main>
```

El banner internamente verifica:
- Usuario tiene sesion de caja activa
- Sesion tiene `accept_app_orders = true`
- Hay pedidos en estado `PendienteAceptacion`

---

### 9. Actualizar Filtro de Cocina (KDS)

**Archivo:** `src/hooks/useKitchenOrders.ts`

El KDS ya filtra ordenes por status. Verificar que **NO** muestre ordenes en `PendienteAceptacion`:
- Actualmente muestra: Pendiente, En preparacion, En pausa, Listo
- Esto ya excluye `PendienteAceptacion` naturalmente

---

### 10. Notificacion Push al Cliente

Al aceptar el pedido, enviar push notification al cliente:
- Titulo: "Tu pedido fue aceptado ✅"
- Cuerpo: "Pedido #1234 - Ya estamos preparandolo"
- Reutilizar infraestructura de OneSignal existente

---

## Flujo Completo (Ejemplo)

### Caso 1: RETIRO
1. Cliente paga → orden en `PendienteAceptacion`
2. Cajero ve banner verde: "NUEVO PEDIDO #1234 | RETIRO | 2 items | $15.000"
3. Cajero presiona [ACEPTAR]
4. Orden pasa a `Pendiente` → aparece en Cocina
5. Cliente recibe push: "Tu pedido fue aceptado"

### Caso 2: DELIVERY (modo asignado)
1. Cliente paga → orden en `PendienteAceptacion`
2. Cajero ve banner: "NUEVO PEDIDO #1234 | DELIVERY | Av. Prov. 123"
3. Cajero presiona [VER DETALLES]
4. Modal muestra detalles + selector de repartidor
5. Cajero selecciona "Carlos Martinez" y presiona [ACEPTAR Y ASIGNAR]
6. Orden pasa a `Pendiente` con delivery_person asignado → Cocina
7. Cliente recibe push: "Tu pedido fue aceptado"
8. Repartidor recibe push: "Nuevo pedido asignado"

### Caso 3: DELIVERY (modo pool)
1. Cliente paga → orden en `PendienteAceptacion`
2. Cajero ve banner y presiona [ACEPTAR] (sin asignar)
3. Orden pasa a `Pendiente` sin delivery_person
4. Repartidores ven el pedido en su lista y lo "toman"

---

## Archivos a Crear

| Archivo | Descripcion |
|---------|-------------|
| `src/hooks/useIncomingOrders.ts` | Hook para suscripcion realtime y aceptacion |
| `src/components/pos/IncomingOrderBanner.tsx` | Banner flotante de notificacion |
| `src/components/pos/IncomingOrderModal.tsx` | Modal con detalles y asignacion |
| `src/components/pos/IncomingOrderSound.tsx` | Sonido de alerta |

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/types/index.ts` | Agregar 'PendienteAceptacion' a OrderStatus |
| `src/types/staffNotifications.ts` | Agregar tipo 'incoming_app_order' |
| `src/lib/staffNotificationTriggers.ts` | Agregar trigger para notificar al cliente |
| `supabase/functions/mp-webhook/index.ts` | Cambiar destino a PendienteAceptacion |
| `src/lib/integrations/runasPayment.ts` | Cambiar destino a PendienteAceptacion |
| `src/App.tsx` | Integrar IncomingOrderBanner en StaffLayout |

## Migracion SQL

```sql
-- Agregar nuevo estado al enum order_status
ALTER TYPE order_status ADD VALUE 'PendienteAceptacion' AFTER 'PendientePago';
```

---

## Consideraciones de UX

1. **No invasivo**: El banner no bloquea la interfaz de venta
2. **Visible pero no molesto**: Posicion fija arriba, animacion sutil
3. **Accion rapida**: ACEPTAR directo desde el banner para retiros
4. **Flujo completo**: Modal para delivery con asignacion cuando es necesario
5. **Audio distintivo**: Diferente al sonido de cocina para identificar el origen
6. **Contador**: Si hay multiples pedidos, mostrar cuantos hay pendientes

---

## Plan de Prueba (QA)

1. Hacer pedido RETIRO desde app, pagar con MP
   - Verificar que aparezca banner en POS
   - Aceptar → debe aparecer en cocina
   - Cliente debe recibir push

2. Hacer pedido DELIVERY con modo 'assigned'
   - Verificar que aparezca banner
   - Abrir modal → selector de repartidor visible
   - Intentar aceptar sin repartidor → error
   - Asignar repartidor → aceptar → cocina + notificacion a repartidor

3. Hacer pedido DELIVERY con modo 'pool'
   - Banner muestra boton ACEPTAR directo (sin asignar)
   - Aceptar → cocina (sin delivery_person)
   - Repartidor ve pedido en su lista de "disponibles"

4. Verificar que el cajero puede seguir armando pedidos mientras hay alertas

---

## Riesgos y Mitigaciones

| Riesgo | Mitigacion |
|--------|------------|
| Cajero no ve la alerta | Sonido + animacion de pulso |
| Pedido queda sin aceptar mucho tiempo | Posible timeout/recordatorio futuro |
| Conexion realtime falla | Polling de respaldo cada 30s |
| Multiples cajeros con sesiones | Cualquiera puede aceptar; el primero gana |
