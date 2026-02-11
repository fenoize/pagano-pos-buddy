
# Plan: Mostrar cantidad de Runas en vez de monto en pesos

## Problema

Cuando un pedido se paga con Runas, en la app del cliente se muestra el equivalente en dinero (ej: "$24.600") en lugar de la cantidad de runas utilizadas (ej: "41 Runas"). Esto confunde al cliente porque parece un descuento monetario, no un canje de runas.

**Causa raiz:** El campo `payment_runas` en la base de datos almacena el valor monetario equivalente (ej: 24600), no la cantidad de runas (ej: 41). Todos los componentes muestran ese valor directamente como dinero.

## Solucion

Calcular la cantidad real de runas a partir del valor monetario usando la configuracion del sistema: `cantidad_runas = payment_runas / runa_reward_value` (actualmente $600 por runa).

## Archivos a modificar

### 1. CustomerOrderCard.tsx (tarjeta de pedido en "Mis Pedidos")
- **Linea 113**: Cuando `payment_method === 'runas'`, mostrar "Pagado con X Runas" en vez de `formatCLP(order.total)`
- **Linea 195**: Calcular la cantidad real de runas: `Math.ceil(payment_runas / runaRedemptionValue)` en vez de mostrar `payment_runas` directamente

### 2. CustomerOrderSuccess.tsx (pantalla de exito post-compra)
- **Linea ~113**: Donde muestra "Total pagado", si es runas, mostrar "X Runas" en vez del monto en pesos
- **Linea ~120-125**: Corregir el calculo de runas utilizadas (actualmente usa una formula incorrecta con valores hardcodeados)
- **Linea ~128**: "Runas restantes" ya usa `cantidad_runas` del cliente, esta bien

### 3. CustomerOrderTracking.tsx (seguimiento de pedido)
- **Linea 416-419**: En el total del pedido, si es pago con runas, mostrar "X Runas" en vez del precio en pesos

### 4. RunasPaymentSection.tsx (seccion de pago en checkout)
- Ya muestra runas correctamente, no requiere cambios

## Seccion tecnica

### Logica de conversion

```text
runa_reward_value = 600 (desde config)
runas_count = Math.ceil(payment_runas / runa_reward_value)

Ejemplo: payment_runas = 24600 -> 24600 / 600 = 41 runas
```

### Patron de implementacion

Cada componente que muestre montos de pedidos con runas usara el hook `useRunasConfig()` para obtener `runaRedemptionValue` y calcular la cantidad:

```text
const { runaRedemptionValue } = useRunasConfig();
const runasCount = Math.ceil(order.payment_runas / runaRedemptionValue);
// Mostrar: "41 Runas" en vez de "$24.600"
```

### Formato de visualizacion

- **Total del pedido (runas):** "41 Runas" con icono de moneda, en color primario
- **Detalle expandido:** "Pagaste con 41 Runas"
- **Pantalla de exito:** "41 Runas utilizadas" + saldo restante

### Compatibilidad con datos existentes

Los pedidos antiguos almacenan el monto monetario en `payment_runas`. La conversion `payment_runas / runa_reward_value` funciona para todos los registros existentes. Si el valor de configuracion cambia en el futuro, los pedidos antiguos mostraran un calculo ligeramente distinto, pero esto es aceptable.
