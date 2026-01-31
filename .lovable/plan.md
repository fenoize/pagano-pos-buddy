# Plan: Calendario de Turnos para Empleados + Notificaciones

## ✅ COMPLETADO

### Resumen de lo Implementado

1. **Base de Datos (Migración)**
   - ✅ Añadido `employee_response` (pending/accepted/rejected) a `hr_shifts`
   - ✅ Añadido `employee_response_at` (timestamp)
   - ✅ Añadido `employee_response_note` (texto para motivo de rechazo)

2. **Tipos TypeScript**
   - ✅ `src/types/hr.ts` - Añadido `HREmployeeResponse` y campos en `HRShift`
   - ✅ `src/types/staffNotifications.ts` - Nuevos tipos: `shift_assigned`, `shift_accepted`, `shift_rejected`

3. **Hook para Empleados**
   - ✅ `src/hooks/useMyShifts.ts` - Hook completo con:
     - Detección de empleado vinculado al usuario
     - Carga de turnos propios con compañeros de trabajo
     - Funciones: acceptShift, rejectShift, bulkAccept, bulkReject
     - Navegación por meses

4. **Notificaciones**
   - ✅ `src/lib/staffNotificationTriggers.ts` - Nuevas funciones:
     - `triggerShiftAssignedNotification` (para empleados)
     - `triggerShiftAcceptedNotification` (para admins)
     - `triggerShiftRejectedNotification` (para admins)
   - ✅ `src/components/notifications/StaffNotificationItem.tsx` - Iconos para nuevos tipos
   - ✅ `supabase/functions/send-staff-push/index.ts` - URLs de click actualizadas

5. **Página Mi Calendario**
   - ✅ `src/pages/MiCalendario.tsx` - Página completa con:
     - Calendario mensual con turnos del empleado
     - Vista de compañeros de trabajo por turno
     - Badges de estado (Pendiente/Aceptado/Rechazado)
     - Selección múltiple + acciones masivas
     - Botones de aceptar/rechazar individual
   - ✅ `src/components/rrhh/ShiftResponseModal.tsx` - Modal para rechazar con nota

6. **Navegación y Rutas**
   - ✅ `src/components/AppSidebar.tsx` - "Mi Calendario" visible para todos los roles
   - ✅ `src/App.tsx` - Ruta `/pos/mi-calendario` añadida

## Flujo de Usuario

### Empleado
1. Login en POS
2. Ve "Mi Calendario" en sidebar (debajo de Configuración)
3. Entra y ve calendario con sus turnos
4. Puede navegar por meses
5. Selecciona turno(s) pendientes (checkbox)
6. Acepta o rechaza (con nota opcional en rechazo)
7. Turno cambia a "Aceptado" o "Rechazado"
8. Administradores reciben notificación push

### Administrador
1. Crea/genera turnos desde RRHH > Turnos
2. Empleado ve el turno en "Mi Calendario"
3. Empleado acepta/rechaza
4. Admin recibe notificación en campana y push
5. En RRHH > Turnos puede ver estado de respuesta

## Pendiente (Mejoras Futuras)
- [ ] Trigger automático de notificación al asignar empleado a turno (en useHRShifts)
- [ ] Mostrar badge de respuesta del empleado en la vista de RRHH > Turnos
- [ ] Filtros por estado de respuesta en RRHH
