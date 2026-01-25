
## Objetivo

Separar la visualización y gestión de contenido de **Promos App** y **Contenido TV** en el módulo de Marketing, ya que actualmente ambos tipos de promociones se muestran mezclados en la página "Promos App".

---

## Análisis del Problema

### Estructura Actual de Datos

Ambos tipos de contenido se almacenan en la misma tabla `marketing_app_promotions`, diferenciados por el campo `cta_type`:

| Tipo | cta_type | Uso |
|------|----------|-----|
| **Promos App** | `open_menu`, `open_cart`, `open_orders`, `open_benefits`, `open_product`, `open_custom_url` | Slider en app cliente |
| **Contenido TV** | `none` | Pantallas TV de pedidos listos |

### Código Actual

```text
┌─────────────────────────────────────────────────────────────┐
│ useMarketingPromotions (hook)                               │
├─────────────────────────────────────────────────────────────┤
│ SELECT * FROM marketing_app_promotions                      │
│ ORDER BY priority, created_at                               │
│                                                             │
│ ❌ NO filtra por cta_type                                   │
│ ❌ Trae TODO (App + TV)                                     │
└─────────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│ MarketingPromosApp.tsx                                      │
├─────────────────────────────────────────────────────────────┤
│ Muestra TODAS las promociones en la tabla                   │
│ ❌ Incluye contenido TV (cta_type = 'none')                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Plan de Implementación

### 1. Modificar Hook `useMarketingPromotions`

**Archivo:** `src/hooks/useMarketingPromotions.ts`

Agregar filtro para excluir contenido TV:

```typescript
// Antes
const { data, error } = await configuredSupabase
  .from('marketing_app_promotions')
  .select('*')
  .order('priority', { ascending: true })

// Después
const { data, error } = await configuredSupabase
  .from('marketing_app_promotions')
  .select('*')
  .neq('cta_type', 'none')  // 👈 Excluir contenido TV
  .order('priority', { ascending: true })
```

### 2. Actualizar Mutations en el Hook

Asegurar que las mutaciones (create, update, delete) continúen funcionando correctamente y refresquen las queries apropiadas:

- `createPromotion`: Invalidar `marketing-promotions`
- `updatePromotion`: Invalidar `marketing-promotions`
- `deletePromotion`: Invalidar `marketing-promotions`
- `toggleActive`: Invalidar `marketing-promotions`

### 3. Actualizar Descripción en MarketingPromosApp

**Archivo:** `src/pages/MarketingPromosApp.tsx`

Clarificar en la interfaz que esta sección es exclusivamente para promociones de la app cliente:

```text
┌─────────────────────────────────────────────────────────────┐
│ Promos App                                                  │
│ Gestiona promociones que se muestran en el slider de la    │
│ aplicación cliente. Para contenido de TV, usa el módulo    │
│ "Contenido TV".                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Resultado Esperado

### Antes

```text
Marketing > Promos App
┌──────────────────────────────────────┐
│ Título          │ CTA          │ ... │
├──────────────────────────────────────┤
│ Promo Verano    │ Ir al Menú   │     │ ← App
│ Video Cocina    │ Sin acción   │     │ ← TV ❌
│ Nuevo Combo     │ Ir al Carrito│     │ ← App
│ Imagen Promo    │ Sin acción   │     │ ← TV ❌
└──────────────────────────────────────┘
```

### Después

```text
Marketing > Promos App
┌──────────────────────────────────────┐
│ Título          │ CTA          │ ... │
├──────────────────────────────────────┤
│ Promo Verano    │ Ir al Menú   │     │ ← Solo App
│ Nuevo Combo     │ Ir al Carrito│     │ ← Solo App
└──────────────────────────────────────┘

Marketing > Contenido TV
┌──────────────────────────────────────┐
│ Título          │ Tipo   │ ...       │
├──────────────────────────────────────┤
│ Video Cocina    │ Video  │           │ ← Solo TV
│ Imagen Promo    │ Imagen │           │ ← Solo TV
└──────────────────────────────────────┘
```

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/hooks/useMarketingPromotions.ts` | Agregar `.neq('cta_type', 'none')` al query principal |
| `src/pages/MarketingPromosApp.tsx` | Actualizar descripción para clarificar que es solo para app cliente |

---

## Validación del Cambio

El contenido TV ya está correctamente separado:

- **Hook `useTVContent`** en `MarketingTVContent.tsx` filtra con `.eq('cta_type', 'none')` ✅
- **Hook `useActivePromotions`** para app cliente ya filtra con `.neq('cta_type', 'none')` ✅
- **Hook `useActiveTVContent`** para TV ya filtra con `.eq('cta_type', 'none')` ✅

Solo falta aplicar el mismo filtro al hook de gestión `useMarketingPromotions`.

---

## Impacto

- **Bajo riesgo**: Solo se modifica el filtro de la query, no afecta la estructura de datos
- **Sin migración**: No requiere cambios en la base de datos
- **Retrocompatible**: El contenido existente seguirá funcionando correctamente
