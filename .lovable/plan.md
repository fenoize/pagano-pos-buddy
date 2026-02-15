

## Buscador de Productos Mejorado - Nueva Venta

### Problema actual
El buscador solo filtra por el nombre del producto. Si buscas "Coca Cola", no encuentra el producto "Lata" aunque tenga esa variante configurada.

### Solucion

**1. Busqueda por variantes**

Modificar la logica de filtrado en `src/components/pos/ProductGrid.tsx` (linea 372-392) para que ademas del nombre del producto, busque dentro de los nombres de las variantes asociadas (`productVariants`).

La logica sera:
- Buscar en `product.name`
- Buscar en los nombres de las variantes del producto (`productVariants[product.id]`)
- Si alguna coincide, el producto aparece en los resultados
- Cuando el match es por variante (no por nombre), mostrar un indicador visual (badge) debajo del producto indicando que variante coincidio (ej: "Coca Cola" destacado)

**2. Mejoras de UX/UI del buscador**

- **Resultados instantaneos (1 caracter minimo en vez de 2)**: Reducir el umbral de busqueda de 2 a 1 caracter para respuesta mas rapida.
- **Highlight de coincidencia por variante**: Cuando un producto aparece porque una variante coincide, mostrar un badge o texto debajo indicando "Variante: Coca Cola" para que el cajero entienda por que aparece ese resultado.
- **Icono X mas limpio**: Reemplazar el caracter "X" por el icono `X` de lucide-react que ya esta importado en el proyecto.
- **Autofocus**: Al cargar la pagina, enfocar automaticamente el buscador para agilizar la operacion del cajero.
- **Contador de resultados mejorado**: Indicar si los resultados incluyen coincidencias por variante.

### Detalles tecnicos

**Archivo**: `src/components/pos/ProductGrid.tsx`

**Cambios en el filtrado** (linea ~372):
```typescript
const filteredProducts = useMemo(() => {
  let filtered = products;

  if (searchTerm.trim().length >= 1) {
    const searchLower = searchTerm.toLowerCase().trim();
    filtered = filtered.filter(product => {
      // Match por nombre de producto
      if (product.name.toLowerCase().includes(searchLower)) return true;
      // Match por nombre de variante
      const variants = productVariants[product.id!] || [];
      return variants.some(v => 
        v.variant_value?.toLowerCase().includes(searchLower) ||
        v.variant?.name?.toLowerCase().includes(searchLower)
      );
    });
  }

  if (searchTerm.trim().length < 1 && activeCategory !== 'all') {
    filtered = filtered.filter(p => 
      p.categories?.some(cat => cat.id === activeCategory)
    );
  }

  return filtered;
}, [products, searchTerm, activeCategory, productVariants]);
```

**Funcion helper para obtener variantes que coinciden** (nueva):
```typescript
const getMatchingVariants = (product: Product): string[] => {
  if (searchTerm.trim().length < 1) return [];
  const searchLower = searchTerm.toLowerCase().trim();
  if (product.name.toLowerCase().includes(searchLower)) return [];
  const variants = productVariants[product.id!] || [];
  return variants
    .filter(v => v.variant_value?.toLowerCase().includes(searchLower))
    .map(v => v.variant_value);
};
```

**UI del producto en resultados** - agregar debajo del nombre del producto:
```tsx
{getMatchingVariants(product).length > 0 && (
  <div className="flex flex-wrap gap-1">
    {getMatchingVariants(product).map((name, i) => (
      <Badge key={i} variant="outline" className="text-xs bg-primary/10">
        Variante: {name}
      </Badge>
    ))}
  </div>
)}
```

**Icono X**: Reemplazar el boton con texto "X" por el componente `X` de lucide-react (ya importado en otros archivos).

**Autofocus**: Agregar `autoFocus` al Input de busqueda, pero solo en desktop (verificar con `useIsMobile()`), para no molestar en movil donde el teclado virtual ocupa espacio.

