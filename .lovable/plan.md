

# Mostrar TODOS los productos en el menu del cliente (sin ocultar ninguno)

## Problema detectado

El hook `useCustomerMenuProducts.ts` tiene **dos filtros** que ocultan productos:

1. **Linea 137**: Filtra productos sin categoria visible --> oculta "Porciones Telelon" (0 categorias visibles)
2. **Linea 139**: Filtra productos donde `getProductMinPrice()` retorna `null` --> oculta **Promo Summer 2X** y **Promo Thor** porque no tienen variantes ni precios legacy configurados

Productos afectados actualmente:
- **Promo Summer 2X** - tiene categoria visible pero 0 variantes y precios vacios
- **Promo Thor** - tiene categoria visible pero 0 variantes y precios vacios
- **Porciones Telelon** - sin categoria visible (problema aparte)

## Solucion

### Archivo: `src/hooks/useCustomerMenuProducts.ts`

1. **Eliminar el filtro de precio** (linea 139) - ya no se excluiran productos sin precio
2. **Mantener el filtro de categoria visible** (linea 137) - un producto sin categoria no puede mostrarse en ninguna seccion

### Archivo: `src/pages/customer/CustomerMenu.tsx`

3. **Ajustar el formato de precio** - Cuando `getProductMinPrice()` retorne `null`, mostrar un texto alternativo como "Ver opciones" en vez de "Consultar", para que el cliente entienda que debe abrir el producto
4. **Ajustar el ordenamiento** - Los productos sin precio se colocaran al final de cada categoria (despues de los que si tienen precio)

## Detalles tecnicos

```text
Antes (hook):
  .filter(product => product.categories.length > 0)  // mantener
  .filter(product => getProductMinPrice(product) !== null)  // ELIMINAR

Despues (hook):
  .filter(product => product.categories.length > 0)  // solo este filtro

Ordenamiento dentro de categorias:
  sort((a, b) => {
    const priceA = getProductMinPrice(a);
    const priceB = getProductMinPrice(b);
    if (priceA === null && priceB === null) return 0;
    if (priceA === null) return 1;  // sin precio al final
    if (priceB === null) return -1;
    return priceA - priceB;  // menor a mayor
  })
```

Esto garantiza que **ningun producto activo y visible en app** quede oculto, independientemente de si tiene precio configurado o no.

