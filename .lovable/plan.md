
## Objetivo

Corregir el flujo de personalización de productos en la aplicación cliente para que los extras, modificadores y variantes seleccionados se guarden correctamente y se muestren tanto en el carrito/app cliente como en la cocina (KDS).

---

## Diagnóstico del Problema

### Flujo Actual Identificado

```text
┌─────────────────────────────────────────────────────────────┐
│ CustomerProductCustomization.tsx                            │
├─────────────────────────────────────────────────────────────┤
│ handleAddToCart() crea:                                     │
│                                                             │
│ orderItem = {                                               │
│   productId, productName, basePrice, quantity,              │
│   extras: [{key, label, price, quantity}],      ✅ Correcto │
│   modifiers: [{id, name}],                      ✅ Correcto │
│   variant_name,                                 ✅ Correcto │
│   ...                                                       │
│ }                                                           │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ CartContext.tsx                                             │
├─────────────────────────────────────────────────────────────┤
│ CartItem interface espera:                                  │
│                                                             │
│ {                                                           │
│   selectedExtras: [{id, name, price}],          ❌ Diferente│
│   selectedModifiers: [{id, name}],              ✅ OK       │
│   selectedVariant: {id, name, priceAdjustment}  ❌ Diferente│
│ }                                                           │
│                                                             │
│ ⚠️ El item SE GUARDA pero con nombres DIFERENTES            │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ CustomerCheckout.tsx → useMercadoPago/createRunasOrder      │
├─────────────────────────────────────────────────────────────┤
│ Envía:                                                      │
│ items.map(item => ({                                        │
│   ...                                                       │
│   selectedExtras: item.selectedExtras,          ❌ Pero es  │
│   selectedModifiers: item.selectedModifiers,       undefined│
│   selectedVariant: item.selectedVariant                     │
│ }))                                                         │
│                                                             │
│ ⚠️ LOS CAMPOS REALES SON extras/modifiers, NO selectedExtras│
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ Edge Function / Supabase                                    │
├─────────────────────────────────────────────────────────────┤
│ Guarda items tal cual vienen                                │
│ Si vienen sin selectedExtras → se pierden los datos         │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│ OrderCard.tsx (KDS)                                         │
├─────────────────────────────────────────────────────────────┤
│ Busca: item.extras (estructura [{key,label,price,qty}])     │
│        item.modifiers                                       │
│                                                             │
│ ⚠️ Si la orden tiene selectedExtras en vez de extras,       │
│    NO se mostrará nada                                      │
└─────────────────────────────────────────────────────────────┘
```

### Problema Identificado

**Hay 2 estructuras de datos incompatibles:**

| Campo | CartContext (App Cliente) | OrderItem (POS/DB) |
|-------|---------------------------|-------------------|
| Extras | `selectedExtras: [{id, name, price}]` | `extras: [{key, label, price, quantity}]` |
| Modifiers | `selectedModifiers: [{id, name}]` | `modifiers: [{id, name}]` |
| Variant | `selectedVariant: {id, name, priceAdjustment}` | `variant_name`, `category_variant_id` |

El componente `CustomerProductCustomization` genera datos con estructura de `OrderItem`, pero el `CartContext` espera estructura diferente. Y el `CustomerCheckout` mapea usando los nombres incorrectos.

---

## Plan de Corrección

### 1. Actualizar CartContext para Aceptar Ambas Estructuras

**Archivo:** `src/contexts/CartContext.tsx`

- Expandir la interfaz `CartItem` para incluir los campos de `OrderItem` además de los actuales
- Esto asegura compatibilidad con ambos sistemas

```typescript
export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  categoryId?: string;
  categoryName?: string;
  basePrice: number;
  quantity: number;
  
  // Campos de OrderItem (usados por CustomerProductCustomization)
  extras?: Array<{ key: string; label: string; price: number; quantity?: number }>;
  modifiers?: Array<{ id: string; name: string }>;
  variant_name?: string;
  category_variant_id?: string;
  product_variant_option_id?: string;
  size?: 'simple' | 'doble' | 'triple' | 'cuádruple';
  priceKind?: 'combo' | 'only';
  is_combo_item?: boolean;
  combo_selections?: any[];
  
  // Campos legacy (opcionales para compatibilidad)
  selectedVariant?: { id: string; name: string; priceAdjustment: number };
  selectedExtras?: Array<{ id: string; name: string; price: number }>;
  selectedModifiers?: Array<{ id: string; name: string }>;
  
  notes?: string;
  imageUrl?: string;
}
```

### 2. Actualizar el Cálculo de Totales en CartContext

**Archivo:** `src/contexts/CartContext.tsx`

- Modificar `getItemTotal` para leer de ambos campos posibles (extras y selectedExtras)

```typescript
const getItemTotal = (item: CartItem): number => {
  let total = item.basePrice;
  
  // Sumar ajuste de variante (legacy)
  if (item.selectedVariant) {
    total += item.selectedVariant.priceAdjustment;
  }
  
  // Sumar extras - priorizar el formato de OrderItem
  if (item.extras && item.extras.length > 0) {
    total += item.extras.reduce((sum, extra) => 
      sum + (extra.price * (extra.quantity || 1)), 0);
  } else if (item.selectedExtras && item.selectedExtras.length > 0) {
    total += item.selectedExtras.reduce((sum, extra) => sum + extra.price, 0);
  }
  
  return total * item.quantity;
};
```

