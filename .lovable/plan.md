# Sistema de Etiquetas (Tags) para Clientes

Permite categorizar clientes con etiquetas reutilizables (ej. "Crossfit La Reina", "Influencer", "VIP") con auto-asignación desde Alianzas y gestión manual desde el panel admin.

## Arquitectura de datos

Dos nuevas tablas en `public`:

**`customer_tags`** — catálogo maestro de etiquetas
- `id` uuid PK
- `name` text unique (case-insensitive)
- `color` text (hex, para chips)
- `description` text
- `auto_source` text (`'manual' | 'alliance' | 'campaign'`)
- `created_at`, `created_by`

**`customer_tag_assignments`** — relación N:N cliente↔etiqueta
- `id` uuid PK
- `customer_id` uuid → customers
- `tag_id` uuid → customer_tags
- `source` text (`'manual' | 'alliance' | 'campaign' | 'import'`)
- `source_ref_id` uuid (alliance_id u otro origen)
- `assigned_by` uuid (staff)
- `assigned_at` timestamptz
- UNIQUE(customer_id, tag_id)

**Vínculo en alianzas**: agregar a `marketing_alliances` la columna `auto_tag_id uuid` (nullable, FK a `customer_tags`). Cuando un cliente se atribuye a la alianza (al firmar/comprar), se le asigna automáticamente esa etiqueta.

RLS: lectura/escritura para staff autenticado vía `withStaffContext` / función `has_role`. Customers no acceden directamente.

## Backend (Supabase)

1. Migración con las 2 tablas + columna `auto_tag_id` + índices.
2. RPC `assign_customer_tag(_customer_id, _tag_id, _source, _source_ref_id)` (SECURITY DEFINER) — idempotente.
3. RPC `remove_customer_tag(_customer_id, _tag_id)`.
4. Modificar las RPC existentes `claim_marketing_alliance_signup` y `track_marketing_alliance_purchase` para que, si la alianza tiene `auto_tag_id`, llamen a `assign_customer_tag` con `source='alliance'` y `source_ref_id=alliance_id`.
5. RPC `list_customer_tags_with_counts()` para listado admin con conteo de clientes.

## Frontend

### Gestión de catálogo de etiquetas
Nueva página **`/pos/clientes/etiquetas`** (o tab dentro de Clientes):
- Tabla con: nombre, color, descripción, # clientes asignados, origen.
- Botones acción `h-9 w-9` (estándar admin): editar, eliminar.
- Modal "Nueva etiqueta" con nombre, color (color picker), descripción.

### Gestión por cliente
En el modal/detalle de cliente (componente existente en `src/components/clientes/`):
- Nueva sección **"Etiquetas"** con chips coloreados.
- Botón `+` abre popover con buscador/selector multi-select de etiquetas existentes + opción "Crear nueva".
- Cada chip tiene `x` para quitar (con confirmación si `source != 'manual'`).
- Mostrar tooltip con origen ("Asignada por alianza Crossfit La Reina").

### Listado de clientes
- Agregar columna/filtro **"Etiquetas"** en `Clientes.tsx`.
- Filtro multi-select por etiquetas (AND/OR).
- Mostrar chips coloreados en cada fila.

### Formulario de Alianza
En `AllianceFormModal.tsx`:
- Nuevo campo **"Etiqueta automática"** (Select de tags + botón "Crear"). 
- Al guardar, persiste `auto_tag_id`.
- Al landing page (`AllianceLanding.tsx`) mostrar opcionalmente "Serás identificado como [tag]".

### Hooks
- `useCustomerTags()` — CRUD del catálogo (React Query).
- `useCustomerTagAssignments(customerId)` — etiquetas del cliente + mutaciones assign/remove.
- Extender `useCustomers` para incluir tags (join) y permitir filtro.

## Integración con campañas/mailings (preparación)

El sistema de campañas (`useLoyaltyCampaigns`, `campaignEvaluator.ts`) y push (`MarketingNotifications`) podrá filtrar audiencia por `tag_id` en una iteración futura. Esta entrega deja la base lista (estructura + asignación), sin modificar aún los selectores de audiencia.

## Archivos a crear / modificar

**Nuevos**
- `supabase/migrations/<timestamp>_customer_tags.sql`
- `src/hooks/useCustomerTags.ts`
- `src/hooks/useCustomerTagAssignments.ts`
- `src/components/clientes/CustomerTagsManager.tsx` (catálogo)
- `src/components/clientes/CustomerTagChips.tsx` (chips + selector reutilizable)
- `src/pages/CustomerTags.tsx` (página de gestión, o tab en Clientes)

**Modificados**
- `src/pages/Clientes.tsx` — columna + filtro por tags
- `src/components/clientes/` (modal de detalle de cliente) — sección etiquetas
- `src/components/marketing/AllianceFormModal.tsx` — campo auto_tag_id
- `src/hooks/useMarketingAlliances.ts` — incluir auto_tag_id
- `src/lib/allianceAttribution.ts` — RPC ya disparará el tag desde backend, no requiere cambios
- `src/pages/customer/AllianceLanding.tsx` — opcional, mostrar tag
- `src/integrations/supabase/types.ts` — autogenerado

## Aceptación

1. Puedo crear la etiqueta "Crossfit La Reina" desde gestión de etiquetas.
2. En la alianza "Crossfit La Reina", la asocio como etiqueta automática.
3. Un cliente que se registra desde el landing de esa alianza recibe automáticamente la etiqueta.
4. Desde el detalle de cualquier cliente puedo agregar/quitar/editar etiquetas manualmente.
5. En el listado de clientes puedo filtrar por una o más etiquetas.
6. Las etiquetas se ven como chips coloreados consistentes en todo el sistema.