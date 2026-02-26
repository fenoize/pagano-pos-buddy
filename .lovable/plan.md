
Objetivo inmediato: dejar operativo el botón **“Registrar recepción”** sin más errores encadenados y blindar el flujo para que no vuelvas a perder créditos.

## 1) Diagnóstico confirmado (hecho con revisión de BD real + flujo UI)

Encontré el problema exacto en producción:

1. La función RPC activa en Supabase (`public.receive_purchase_items`) está insertando:
   - `move_type = 'in'` en `stock_moves`
   - pero el enum `stock_move_type` **no** permite `'in'`; solo permite:
     `purchase, sale, adjustment, transfer_in, transfer_out, waste`.
   - Por eso el error: `invalid input value for enum stock_move_type: "in"`.

2. Además, esa misma función activa intenta hacer:
   - `INSERT INTO stock_balances (..., qty)`
   - `DO UPDATE SET qty = ...`
   - pero en tu esquema real `stock_balances` usa `qty_on_hand` (no `qty`).
   - O sea: aunque arreglemos `'in'`, el siguiente error sería por columna inexistente si no corregimos todo junto.

3. El replay de sesión confirma que al hacer click en **Registrar Recepción** el error viene del RPC backend (no del frontend).

## 2) Causa raíz de por qué “no se arreglaba”

Hay migraciones recientes que reescribieron `receive_purchase_items` con mezcla de esquemas antiguos/nuevos:
- esquema nuevo de `stock_moves` (`qty_in/qty_out/notes`) + valor viejo `'in'`
- y además `stock_balances.qty` (que no existe en tu BD actual)

Resultado: función inválida en producción aunque el front esté bien.

## 3) Plan de solución (implementación propuesta, de punta a punta)

### Fase A — Hotfix backend definitivo (una sola migración limpia)
Crear una nueva migración que haga `CREATE OR REPLACE FUNCTION public.receive_purchase_items(...)` y deje el flujo consistente con tu esquema real:

- En `stock_moves`:
  - usar `move_type = 'purchase'::stock_move_type`
  - usar columnas correctas: `qty_in`, `qty_out`, `notes`, `related_purchase_id`.
- En `stock_balances`:
  - upsert con `qty_on_hand`.
  - actualizar costo promedio (`avg_cost`) de forma consistente al recibir.
- Mantener lógica de clamp para no recibir más que pendiente.
- Mantener estado de OC:
  - `received` si todo recibido
  - `partial` si parcial
- Mantener `SECURITY DEFINER` para evitar bloqueos por RLS desde frontend.

### Fase B — Robustez del RPC (para evitar próximos errores)
En la misma función:

- validaciones explícitas por ítem:
  - item pertenece a la orden
  - cantidad > 0
  - no exceder pendiente
- mapeo UOM robusto y determinístico (evitar fallback “primer registro” cuando no hay match claro).
- mensajes de error más específicos (`RAISE EXCEPTION`) para diagnóstico rápido.

### Fase C — Ajuste frontend mínimo (si hace falta)
`usePurchaseOrders.receiveItems` y modal ya están bien para invocar el RPC, pero agregaré:
- manejo de error más claro en toast (traducido/contextual) para diferenciar:
  - error enum
  - error uom
  - error saldo/columna
Así el próximo fallo no queda ambiguo.

### Fase D — Verificación completa del flujo OC
Haré una prueba de flujo completa con la OC que estás usando (`OC-2026-0012`):
1. recepción parcial
2. recepción total
3. verificar:
   - `purchase_items.qty_received / qty_pending`
   - `purchase_orders.status`
   - inserción en `stock_moves`
   - upsert correcto en `stock_balances.qty_on_hand`
4. repetir con switch de “Ingresar automáticamente al inventario” apagado para validar ambos caminos.

## 4) Resultado esperado tras aplicar el plan

- El error `enum stock_move_type: "in"` desaparece.
- No aparece error posterior por `stock_balances.qty`.
- La recepción de items funciona de principio a fin.
- Queda estabilizado el flujo para que no vuelvas a consumir créditos en intentos fallidos.

## 5) Detalle técnico (resumen para referencia)

```text
Flujo corregido del RPC:

UI (Registrar Recepción)
  -> supabase.rpc('receive_purchase_items', p_order_id, p_receipts, p_ingress_to_inventory)
    -> valida orden + items + cantidades
    -> UPDATE purchase_items.qty_received
    -> IF ingress:
         INSERT stock_moves(move_type='purchase', qty_in, qty_out=0, ...)
         UPSERT stock_balances(qty_on_hand, avg_cost)
    -> recalcula estado OC (partial/received)
    -> commit atómico
```

Archivos objetivo cuando implementemos:
- `supabase/migrations/<new_timestamp>_fix_receive_purchase_items.sql`
- (opcional, solo si agregamos mejora de UX de error)
  - `src/hooks/usePurchaseOrders.ts`

<lov-actions>
<lov-suggestion message="Testea el flujo completo end-to-end de recepción de OC (parcial y total) para confirmar que ya no aparece el error y que se actualizan stock_moves y stock_balances.">Verificar flujo end-to-end</lov-suggestion>
<lov-suggestion message="Agregar una vista de auditoría en la pantalla de OC que muestre los movimientos de stock generados por cada recepción (kardex vinculado por related_purchase_id).">Agregar auditoría de recepción</lov-suggestion>
<lov-suggestion message="Implementar un check de salud en Configuración que valide RPCs críticas de inventario (receive_purchase_items, process_stock_adjustment, process_stock_transfer) y avise incompatibilidades de esquema.">Health check de RPCs críticas</lov-suggestion>
</lov-actions>
