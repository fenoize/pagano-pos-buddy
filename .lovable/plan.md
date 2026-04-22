

# Implementación: Reestructura limpia de Variantes (Tamaño + Proteína)

Plan aprobado con condiciones operativas. Ejecución en 4 etapas atómicas + validación.

---

## Etapa 0 — Respaldo previo (obligatorio antes de tocar datos)

Antes de cualquier ALTER/DELETE, exportar a `/mnt/documents/` snapshots CSV de:
- `product_variant_options`
- `variant_group_options`
- `variant_groups`
- `combo_items`
- `product_variant_groups`

Archivos: `backup_<tabla>_<timestamp>.csv`. Se entregan como `<lov-artifact>` para descarga inmediata.

También se crea una **tabla de auditoría** en BD `migration_warnings_variantes` (texto, jsonb, created_at) que sobrevive a la migración para revisión posterior.

---

## Etapa 1 — Migración SQL (1 sola transacción)

Una migración con todo dentro de `BEGIN...COMMIT`. Si algo falla, rollback total.

1. **Schema additivo (no destructivo)**:
   - `ALTER TABLE variant_group_options ADD COLUMN price_delta INT NOT NULL DEFAULT 0`.
   - `ALTER TABLE variant_groups ADD COLUMN min_select INT DEFAULT 1, max_select INT DEFAULT 1, is_required BOOLEAN DEFAULT true`.
   - Crear `migration_warnings_variantes`.

2. **Limpieza de duplicados en `combo_items`**:
   - Detectar duplicados por `(combo_product_id, category_id, default_product_id, display_order)`.
   - Conservar el más antiguo (`MIN(created_at)`), borrar el resto.
   - Loguear cada borrado en `migration_warnings_variantes` con tipo `combo_item_duplicate`.

3. **Backfill de `price_delta`** (sin borrar nada todavía):
   - Para cada `(product_id, group_id, group_option_id)`:
     - Buscar fila legacy del mismo `(product_id, category_variant_id)` con `variant_group_option_id IS NULL` → ese es el **precio base**.
     - Calcular `delta = price_con_grupo − price_base` por cada tamaño.
     - Si **todos los tamaños del producto** dan el mismo delta para esa opción → aplicar a `variant_group_options.price_delta` (con prioridad: si ya hay valor distinto puesto por otro producto, loguear conflicto).
     - Si **delta no uniforme** entre tamaños del mismo producto → **NO normalizar**. Loguear en `migration_warnings_variantes` tipo `delta_inconsistente` con detalle por tamaño. Marcar producto como "requiere revisión manual" y **no eliminar sus filas combinadas** en el paso siguiente.

4. **Eliminación controlada de filas en `product_variant_options`**:
   - Borrar filas con `variant_group_option_id IS NOT NULL` **solo** para productos sin warnings de delta inconsistente.
   - Borrar filas legacy `variant_group_option_id IS NULL` **solo** si ya tienen reemplazo coherente (en este modelo se mantienen como precio base de tamaño).
   - Productos con warnings: se dejan intactos y se reportan.

5. **Drop de columna ambigua**:
   - `ALTER TABLE product_variant_options DROP COLUMN variant_group_option_id` (solo si no quedaron filas que la usen, validado dentro de la transacción).
   - Si quedan productos en revisión manual, **abortar drop** y loguear: la columna se elimina en una segunda migración tras resolver casos manualmente.

6. **Constraints finales**:
   - `UNIQUE (product_id, category_variant_id)` en `product_variant_options`.
   - `CHECK (price >= 0)` en `product_variant_options`.
   - `CHECK (price_delta >= 0)` en `variant_group_options`.
   - `UNIQUE (combo_product_id, category_id, default_product_id, display_order)` en `combo_items`.

---

## Etapa 2 — Reporte de migración

Al terminar la migración, generar y entregar como artefactos:

- `migration_report.md` con:
  - Conteo de productos migrados correctamente.
  - Conteo y lista de productos con advertencias (delta inconsistente).
  - Tabla de deltas calculados por grupo y opción (Carne=0, Pollo=200, etc.).
  - Casos no uniformes detallados.
  - Conteo de duplicados eliminados en `combo_items`.
