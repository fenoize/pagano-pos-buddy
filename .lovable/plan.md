
# Plan: Calendario de Turnos para Empleados + Notificaciones

## Resumen Ejecutivo
Implementar un módulo de "Mi Calendario" donde cada usuario del sistema (vinculado como empleado HR) pueda:
1. Ver sus turnos asignados en un calendario
2. Ver con quiénes trabajará en cada jornada
3. Aceptar o rechazar turnos (individual o masivamente)
4. Recibir notificaciones push cuando se les asigne un turno
5. Los administradores recibirán notificaciones cuando un empleado acepte o rechace

## Contexto Actual

### Modelo de Datos
- `hr_employees` tiene `user_id` que vincula empleados con usuarios del sistema
- `hr_shifts` tiene:
  - `employee_id` (FK a hr_employees)
  - `status`: draft | confirmed | approved | paid
  - `shift_date`, `shift_type_id`, `role_id`, `schedule_id`
- Los turnos actualmente pasan: draft -> confirmed -> approved -> paid (flujo admin)

### Relaciones
- Usuario del sistema (`users.id`) -> `hr_employees.user_id` -> `hr_shifts.employee_id`
- Ejemplo: Matias (user_id: 3af48824) -> hr_employee (id: d7094d61) -> puede tener turnos asignados

### Sistema de Notificaciones Staff
- Ya existe `staff_notifications` con tipos: cash_session_open/close, cash_movement, order_assigned/delivered
- Edge function `send-staff-push` envía push via OneSignal usando `staff_${user_id}`
- Hook `useStaffNotifications` con polling cada 4s

## Cambios Propuestos

### 1. Base de Datos

#### 1.1 Nuevos Estados para Turnos (o campo separado)
Añadir campo `employee_response` a `hr_shifts` para manejar la respuesta del empleado:

```sql
ALTER TABLE hr_shifts 
ADD COLUMN employee_response TEXT CHECK (employee_response IN ('pending', 'accepted', 'rejected'));

ALTER TABLE hr_shifts
ADD COLUMN employee_response_at TIMESTAMPTZ;

ALTER TABLE hr_shifts
ADD COLUMN employee_response_note TEXT;

-- Default para registros existentes
UPDATE hr_shifts SET employee_response = 'pending' WHERE employee_response IS NULL;
```

Esto permite:
- Separar el flujo de confirmación/aprobación del admin del flujo de aceptación del empleado
- Un turno puede estar "confirmed" (por admin) pero "pending" (esperando respuesta del empleado)

#### 1.2 Nuevos Tipos de Notificación Staff
Agregar tipos en `staff_notifications`:

```sql
-- En el tipo ya existente o como extensión (solo validación frontend)
-- shift_assigned: cuando asignan un turno al empleado
-- shift_accepted: cuando el empleado acepta (para admins)
-- shift_rejected: cuando el empleado rechaza (para admins)
```

### 2. Frontend: Nueva Página "Mi Calendario"

#### 2.1 Ruta y Navegación
- Nueva ruta: `/pos/mi-calendario`
- Agregar al menú lateral para TODOS los roles (no solo admin)
- Icono: Calendar

#### 2.2 Página: `src/pages/MiCalendario.tsx`
Componente principal que:
- Detecta el usuario actual y busca su `hr_employee` vinculado
- Si no está vinculado, muestra mensaje "No tienes turnos asignados"
- Si está vinculado, muestra calendario con SUS turnos

Vista:
- Calendario mensual/semanal similar al de RRHH pero solo con turnos propios
- Badge con estado de aceptación (Pendiente/Aceptado/Rechazado)
- Checkbox para seleccionar turnos
- Botones "Aceptar Seleccionados" y "Rechazar Seleccionados"

Información extra por día:
- Lista de compañeros que trabajan ese día (mismo schedule/jornada)
- Horario de la jornada

#### 2.3 Componente: `src/components/rrhh/EmployeeShiftCalendar.tsx`
Reutiliza la visualización de `ShiftCalendar` pero:
- Filtrado solo para el empleado actual
- Añade información de compañeros de trabajo
- Permite acciones de aceptar/rechazar

#### 2.4 Hook: `src/hooks/useMyShifts.ts`
Hook específico para el empleado:
```typescript
function useMyShifts() {
  // 1. Obtener user actual desde AuthContext
  // 2. Buscar hr_employee con ese user_id
  // 3. Cargar turnos donde employee_id = ese hr_employee.id
  // 4. Funciones: acceptShift, rejectShift, bulkAccept, bulkReject
}
```

### 3. Notificaciones

#### 3.1 Tipos de Notificación (Frontend)
Actualizar `src/types/staffNotifications.ts`:
```typescript
export type StaffNotificationType = 
  | 'cash_session_open'
  | 'cash_session_close'
  | 'cash_movement'
  | 'order_assigned'
  | 'order_delivered'
  | 'shift_assigned'    // Nuevo: turno asignado al empleado
  | 'shift_accepted'    // Nuevo: empleado aceptó (para admin)
  | 'shift_rejected';   // Nuevo: empleado rechazó (para admin)
```

