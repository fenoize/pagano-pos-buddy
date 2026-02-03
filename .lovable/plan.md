

## Plan: Escala de Colores por Respuesta del Empleado en Gestión de Turnos

### Contexto

Actualmente los turnos en el calendario de gestión usan colores basados en el estado administrativo (`status`: draft, confirmed, approved, paid). El usuario necesita una escala visual basada en la **respuesta del empleado** (`employee_response`) para identificar rápidamente:

- Quién ha aceptado su turno
- Quién aún no ha respondido
- Qué turnos ya fueron realizados (aprobados)

### Nueva Escala de Colores

| Estado | Color | Significado |
|--------|-------|-------------|
| `employee_response = null/pending` | **Amarillo** | Programado, pendiente de aceptación |
| `employee_response = accepted` | **Verde** | Turno aceptado por el empleado |
| `status = approved` | **Gris** | Turno aprobado (ya se realizó) |
| `employee_response = rejected` | **Rojo** (adicional) | Turno rechazado por el empleado |

### Lógica de Prioridad

El color se determinará con la siguiente prioridad:
1. Si `status === 'approved'` → **Gris** (turno realizado, sin importar respuesta)
2. Si `employee_response === 'rejected'` → **Rojo** (rechazado)
3. Si `employee_response === 'accepted'` → **Verde** (aceptado)
4. Cualquier otro caso → **Amarillo** (pendiente)

### Cambios a Realizar

#### 1. Modificar ShiftCalendar.tsx

Actualizar los estilos de color para reflejar la nueva escala basada en `employee_response`:

```typescript
// Nueva función para determinar el color del turno
const getShiftColors = (shift: HRShift) => {
  // Prioridad 1: Turno aprobado (ya realizado)
  if (shift.status === 'approved' || shift.status === 'paid') {
    return {
      border: 'border-l-gray-400',
      bg: 'bg-gray-100 dark:bg-gray-800/40',
    };
  }
  
  // Prioridad 2: Rechazado por empleado
  if (shift.employee_response === 'rejected') {
    return {
      border: 'border-l-red-500',
      bg: 'bg-red-50 dark:bg-red-950/30',
    };
  }
  
  // Prioridad 3: Aceptado por empleado
  if (shift.employee_response === 'accepted') {
    return {
      border: 'border-l-green-500',
      bg: 'bg-green-50 dark:bg-green-950/30',
    };
  }
  
  // Default: Pendiente (amarillo)
  return {
    border: 'border-l-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
  };
};
```

#### 2. Modificar ShiftListView.tsx

Aplicar la misma lógica de colores en la vista de lista, mostrando un indicador visual del estado de respuesta junto al badge de estado administrativo.

#### 3. Agregar Leyenda Visual (Opcional)

Añadir una pequeña leyenda en la cabecera del calendario para que el usuario entienda el código de colores:

```text
● Pendiente  ● Aceptado  ● Aprobado  ● Rechazado
  (amarillo)   (verde)     (gris)      (rojo)
```

### Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/rrhh/ShiftCalendar.tsx` | Nueva lógica de colores por `employee_response` |
| `src/components/rrhh/ShiftListView.tsx` | Consistencia visual en vista lista |
| `src/pages/rrhh/RRHHTurnos.tsx` | Leyenda opcional de colores |

### Resultado Visual Esperado

En el calendario:
- Los turnos **amarillos** son los que necesitan atención (el empleado no ha respondido)
- Los turnos **verdes** están confirmados por el empleado
- Los turnos **grises** ya se realizaron
- Los turnos **rojos** fueron rechazados y necesitan reasignación

Esto permitirá al administrador identificar rápidamente qué acciones tomar.

