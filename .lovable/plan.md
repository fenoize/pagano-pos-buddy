

# Plan: Flujo Completo SC → OC + Lista de Compra Directa + Comentarios

## Resumen de lo que falta (según tu descripción)

Tu flujo real tiene 3 actores secuenciales:

```text
CHEF                    APROBADOR                   ENCARGADO DE COMPRAS
─────                   ─────────                   ────────────────────
Arma lista de items     Ve items + último            "Iniciar Gestión":
Solo material+cant+nota  proveedor + último precio   ├─ OCs por proveedor (despacho/retiro)
                        Aprueba/Rechaza              │  → envía por WhatsApp/Email
                                                     ├─ "Lista Compra Directa" (checklist mobile)
                                                     │  → registra precio real al comprar
                                                     ├─ Edita todo hasta finalizar
                                                     ├─ Caja de comentarios
                                                     └─ "Finalizar Gestión" (con confirmación)
```

## Observaciones y Recomendaciones

### 1. Pre-llenado inteligente en Aprobación
- Cuando la SC llega a `pending_approval`, cada item debería mostrar automáticamente:
  - **Último proveedor** (de la última SC completada que incluyó ese material)
  - **Último precio pagado** (de `actual_unit_cost` del último item resuelto para ese material)
  - **Modalidad anterior** (último `procurement_mode` usado)
- Esto evita que el aprobador tenga que adivinar valores y acelera la aprobación.
- **Recomendación**: Guardar estos datos en `raw_materials` como campos denormalizados (`last_supplier_id`, `last_procurement_mode`) que se actualizan al completar cada SC. Alternativa más simple: hacer un query al momento de cargar.

### 2. Generación automática de OCs al "Iniciar Gestión"
- Al presionar "Iniciar Gestión", el sistema debe:
  1. Agrupar items por `actual_supplier_id` donde `procurement_mode` IN (`proveedor_despacha`, `retiro_proveedor`)
  2. Crear una `purchase_order` por cada proveedor, con `request_id` vinculado a la SC
  3. Los items de `compra_directa` NO generan OC — quedan en una lista aparte
- Las OCs generadas heredan: `warehouse_id`, items con `qty`, `uom_id`, `unit_cost` desde la SC
- Cada OC queda en estado `draft` para que el encargado de compras pueda editarla antes de enviar

### 3. "Lista de Compra Directa" como OC especial o vista dedicada
- **Recomendación**: Crear una vista tipo checklist mobile-first dentro del detalle de la SC (no una OC separada)
- Cada item de `compra_directa` se muestra como una tarjeta con:
  - Nombre del material
  - Cantidad solicitada + UOM
  - Campo para: proveedor/lugar, presentación, precio pagado
  - Checkbox de "comprado" (que hace el resolve del item)
- Esto es más natural para alguien caminando por una feria con el teléfono

### 4. Caja de comentarios en la SC
- Agregar campo `management_notes` (text) en `purchase_requests` — separado de `notes` (que son las notas del chef)
- UI: textarea siempre visible en la parte inferior cuando `status = en_proceso`
- Auto-save o botón guardar para no perder notas

### 5. Edición completa hasta finalizar
- Mientras la SC está en `en_proceso`:
  - Las OCs generadas son editables (precios, cantidades)
  - Los items de compra directa son editables
  - Se pueden re-asignar modalidades
- Al "Finalizar Gestión":
  - Validar que TODOS los items están resueltos
  - Confirmar con AlertDialog: "¿Estás seguro de finalizar? Los precios y proveedores quedarán registrados."
  - Actualizar `raw_materials.last_cost` y `last_supplier_id` para cada item
  - Marcar SC como `completada`

### 6. Flujo de la OC generada desde SC
Las OCs generadas mantienen el flujo existente:
- `draft` → el encargado revisa/edita → envía por WhatsApp/Email (ya funciona con `SendPurchaseOrderModal`)
- `sent` → espera mercadería → `received` (con recepción que ya funciona)
- La SC se puede "completar" independientemente de si las OCs ya fueron recibidas o no (la recepción de mercadería es un paso posterior)

