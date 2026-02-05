

# Plan: Sistema de Pedidos con Pago Pendiente

## Resumen Ejecutivo

Implementar un sistema completo que permita enviar pedidos a cocina **sin pago inmediato** usando el metodo de pago "Pendiente". Esta funcion es crucial para operaciones donde el cliente pide en mesa o solicita preparar el pedido para pagar al retirarlo.

---

## Diagnostico Actual

### Estado del sistema

1. **Metodo de pago "Pendiente" ya existe** en la tabla `payment_methods`:
   - `name: 'pendiente'`
   - `display_name: 'Pendiente'`
   - `counts_as_real_sale: false` (correcto)
   - `is_active: true`

2. **Problema critico**: El enum `payment_method` en PostgreSQL **NO incluye 'pendiente'**
   - Valores actuales: `aplicacion, efectivo, mixto, mp, pos, runas`
   - Esto impide crear ordenes con `payment_method = 'pendiente'`

3. **No existe logica para**:
   - Identificar pedidos pendientes de pago visualmente
   - Alertar al cierre de caja sobre pedidos sin pagar
   - Indicar al siguiente cajero que hay pedidos heredados
   - Permitir cobrar pedidos pendientes posteriormente

---

## Arquitectura de la Solucion

### Flujo General

```text
CREACION:
Cliente pide en mesa → Cajero selecciona "Pendiente" → Pedido va a Cocina
                                                    → Status: 'Pendiente' (normal)
                                                    → payment_method: 'pendiente'
                                                    → payment_status: 'unpaid' (nuevo campo)

COBRO POSTERIOR:
Cajero ve icono de pendientes → Abre lista → Selecciona pedido → Registra pago real
                                                                → payment_status: 'paid'
                                                                → Actualiza payment_efectivo/pos/mp/etc

CIERRE DE CAJA:
Si hay pedidos pendientes en el turno:
  → Mostrar alerta: "Hay X pedidos sin pagar por $Y"
  → Permitir cerrar pero con confirmacion explicita
  → Los pedidos quedan "huerfanos" para el siguiente turno

APERTURA DE TURNO:
Si hay pedidos pendientes sin session_id asignado:
  → Banner: "Tienes X pedidos pendientes heredados"
  → El cajero puede ver y cobrarlos
```

---

## Cambios a Implementar

### 1. Migracion SQL

#### 1.1 Agregar 'pendiente' al enum payment_method

```sql
ALTER TYPE payment_method ADD VALUE 'pendiente';
```

#### 1.2 Agregar campo payment_status a orders

```sql
-- Nuevo campo para distinguir ordenes pagadas de pendientes
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status text 
  DEFAULT 'paid' CHECK (payment_status IN ('paid', 'unpaid', 'partial'));

-- Indice para consultas rapidas de pedidos pendientes
CREATE INDEX IF NOT EXISTS idx_orders_payment_status 
  ON orders(payment_status) WHERE payment_status = 'unpaid';
```

### 2. Actualizar Tipos TypeScript

**Archivo:** `src/types/index.ts`

```typescript
// Agregar 'pendiente' al tipo PaymentMethod
export type PaymentMethod = 'efectivo' | 'mp' | 'pos' | 'aplicacion' | 'runas' | 'mixto' | 'pendiente';

// Agregar tipo para status de pago
export type PaymentStatus = 'paid' | 'unpaid' | 'partial';
```

---

### 3. Hook: usePendingPaymentOrders

**Archivo nuevo:** `src/hooks/usePendingPaymentOrders.ts`

Responsabilidades:
- Obtener pedidos con `payment_method = 'pendiente'` y `payment_status = 'unpaid'`
- Filtrar por sesion de caja activa + pedidos huerfanos (sin cash_session_id)
- Suscripcion realtime para actualizaciones
- Funcion para cobrar un pedido pendiente
- Exponer contador para el icono del header

```typescript
interface PendingPaymentOrder {
  id: string;
  order_number: number;
  total: number;
  customer_name?: string;
  fulfillment: string;
  created_at: string;
  cash_session_id: string | null;
  items: OrderItem[];
}

export function usePendingPaymentOrders() {
  // ...
  return {
    pendingOrders: PendingPaymentOrder[],
    count: number,
    totalAmount: number,
    loading: boolean,
    collectPayment: (orderId: string, paymentData: PaymentData) => Promise<void>,
    refetch: () => void
  }
}
```

