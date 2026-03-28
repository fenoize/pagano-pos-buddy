

## Campañas de Runas - Sistema de Desafíos y Promociones

### Objetivo
Permitir a los administradores crear campañas de marketing que otorguen runas a los clientes cuando cumplan condiciones específicas (registro en fechas, compra de productos, cantidades, etc.).

### Tipos de campaña soportados (V1)

1. **Registro**: "Regístrate entre X y Y fecha → gana N runas"
2. **Compra de productos**: "Compra N unidades de [producto/categoría] → gana N runas"
3. **Monto acumulado**: "Gasta $X en el período → gana N runas"
4. **Primera compra**: "Haz tu primera compra entre X y Y → gana N runas"

### Arquitectura

**Nueva tabla: `loyalty_campaigns`**

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | uuid PK | |
| title | text | Nombre de la campaña |
| description | text | Descripción visible al admin |
| campaign_type | enum | `registration`, `product_purchase`, `accumulated_spend`, `first_purchase` |
| is_active | boolean | Activa/inactiva |
| starts_at | timestamptz | Inicio de vigencia |
| ends_at | timestamptz | Fin de vigencia |
| reward_runas | integer | Runas a otorgar |
| conditions | jsonb | Condiciones específicas según tipo |
| max_claims | integer | Máximo de clientes que pueden reclamar (null = ilimitado) |
| one_per_customer | boolean default true | Solo 1 vez por cliente |
| created_at | timestamptz | |

El campo `conditions` (JSONB) varía según tipo:
- `registration`: `{}` (solo importan las fechas)
- `product_purchase`: `{ "product_ids": [...], "category_ids": [...], "min_quantity": 3 }`
- `accumulated_spend`: `{ "min_amount": 50000 }`
- `first_purchase`: `{}` (solo importan las fechas)

**Nueva tabla: `loyalty_campaign_claims`**

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | uuid PK | |
| campaign_id | uuid FK → loyalty_campaigns | |
| customer_id | uuid FK → customers | |
| claimed_at | timestamptz | Cuándo se otorgó |
| order_id | uuid FK → orders (nullable) | Pedido que disparó el claim |

Constraint UNIQUE en `(campaign_id, customer_id)` cuando `one_per_customer = true`.

**Nueva RPC: `check_and_claim_campaign(p_customer_id, p_campaign_id, p_order_id)`**
- SECURITY DEFINER
- Valida vigencia, que no haya claim previo, que no se supere max_claims
- Inserta claim + otorga runas via `insert_runas_transaction_with_context`

**Nueva RPC: `evaluate_campaigns_for_order(p_customer_id, p_order_id)`**
- SECURITY DEFINER
- Evalúa todas las campañas activas y vigentes
- Para cada tipo, verifica si el cliente cumple las condiciones con ese pedido
- Otorga automáticamente las que correspondan
- Se llama desde el frontend al confirmar pedido (junto con badges)

**Nueva RPC: `evaluate_registration_campaigns(p_customer_id)`**
- Para campañas tipo `registration`
- Se llama al registrarse un nuevo cliente

---

### Frontend

**Nuevo componente: `src/components/fidelizacion/CampaignsContent.tsx`**
- Lista de campañas con estado (activa, programada, finalizada, inactiva)
- Botón "Nueva campaña" → modal/formulario
- Cada campaña muestra: título, tipo, fechas, runas, claims/max_claims
- Acciones: activar/desactivar, editar, ver claims

**Nuevo componente: `src/components/fidelizacion/CampaignFormModal.tsx`**
- Formulario con: título, descripción, tipo, fechas inicio/fin, runas a otorgar, máximo de claims
- Sección de condiciones dinámica según tipo seleccionado:
  - `product_purchase`: selector de productos y/o categorías + cantidad mínima
  - `accumulated_spend`: monto mínimo
  - `registration` / `first_purchase`: sin condiciones extra (solo fechas)

**Nuevo hook: `src/hooks/useLoyaltyCampaigns.ts`**
- CRUD de campañas
- Consulta de claims por campaña

**Modificar: `src/pages/FidelizacionHub.tsx`**
- Agregar tab "Campañas" en la ruta `/pos/fidelizacion/campanas`

**Modificar: `src/components/AppSidebar.tsx`**
- Agregar item "Campañas" en el menú de Fidelización

**Modificar: `src/App.tsx`**
- Agregar ruta `/pos/fidelizacion/campanas`

**Modificar: `src/lib/badgeAwarder.ts`** (o crear nuevo helper)
- Al confirmar pedido, después de checkAndAwardBadges, llamar a `evaluate_campaigns_for_order`

**Modificar: Registro de cliente (CustomerLogin o flujo de signup)**
- Al registrarse exitosamente, llamar a `evaluate_registration_campaigns`

---

### Flujo de evaluación

```text
Cliente hace pedido → confirmar orden
  ├── checkAndAwardBadges()        (existente)
  └── evaluateCampaignsForOrder()  (nuevo)
       ├── product_purchase → cuenta items del pedido vs conditions
       ├── accumulated_spend → suma total de pedidos en período
       ├── first_purchase → verifica que sea el primer pedido
       └── Si cumple → claim + otorga runas + toast

Cliente se registra
  └── evaluateRegistrationCampaigns()
       └── Si hay campaña activa de registro → claim + otorga runas
```

---

### Archivos

| Acción | Archivo |
|--------|---------|
| Migración | Tabla `loyalty_campaigns`, `loyalty_campaign_claims`, RPCs, RLS |
| Nuevo | `src/components/fidelizacion/CampaignsContent.tsx` |
| Nuevo | `src/components/fidelizacion/CampaignFormModal.tsx` |
| Nuevo | `src/hooks/useLoyaltyCampaigns.ts` |
| Modificar | `src/pages/FidelizacionHub.tsx` — agregar tab campañas |
| Modificar | `src/components/AppSidebar.tsx` — agregar menú campañas |
| Modificar | `src/App.tsx` — agregar ruta |
| Modificar | `src/lib/badgeAwarder.ts` — llamar evaluación de campañas post-pedido |
| Modificar | Flujo de registro de cliente — evaluar campañas de registro |

