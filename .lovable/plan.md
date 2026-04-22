
# Plan actualizado: configuración simple y flujo Proteína → Tamaño → Extras

## Objetivo

Simplificar completamente la configuración de hamburguesas con variante de proteína, manteniendo dimensiones independientes:

```text
Producto
├─ Proteína
│  ├─ Carne: +$0
│  └─ Pollo: +$200
├─ Tamaño
│  ├─ Simple: precio base
│  ├─ Doble: precio base
│  └─ Triple: precio base
└─ Extras
   ├─ Extra tocino
   ├─ Extra queso
   └─ etc.
```

El precio final será:

```text
precio final = precio base del tamaño + adicional de proteína + extras
```

No habrá combinaciones cruzadas ni duplicación de precios por Carne/Pollo.

---

## Flujo correcto en la aplicación de cliente

El orden de selección debe ser:

```text
1. Proteína
   Carne / Pollo +$200

2. Tamaño
   Simple / Doble / Triple

3. Extras
   Extras pagados y modificadores sin costo
```

Esto reemplaza cualquier flujo anterior donde el tamaño aparecía primero.

Ejemplo:

```text
Producto: Amerikana Smash&Fries

Paso 1: Proteína
- Carne +$0
- Pollo +$200

Paso 2: Tamaño
- Simple $9.490
- Doble $13.190
- Triple $15.490

Paso 3: Extras
- Extra tocino
- Extra queso
- etc.
```

Cálculo:

```text
Amerikana + Carne + Simple = $9.490
Amerikana + Pollo + Simple = $9.690
Amerikana + Carne + Doble = $13.190
Amerikana + Pollo + Doble = $13.390
```

---

## Cambios en configuración administrativa

### 1. Precios base por tamaño

En el editor de producto, el administrador configurará solo una fila por tamaño:

```text
Simple   $____
Doble    $____
Triple   $____
```

Estos precios base incluyen Carne por defecto.

### 2. Proteínas como adicionales

El grupo global Proteína quedará configurado así:

| Proteína | Adicional |
|---|---:|
| Carne | $0 |
| Pollo | +$200 |

Si en el futuro agregan otra proteína:

| Proteína | Adicional |
|---|---:|
| Veggie | +$500 |

no será necesario duplicar tamaños ni crear combinaciones.

### 3. Vista previa simple para el administrador

Agregaré una vista previa calculada, sin editar combinaciones:

```text
Simple + Carne = precio Simple
Simple + Pollo = precio Simple + 200
Doble + Carne = precio Doble
Doble + Pollo = precio Doble + 200
Triple + Carne = precio Triple
Triple + Pollo = precio Triple + 200
```

La vista previa es solo informativa; no creará filas adicionales.

---

## Cambios de datos

### 4. Normalizar grupo Proteína

Actualizaré el grupo Proteína para que:

```text
Carne = +$0
Pollo = +$200
```

### 5. Asignar Proteína a productos correspondientes

Asignaré el grupo Proteína a los productos hamburguesa que lo necesiten, incluyendo la Amerikana de la categoría **Smash&Fries**, que actualmente no muestra proteína porque no tiene el grupo asignado.

### 6. Revisar tamaños base en Smash&Fries

Validaré que los productos de Smash&Fries tengan tamaños base:

```text
Simple
Doble
Triple
```

Solo debe existir una fila por tamaño, no una fila por cada proteína.

Si falta un precio base real para algún producto/tamaño, lo dejaré marcado para revisión manual en vez de inventarlo.

---

## Cambios en app cliente

### 7. Reordenar personalización

Actualizaré el modal/flujo de personalización del cliente para que muestre:

```text
Proteína → Tamaño → Extras
```

Reglas:

- No permitir agregar al carrito hasta elegir proteína requerida.
- No permitir agregar al carrito hasta elegir tamaño requerido.
- Mostrar el recargo de Pollo claramente como `+$200`.
- Actualizar el total en vivo cuando cambie proteína, tamaño o extras.
- Mantener el estándar visual actual de listas verticales tipo app de delivery.

---

## Cambios en POS

### 8. Alinear POS con el mismo modelo de cálculo

El POS usará el mismo cálculo:

```text
precio base tamaño + delta proteína + extras
```

El POS puede mantener su layout operativo actual, pero internamente no debe resolver precios mediante combinaciones cruzadas.

Si corresponde al flujo de atención, también se ordenará como:

```text
Proteína → Tamaño → Extras
```

para mantener consistencia con la app cliente.

---

## Validación final

Validaré que:

1. En la app cliente, la selección aparezca en este orden:
   ```text
   Proteína → Tamaño → Extras
   ```

2. La Amerikana de Smash&Fries muestre:
   ```text
   Carne +$0
   Pollo +$200
   ```

3. El precio cambie solo por el delta de proteína:
   ```text
   Carne = precio base
   Pollo = precio base + 200
   ```

4. Los tamaños sigan siendo independientes:
   ```text
   Simple
   Doble
   Triple
   ```

5. No existan combinaciones cruzadas:
   ```text
   Simple + Carne
   Simple + Pollo
   Doble + Carne
   Doble + Pollo
   ```
   como filas de precio editables.

6. El sistema escale a 3+ proteínas sin duplicar precios:
   ```text
   Carne +$0
   Pollo +$200
   Veggie +$500
   ```

7. El administrador solo edite:
   - precio base por tamaño;
   - adicional por proteína;
   - extras/modificadores.

---

## Resultado esperado

La configuración quedará así:

```text
Producto: Hamburguesa

Proteínas:
- Carne: +$0
- Pollo: +$200

Tamaños:
- Simple: precio base
- Doble: precio base
- Triple: precio base

Extras:
- Se suman después
```

Y el cliente verá el flujo en este orden:

```text
1. Elige proteína
2. Elige tamaño
3. Elige extras
4. Agrega al carrito
```

Sin generador de combinaciones, sin tabla de combinaciones de precio y sin duplicación de filas por tamaño/proteína.