- `migration_warnings.csv` (export de la tabla de auditoría).

---

## Etapa 3 — Frontend (alineado con el nuevo shape)

### Tipos
- `src/types/index.ts`: quitar `variant_group_option_id` de `ProductVariantOption`. Agregar `price_delta` a `VariantGroupOption`. Agregar `min_select`, `max_select`, `is_required` a `VariantGroup`.

### Hooks (ajustar SELECTs)
- `useAppProducts.ts`, `useCustomerMenuProducts.ts`, `useAllProducts.ts`, `useVariantGroups.ts`: pedir `price_delta` y metadatos del grupo. Quitar referencias a la columna eliminada.

### Componentes cliente
- `CustomerComboSelector.tsx`:
  - Cargar `product_variant_groups` del producto del slot.
  - Renderizar 2 pasos: **"Elige tu tamaño"** (lista plana de `category_variants`) → **"Elige tu proteína"** (opciones del grupo con etiqueta `+$delta`).
  - Calcular precio: `pvo.price + Σ option.price_delta`.
- `CustomerProductCustomization.tsx`:
  - Quitar `filterVariantsByGroup`. Renderizar tamaño y grupos como ejes ortogonales.

### Componentes POS
- `ComboSelector.tsx`, `ProductCustomizationModalEnhanced.tsx`: misma lógica de 2 pasos + suma de delta.

### Admin
- `ProductVariantsManagementEnhanced.tsx`: 1 input de precio por tamaño (no más matriz).
- `ProductVariantGroupsAssignment.tsx`: input `price_delta` por opción del grupo.

---

## Etapa 4 — Validación end-to-end

Queries SQL ejecutadas y reportadas:

1. `SELECT product_id, category_variant_id, COUNT(*) FROM product_variant_options GROUP BY 1,2 HAVING COUNT(*) > 1` → debe ser 0 filas.
2. `SELECT combo_product_id, category_id, default_product_id, display_order, COUNT(*) FROM combo_items GROUP BY 1,2,3,4 HAVING COUNT(*) > 1` → debe ser 0 filas.
3. `SELECT column_name FROM information_schema.columns WHERE table_name='product_variant_options' AND column_name='variant_group_option_id'` → debe ser 0 filas.

Ejemplos reales que se entregan al cierre:

- **1 hamburguesa migrada** (Cheese Burger): JSON con sus 3 PVO + grupo Proteína con deltas.
- **1 combo migrado** (INVOK2): JSON con slots únicos + shape entregado al `CustomerComboSelector`.
- **Shape final al frontend** (igual al contrato `sizes[] + variantGroups[]` ya aprobado).

Validación visual con browser tools:
- Abrir `CustomerComboSelector` en preview con INVOK2.
- Confirmar que aparece **"Elige tu tamaño"** primero (Simple/Doble/Triple, sin duplicados).
- Confirmar que aparece **"Elige tu proteína"** después (Carne/Pollo con `+$delta`).
- Cambiar selección y verificar que el precio se actualiza como `base + delta`.
- Captura de pantalla anexada al reporte final.

---

## Detalles técnicos clave

- **Transaccionalidad**: toda la migración va en `BEGIN/COMMIT`. Si el drop de columna no es seguro (warnings pendientes), la columna se mantiene y se hace en migración posterior — el resto sí queda aplicado.
- **Backfill no destructivo**: el cálculo de delta lee filas existentes pero no las borra hasta confirmar coherencia.
- **Política ante deltas inconsistentes**: nunca normalizar automáticamente. Producto queda en estado "revisión manual" y se reporta.
- **Frontend defensivo**: si un producto del backend aún arrastra estructura vieja (caso revisión manual), el componente muestra un fallback claro en vez de romper.
- **Riesgo histórico**: `OrderItem` ya guarda `basePrice` y `variant_price` congelados. Los pedidos pasados no se ven afectados.
- **Memoria a actualizar**: `mem://products/multi-dimensional-variant-groups-architecture` se reemplaza al cierre con el nuevo modelo.

