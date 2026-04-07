
Objetivo: corregir que los combos de la categoría Smash&Fries vuelvan a mostrar y cobrar el precio correcto, calculado desde los productos/variantes de sus slots, no desde variantes propias del producto combo.

1. Diagnóstico confirmado
- El problema no viene de la limpieza de variantes en sí, sino de dos efectos colaterales:
  - En `src/components/pos/ProductGrid.tsx`, `getMinPrice()` para combos dinámicos cae a las variantes del producto combo. Como ya no existen variantes propias en combos, termina en `0`.
  - En la base de datos, varios slots de combos Smash&Fries siguen apuntando al mismo producto combo (`default_product_id = combo product`), por ejemplo: Big Pagana, Loki, Melt, Old School, Paltona y Smoke House. Como esos combos ya no tienen variantes propias, el cálculo dinámico también puede quedar en `0`.

2. Cambios a implementar
- Corregir el cálculo visual del precio en POS:
  - En `ProductGrid.tsx`, cuando un producto tenga `combo_products` en modo `dynamic`, calcular el “Desde” sumando el precio por defecto de cada slot:
    - usar `default_variant_id` si existe,
    - si no existe, tomar la variante por defecto o la primera válida del producto del slot,
    - sumar `base_price` del combo si aplica,
    - aplicar `combo_discount` si corresponde,
    - sumar extras solo si forman parte del precio base visible (normalmente no).
- Corregir el cálculo del total del combo:
  - Mantener la lógica de `ComboSelector.tsx`, pero agregar un resguardo para que si un slot quedó mal configurado y apunta al propio combo, no use ese producto como fuente de precio.
  - Mostrar advertencia/console clara si un combo tiene un slot autorreferenciado.
- Corregir la configuración de datos:
  - Crear una migración para re-apuntar los slots principales de Smash&Fries al producto base real de Smash y a su variante “Simple”.
  - Revisar todos los combos para detectar otros casos donde un slot apunte al mismo combo.
- Blindar la administración:
  - En `ComboManagement.tsx`, impedir guardar un slot cuyo `default_product_id` sea el mismo `product_id` del combo.
  - Si la categoría del slot corresponde a la hamburguesa base, favorecer productos de la categoría origen correcta y no el combo actual.

3. Auditoría que haré junto con el fix
- Revisar todos los combos activos para detectar:
  - slots autorreferenciados,
  - slots sin `default_product_id`,
  - slots con `default_variant_id` inválido para la categoría del slot,
  - combos dinámicos cuyo precio derivado quede en `0`.
- Aplicar la corrección al menos a los combos afectados de Smash&Fries:
  - Big Pagana
  - Loki
  - Melt
  - Old School
  - Paltona
  - Smoke House
- Verificar que Amerikana, Oklahoma y Cheese Burger ya estén bien enlazados.

4. Resultado esperado
- En Nueva Venta, las tarjetas de Smash&Fries dejarán de mostrar “Desde $0”.
- Al abrir un combo, el total inicial coincidirá con la suma de la hamburguesa base + acompañamiento según la configuración del combo.
- Los combos seguirán sin variantes propias, heredando correctamente las de sus productos componentes.
- No se podrá volver a dejar un combo configurado apuntándose a sí mismo.

5. Archivos y áreas involucradas
- `src/components/pos/ProductGrid.tsx`
- `src/components/pos/ComboSelector.tsx`
- `src/components/pos/ComboManagement.tsx`
- `supabase/migrations/...sql`

6. Detalle técnico
- Causa raíz:
  - antes, el POS usaba variantes propias del combo como fallback visual;
  - al eliminar esas variantes, el fallback quedó inválido;
  - además, algunos combos seguían enlazados a sí mismos en `combo_items`.
- Regla correcta:
  - combo dinámico = suma de precios de los slots configurados;
  - combo fijo = `base_price` del combo, con ajuste por variantes solo si `included_variants = false`.
- Validación importante:
  - el precio visible en la grilla y el precio real al personalizar deben salir de la misma fuente lógica para evitar nuevas diferencias.

7. Verificación después de implementar
- Comprobar en `/pos/nueva-venta` que Smash&Fries ya no muestre `$0`.
- Abrir cada combo afectado y validar total inicial.
- Probar cambio de proteína/tamaño y confirmar que el total responde correctamente.
- Confirmar que un combo no expone variantes propias del producto combo.
