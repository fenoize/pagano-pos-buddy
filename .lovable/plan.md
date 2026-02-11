

# Plan: Modulo de Cupones Robusto

## Resumen

Mejorar el modulo de cupones con: estadisticas de uso y montos, informe detallado por cupon, sistema de comisiones para influencers, y opciones de delivery gratis/descuento parcial.

---

## 1. Migracion de Base de Datos

Agregar campos de comision a la tabla `coupons`:

- `commission_enabled` (boolean, default false) -- activa comision
- `commission_type` ('percentage' | 'fixed', nullable) -- tipo de comision
- `commission_value` (numeric, nullable) -- valor (% o CLP)
- `commission_contact` (text, nullable) -- nombre del influencer/contacto

La tabla `coupon_applications` ya tiene `discount_products`, `discount_delivery` y relacion con `orders`, por lo que los montos totales de descuento y ventas se pueden calcular con queries sin necesidad de campos adicionales.

Para delivery gratis/parcial, la tabla ya tiene `delivery_mode` (free/fixed/percent) y `delivery_amount`. Solo falta exponerlos en la UI del formulario.

---

## 2. Estadisticas en la Tabla de Cupones

Modificar `useCoupons` para calcular por cada cupon:

- **Usos totales**: ya existe (`total_used` via count de `coupon_applications`)
- **Monto total descontado**: SUM de `discount_products + discount_delivery` de `coupon_applications`
- **Monto total de ventas con ese cupon**: SUM del `total` de las ordenes relacionadas via `coupon_applications.order_id`

Mostrar estas 3 columnas nuevas en la tabla de cupones:
| Codigo | Tipo | Descuento | Usos | Desc. Total | Ventas c/Cupon | Estado | Acciones |

---

## 3. Informe / Detalle del Cupon

Al hacer clic en un cupon (o boton "Ver informe"), abrir un Dialog/Sheet con:

- **KPIs**: Usos totales, Monto total descontado, Total ventas generadas, Comision acumulada (si aplica)
- **Tabla de aplicaciones**: Fecha, Orden ID, Cliente, Subtotal de la venta, Descuento aplicado, Comision generada
- **Exportar CSV** del detalle

---

## 4. Comision para Influencers

En el formulario de creacion/edicion de cupon, nueva seccion "Comision":

- Switch "Habilitar Comision"
- Si activo: selector tipo (Porcentaje / Monto Fijo) + valor + campo texto "Nombre del Influencer"
- En el informe del cupon, mostrar columna de comision calculada:
  - Si tipo = percentage: comision = valor% del total de la venta
  - Si tipo = fixed: comision = monto fijo por uso
- KPI de "Comision Total Acumulada"

---

## 5. Delivery Gratis / Descuento Parcial

Exponer los campos `delivery_mode` y `delivery_amount` que ya existen en la DB, en la tab "Reglas" del formulario:

- Reemplazar el switch simple "Aplica a Delivery" por una seccion mas completa:
  - Switch "Aplica descuento al Delivery"
  - Si activo, selector de modo:
    - **Gratis** (delivery_mode = 'free'): delivery queda en $0
    - **Monto fijo** (delivery_mode = 'fixed'): descuenta X CLP del delivery
    - **Porcentaje** (delivery_mode = 'percent'): descuenta X% del delivery
  - Campo numerico para el valor (oculto si modo = free)

---

## Archivos a Modificar

1. **Nueva migracion SQL** -- agregar campos de comision a `coupons`
2. **`src/integrations/supabase/types.ts`** -- se actualiza automaticamente
3. **`src/types/index.ts`** -- agregar campos de comision al interface `Coupon`
4. **`src/hooks/useCoupons.ts`** -- agregar calculo de stats (monto descontado, ventas, comision)
5. **`src/pages/CouponsManagement.tsx`** -- UI principal: tabla con stats, formulario con comision y delivery modes, dialog de informe
6. **`src/lib/couponValidation.ts`** -- ajustar logica de delivery si es necesario para los modos free/fixed/percent

---

## Seccion Tecnica

### Migracion SQL
```sql
ALTER TABLE coupons
  ADD COLUMN IF NOT EXISTS commission_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS commission_type text, -- 'percentage' | 'fixed'
  ADD COLUMN IF NOT EXISTS commission_value numeric,
  ADD COLUMN IF NOT EXISTS commission_contact text;
```

### Query de estadisticas (en useCoupons)
```sql
SELECT 
  ca.coupon_id,
  COUNT(*) as total_used,
  SUM(ca.discount_products + ca.discount_delivery) as total_discounted,
  SUM(o.total) as total_sales
FROM coupon_applications ca
JOIN orders o ON o.id = ca.order_id
GROUP BY ca.coupon_id
```

Esto se ejecutara via Supabase JS con un query por cupon o un RPC para eficiencia.

### Calculo de comision (frontend)
- `commission_type = 'percentage'`: por cada aplicacion, `order.total * commission_value / 100`
- `commission_type = 'fixed'`: `count_uses * commission_value`

