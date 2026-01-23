

## Objetivo

Modificar la visualización del calendario de turnos en RRHH para que agrupe los turnos por **Jornada/Horario** (ej: "Jornada AM", "Jornada PM") en lugar de por tipo de turno de pago ("Turno Completo", "Medio Turno").

---

## Análisis del Problema

Actualmente:
- Los turnos (`hr_shifts`) se almacenan con `shift_type_id` que apunta a tipos de pago como "TURNO COMPLETO" o "MEDIO TURNO"
- **No existe** una columna `schedule_id` que vincule cada turno con su jornada/horario
- Cuando se generan turnos desde un horario, no se guarda esa referencia

---

## Plan de Implementación

### 1. Migración de Base de Datos

Agregar columna `schedule_id` a la tabla `hr_shifts`:

```text
┌─────────────────────────────────────────────────────────┐
│  hr_shifts                                              │
├─────────────────────────────────────────────────────────┤
│  + schedule_id (UUID, nullable, FK → hr_schedules.id)   │
│    SET NULL on delete                                   │
└─────────────────────────────────────────────────────────┘
```

- Columna nullable para no afectar turnos existentes
- FK con `ON DELETE SET NULL` para que si se elimina un horario, los turnos no se pierdan

### 2. Actualizar Tipos TypeScript

Modificar `src/types/hr.ts`:
- Agregar `schedule_id?: string | null` a `HRShift`
- Agregar `schedule?: HRSchedule` para datos relacionados
- Actualizar `HRShiftFormData` con `schedule_id`

### 3. Actualizar Generación de Turnos

Modificar `src/components/rrhh/GenerateShiftsModal.tsx`:
- Incluir `schedule_id` al generar turnos desde un horario

Modificar `src/hooks/useHRShifts.ts`:
- En `bulkCreateShifts`: pasar `schedule_id` en los inserts
- En `fetchShifts`: incluir join con `hr_schedules` en la consulta

### 4. Actualizar Calendario de Turnos

Modificar `src/components/rrhh/ShiftCalendar.tsx`:
- Cambiar agrupación de `shift_type_id` a `schedule_id`
- Mostrar nombre del horario (ej: "Jornada AM") como cabecera de grupo
- Los turnos sin `schedule_id` se agruparán bajo "Sin jornada asignada"

### 5. Actualizar Formulario de Turno Individual

El formulario de crear/editar turno manual (`ShiftFormModal`) deberá permitir seleccionar el horario/jornada además del tipo de turno.

---

## Resultado Visual Esperado

```text
┌─────────────────────────────────────┐
│ VIERNES 23                          │
├─────────────────────────────────────┤
│ JORNADA AM                          │
│ ────────────────────                │
│ 🍳 Cristóbal Sepúlveda              │
│ 💰 Felipe Sepúlveda                 │
├─────────────────────────────────────┤
│ JORNADA PM                          │
│ ────────────────────                │
│ 🍳 Diego Ulloa                      │
│ 💰 Ignacio Hernández                │
│ 📋 Joshua Herrera                   │
└─────────────────────────────────────┘
```

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `supabase/migrations/` | Nueva migración para agregar `schedule_id` |
| `src/types/hr.ts` | Agregar campos `schedule_id` y `schedule` |
| `src/hooks/useHRShifts.ts` | Join con schedules, soporte para `schedule_id` |
| `src/components/rrhh/GenerateShiftsModal.tsx` | Pasar `schedule_id` al generar |
| `src/components/rrhh/ShiftCalendar.tsx` | Agrupar por `schedule` en lugar de `shift_type` |
| `src/components/rrhh/ShiftFormModal.tsx` | Selector de jornada/horario |
| `src/integrations/supabase/types.ts` | Se regenera automáticamente |

---

## Consideraciones

- Los turnos existentes tendrán `schedule_id = null` y se mostrarán bajo "Sin jornada"
- Los turnos creados manualmente podrán seleccionar opcionalmente una jornada
- El `shift_type_id` sigue siendo necesario para el cálculo de pago en nómina

