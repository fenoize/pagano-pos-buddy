

## Objetivo

Permitir seleccionar **múltiples jornadas/horarios** en el modal "Generar desde Horario" para crear turnos de varias jornadas simultáneamente en un solo paso.

---

## Problema Actual

El modal `GenerateShiftsModal` solo permite seleccionar **una jornada a la vez**:

```text
┌──────────────────────────────────────┐
│  Generar Turnos desde Horario        │
├──────────────────────────────────────┤
│  Horario / Plantilla                 │
│  [Dropdown: Jornada AM ▼]  ← Solo 1  │
│                                      │
│  Fecha inicio: [_________]           │
│  Fecha fin:    [_________]           │
└──────────────────────────────────────┘
```

Esto obliga al usuario a generar turnos de cada jornada por separado, lo cual es:
- Tedioso (abrir modal múltiples veces)
- Propenso a errores (olvidar generar una jornada)

---

## Solución Propuesta

Reemplazar el `Select` simple por un sistema de **selección múltiple** con checkboxes:

```text
┌──────────────────────────────────────┐
│  Generar Turnos desde Horario        │
├──────────────────────────────────────┤
│  Horarios / Jornadas                 │
│  ┌────────────────────────────────┐  │
│  │ ☑ Jornada AM (11:00-17:30)     │  │
│  │   L M X J V S D                │  │
│  │   ○ ○ ○ ○ ● ● ○   2 pos/día    │  │
│  ├────────────────────────────────┤  │
│  │ ☑ Jornada PM FDS (18:30-01:00) │  │
│  │   L M X J V S D                │  │
│  │   ○ ○ ○ ○ ● ● ○   3 pos/día    │  │
│  ├────────────────────────────────┤  │
│  │ ☐ Jornada PM (18:00-12:00)     │  │
│  │   L M X J V S D                │  │
│  │   ● ● ● ● ○ ○ ○   2 pos/día    │  │
│  └────────────────────────────────┘  │
│                                      │
│  Fecha inicio: [2026-01-24]          │
│  Fecha fin:    [2026-01-31]          │
│                                      │
│  Vista previa: 35 turnos             │
│  • Jornada AM: 10 turnos             │
│  • Jornada PM FDS: 12 turnos         │
│  • Jornada PM: 13 turnos             │
│                                      │
│  [Cancelar]  [Generar 35 turno(s)]   │
└──────────────────────────────────────┘
```

---

## Cambios Técnicos

### Archivo: `src/components/rrhh/GenerateShiftsModal.tsx`

| Cambio | Descripción |
|--------|-------------|
| Estado | Cambiar `scheduleId: string` a `selectedScheduleIds: string[]` |
| UI | Reemplazar `<Select>` por lista de checkboxes/cards |
| Preview | Modificar para iterar sobre múltiples horarios |
| Generación | Concatenar turnos de todos los horarios seleccionados |

### Lógica de Preview

```typescript
// Antes: un solo scheduleId
const preview = useMemo(() => {
  if (!selectedSchedule) return [];
  // ... genera turnos para 1 horario
}, [selectedSchedule, startDate, endDate]);

// Después: múltiples scheduleIds
const preview = useMemo(() => {
  const allShifts = [];
  for (const scheduleId of selectedScheduleIds) {
    const schedule = schedules.find(s => s.id === scheduleId);
    if (!schedule) continue;
    // ... genera turnos para este horario
    allShifts.push({ schedule, shifts: [...] });
  }
  return allShifts;
}, [selectedScheduleIds, schedules, startDate, endDate]);
```

### Lógica de Generación

```typescript
const handleGenerate = async () => {
  const allShiftsToCreate = [];
  
  for (const scheduleGroup of preview) {
    for (const day of scheduleGroup.shifts) {
      for (const position of day.positions) {
        allShiftsToCreate.push({
          employee_id: null,
          shift_date: day.dateStr,
          shift_type_id: position.shift_type_id,
          role_id: position.role_id,
          schedule_id: scheduleGroup.schedule.id,
        });
      }
    }
  }
  
  await onGenerate(allShiftsToCreate);
};
```

---

## Flujo de Usuario

1. Usuario abre modal "Generar desde Horario"
2. Ve lista de todas las jornadas activas con checkboxes
3. Selecciona las jornadas deseadas (ej: AM + PM FDS)
4. Define rango de fechas
5. Ve preview consolidado con desglose por jornada
6. Confirma y se generan todos los turnos de una vez

---

## Beneficios

- Menor fricción: un solo paso en lugar de múltiples
- Menos errores: usuario ve todas las jornadas a generar
- Vista previa clara: desglose por jornada antes de confirmar
- Mantiene compatibilidad: sigue usando el mismo `bulkCreateShifts`