---

### 4. Componente: PendingPaymentsIndicator

**Archivo nuevo:** `src/components/pos/PendingPaymentsIndicator.tsx`

Icono en el header (al lado de notificaciones) que muestra:
- Badge con cantidad de pedidos pendientes
- Color amarillo/naranja para destacar
- Click abre panel/modal con lista de pedidos

Diseno:

```text
[Campana Notif.] [💰 3] [🚚 2] [Switch App] [Menu Turno]
                  ^
                  Indicador de pagos pendientes
```

---

### 5. Componente: PendingPaymentsPanel

**Archivo nuevo:** `src/components/pos/PendingPaymentsPanel.tsx`

Panel lateral (Sheet/Drawer) con:
- Lista de pedidos pendientes de pago
- Filtro: "Mi turno" / "Heredados"
- Para cada pedido:
  - Numero de orden
  - Cliente (si existe)
  - Total a cobrar
  - Items resumidos
  - Boton "Cobrar"
- Al presionar "Cobrar": abre modal de pago (reutiliza PaymentModal modificado)

---

### 6. Componente: CollectPaymentModal

**Archivo nuevo:** `src/components/pos/CollectPaymentModal.tsx`

Modal simplificado para cobrar un pedido existente:
- Muestra resumen del pedido (items, total)
- Seleccion de metodo de pago (excepto "Pendiente")
- Al confirmar:
  - Actualiza `payment_status = 'paid'`
  - Actualiza campos `payment_efectivo/mp/pos/etc` segun corresponda
  - Vincula a sesion de caja activa si no tenia

---

### 7. Modificar PaymentModal

**Archivo:** `src/components/pos/PaymentModal.tsx`

Cambios:
- Al seleccionar metodo "Pendiente":
  - Deshabilitar campo de monto (no se requiere)
  - Mostrar advertencia: "El pedido ira a cocina sin pago"
  - Al confirmar: enviar orden con `payment_method: 'pendiente'` y `payment_status: 'unpaid'`

---

### 8. Modificar NewSale.tsx

**Archivo:** `src/pages/NewSale.tsx`

Cambios en `processOrderInBackground`:
- Detectar si el metodo de pago es "Pendiente"
- Si es pendiente:
  - `payment_method: 'pendiente'`
  - `payment_status: 'unpaid'`
  - Todos los campos `payment_*` quedan en 0
- Si no es pendiente: flujo normal

---

### 9. Modificar CashSessionModal (Cierre de Caja)

**Archivo:** `src/components/cash/CashSessionModal.tsx`

Cambios al cerrar turno:
- Antes de mostrar modal, consultar pedidos pendientes del turno
- Si hay pedidos pendientes:
  - Mostrar seccion de alerta en el modal
  - Texto: "⚠️ Hay X pedidos sin pagar por un total de $Y"
  - Checkbox de confirmacion: "Entiendo que estos pedidos pasaran al siguiente turno"
  - Solo habilitar boton "Cerrar Turno" si el checkbox esta marcado

---

### 10. Modificar Apertura de Turno

**Archivo:** `src/components/cash/CashSessionModal.tsx`

Al abrir turno:
- Consultar pedidos con `payment_status = 'unpaid'` y sin `cash_session_id` asignado
- Si existen:
  - Mostrar seccion informativa
  - "📋 Hay X pedidos pendientes de turnos anteriores"
  - Opcional: asignarlos automaticamente al nuevo turno

---

### 11. Integrar Indicador en Header

**Archivo:** `src/components/cash/CashSessionTopBar.tsx`

Agregar el componente `PendingPaymentsIndicator` junto a los otros iconos:

```tsx
<div className="flex items-center gap-3">
  {user?.role === 'Administrador' && <StaffNotificationBell />}
  
  {/* NUEVO: Indicador de pagos pendientes */}
  <PendingPaymentsIndicator />
  
  {/* Icono de efectivo de delivery */}
  <Button>...</Button>
  
  {/* Switch de pedidos desde app */}
  <div>...</div>
</div>
```

---

### 12. Actualizar create_order_with_context

**Archivo:** Migracion SQL

