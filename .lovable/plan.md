

## Asignacion Masiva de Turnos a Empleados

### Problema actual
Actualmente, para asignar turnos recurrentes a un empleado (ej: "Cristobal trabaja de lunes a viernes en Cocina"), hay que crear cada turno uno por uno o usar "Generar desde Horario" que crea turnos **sin empleado asignado** y luego asignarlos manualmente.

### Solucion propuesta
Crear un nuevo modal **"Asignacion Masiva"** accesible desde la pagina de Turnos, que permita definir reglas de asignacion por empleado y generar todos los turnos en un rango de fechas.

### Flujo del usuario

1. El usuario hace clic en un boton "Asignacion Masiva" en la barra de herramientas de Turnos
2. Se abre un modal con:
   - **Rango de fechas** (fecha inicio / fecha fin)
   - **Lista de reglas de asignacion** donde cada regla tiene:
     - Empleado (select)
     - Rol (select: Cocina, Caja, etc.)
     - Tipo de turno (select: Turno Completo, etc.)
     - Jornada (select: Jornada AM, PM, etc.)
     - Dias de la semana (checkboxes: L M X J V S D)
   - Boton "+ Agregar regla" para agregar mas empleados
3. **Vista previa** muestra cuantos turnos se generaran en total, desglosado por empleado
4. Al confirmar, se crean todos los turnos en estado "draft" con el empleado ya asignado

### Ejemplo del usuario
- Regla 1: Cristobal Sepulveda / Cocina / Turno Completo / Jornada PM / L-M-X-J-V
- Regla 2: Ignacio Hernandez / Caja / Turno Completo / Jornada PM / L-X-V (dia por medio)
- Rango: 31 marzo - 13 abril (2 semanas)
- Resultado: Cristobal obtiene 10 turnos, Ignacio obtiene 6 turnos = 16 turnos totales

### Detalles tecnicos

**Nuevo componente:** `src/components/rrhh/BulkAssignShiftsModal.tsx`
- Reutiliza los mismos datos de `activeEmployees`, `activeRoles`, `activeShiftTypes`, `activeSchedules`
- Usa `eachDayOfInterval` y `getDay` de date-fns para calcular que dias coinciden con los checkboxes seleccionados
- La vista previa se calcula en un `useMemo` reactivo
- Al confirmar, llama a `bulkCreateShifts` del hook existente `useHRShifts`, pero ahora cada turno incluye `employee_id`

**Modificacion en:** `src/pages/rrhh/RRHHTurnos.tsx`
- Agregar boton "Asignacion Masiva" junto a "Generar desde Horario" y "Nuevo Turno"
- Importar y renderizar el nuevo modal
- Pasar las mismas props (employees, roles, shiftTypes, schedules, bulkCreateShifts)

**Sin cambios en base de datos** - Se reutiliza `bulkCreateShifts` que ya soporta `employee_id` en cada turno.

