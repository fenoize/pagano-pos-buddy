

## Plan: Corregir 3 problemas en formulario de Orden de Compra

### Problema 1 — Buscador de materiales usa Select plano
Actualmente el selector de materiales es un `<Select>` con todos los items. Se debe reemplazar por `MaterialSearchAutocomplete` (el componente que ya existe con filtro de 3+ caracteres).

**Cambios en `PurchaseOrderForm.tsx`**:
- Importar `MaterialSearchAutocomplete`
- Reemplazar el `<Select>` de la columna "Material" por `<MaterialSearchAutocomplete>` pasando `materials`, `value`, `onSelect` y el display adecuado.

### Problema 2 — No se pueden seleccionar presentaciones de compra
El sistema de presentaciones (`material_purchase_presentations`) ya existe pero no está integrado en el formulario de OC. Cuando el usuario selecciona un material, si ese material tiene presentaciones configuradas, debe poder elegir una (ej: "Caja x36 un").

**Cambios en `PurchaseOrderForm.tsx`**:
- Agregar campo `presentation_id` al tipo `OrderItem`.
- Al seleccionar un material, cargar sus presentaciones disponibles vía query directa.
- Si hay presentaciones, mostrar un selector debajo del material o en la columna "Unidad" para elegir la presentación.
- Al elegir una presentación, auto-rellenar la unidad de compra (`purchase_uom_id`) y el último precio conocido (`last_price`).
- En el resumen, mostrar una nota informativa de la conversión (ej: "1 Caja = 36 un").

### Problema 3 — El cálculo agrega IVA cuando la compra es bruta
El resumen calcula `subtotal + IVA 19%`, pero las compras a proveedores se hacen con precio bruto (el monto ingresado ya incluye todo). El hook `usePurchaseOrders.createOrder` también suma IVA.

**Cambios en `PurchaseOrderForm.tsx`**:
- Agregar un toggle/switch "Precio incluye IVA" (por defecto activado).
- Si está activado: el total = suma de (qty × unit_cost) directo. Desglosar IVA como `total / 1.19 * 0.19` (informativo).
- Si está desactivado: calcular como hoy (neto + 19%).

**Cambios en `usePurchaseOrders.ts`**:
- Aceptar flag `prices_include_tax` en `CreatePurchaseOrderData`.
- Si `true`: `total = sum`, `tax = round(total - total/1.19)`, `subtotal = total - tax`.
- Si `false`: mantener lógica actual.

### Resumen de archivos a modificar
1. `src/pages/inventory/PurchaseOrderForm.tsx` — autocomplete, presentaciones, toggle IVA
2. `src/hooks/usePurchaseOrders.ts` — flag de IVA en create/update