La funcion SQL debe aceptar el nuevo campo `payment_status`:

```sql
-- En el INSERT, agregar:
COALESCE((p_order_data->>'payment_status')::text, 'paid')
```

---

## Archivos a Crear

| Archivo | Descripcion |
|---------|-------------|
| `src/hooks/usePendingPaymentOrders.ts` | Hook para gestionar pedidos pendientes de pago |
| `src/components/pos/PendingPaymentsIndicator.tsx` | Icono con badge en el header |
| `src/components/pos/PendingPaymentsPanel.tsx` | Panel lateral con lista de pedidos |
| `src/components/pos/CollectPaymentModal.tsx` | Modal para cobrar pedido existente |

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| Migracion SQL | Agregar 'pendiente' al enum + campo payment_status |
| `src/types/index.ts` | Agregar 'pendiente' y tipo PaymentStatus |
| `src/components/pos/PaymentModal.tsx` | Logica especial para metodo Pendiente |
| `src/pages/NewSale.tsx` | Crear orden con payment_status segun metodo |
| `src/components/cash/CashSessionModal.tsx` | Alertas en cierre y apertura de turno |
| `src/components/cash/CashSessionTopBar.tsx` | Integrar indicador de pendientes |
| `src/hooks/usePaymentMethods.ts` | Agregar 'pendiente' a defaults |

---

## Consideraciones Importantes

### Seguridad
- Los pedidos pendientes solo pueden ser cobrados por Cajero o Administrador
- El cobro debe actualizar la sesion de caja correctamente
- Los montos deben reflejarse en el cierre correspondiente

### Consistencia
- Un pedido con `payment_status = 'unpaid'` NO debe sumarse a las estadisticas de ventas reales
- Al cobrarse, debe actualizarse el `cash_session_id` al turno donde se cobra
- Los reportes deben distinguir entre fecha de creacion vs fecha de cobro

### UX
- El indicador debe ser visible pero no molesto
- El flujo de cobro debe ser rapido (pocos clics)
- Las alertas de cierre deben ser claras pero no bloqueantes

---

## Plan de Prueba (QA)

1. **Crear pedido pendiente**
   - Seleccionar productos, elegir metodo "Pendiente"
   - Verificar que va a cocina sin montos en payment_*
   - Verificar que aparece en el indicador del header

2. **Cobrar pedido pendiente**
   - Abrir panel de pendientes
   - Seleccionar pedido y presionar "Cobrar"
   - Elegir metodo de pago real (efectivo, POS, etc.)
   - Verificar que desaparece del indicador
   - Verificar que los montos se actualizan correctamente

3. **Cierre de turno con pendientes**
   - Crear un pedido pendiente sin cobrarlo
   - Intentar cerrar turno
   - Verificar alerta y checkbox de confirmacion
   - Cerrar turno y verificar que el pedido queda sin cash_session_id

4. **Apertura de turno con heredados**
   - Abrir nuevo turno despues de cerrar con pendientes
   - Verificar mensaje informativo sobre pedidos heredados
   - Verificar que se pueden cobrar desde el nuevo turno

5. **Estadisticas**
   - Verificar que pedidos pendientes NO suman en dashboard
   - Al cobrarse, verificar que suman en el turno correspondiente

---

## Observaciones y Recomendaciones

### Recomendacion 1: Timeout de Pedidos Pendientes
Considerar implementar a futuro un sistema de "limpieza" o alerta para pedidos pendientes que llevan mas de X horas sin cobrarse. Esto evitaria acumulacion de pedidos olvidados.

### Recomendacion 2: Historial de Cobros
Agregar un log de cuando y por quien fue cobrado un pedido pendiente, util para auditorias.

### Recomendacion 3: Notificaciones
Enviar notificacion al administrador si un turno cierra con muchos pedidos pendientes (ej: mas de 5 o mas de $50.000).

### Recomendacion 4: Limitar Uso
Considerar agregar un toggle en configuracion para habilitar/deshabilitar el metodo de pago "Pendiente" segun las necesidades del negocio. Ya existe (`is_active`), solo asegurar que funcione correctamente.

### Recomendacion 5: Modo "Mesa"
En futuras versiones, vincular este sistema con un modulo de mesas para restaurantes, donde el pedido pendiente se asocia a una mesa especifica.

