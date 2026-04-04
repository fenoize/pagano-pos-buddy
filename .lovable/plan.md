

## Plan: Grupos de Variantes Multi-Dimensionales

### Problema Actual
Hoy el sistema tiene UN solo eje de variantes por producto (ej: Simple/Doble/Triple vienen de la categoría "Smash"). Necesitas agregar una segunda dimensión: **Proteína** (Carne, Pollo), de modo que el cliente y el cajero seleccionen ambas al personalizar un producto.

### Arquitectura Propuesta

```text
category_variants (existente)         variant_groups (NUEVA)
┌──────────────┐                      ┌───────────────────────┐
│ Simple       │                      │ group: "Proteína"     │
│ Doble        │  ← Tamaño            │   ├─ Carne            │
│ Triple       │                      │   └─ Pollo            │
└──────────────┘                      └───────────────────────┘
                                              │
        product_variant_options (existente)    │
        ┌──────────────────────────────┐      │
        │ product + variant + price    │◄─────┘
        │ + variant_group_option_id    │  (nullable FK)
        └──────────────────────────────┘
```

### Cambios en Base de Datos

1. **Nueva tabla `variant_groups`**: Define los grupos de variantes (ej: "Proteína"). Campos: `id`, `name`, `display_order`, `active`, `created_at`.

2. **Nueva tabla `variant_group_options`**: Opciones dentro de un grupo (ej: "Carne", "Pollo"). Campos: `id`, `group_id` (FK), `name`, `display_order`, `image_url`, `is_default`, `active`.

3. **Nueva tabla `product_variant_groups`**: Qué grupos aplican a qué productos (muchos-a-muchos). Campos: `product_id`, `group_id`. Así solo los productos de hamburguesas tendrían el grupo "Proteína", pero los postres no.

4. **Columna nueva en `product_variant_options`**: Agregar `variant_group_option_id` (FK nullable a `variant_group_options`). Esto permite definir el precio por combinación exacta: "Amerikana + Simple + Carne = $9.290", "Amerikana + Simple + Pollo = $9.790".

### Cambios en el Frontend

5. **Administración de Grupos de Variantes** (nueva sección en Configuración o Productos):
   - CRUD para grupos (crear "Proteína") y sus opciones (crear "Carne", "Pollo").
   - Asignar grupos a productos individuales o por categoría.

6. **Gestión de precios en ProductVariantsManagement**:
   - Cuando un producto tiene grupos asignados, la tabla de precios muestra una fila por combinación (Simple+Carne, Simple+Pollo, Doble+Carne, etc.).
   - Botón para generar automáticamente las combinaciones con un precio base.

7. **Modal de personalización POS** (`ProductCustomizationModal.tsx`):
   - Antes del selector de variante (tamaño), mostrar el selector del grupo (ej: "Proteína: Carne | Pollo").
   - Al seleccionar ambos, filtrar `product_variant_options` para obtener el precio correcto.

8. **App de Cliente** (`CustomerProductCustomization.tsx`):
   - Mismo patrón: selector de grupo con estilo UberEats (lista vertical con radio buttons).
   - El precio se actualiza dinámicamente al cambiar cualquiera de las dos selecciones.

9. **Registro en órdenes** (`OrderItem`):
   - Agregar campo `variant_group_selections` al tipo OrderItem para guardar las selecciones de grupos (ej: `[{group: "Proteína", option: "Pollo"}]`).
   - Se muestra en KDS, boleta, historial de ventas y app de delivery.

10. **Retrocompatibilidad**:
    - Si un producto NO tiene grupos de variantes asignados, todo funciona exactamente igual que hoy.
    - Los grupos son opcionales y aditivos.

### Resumen de Archivos a Crear/Modificar

| Archivo | Acción |
|---------|--------|
| Migración SQL | Crear tablas `variant_groups`, `variant_group_options`, `product_variant_groups` + columna en `product_variant_options` |
| `src/components/config/VariantGroupsConfig.tsx` | Nuevo — CRUD de grupos |
| `src/components/pos/ProductVariantsManagementEnhanced.tsx` | Modificar — precios por combinación |
| `src/components/pos/ProductCustomizationModal.tsx` | Modificar — selector de grupo |
| `src/components/customer/CustomerProductCustomization.tsx` | Modificar — selector de grupo estilo app |
| `src/components/pos/VariantSelector.tsx` | Modificar — filtrado por grupo seleccionado |
| `src/types/index.ts` | Agregar tipos para grupos |
| KDS, Sales, Delivery components | Mostrar selección de grupo en detalle del item |

