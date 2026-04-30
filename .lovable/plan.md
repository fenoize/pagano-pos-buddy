## Escritorio de Reportes

Crear una nueva página tipo "dashboard de análisis" dentro del módulo Reportes, complementando el reporte de Productos ya existente.

### Ubicación

- **Ruta nueva:** `/pos/reportes/escritorio` (será el ítem por defecto del menú Reportes, listado primero).
- **Sidebar:** agregar "Escritorio" arriba de "Productos" dentro del grupo Reportes.
- **Permisos:** Administrador (igual que el resto de Reportes).

### Filtros (encabezado de la página)

1. **Rango de fecha** — usando el `ReportDatePicker` existente (presets: hoy, ayer, esta semana, semana pasada, este mes, mes pasado, custom).
2. **Cajero** — selector con todos los usuarios staff que hayan registrado ventas (lista poblada desde `orders.created_by_user_id`). Opción "Todos" por defecto.
3. Botón Actualizar + botón Exportar CSV del resumen.

### Widgets / KPIs principales (cards superiores)

Fila de cards de resumen con totales del período filtrado:

- **Ticket promedio** = ingresos netos / cantidad de pedidos reales.
- **Ventas totales** (ingresos netos, excluyendo runas/colación/canje según regla `counts_as_real_sale: false`).
- **Pedidos totales** (excluye Cancelados).
- **Unidades vendidas** (suma de `items[].quantity`).
- **Total de gastos/egresos** del período (desde `finance_expenses` + `cash_movements` tipo egreso).
- **Margen estimado** = Ventas - Gastos.

### Bloques de análisis (grid 2 columnas en desktop, 1 en mobile)

1. **Ventas por día de la semana** (gráfico de barras)
   - Agrupa pedidos del rango por día de semana (Lun-Dom).
   - Muestra ingresos y cantidad de pedidos.
   - Resalta el día con más ventas.

2. **Ventas por horario** (gráfico de barras por hora 00-23)
   - Agrupa pedidos por hora de `created_at`.
   - Resalta franja horaria pico.

3. **Top productos vendidos** (tabla compacta top 10)
   - Reutiliza la lógica de agregación de `useProductSalesAnalytics` (extraer a util compartida).
   - Columnas: producto, unidades, ingresos, % del total.
   - Link "Ver reporte completo" → `/pos/reportes/productos`.

4. **Mejor vendedor / Ranking de cajeros** (tabla)
   - Agrupa pedidos por `created_by_user_id` (join contra usuarios para nombre).
   - Columnas: cajero, # turnos trabajados (count distinct `cash_session_id`), # pedidos, ventas totales, ticket promedio.
   - Ordenado por ventas. Resalta el #1.
   - Si hay filtro de cajero específico aplicado, muestra solo esa fila con detalle.

5. **Métodos de pago** (donut/pie pequeño)
   - Distribución de ingresos por `payment_method` (efectivo, transferencia, POS, mixto, app).
   - Ayuda al análisis de flujo de caja.

6. **Resumen de gastos por categoría** (tabla compacta)
   - Top categorías de `finance_expenses` en el período.
   - Sirve como contexto financiero rápido.

### Reglas de negocio (consistentes con memoria del proyecto)

- Excluir pedidos `Cancelado`.
- Excluir métodos de pago con `counts_as_real_sale: false` (runas, colación, canje) usando `getNonRealSaleMethods()`.
- Pedidos `mixto` se incluyen porque tienen ingreso real parcial.
- Tiempos en zona `America/Santiago`.
- El filtro por cajero se aplica vía `orders.created_by_user_id`.

### Detalles técnicos

**Archivos nuevos:**
- `src/pages/reports/ReportsDashboard.tsx` — página principal.
- `src/hooks/useReportsDashboard.ts` — hook que carga: orders del rango (con filtro cajero), expenses del rango, lista de cajeros con ventas, y devuelve KPIs + agregaciones.
- `src/components/reports/dashboard/KPICards.tsx` — cards superiores.
- `src/components/reports/dashboard/SalesByWeekdayChart.tsx`
- `src/components/reports/dashboard/SalesByHourChart.tsx`
- `src/components/reports/dashboard/TopProductsCompact.tsx`
- `src/components/reports/dashboard/TopCashiersTable.tsx`
- `src/components/reports/dashboard/PaymentMethodBreakdown.tsx`
- `src/components/reports/dashboard/ExpensesByCategoryCompact.tsx`
- `src/components/reports/dashboard/CashierFilter.tsx`

**Archivos editados:**
- `src/App.tsx` — agregar `lazy import` y `<Route path="/pos/reportes/escritorio">`. Opcional: redirigir `/pos/reportes` → `/pos/reportes/escritorio`.
- `src/components/AppSidebar.tsx` — agregar `{ title: "Escritorio", url: "/pos/reportes/escritorio", icon: LayoutDashboard, roles: ['Administrador'] }` al inicio de `reportItems`.

**Datos:**
- `orders`: select de `id, total, items, created_at, status, payment_method, payment_runas, created_by_user_id, cash_session_id` filtrando por rango.
- `finance_expenses`: select por rango (`expense_date`).
- Lista de cajeros: distinct join contra tabla de usuarios staff para mostrar nombre legible.
- Sin nuevas tablas ni migraciones — toda la información ya existe.

### Fuera de alcance (esta iteración)

- Comparativos contra período previo (puede agregarse después).
- Drill-down a pedidos individuales desde cada widget.
- Exportación PDF (solo CSV de KPIs).