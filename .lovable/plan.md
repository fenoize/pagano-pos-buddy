

# Cargar precios de productos COMBO en el menu del cliente

## Problema

Los productos tipo COMBO (Promo Summer 2X, Promo Thor, Invok2) guardan su precio en la tabla `combo_products` (campo `base_price`), pero el hook `useCustomerMenuProducts` solo busca precios en:
- `product_variant_options` (sistema de variantes)
- Campo `prices` JSON del producto (sistema legacy)

Como resultado, `getProductMinPrice()` retorna `null` para estos productos y aparecen con "Ver opciones" en vez de su precio real.

```text
Tabla combo_products (datos actuales):
+-----------------+---------------+------------+
| Producto        | pricing_mode  | base_price |
+-----------------+---------------+------------+
| Promo Summer 2X | fixed         | $9.990     |
| Promo Thor      | fixed         | $10.990    |
| Invok2          | fixed         | $17.990    |
+-----------------+---------------+------------+
```

## Solucion

### 1. Hook: incluir datos de combo en la query (`useCustomerMenuProducts.ts`)

Agregar `combo_products` al SELECT de productos mediante la relacion existente:

```text
product_variant_options(...),
combo_products(
  base_price,
  pricing_mode,
  active
)
```

### 2. Interfaz: agregar campo `comboPrice` al tipo `MenuProduct`

Agregar un campo opcional `comboPrice: number | null` que almacene el `base_price` del combo activo.

### 3. Funcion `getProductMinPrice`: considerar precio de combo

Agregar una tercera fuente de precio:

```text
Orden de busqueda:
1. Variantes activas (product_variant_options)
2. Precios legacy (campo prices JSON)
3. Precio de combo (combo_products.base_price)  <-- NUEVO

Retorna el minimo de todos los encontrados.
```

### Detalles tecnicos

**Archivo: `src/hooks/useCustomerMenuProducts.ts`**

- En la query de productos, agregar `combo_products(base_price, pricing_mode, active)` al SELECT
- En la transformacion del producto, extraer el `base_price` del primer combo activo y guardarlo como `comboPrice`
- En `getProductMinPrice()`, si el producto tiene `comboPrice > 0`, incluirlo en la lista de precios candidatos
- En la interfaz `MenuProduct`, agregar `comboPrice?: number | null`

No se requieren cambios en `CustomerMenu.tsx` ya que este ya usa `getProductMinPrice()` para mostrar el precio.

## Resultado esperado

- Promo Summer 2X mostrara **$9.990**
- Promo Thor mostrara **$10.990**
- Invok2 mostrara **$17.990**
- Todos los demas productos seguiran funcionando igual

