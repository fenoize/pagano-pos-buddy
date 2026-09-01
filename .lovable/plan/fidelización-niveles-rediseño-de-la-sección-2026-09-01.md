# Fidelización > Niveles — Rediseño de la sección

La sección ya existe en `/pos/fidelizacion/niveles` (componente `NivelesContent`) con una tabla básica y un modal de crear/editar. El trabajo consiste en llevarla al nivel descrito: conteo de clientes, equivalencia en pesos, selector visual de íconos/colores, validaciones y panel de detalle.

## Vista principal — Tabla de niveles

Columnas (ordenadas por `level_order`):

- Orden
- Ícono (Lucide dinámico, en el color configurado) + Nombre + código en pequeño
- Rango de puntos: `min – max` ("∞" si `max_points` es null)
- Equivale a: `min_points * 100 – max_points * 100` formateado en CLP (ej. "$50.000 – $149.999")
- Clientes: cantidad de clientes en ese nivel
- Beneficios: chips con cada beneficio (máx. 3 visibles + "+N")
- Estado: switch activo/inactivo que guarda al instante
- Acciones: Editar / Eliminar

Botón "+ Agregar nivel" arriba a la derecha. En móvil, la tabla se reemplaza por tarjetas con la misma información.

## Modal de creación / edición

Campos: Nombre, Código (minúsculas y guión bajo, autogenerado desde el nombre si está vacío), Orden (autosugerido), Puntos mínimos, Puntos máximos con checkbox "Último nivel (sin límite)", Costo en puntos (`points_cost`, input numérico simple, sin uso en cálculos ni validaciones — se mantiene solo por compatibilidad futura), Ícono (grilla de íconos con preview: Flame, Shield, Sword, Swords, Star, Zap, Crown, Trophy, Award, Skull, Medal, Target), Color (swatches: gris, verde, azul, índigo, violeta, naranja, ámbar, rojo, amarillo), Descripción, Beneficios (lista editable con agregar/eliminar), Activo.

Vista previa del ícono con su color arriba del formulario.

La progresión de nivel se determina exclusivamente por `min_points` y `max_points`; `points_cost` no participa de ninguna lógica.

## Validaciones

- `level_code` único (chequeo local + manejo del error de la base de datos)
- `min_points` mayor que el `max_points` del nivel anterior
- `max_points` mayor que `min_points`, o nulo
- No se permite eliminar un nivel con clientes: toast "No se puede eliminar un nivel con X clientes activos. Primero reasigna los clientes." El botón Eliminar queda deshabilitado con tooltip cuando hay clientes.

## Panel de detalle

Al hacer clic en una fila se abre un panel lateral (Sheet) con:

- Resumen del nivel (rango, equivalencia en pesos, beneficios)
- Últimos 10 clientes que alcanzaron el nivel
- Gráfico de barras con la distribución de puntos dentro del rango (recharts)

## Notas técnicas

- Nuevo hook `src/hooks/useCustomerLevels.ts` (react-query): carga `customer_level_definitions` ordenada, y en paralelo el conteo de clientes por `level_code` desde la vista `customer_levels`; expone mutaciones de crear, actualizar, alternar activo y eliminar, con invalidación de caché.
- Nuevo `src/components/fidelizacion/LevelIcon.tsx` con el mapa de íconos Lucide y fallback a `Award`.
- Nuevo `src/components/fidelizacion/LevelFormModal.tsx` (formulario + validaciones) y `src/components/fidelizacion/LevelDetailSheet.tsx` (panel lateral).
- `NivelesContent.tsx` se reescribe para usar estas piezas; conserva la ruta y el guard de rol Administrador actuales.
- Equivalencia en pesos con `formatCLP` de `src/lib/utils.ts`.
- Sin cambios de base de datos: se lee y escribe con el cliente Supabase existente.
- `src/pages/NivelesManagement.tsx` es una página duplicada y desactualizada de la misma sección; se elimina si ninguna ruta la usa, o se convierte en un envoltorio de `NivelesContent`.
