# Plan: Canales de Venta dinámicos

## Contexto actual
- `orders` tiene una columna `source` (text libre) con valores hardcodeados: `pos`, `web`, `customer_app`. El badge en Sales (`OrderSourceBadge`) los renderiza con un switch en código.
- No hay selector de canal en Nueva Venta — el `source` se asigna implícito según dónde se crea la orden.
- No existe tabla de canales ni panel de gestión.

## 1. Migración de base de datos

Crear `public.sales_channels`:
- `id uuid PK default gen_random_uuid()`
- `name text not null`
- `slug text not null unique`
- `type text not null check (type in ('local','delivery_app','web','phone'))`
- `color text` (hex, ej. `#3b82f6`)
- `icon_url text`
- `active boolean not null default true`
- `integration_enabled boolean not null default false`
- `integration_config jsonb` (nullable; reservado para credenciales)
- `position int not null default 0`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()` + trigger

GRANTs + RLS:
- `GRANT SELECT` a `anon, authenticated` (lectura pública del catálogo activo).
- `GRANT INSERT/UPDATE/DELETE` a `authenticated`; `ALL` a `service_role`.
- Policies: SELECT abierto a authenticated; INSERT/UPDATE/DELETE restringido a rol `Administrador` vía `has_role(auth.uid(),'Administrador')` (usando patrón existente en otras tablas de config).

Seed inicial (insertados en la misma migración):
- Local (`local`, type `local`, position 1)
- App Paganos (`app`, `web`, 2)
- Rappi (`rappi`, `delivery_app`, 3)
- Uber Eats (`uber_eats`, `delivery_app`, 4)
- PedidosYa (`pedidos_ya`, `delivery_app`, 5)
- Teléfono (`phone`, `phone`, 6)

Cambios a `orders`:
- Añadir columna `sales_channel_slug text` (nullable, sin FK por ser slug; índice simple).
- No tocar la columna `source` existente para no romper Sales/EditModal — se seguirá escribiendo en paralelo durante esta versión, mapeando `local→pos`, `app→customer_app`, resto→`web`. (No se renombra `source` en este plan).

Función para borrado seguro:
- RPC `can_delete_sales_channel(channel_slug text) returns boolean` que retorna `false` si existen `orders.sales_channel_slug = slug`. El UI consulta esto antes de permitir eliminar; si hay órdenes, solo permite desactivar.

## 2. Hook y tipos

Nuevo archivo `src/hooks/useSalesChannels.ts`:
- `useSalesChannels({ onlyActive?: boolean })` con react-query: lista ordenada por `position`.
- Mutaciones: `createChannel`, `updateChannel`, `toggleActive`, `deleteChannel` (chequea RPC antes).
- Tipo `SalesChannel` agregado en `src/types/index.ts`.

## 3. Panel de gestión (Configuración)

Nuevo archivo `src/components/config/SalesChannelsConfig.tsx`:
- Tabla con columnas: nombre, slug, tipo (badge), color (swatch), estado (Switch active), integración (badge "Integración activa" si `integration_enabled`).
- Botón "Nuevo canal" → Dialog con formulario: nombre, slug (autogenerado desde nombre, editable), tipo (Select con las 4 opciones), color (input color).
- Botón editar (icono lápiz h-9 w-9): permite editar nombre, color, posición.
- Botón eliminar (icono trash h-9 w-9): si `can_delete_sales_channel = false`, deshabilitado con tooltip "Tiene órdenes asociadas — desactívalo".
- Para canales `type = 'delivery_app'`: sección colapsable (`Collapsible` shadcn) "Configuración de integración" con mensaje "Integración disponible próximamente" y switch `integration_enabled` deshabilitado.
- Cumple memoria `mem://ui/estandar-controles-accion-gestion` (h-9 w-9, Switch para toggles).

Registrar la pestaña en `src/pages/ConfiguracionPage.tsx`:
- Nuevo `TabsTrigger value="sales-channels"` con icono `Radio` o `Megaphone` (lucide), label "Canales de Venta".
- Nuevo `TabsContent` que renderiza `<SalesChannelsConfig />`.

## 4. Selector en Nueva Venta

En `src/pages/NewSale.tsx`:
- Cargar `useSalesChannels({ onlyActive: true })`.
- Nuevo campo en el formulario de venta: Select "Canal de venta" con default = canal `local` (o el de menor `position`).
- Render: muestra nombre + chip de color; los de `type = 'delivery_app'` con borde/badge distintivo (variante `outline` + color del canal + label "App").
- Al confirmar la orden, persistir:
  - `sales_channel_slug` = slug del canal seleccionado.
  - `source` (legacy) = mapeo: `local→pos`, `app→customer_app`, demás→`web`.

## 5. Compatibilidad de visualización

`OrderSourceBadge` se extiende:
- Acepta opcional `channelSlug` y `channels` (o consulta `useSalesChannels` con cache global).
- Si la orden tiene `sales_channel_slug`, renderiza con el `name` + `color` del canal (badge con `style={{ backgroundColor: color }}`).
- Si no, fallback al comportamiento actual basado en `source`.
- Sales.tsx y OrderEditModal.tsx pasan `channelSlug={(order as any).sales_channel_slug}`.

## 6. Versionado

Actualizar `src/config/version.ts` a `1.5.3` con entrada de changelog listando: nueva tabla `sales_channels`, panel de gestión, selector dinámico, estructura preparada para integraciones futuras.

## Fuera de alcance (explícito)
- No se implementa ninguna integración real (Rappi/UberEats/PedidosYa). `integration_config` queda vacío y `integration_enabled` no se puede activar desde la UI todavía.
- No se renombra ni se elimina la columna legacy `orders.source`; se mantiene en paralelo.
- No se modifica el flujo de creación de órdenes de la app del cliente ni de pedidos web (siguen escribiendo `source` como hoy; futura PR los hará escribir `sales_channel_slug = 'app'` / `'web'`).
