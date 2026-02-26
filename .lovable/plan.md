

# Plan: Rediseño del Flujo de Compras para Paganos

## Tu realidad operativa (como la entiendo)

1. **Cocina hace una lista** de todo lo que necesita (la "solicitud").
2. **Logística recibe esa lista** y tiene que resolver cada item:
   - Algunos van a **proveedores fijos** (les mandan la lista y ellos despachan o ustedes retiran).
   - Otros requieren **cotizar/buscar** en ferias o locales (tomates, paltas, cebollas) para encontrar el mejor precio.
3. **La compra real** puede ser: proveedor entrega en local, ustedes van a retirar, o compra directa en feria/local.
4. **Problema de UOM**: compran en cajas (ej: caja de papas McCain = 8 bolsas x 2.25kg) pero usan/venden en gramos (200g). El sistema no traduce bien entre "unidad de compra" y "unidad de uso".

## Observaciones sobre el sistema actual

**Lo que no calza con tu operación:**

- La **Solicitud de Compra** actual obliga a poner **proveedor y precio** por cada item. En tu caso, cocina no sabe (ni debería saber) a quién ni a cuánto se compra. Solo dice "necesito 5kg de tomate".
- Al **aprobar** la solicitud, se generan OC automáticamente agrupadas por proveedor. Pero si un item no tiene proveedor fijo (ej: verduras), no hay forma de manejar la fase de "búsqueda de mejor precio".
- No existe un **estado intermedio** entre "aprobada la solicitud" y "comprado" para la fase de cotización/búsqueda.
- No hay distinción entre **"proveedor despacha"** vs **"nosotros retiramos"** vs **"compra directa en feria"**.
- Las **UOM de compra vs. UOM de uso** no están diferenciadas. No hay concepto de "presentación de compra" (caja, bolsa, pack) con su contenido equivalente.

**Lo que sí sirve:**

- La estructura base de Solicitud → OC → Recepción es correcta conceptualmente.
- El sistema de materiales, bodegas, y kardex está funcional.
- La recepción con movimientos de stock (recién arreglada) está operativa.

## Plan de Mejoras

### Fase 1 — Solicitud de Compra simplificada (lo que pide cocina)

**Cambio conceptual**: La solicitud de cocina es solo una **lista de necesidades** — sin proveedor, sin precio.

- Quitar la obligatoriedad de proveedor y precio en `purchase_request_items`.
- El formulario de solicitud solo pide: **Material + Cantidad + Unidad + Nota** (ej: "maduros", "de 2.25kg", etc.).
- El campo `supplier_id` y `estimated_unit_cost` pasan a ser opcionales (nullable).
- Cocina crea la solicitud y la envía. Punto.

**Impacto en BD:**
- ALTER `purchase_request_items`: `supplier_id` nullable, `estimated_unit_cost` default 0.
- Validación frontend ajustada.

### Fase 2 — Asignación por Logística (fase nueva)

Cuando logística recibe una solicitud aprobada, necesita **resolver cada item**:

**Nuevo concepto: "Modalidad de abastecimiento" por item:**

| Modalidad | Descripción | Flujo |
|-----------|-------------|-------|
| `proveedor_despacha` | Proveedor fijo, ellos entregan | Se genera OC → se envía → se recibe |
| `retiro_proveedor` | Proveedor fijo, nosotros retiramos | Se genera OC → se marca "por retirar" → se recibe |
| `compra_directa` | Feria/local, sin proveedor fijo | Se registra compra con precio real post-compra |

**Nuevo estado en la solicitud**: `en_proceso` (entre `approved` y un nuevo estado `completada`).

**UI nueva: Panel de "Gestión de Compra"**
- Logística ve cada item de la solicitud.
- Asigna proveedor (o marca "compra directa").
- Registra cotizaciones/precios encontrados.
- Marca cada item como "resuelto" cuando tiene proveedor+precio definido.
- Desde ahí genera las OC (agrupadas por proveedor) solo para los items con proveedor fijo.
- Los items de "compra directa" se registran con el precio real al volver de la feria.