## Cambios técnicos necesarios

### Base de datos (migración)
1. `ALTER TABLE purchase_requests ADD COLUMN management_notes text` — notas del encargado de compras
2. Actualizar `raw_materials`: agregar `last_supplier_id uuid REFERENCES suppliers(id)`, `last_procurement_mode procurement_mode_enum` (opcionales, para pre-llenado)

### Backend / Hook (`usePurchaseRequests.ts`)
1. Nueva función `generateOrdersFromRequest(requestId)`:
   - Consulta items con `procurement_mode` IN (`proveedor_despacha`, `retiro_proveedor`) agrupados por `actual_supplier_id`
   - Crea una `purchase_order` por grupo con `request_id = SC.id`
   - Inserta `purchase_items` correspondientes
   - Retorna array de OC IDs generadas
2. Modificar `startProcessing`:
   - Llama a `generateOrdersFromRequest` automáticamente
   - Cambia status a `en_proceso`
3. Nueva función `updateManagementNotes(requestId, notes)`
4. Modificar `completeRequest`:
   - Valida todos los items resueltos
   - Actualiza `raw_materials.last_cost`, `last_supplier_id` por cada item
5. Nueva función `getLastPurchaseInfo(rawMaterialId)` — para pre-llenar en aprobación

### UI — Detalle de SC (`PurchaseRequestDetail.tsx`)
**Estado `pending_approval`:**
- Tabla de items muestra columnas extra: "Último Proveedor", "Último Precio", "Modalidad Anterior" (pre-llenados desde historial)
- El aprobador puede ver estimados antes de aprobar

**Estado `en_proceso` (rediseño mayor):**
- **Sección 1: OCs Generadas** — Lista de OCs vinculadas con estado y botón "Ver OC" / "Enviar"
- **Sección 2: Lista Compra Directa** — Checklist mobile-first con los items `compra_directa`
  - Cada item: tarjeta expandible con campos de proveedor/lugar, precio, presentación, checkbox
  - Al marcar checkbox → resolve item automáticamente
- **Sección 3: Comentarios** — Textarea para `management_notes` con auto-save
- **Botón "Finalizar Gestión"** — con AlertDialog de confirmación

### Nuevos componentes
1. `DirectPurchaseChecklist.tsx` — checklist mobile-first para items de compra directa
2. `LinkedPurchaseOrders.tsx` — mini-lista de OCs vinculadas a la SC con acciones rápidas (ver, enviar)

### Archivos a modificar
- `supabase/migrations/new` — agregar `management_notes`, campos en `raw_materials`
- `src/hooks/usePurchaseRequests.ts` — nuevas funciones
- `src/pages/inventory/PurchaseRequestDetail.tsx` — rediseño del estado `en_proceso`
- `src/components/inventory/DirectPurchaseChecklist.tsx` — nuevo
- `src/components/inventory/LinkedPurchaseOrders.tsx` — nuevo
- `src/types/purchaseRequests.ts` — agregar `management_notes` al tipo

## Orden de implementación

| Paso | Qué | Por qué primero |
|------|-----|-----------------|
| 1 | Migración BD (management_notes + raw_materials fields) | Base para todo lo demás |
| 2 | Pre-llenado en aprobación (último proveedor/precio/modo) | Mejora inmediata para el aprobador |
| 3 | Generación automática de OCs al "Iniciar Gestión" | Core del flujo — conecta SC con OC |
| 4 | LinkedPurchaseOrders + vista en detalle SC | El encargado ve y envía OCs desde la SC |
| 5 | DirectPurchaseChecklist (checklist mobile) | Completa el flujo de compra directa |
| 6 | Caja de comentarios (management_notes) | UX para el encargado |
| 7 | "Finalizar Gestión" con validación + actualización de last_cost | Cierre del ciclo |

