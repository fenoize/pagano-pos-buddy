

# Plan: Suscripcion de Descuentos para Clientes

## Resumen

Crear un sistema de suscripcion de descuentos permanentes para clientes, similar a la suscripcion de runas existente. Cuando un cliente tenga una suscripcion de descuento activa, se le aplicara automaticamente un porcentaje de descuento en cada compra (tanto desde la app del cliente como desde el POS).

## Cambios a realizar

### 1. Nueva tabla en base de datos: `customer_discount_subscriptions`

Estructura similar a `customer_runa_subscriptions`:

- `id` (UUID, PK)
- `customer_id` (UUID, FK a customers)
- `discount_percent` (integer, 1-100, ej: 20)
- `is_active` (boolean, default true)
- `start_date` (date, opcional)
- `end_date` (date, opcional - NULL = sin termino)
- `notes` (text, opcional)
- `created_by` (UUID, opcional)
- `created_at`, `updated_at` (timestamps)

RLS: solo staff puede gestionar. Un constraint UNIQUE en (customer_id) para que cada cliente tenga maximo una suscripcion de descuento activa.

### 2. Hook: `src/hooks/useDiscountSubscription.ts`

CRUD para la suscripcion de descuento de un cliente, siguiendo el patron de `useRunaSubscriptions.ts`:
- `fetchSubscription(customerId)` - obtener suscripcion activa
- `createSubscription(customerId, percent, notes, startDate, endDate)`
- `updateSubscription(id, updates)`
- `deleteSubscription(id)`

### 3. Hook para consulta rapida: `src/hooks/useCustomerDiscountSubscription.ts`

Hook ligero que dado un `customer_id`, retorna el porcentaje de descuento activo (o 0 si no tiene). Este se usara en el checkout y en el POS para aplicar el descuento automaticamente.

### 4. UI Admin: `src/components/clientes/CustomerDiscountSubscription.tsx`

Componente para la pagina de Clientes (tab de suscripciones o nueva tab). Permite:
- Ver si el cliente tiene descuento activo (badge con %, fechas)
- Crear/editar/eliminar suscripcion
- Activar/pausar con switch
- Campos: porcentaje, notas, fecha inicio, fecha termino

Se integra en `src/pages/Clientes.tsx` junto al componente de suscripciones de runas.

### 5. Aplicacion automatica en Checkout del cliente (`src/pages/customer/CustomerCheckout.tsx`)

- Al cargar la pagina, consultar si el cliente tiene descuento activo
- Si lo tiene, mostrar un banner: "Tienes un 20% de descuento aplicado"
- Calcular el descuento sobre el subtotal de productos
- Mostrar linea en el resumen: "Descuento suscripcion (20%): -$X"
- El descuento se aplica ANTES de delivery fee
- Enviar el monto de descuento al crear la orden (campo `discount` de la tabla orders)

### 6. Aplicacion automatica en POS (`src/pages/NewSale.tsx`)

- Cuando se selecciona un cliente en el POS, verificar si tiene descuento activo
- Si lo tiene, aplicar automaticamente como descuento (similar al descuento manual pero marcado como "Descuento suscripcion")
- Mostrar un badge en el carrito indicando el descuento
- No deberia ser removible manualmente (es un beneficio del cliente)
- Se suma al campo `discount` de la orden

### 7. Visualizacion en la app del cliente

- En el perfil del cliente o en la pantalla de beneficios, mostrar si tiene un descuento activo
- Badge/card: "Tienes un 20% de descuento en todas tus compras"

---

## Seccion tecnica

### Archivos nuevos

| Archivo | Descripcion |
|---|---|
| `src/hooks/useDiscountSubscription.ts` | CRUD completo para suscripciones de descuento (admin) |
| `src/hooks/useCustomerDiscountSubscription.ts` | Hook ligero para obtener % descuento activo de un cliente |
| `src/components/clientes/CustomerDiscountSubscription.tsx` | UI de gestion en panel de clientes |

### Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/pages/Clientes.tsx` | Agregar componente CustomerDiscountSubscription en tab suscripciones |
| `src/pages/customer/CustomerCheckout.tsx` | Consultar descuento activo y aplicarlo al total |
| `src/pages/NewSale.tsx` | Consultar descuento activo del cliente seleccionado y aplicarlo |
| `src/pages/customer/CustomerBenefits.tsx` | Mostrar badge de descuento activo |

### Migracion SQL

```text
CREATE TABLE customer_discount_subscriptions (
  id UUID PK,
  customer_id UUID UNIQUE FK -> customers,
  discount_percent INTEGER NOT NULL CHECK (1-100),
  is_active BOOLEAN DEFAULT true,
  start_date DATE,
  end_date DATE,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

+ RLS (staff only)
+ Trigger update_updated_at
+ Indice en customer_id
```

### Flujo de aplicacion del descuento

```text
Cliente con suscripcion de descuento 20%
    |
    v
Compra desde App o POS
    |
    v
Se detecta suscripcion activa (is_active = true, dentro de rango de fechas)
    |
    v
Se calcula: descuento = subtotal * (discount_percent / 100)
    |
    v
Se muestra en resumen: "Descuento suscripcion (20%): -$X"
    |
    v
Total = subtotal - descuento_suscripcion - otros_descuentos + delivery
    |
    v
Se guarda en orders.discount el monto total de descuento
```

### Consideraciones

- El descuento de suscripcion se acumula con cupones y descuentos manuales (son independientes)
- Se valida que `end_date` no haya pasado al momento de aplicar
- La constraint UNIQUE en customer_id asegura un solo descuento por cliente
- El POS muestra claramente que el descuento viene de una suscripcion y no es editable

