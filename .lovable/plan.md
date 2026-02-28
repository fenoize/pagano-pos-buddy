

## Diagnóstico

Los proveedores no aparecen porque las **políticas RLS de la tabla `suppliers`** requieren una sesión de staff activa (`has_active_staff_session()`). Cuando PostgREST ejecuta el JOIN desde `purchase_request_items` hacia `suppliers`, la verificación RLS falla silenciosamente y retorna `null` en vez de los datos del proveedor. Esto ocurre intermitentemente debido al connection pooling de Supabase, donde el `set_staff_context` y la query pueden caer en conexiones distintas.

## Solución

Adoptar un enfoque en dos fases: traer los items sin joins a suppliers, y luego hacer una consulta directa a suppliers con los IDs necesarios.

### Paso 1 — Modificar `getRequestById` en `usePurchaseRequests.ts`

1. Cambiar la query de items para **no hacer join a suppliers** (eliminar las líneas de `supplier:suppliers!...` y `actual_supplier:suppliers!...`).
2. Después de obtener los items, extraer todos los `supplier_id` y `actual_supplier_id` únicos no-nulos.
3. Hacer una consulta directa a `suppliers` filtrada por esos IDs (con `withStaffContext`).
4. Mapear los resultados de suppliers como un diccionario `{id: supplierData}`.
5. En la normalización, asignar `item.supplier` y `item.actual_supplier` desde el diccionario usando los IDs del item.

### Cambios de código

**Archivo**: `src/hooks/usePurchaseRequests.ts` (función `getRequestById`, ~líneas 67-94)

```typescript
// Query items SIN join a suppliers
const { data: items, error: itemsError } = await withStaffContext(staffUserId, async () =>
  await supabase
    .from('purchase_request_items')
    .select(`
      *,
      raw_material:raw_materials(id, name, code, last_cost, base_uom_id, base_uom:units_of_measure(id, name, abbreviation)),
      uom:units_of_measure(id, name, abbreviation)
    `)
    .eq('request_id', id)
    .order('created_at', { ascending: true })
);

if (itemsError) throw itemsError;

// Fetch suppliers por separado
const supplierIds = new Set<string>();
(items || []).forEach((item: any) => {
  if (item.supplier_id) supplierIds.add(item.supplier_id);
  if (item.actual_supplier_id) supplierIds.add(item.actual_supplier_id);
});

let suppliersMap: Record<string, any> = {};
if (supplierIds.size > 0) {
  const { data: suppliers } = await withStaffContext(staffUserId, async () =>
    await supabase
      .from('suppliers')
      .select('id, name, phone, email')
      .in('id', Array.from(supplierIds))
  );
  (suppliers || []).forEach(s => { suppliersMap[s.id] = s; });
}

// Normalizar y asignar suppliers
const normalizedItems = (items || []).map((item: any) => ({
  ...item,
  raw_material: Array.isArray(item.raw_material) ? item.raw_material[0] || null : item.raw_material,
  uom: Array.isArray(item.uom) ? item.uom[0] || null : item.uom,
  supplier: item.supplier_id ? suppliersMap[item.supplier_id] || null : null,
  actual_supplier: item.actual_supplier_id ? suppliersMap[item.actual_supplier_id] || null : null,
}));
```

Este enfoque elimina la dependencia del JOIN con RLS y garantiza que los proveedores siempre se resuelvan correctamente, ya que la consulta directa a `suppliers` tiene su propio `withStaffContext`.

