

## Plan: Nuevo Tab "Resumen" en Módulo RRHH

### Objetivo

Crear una nueva vista de resumen que permita al administrador tener una visión consolidada de:
- Cantidad de turnos por trabajador
- Monto a pagar por trabajador
- Total general de sueldos proyectados

Con filtros por trabajador, fechas y tipo de turno.

---

### Vista Previa de la Interfaz

```text
┌─────────────────────────────────────────────────────────────────┐
│  Resumen de Turnos y Pagos                                      │
│  Vista consolidada del período                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [Filtros]  Empleado ▼  Desde [____] Hasta [____]  Turno ▼      │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ KPIs                                                     │    │
│  │ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐      │    │
│  │ │   45         │ │    8         │ │  $1.250.000  │      │    │
│  │ │ Total Turnos │ │ Empleados    │ │ Total a Pagar│      │    │
│  │ └──────────────┘ └──────────────┘ └──────────────┘      │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Tabla Detalle por Empleado                               │    │
│  │ ──────────────────────────────────────────────────────── │    │
│  │ Empleado        │ Turnos │ Pend │ Aprob │ Monto Estimado │    │
│  │ ───────────────────────────────────────────────────────  │    │
│  │ Juan Pérez      │   12   │   2  │  10   │    $312.000    │    │
│  │ María González  │    8   │   1  │   7   │    $208.000    │    │
│  │ Carlos López    │   15   │   3  │  12   │    $390.000    │    │
│  │ Ana Martínez    │   10   │   0  │  10   │    $340.000    │    │
│  │ ───────────────────────────────────────────────────────  │    │
│  │ TOTAL           │   45   │   6  │  39   │  $1.250.000    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│                              [Exportar CSV] [Exportar PDF]       │
└─────────────────────────────────────────────────────────────────┘
```

---

### Cambios Requeridos

#### 1. Nueva Página: `src/pages/rrhh/RRHHResumen.tsx`

Componente principal que incluirá:
- **Filtros**: Selector de empleado, rango de fechas, tipo de turno
- **KPIs Cards**: Total turnos, empleados activos, total proyectado a pagar
- **Tabla de resumen**: Desglose por empleado con:
  - Nombre del empleado
  - Total de turnos en el período
  - Turnos pendientes (draft/confirmed)
  - Turnos aprobados (approved)
  - Monto estimado a pagar (calculado con `hr_pay_rules`)
- **Exportación**: Botones para CSV y PDF

#### 2. Nuevo Hook: `src/hooks/useHRShiftsSummary.ts`

Hook personalizado para calcular los datos de resumen:

```typescript
interface ShiftSummaryItem {
  employee_id: string;
  employee_name: string;
  employee_rut: string | null;
  total_shifts: number;
  pending_shifts: number;    // draft + confirmed
  approved_shifts: number;   // approved + paid
  estimated_pay: number;     // calculado con pay_rules
}

interface ShiftSummaryTotals {
  total_shifts: number;
  total_employees: number;
  total_pending: number;
  total_approved: number;
  total_estimated_pay: number;
}
```

La lógica de cálculo:
1. Obtener todos los turnos del período filtrado
2. Agrupar por empleado
3. Para cada turno, buscar el `pay_per_shift` en `hr_pay_rules` según el `shift_type_id`
4. Sumar los montos para el estimado total

#### 3. Agregar Ruta en `src/App.tsx`

```typescript
const RRHHResumen = lazy(() => import("@/pages/rrhh/RRHHResumen"));

// En las rutas:
<Route 
  path="/pos/rrhh/resumen" 
  element={
    <StaffProtectedRoute>
      <StaffLayout><RRHHResumen /></StaffLayout>
    </StaffProtectedRoute>
  } 
/>
```

#### 4. Agregar Item en Sidebar `src/components/AppSidebar.tsx`

```typescript
const rrhhItems = [
  { title: "Resumen", url: "/pos/rrhh/resumen", icon: BarChart3, roles: ['Administrador'] },  // NUEVO
  { title: "Turnos", url: "/pos/rrhh/turnos", icon: Users, roles: ['Administrador'] },
  { title: "Liquidaciones", url: "/pos/rrhh/liquidaciones", icon: DollarSign, roles: ['Administrador'] },
  { title: "Ajustes", url: "/pos/rrhh/ajustes", icon: TrendingUpIcon, roles: ['Administrador'] },
  { title: "Configuración", url: "/pos/rrhh/configuracion", icon: SettingsIcon, roles: ['Administrador'] },
];
```

#### 5. Funciones de Exportación en `src/lib/hrExport.ts`

Agregar nuevas funciones:
- `exportShiftsSummaryCSV(items, totals, dateRange)`
- `exportShiftsSummaryPDF(items, totals, dateRange)`

---

### Detalle Técnico de Cálculo

El monto estimado se calcula así:

```typescript
// Para cada turno
const getShiftPayAmount = (shift: HRShift, payRules: HRPayRule[]) => {
  const rule = payRules.find(r => 
    r.shift_type_id === shift.shift_type_id && r.is_active
  );
  return rule?.pay_per_shift || 0;
};

// Para cada empleado
const employeePay = employeeShifts.reduce((sum, shift) => {
  return sum + getShiftPayAmount(shift, payRules);
}, 0);
```

**Nota importante**: Este es un monto **estimado** basado en los turnos actuales. Los ajustes (bonos, adelantos, descuentos) se aplican solo en las liquidaciones.

---

### Archivos a Crear/Modificar

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `src/pages/rrhh/RRHHResumen.tsx` | Crear | Nueva página de resumen |
| `src/hooks/useHRShiftsSummary.ts` | Crear | Hook para cálculo de datos |
| `src/App.tsx` | Modificar | Agregar ruta |
| `src/components/AppSidebar.tsx` | Modificar | Agregar item al menú |
| `src/lib/hrExport.ts` | Modificar | Funciones de exportación |

---

### Desglose de Columnas de la Tabla

| Columna | Descripción |
|---------|-------------|
| **Empleado** | Nombre completo del trabajador |
| **Turnos Totales** | Cantidad total de turnos en el período |
| **Pendientes** | Turnos en estado `draft` o `confirmed` (aún no aprobados) |
| **Aprobados** | Turnos en estado `approved` o `paid` |
| **Monto Estimado** | Suma de `pay_per_shift` de cada turno según su tipo |

---

### Consideraciones

1. **Performance**: El hook usará los mismos filtros que `useHRShifts` pero procesará los datos en el cliente para agrupar y calcular
2. **Consistencia**: Los datos serán coherentes con lo que se ve en "Turnos" ya que usan la misma fuente
3. **Diferencia con Liquidaciones**: Este es un resumen "en vivo" - las liquidaciones son snapshots formales que incluyen ajustes

