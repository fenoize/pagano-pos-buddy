

## Plan: Asignar/cambiar turno de un pedido

### Problema
Cuando un pedido se crea sin turno abierto (tras elegir "Continuar" en la alerta), queda con `cash_session_id = null` y no aparece en ningún resumen de turno. No hay forma de asignarlo después.

### Cambios

#### 1. OrderEditModal.tsx — Sección de asignación de turno
- En la vista de detalle del pedido (no solo en modo edición), mostrar una sección que indique:
  - Si el pedido tiene turno asignado: mostrar fecha/hora del turno y un botón "Cambiar turno".
  - Si no tiene turno: mostrar alerta "Sin turno asignado" con botón "Asignar a turno".
- Al hacer clic, abrir un selector con:
  - **Turno activo actual** (si existe) como opción principal.
  - Lista de turnos recientes (últimos 7 días, abiertos o cerrados) para reasignar.
- Al seleccionar, hacer `UPDATE orders SET cash_session_id = X WHERE id = Y` directamente vía Supabase client.
- Refrescar la orden después del cambio.

#### 2. Permisos
- Solo usuarios con permiso `cash_sessions.manage_all` o Administrador podrán cambiar/asignar turno. Los demás solo verán la info pero no podrán modificar.

### Archivos involucrados
- `src/components/sales/OrderEditModal.tsx` — agregar sección de turno con selector y lógica de update.

### Resultado
- Pedidos sin turno podrán asignarse al turno activo o a un turno reciente.
- Pedidos con turno podrán reasignarse a otro turno.
- Los totales del turno se actualizarán automáticamente al recargarse.

