

## Plan: Selección múltiple de variantes en slots de combo

### Problema actual
Cada slot de un combo solo permite seleccionar **una** variante (ej: French Fries **O** Aros de cebolla). El usuario necesita que ciertos slots permitan seleccionar **varias** variantes a la vez, sumando sus precios.

### Cambios a implementar

#### 1. Migración de base de datos
Agregar columna `allow_multiple_variants` (boolean, default false) a la tabla `combo_items`. Esto permite configurar por slot si se acepta selección múltiple.

#### 2. Tipo `ComboItem` (types/index.ts)
Agregar `allow_multiple_variants?: boolean` a la interfaz.

#### 3. Administración de combos (ComboManagement.tsx)
Agregar un switch "Permitir múltiples variantes" en la configuración de cada slot, junto a los otros toggles existentes (allow_variant_change, lock_product).

#### 4. Selector de combo en POS (ComboSelector.tsx)
- Cambiar `ComboItemSelection.selectedVariant` de un solo objeto a un array: `selectedVariants?: ProductVariantOption[]` (mantener `selectedVariant` para compatibilidad).
- Para slots con `allow_multiple_variants = true`:
  - Mostrar checkboxes (multi-select) en lugar de radio buttons.
  - Permitir seleccionar/deseleccionar variantes individualmente.
- Para slots normales: comportamiento actual sin cambios.
- **Cálculo de precio**: cuando es multi-select, sumar el precio de todas las variantes seleccionadas (con descuento de combo si aplica).

#### 5. Selector de combo en App Cliente (CustomerComboSelector.tsx)
Replicar la misma lógica de multi-select para la app del cliente.

#### 6. Datos de la orden y KDS
Al confirmar el pedido, guardar todas las variantes seleccionadas en el detalle del ítem del combo. El KDS ya muestra los combo_selections, así que cada variante seleccionada aparecerá como una línea separada dentro del slot.

### Archivos involucrados
- `supabase/migrations/...sql` — nueva columna
- `src/types/index.ts` — actualizar ComboItem
- `src/components/pos/ComboManagement.tsx` — switch de configuración
- `src/components/pos/ComboSelector.tsx` — lógica multi-select + precio
- `src/components/pos/VariantSelector.tsx` — modo multi-select con checkboxes
- `src/components/customer/CustomerComboSelector.tsx` — mismo cambio para app cliente
- `src/components/pos/ProductCustomizationModalEnhanced.tsx` — enriquecer datos para KDS
- `src/components/kitchen/OrderCard.tsx` — mostrar múltiples variantes por slot

### Resultado esperado
- En la OldSchool de Smash&Fries, el slot "Acompañamientos" podrá configurarse con selección múltiple.
- Al personalizar, el cliente/cajero podrá marcar French Fries + Aros de cebolla.
- El precio total sumará ambos acompañamientos.
- El KDS mostrará ambos acompañamientos en el detalle del pedido.