### 3. Actualizar CustomerCart para Mostrar Ambas Estructuras

**Archivo:** `src/pages/customer/CustomerCart.tsx`

- Modificar el renderizado para leer de `extras` o `selectedExtras`
- Mostrar la variante desde `variant_name` o `selectedVariant.name`

```tsx
{/* Variant - leer de ambos formatos */}
{(item.variant_name || item.selectedVariant?.name) && (
  <p className="text-sm text-muted-foreground">
    {item.variant_name || item.selectedVariant?.name}
  </p>
)}

{/* Extras - leer de ambos formatos */}
{((item.extras && item.extras.length > 0) || 
  (item.selectedExtras && item.selectedExtras.length > 0)) && (
  <p className="text-sm text-muted-foreground">
    + {item.extras 
        ? item.extras.map(e => `${e.quantity || 1}x ${e.label}`).join(', ')
        : item.selectedExtras?.map(e => e.name).join(', ')}
  </p>
)}
```

### 4. Corregir el Mapeo en CustomerCheckout

**Archivo:** `src/pages/customer/CustomerCheckout.tsx`

- Mapear los items del carrito correctamente al enviar a MercadoPago y Runas

```typescript
// Al enviar a createPaymentAndRedirect y createRunasOrder
items: items.map(item => ({
  productId: item.productId,
  productName: item.productName,
  quantity: item.quantity,
  basePrice: item.basePrice,
  
  // Mapear extras al formato correcto de OrderItem
  extras: item.extras || item.selectedExtras?.map(e => ({
    key: e.id,
    label: e.name,
    price: e.price,
    quantity: 1
  })) || [],
  
  modifiers: item.modifiers || item.selectedModifiers || [],
  
  // Variantes
  variant_name: item.variant_name || item.selectedVariant?.name,
  category_variant_id: item.category_variant_id,
  product_variant_option_id: item.product_variant_option_id,
  size: item.size,
  priceKind: item.priceKind,
  
  // Combos
  is_combo_item: item.is_combo_item,
  combo_selections: item.combo_selections,
  
  notes: item.notes
}))
```

### 5. Actualizar runasPayment para Usar Estructura Correcta

**Archivo:** `src/lib/integrations/runasPayment.ts`

- Asegurar que los items se mapeen con estructura de `OrderItem`

```typescript
// 3. Preparar items para la orden
const orderItems = items.map(item => ({
  productId: item.productId,
  productName: item.productName,
  quantity: item.quantity,
  basePrice: item.basePrice,
  
  // Usar estructura de OrderItem
  extras: item.extras || item.selectedExtras?.map(e => ({
    key: e.id,
    label: e.name,
    price: e.price,
    quantity: 1
  })) || [],
  
  modifiers: item.modifiers || item.selectedModifiers || [],
  variant_name: item.variant_name || item.selectedVariant?.name,
  category_variant_id: item.category_variant_id,
  size: item.size,
  priceKind: item.priceKind,
  is_combo_item: item.is_combo_item,
  combo_selections: item.combo_selections,
  notes: item.notes || ''
}));
```

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/contexts/CartContext.tsx` | Expandir interfaz CartItem y actualizar getItemTotal |
| `src/pages/customer/CustomerCart.tsx` | Leer de ambos formatos (extras/selectedExtras) |
| `src/pages/customer/CustomerCheckout.tsx` | Mapear items correctamente al enviar |
| `src/lib/integrations/runasPayment.ts` | Normalizar estructura de items |

---

## Resultado Esperado

### Antes

```text
Cliente agrega LOKI + Aros de cebolla
                │
                ▼
CartContext guarda: { extras: [{key, label, price, qty}] }
                │
                ▼
Checkout envía: { selectedExtras: undefined } ❌
                │
                ▼
DB guarda orden sin extras
                │
                ▼
Cocina muestra: "1x LOKI" (sin personalización) ❌
```

### Después

```text
Cliente agrega LOKI + Aros de cebolla
                │
                ▼
CartContext guarda: { extras: [{key, label, price, qty}] }
                │
                ▼
Checkout envía: { extras: [{key, label, price, qty}] } ✅
                │
                ▼
DB guarda orden CON extras
                │
                ▼
Cocina muestra: "1x LOKI - Extras: 1x Aros de cebolla" ✅
```

---

## Sección Técnica

### Estructura Unificada de OrderItem

El sistema debe usar consistentemente esta estructura en todo el flujo:

```typescript
interface OrderItem {
  productId: string;
  productName: string;
  basePrice: number;
  quantity: number;
  
  // Extras con estructura estándar
  extras: Array<{
    key: string;     // ID del extra
    label: string;   // Nombre visible
    price: number;   // Precio unitario
    quantity?: number; // Cantidad (default 1)
  }>;
  
  // Modificadores
  modifiers: Array<{
    id: string;
    name: string;
  }>;
  
  // Variante (nuevo sistema)
  variant_name?: string;
  category_variant_id?: string;
  product_variant_option_id?: string;
  
  // Variante (sistema legacy)
  size?: 'simple' | 'doble' | 'triple' | 'cuádruple';
  priceKind?: 'combo' | 'only';
  
  // Combos
  is_combo_item?: boolean;
  combo_selections?: any[];
  
  notes?: string;
}
```

### Validación en KDS

El componente `OrderCard.tsx` ya lee correctamente de `item.extras` y `item.modifiers`, por lo que una vez que los datos lleguen con la estructura correcta, se mostrarán automáticamente.
