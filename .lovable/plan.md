
# Plan: Corregir Flujo de Pedidos Remotos para Estado PendienteAceptacion

## Diagnostico del Problema

Los pedidos #1545 y #1546 no aparecieron en el banner del cajero porque **nunca tuvieron el estado `PendienteAceptacion`**.

**Causa raiz:** La funcion SQL `create_order_with_context` tiene **hardcodeado** el estado `'Pendiente'`:

```sql
'Pendiente'::order_status,  -- Linea 67 de la funcion
```

Esto significa que aunque `runasPayment.ts` pasa `status: 'PendienteAceptacion'` en el JSON, la funcion **ignora** ese valor y siempre inserta con `'Pendiente'`.

**Resultado:**
- El pedido se crea con estado `Pendiente` (salta directamente a cocina)
- El `IncomingOrderBanner` solo busca pedidos con `status = 'PendienteAceptacion'`
- El banner nunca muestra nada porque no existen pedidos con ese estado

---

## Solucion Propuesta

Modificar la funcion `create_order_with_context` para que **respete** el status pasado en `p_order_data`, con un valor por defecto de `'Pendiente'` para mantener compatibilidad con el POS.

### Cambio en la funcion SQL

La linea actual:
```sql
'Pendiente'::order_status,
```

Debe cambiar a:
```sql
COALESCE((p_order_data->>'status')::order_status, 'Pendiente'::order_status),
```

Esto permite:
1. **Pedidos desde app cliente**: Pasan `status: 'PendienteAceptacion'` → se respeta
2. **Pedidos desde POS**: No pasan status → usa default `'Pendiente'`

---

## Cambios a Realizar

### 1. Migracion SQL

Crear nueva migracion para actualizar la funcion:

```sql
-- Actualizar create_order_with_context para respetar el status del p_order_data
CREATE OR REPLACE FUNCTION public.create_order_with_context(
  p_user_id uuid,
  p_order_data jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order record;
BEGIN
  -- Establecer contexto dentro de la transaccion
  PERFORM set_config('app.user_id', COALESCE(p_user_id::text, ''), false);
  PERFORM set_config('app.customer_id', '', false);
  PERFORM set_config('app.customer_account_id', '', false);
  
  -- Insertar la orden y capturar el registro completo
  INSERT INTO public.orders (
    customer_id, fulfillment, pickup_mode, items, subtotal,
    delivery_fee, discount, total, payment_efectivo, payment_mp,
    payment_pos, payment_aplicacion, payment_runas, payment_method,
    status,  -- Ahora respeta el valor del JSON
    created_by_user_id, nombre_resumen, notes, source,
    delivery_zone_id, delivery_zone_name, delivery_address,
    delivery_number, delivery_comuna_id, delivery_comuna,
    delivery_reference, delivery_person_id, delivery_person_name,
    combo_data, delivery_distance, cash_session_id
  )
  VALUES (
    NULLIF((p_order_data->>'customer_id'), '')::uuid,
    (p_order_data->>'fulfillment')::fulfillment_type,
    NULLIF((p_order_data->>'pickup_mode'), '')::text,
    (p_order_data->'items')::jsonb,
    (p_order_data->>'subtotal')::integer,
    COALESCE((p_order_data->>'delivery_fee')::integer, 0),
    COALESCE((p_order_data->>'discount')::integer, 0),
    (p_order_data->>'total')::integer,
    COALESCE((p_order_data->>'payment_efectivo')::integer, 0),
    COALESCE((p_order_data->>'payment_mp')::integer, 0),
    COALESCE((p_order_data->>'payment_pos')::integer, 0),
    COALESCE((p_order_data->>'payment_aplicacion')::integer, 0),
    COALESCE((p_order_data->>'payment_runas')::integer, 0),
    (p_order_data->>'payment_method')::payment_method,
    -- CAMBIO: Ahora respeta el status del JSON, con default 'Pendiente'
    COALESCE((p_order_data->>'status')::order_status, 'Pendiente'::order_status),
    p_user_id,
    p_order_data->>'nombre_resumen',
    p_order_data->>'notes',
    COALESCE(p_order_data->>'source', 'pos'),
    NULLIF((p_order_data->>'delivery_zone_id'), '')::uuid,
    p_order_data->>'delivery_zone_name',
    p_order_data->>'delivery_address',
    p_order_data->>'delivery_number',
    NULLIF((p_order_data->>'delivery_comuna_id'), '')::uuid,
    p_order_data->>'delivery_comuna',
    p_order_data->>'delivery_reference',
    NULLIF((p_order_data->>'delivery_person_id'), '')::uuid,
    p_order_data->>'delivery_person_name',
    (p_order_data->'combo_data')::jsonb,
    NULLIF((p_order_data->>'delivery_distance'), '')::numeric,
    NULLIF((p_order_data->>'cash_session_id'), '')::uuid
  )
  RETURNING * INTO v_order;
  
  RETURN row_to_json(v_order)::jsonb;
END;
$$;
```

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| Nueva migracion SQL | Actualizar funcion `create_order_with_context` para usar `COALESCE((p_order_data->>'status')::order_status, 'Pendiente')` |

**No se requieren cambios en el codigo TypeScript** - el archivo `runasPayment.ts` ya envia `status: 'PendienteAceptacion'` correctamente (linea 167).

---

## Impacto y Compatibilidad

| Flujo | Antes | Despues |
|-------|-------|---------|
| POS (cajero crea orden) | Usa `'Pendiente'` hardcodeado | Usa default `'Pendiente'` (sin cambio funcional) |
| App cliente con Runas | Ignora status, usa `'Pendiente'` | Respeta `'PendienteAceptacion'` del JSON |
| App cliente con MP (webhook) | N/A (webhook actualiza el status) | Sin cambio (webhook ya actualiza a `PendienteAceptacion`) |

---

## Plan de Prueba (QA)

1. Hacer pedido desde app cliente con pago de Runas
   - Verificar que el status inicial sea `PendienteAceptacion`
   - Verificar que aparezca el banner verde en el POS
   - Aceptar pedido y verificar que pase a `Pendiente` y aparezca en cocina

2. Hacer pedido desde POS (cajero)
   - Verificar que el status sea `Pendiente` (como siempre)
   - No debe aparecer en el banner de pedidos entrantes
   - Debe aparecer directamente en cocina

3. Verificar que los pedidos existentes no se vean afectados
