

## Plan: Agregar campo de cantidad editable al modal "Resolver Item"

### Problema
El proveedor puede no tener la cantidad solicitada originalmente. El comprador necesita ajustar la cantidad real al resolver un item y dejar registro del cambio.

### Solución
Agregar un campo `actual_qty` a la base de datos y al modal de resolución. Mostrar la cantidad original como referencia y permitir editarla. El total estimado se calcula con la cantidad ajustada.

### Paso 1 — Migración: agregar columna `actual_qty`
- Agregar `actual_qty numeric` a `purchase_request_items` (nullable, default null — null significa "sin cambio, usar qty original").

### Paso 2 — Actualizar tipos TypeScript
- Agregar `actual_qty: number | null` al tipo `PurchaseRequestItem` en `src/types/purchaseRequests.ts`.
- Regenerar tipos en `src/integrations/supabase/types.ts`.

### Paso 3 — Modificar `ItemResolveModal.tsx`
- Agregar estado `actualQty` inicializado con `item.actual_qty ?? item.qty`.
- Mostrar campo editable de cantidad entre Proveedor y Precio, con label "Cantidad" y referencia "(Solicitado: X kg)".
- Si `actualQty !== item.qty`, mostrar badge de advertencia "Cantidad ajustada".
- Actualizar el cálculo del total estimado para usar `actualQty` en vez de `item.qty`.

### Paso 4 — Modificar `resolveItem` en `usePurchaseRequests.ts`
- Aceptar `actual_qty` opcional en el payload de `resolveItem`.
- Incluir `actual_qty` en el `updateData` del update a `purchase_request_items`.

### Paso 5 — Modificar `handleSave` en `ItemResolveModal`
- Pasar `actual_qty` al llamar `resolveItem` cuando difiera de `item.qty`.

### Paso 6 — Mostrar cambio en `PurchaseRequestDetail.tsx`
- En la tabla de items, si `actual_qty` existe y difiere de `qty`, mostrar la cantidad ajustada con un indicador visual (tachado en la original + nueva cantidad).
- Ajustar el cálculo de totales para usar `actual_qty ?? qty`.

