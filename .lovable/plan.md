# Beneficios de alianza visibles y auto-aplicables

## Problema
Hoy `useAllianceAutoCoupon` solo se ejecuta dentro de `CustomerCheckout`. El cliente no ve su beneficio en el **carrito**, no puede activarlo/desactivarlo, y el **cajero del POS** no recibe ningún aviso cuando el cliente cargado tiene cupones de alianza o beneficios económicos. Esto provocó que Yanela intentara escribir un cupón caducado y se perdiera una venta.

## Alcance (solo UI/UX y orquestación, sin tocar lógica de validación de cupones)

### 1. App cliente — Aviso en el carrito
Archivo: `src/pages/customer/CustomerCart.tsx`

- Llamar a `useAllianceAutoCoupon` con los items del carrito, subtotal y `deliveryFee=0` (no calculamos delivery aún en el carrito; basta con saber que existe un beneficio elegible). También consultar `getPendingAllianceFreeDeliveryBenefit` para detectar el beneficio de delivery gratis.
- Si hay `autoCoupon` o beneficio de delivery, mostrar **una tarjeta destacada** ("Tienes un descuento disponible por alianza") con el nombre/código del cupón y el monto estimado. Click → abre `AllianceBenefitModal`.

### 2. Nuevo componente `AllianceBenefitModal`
Archivo: `src/components/customer/AllianceBenefitModal.tsx`

- Muestra: nombre del cupón, descripción, tipo de descuento, condiciones (mínimo, vigencia, restricciones de productos resumidas).
- Switch al pie: **"Usar este descuento en mi pedido"** (default ON).
- Estado persistido en `localStorage` con key `alliance_benefit_disabled:{couponId}` (o `:free_delivery:{benefitId}`).

### 3. Respetar el toggle en el checkout
Archivo: `src/pages/customer/CustomerCheckout.tsx`

- Antes de auto-aplicar `autoCoupon`, leer el flag de localStorage. Si está desactivado, no aplicar y mostrar un banner discreto: "Tienes un descuento desactivado. Actívalo en el carrito."
- Igual para `allianceFreeDeliveryBenefit` (respetar disabled flag).
- Default = activo si no existe la key.

### 4. POS — Aviso al cajero
Archivos:
- `src/components/pos/CustomerSearchStep.tsx` (o donde se confirme la selección del cliente en `NewSale`).
- Nuevo hook `src/hooks/useCustomerAllianceBenefits.ts` que envuelva la misma RPC `get_customer_alliance_coupons` + `getPendingAllianceFreeDeliveryBenefit` y devuelva `{ coupons, freeDelivery, hasAny }`.

Comportamiento:
- Cuando el cajero selecciona un cliente, si `hasAny`, mostrar un **toast persistente** (`toast.info(..., { duration: 8000 })`) + un **badge "Beneficios disponibles"** visible junto al nombre del cliente en el resumen del POS.
- Botón en el badge abre un modal `POSCustomerBenefitsModal` listando cupones de alianza y beneficios de delivery, con switch para activar/desactivar cada uno para **esta venta**.

### 5. POS — Auto-aplicar el cupón sin tipeo del cajero
Archivo: `src/pages/NewSale.tsx` (o el contenedor de carrito del POS).

- Reutilizar `useAllianceAutoCoupon` con el cliente seleccionado, items del POS, subtotal y deliveryFee del POS.
- Si hay `autoCoupon` y no hay cupón aplicado manualmente, aplicarlo automáticamente vía el mismo `handleCouponApplied` existente (sin tipear código).
- Si el cajero (o cliente, según modal) desactivó el beneficio para esta venta, no auto-aplicar.
- Mostrar línea "Cupón alianza aplicado automáticamente: CODE — $X" en el resumen.

## Lo que NO cambia
- Validación de cupones (`validateCouponEligibility`), RPCs, schema, edge functions.
- Lógica de runas, subscripciones de descuento, free delivery por subscripción.
- Lógica del input manual `CustomerCouponInput` (sigue disponible).

## Archivos a editar/crear
- **Nuevo**: `src/components/customer/AllianceBenefitModal.tsx`
- **Nuevo**: `src/components/pos/POSCustomerBenefitsModal.tsx`
- **Nuevo**: `src/hooks/useCustomerAllianceBenefits.ts`
- **Editado**: `src/pages/customer/CustomerCart.tsx` (tarjeta + apertura modal)
- **Editado**: `src/pages/customer/CustomerCheckout.tsx` (respetar toggle, banner si está OFF)
- **Editado**: `src/components/pos/CustomerSearchStep.tsx` y/o `NewSale.tsx` (aviso + auto-aplicar + badge)

## QA
1. Cliente con alianza vigente entra al carrito → ve tarjeta "Descuento disponible".
2. Modal muestra detalles + switch ON por defecto.
3. Desactivar → checkout no aplica el cupón y muestra banner para reactivar.
4. Cajero carga ese cliente en POS → toast + badge "Beneficios disponibles"; cupón se aplica solo.
5. Cliente sin beneficios → no aparece nada (sin falsos positivos).