#### 3.2 Triggers de Notificación
Actualizar `src/lib/staffNotificationTriggers.ts`:
```typescript
// Notificar al empleado cuando se le asigna un turno
async function triggerShiftAssignedNotification(
  actorUserId: string,      // Admin que asigna
  employeeUserId: string,   // Usuario del empleado
  shiftDate: string,
  scheduleName: string,
  shiftId: string
)

// Notificar a admins cuando empleado acepta
async function triggerShiftAcceptedNotification(
  actorUserId: string,      // Empleado que acepta
  employeeName: string,
  shiftDate: string,
  shiftId: string
)

// Notificar a admins cuando empleado rechaza
async function triggerShiftRejectedNotification(
  actorUserId: string,      // Empleado que rechaza
  employeeName: string,
  shiftDate: string,
  rejectReason: string | null,
  shiftId: string
)
```

#### 3.3 Integración en Hooks
- En `useHRShifts.ts`:
  - Al crear turno con employee_id -> trigger `shift_assigned`
  - Al asignar empleado a turno existente -> trigger `shift_assigned`

- En `useMyShifts.ts`:
  - Al aceptar turno -> trigger `shift_accepted`
  - Al rechazar turno -> trigger `shift_rejected`

#### 3.4 Edge Function Update
Actualizar `send-staff-push` para manejar los nuevos tipos y generar URLs correctas:
```typescript
// En send-staff-push/index.ts
if (body.type === 'shift_assigned') {
  clickUrl = `${baseUrl}/pos/mi-calendario`;
} else if (body.type === 'shift_accepted' || body.type === 'shift_rejected') {
  clickUrl = `${baseUrl}/pos/rrhh/turnos`;
}
```

### 4. Actualización del Sidebar
En `src/components/AppSidebar.tsx`, agregar item de menú accesible para todos los empleados:
```typescript
// Nuevo item fuera de los menús admin-only
{ 
  title: "Mi Calendario", 
  url: "/pos/mi-calendario", 
  icon: Calendar, 
  roles: ['Administrador', 'Cajero', 'Cocinero', 'Preparador', 'Reparto', 'Caja', 'Cocina'] 
}
```

### 5. Rutas en App.tsx
Agregar nueva ruta protegida:
```tsx
<Route path="/pos/mi-calendario" element={
  <StaffProtectedRoute>
    <StaffLayout>
      <MiCalendario />
    </StaffLayout>
  </StaffProtectedRoute>
} />
```

## Flujo de Usuario

### Empleado
1. Login en POS
2. Ve "Mi Calendario" en sidebar
3. Entra y ve calendario con sus turnos
4. Puede filtrar por semana/mes
5. Selecciona turno(s) pendientes
6. Acepta o rechaza (con nota opcional en rechazo)
7. Turno cambia a "Aceptado" o "Rechazado"

### Administrador
1. Crea/genera turnos desde RRHH > Turnos
2. Al asignar empleado, automáticamente se envía notificación push al empleado
3. Empleado acepta/rechaza
4. Admin recibe notificación en su campana
5. En vista de RRHH > Turnos puede ver estado de respuesta del empleado

## Archivos a Crear/Modificar

### Nuevos Archivos
- `src/pages/MiCalendario.tsx`
- `src/components/rrhh/EmployeeShiftCalendar.tsx`
- `src/components/rrhh/ShiftResponseModal.tsx` (modal para rechazar con nota)
- `src/hooks/useMyShifts.ts`

### Archivos a Modificar
- `src/types/hr.ts` - Agregar campos de respuesta
- `src/types/staffNotifications.ts` - Nuevos tipos
- `src/lib/staffNotificationTriggers.ts` - Nuevas funciones trigger
- `src/hooks/useHRShifts.ts` - Trigger notificación al asignar
- `src/components/AppSidebar.tsx` - Nuevo item de menú
- `src/App.tsx` - Nueva ruta
- `supabase/functions/send-staff-push/index.ts` - Nuevos tipos de click URL
- Migración SQL para nuevos campos

## Secuencia de Implementación

1. **Migración BD**: Agregar campos `employee_response`, `employee_response_at`, `employee_response_note`
2. **Tipos**: Actualizar tipos TypeScript (hr.ts, staffNotifications.ts)
3. **Hook useMyShifts**: Crear hook para empleados
4. **Triggers**: Agregar funciones de notificación para turnos
5. **Página MiCalendario**: Crear página y componentes
6. **Sidebar + Rutas**: Agregar navegación
7. **Edge Function**: Actualizar URLs de click
8. **Integración**: Conectar triggers en useHRShifts

## Consideraciones Técnicas

### Permisos RLS
- Los empleados solo deben poder:
  - VER turnos donde ellos son el `employee_id`
  - ACTUALIZAR solo `employee_response`, `employee_response_at`, `employee_response_note`
- Admins pueden ver/editar todo

### Compatibilidad
- Los turnos existentes tendrán `employee_response = 'pending'` por defecto
- El flujo actual de draft -> confirmed -> approved no cambia
- La respuesta del empleado es un campo paralelo, no reemplaza el status

### Performance
- Usar polling (ya implementado) para recibir notificaciones
- El calendario de empleado filtra solo sus turnos (menos data)