**Impacto en BD:**
- Nuevo campo en `purchase_request_items`: `procurement_mode` (enum: `proveedor_despacha`, `retiro_proveedor`, `compra_directa`).
- Nuevo campo: `actual_unit_cost` (el precio real pagado).
- Nuevo campo: `actual_supplier_id` (el proveedor finalmente seleccionado, puede diferir del estimado).
- Nuevo campo: `resolved_at` (timestamp cuando logística resolvió ese item).
- Nuevo enum value `en_proceso` para `purchase_request_status`.

### Fase 3 — UOM de Compra vs. UOM de Uso (presentaciones)

**Problema actual**: Compras una caja de papas McCain (8 bolsas x 2.25kg = 18kg total), pero el sistema solo conoce "gramos" o "kilogramos". No hay forma de decir "compré 2 cajas" y que el sistema entienda que son 36kg.

**Solución: Presentaciones de compra por material**

Nueva tabla `material_purchase_presentations`:

```text
material_purchase_presentations
├── id
├── raw_material_id     → FK a raw_materials
├── supplier_id         → FK a suppliers (opcional, la presentación puede variar por proveedor)
├── name                → "Caja 8x2.25kg", "Bolsa 2.25kg", "Saco 25kg"
├── purchase_uom_id     → FK a units_of_measure (ej: "Caja")
├── content_qty         → 18 (cantidad en unidad base)
├── content_uom_id      → FK a units_of_measure (ej: "Kilogramo")
├── is_default           → boolean
├── is_active            → boolean
└── last_price           → último precio pagado por esta presentación
```

**Ejemplo papas McCain:**
- Presentación: "Caja 8x2.25kg"
- `purchase_uom_id` = Caja
- `content_qty` = 18
- `content_uom_id` = Kilogramo
- Logística dice "compré 2 cajas a $45.000 c/u"
- Sistema calcula: 2 × 18kg = 36kg ingresan al inventario
- Costo unitario: $45.000 / 18 = $2.500/kg

**Impacto en el flujo:**
- En la solicitud, cocina pide "18kg de papas" (en su unidad de uso).
- En la OC/compra, logística selecciona la presentación "Caja 8x2.25kg" y pone cantidad 1.
- Al recibir, el sistema convierte automáticamente: 1 caja → 18kg al inventario.

### Fase 4 — Registro de cotizaciones (historial de precios)

Para los items que requieren búsqueda de mejor precio:

Nueva tabla `purchase_quotations`:

```text
purchase_quotations
├── id
├── request_item_id     → FK a purchase_request_items
├── supplier_name       → texto libre (para ferias/locales sin ficha)
├── supplier_id         → FK opcional (si es proveedor registrado)
├── unit_price
├── presentation_id     → FK opcional a material_purchase_presentations
├── notes               → "Feria Lo Valledor, puesto 42"
├── quoted_at
├── is_selected         → boolean (la cotización ganadora)
└── quoted_by           → FK a users
```

Esto permite que logística registre: "Tomates: $1.200/kg en Feria Lo Valledor, $1.500/kg en Jumbo, $1.100/kg en Vega Central" → selecciona la mejor y esa se usa para la compra.

## Orden de implementación recomendado

| Prioridad | Fase | Impacto operativo | Complejidad |
|-----------|------|-------------------|-------------|
| 1 | Fase 1: Solicitud simplificada | Alto — cocina deja de inventar precios | Baja |
| 2 | Fase 2: Gestión por logística | Alto — flujo real de trabajo | Media-Alta |
| 3 | Fase 3: Presentaciones de compra | Alto — elimina confusión cajas/gramos | Media |
| 4 | Fase 4: Cotizaciones | Medio — trazabilidad de precios | Baja-Media |

## Resumen visual del flujo propuesto

```text
COCINA                          LOGÍSTICA                           INVENTARIO
──────                          ─────────                           ──────────
Crea solicitud                  
(solo materiales + cant.)       
       │                        
       ▼                        
Envía a aprobación ──────────►  Revisa y aprueba
                                       │
                                       ▼
                                Para cada item:
                                ┌─ Proveedor fijo? ──► Asigna proveedor
                                │                      Genera OC ──────►  Recibe mercadería
                                │                      (despacho/retiro)   Ingresa stock
                                │
                                └─ Sin proveedor? ──► Busca/cotiza
                                                      Registra precio
                                                      Compra directa ──► Registra ingreso
                                                                          Ingresa stock
```

