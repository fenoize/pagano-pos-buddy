# Multi-Local con Caja Registradora por Sucursal

## Objetivo
Permitir crear varios "Locales" (Restaurante principal, Foodtruck, etc.), cada uno con su propia caja registradora, horario y dirección. Al abrir turno, el cajero selecciona el local y todos los movimientos quedan ligados a esa caja, manteniendo saldos auditables y separados por local. Catálogo, productos, precios, stock y clientes siguen siendo globales.

---

## 1. Modelo de datos

### Nueva tabla `branches` (locales)
- `name`, `address`, `phone`
- `is_active`, `is_default` (uno por defecto)
- `opening_hours` (JSONB con horario por día de la semana — controla operatividad de la app cliente)
- `cash_account_id` → FK a `finance_accounts` (caja registradora del local)
- `accepts_online_orders` (bool, opcional para deshabilitar pedidos online a un local específico)
- `timezone` default America/Santiago

### Modificaciones a tablas existentes (todas con `branch_id`)
- `cash_sessions` → `branch_id` NOT NULL (después del backfill)
- `cash_movements` → `branch_id` (denormalizado desde la sesión vía trigger, para reportes rápidos)
- `orders` → `branch_id` (separa ventas por local)
- `finance_expenses` → `branch_id` nullable (gasto puede ser global o local)
- `finance_accounts` → `branch_id` nullable (cajas son por local; bancos/MP/POS bancario quedan globales)

### Migración de datos existentes
1. Crear local **"Principal"** marcado como `is_default = true`.
2. Asignar la caja registradora actual a ese local.
3. Backfill de `branch_id = Principal` en todas las sesiones, movimientos, órdenes y gastos históricos.
4. Una vez backfilled, aplicar `NOT NULL` donde corresponde.

### Reglas DB
- Constraint: una sola caja registradora activa (`type = 'Efectivo'`) puede estar asignada a un local a la vez.
- Trigger en `cash_movements`: al insertar, copiar `branch_id` desde la `cash_session` asociada.
- Trigger en `orders`: copiar `branch_id` desde la `cash_session` activa al crearse desde POS; órdenes online toman `branch_id` según local seleccionado o default.
- Actualizar RPC `register_account_movement` para aceptar `branch_id`.

---

## 2. UX / Flujo

### Configuración → Locales (Admin)
- CRUD de locales con: nombre, dirección, teléfono, horario semanal, activo, marcar como default.
- Selector de **caja registradora**: elegir cuenta tipo Efectivo existente o "Crear nueva cuenta" (modal inline → crea `finance_accounts` y la asigna).
- Solo Administrador puede crear/editar locales y reasignar cajas.

### Login / Selección de local
- Al iniciar sesión, modal **"Selecciona tu local"** con la lista de locales activos.
- Si solo hay un local activo, entrar directo sin preguntar.
- El local seleccionado se persiste en `localStorage` (`paganos_active_branch_id`) + `BranchContext`.
- Indicador del local activo visible en el header del POS (junto al usuario).
- Botón "Cambiar local" disponible **solo si NO hay turno abierto** (para evitar mezclar cajas).

### Apertura de caja
- El modal de apertura muestra el local activo y la caja registradora asociada (informativo, no editable).
- Si el local no tiene caja configurada, bloquear la apertura con mensaje claro: "Configura la caja registradora del local en Configuración → Locales".
- El monto de apertura impacta el saldo de la caja del local.

### Movimientos y cierre
- Todos los movimientos del turno (ingresos, egresos, transferencias entre cuentas) registran `branch_id` automáticamente.
- Transferencias permitidas: caja del local A → caja del local B, caja → banco, etc. (útil para que el foodtruck deposite en caja principal o banco al finalizar el día).
- El cierre compara contra el saldo esperado de la caja del local activo, no de una caja global.

### Pedidos online (app cliente)
- El cliente puede elegir **local de retiro** al hacer pedido (retiro en mostrador) o se asigna automáticamente por **zona de cobertura** (delivery).
- Las zonas de delivery (`delivery_zones`) se vinculan a `branch_id`.
- El horario del local controla si la app acepta pedidos: fuera de horario, mostrar "Local cerrado" o permitir programar.
- Si todos los locales están cerrados, mostrar mensaje global.

### Reportes y dashboards
- Filtro adicional **por local** (con opción "Todos") en:
  - Reportes Dashboard (Escritorio)
  - Ventas
  - Cierres diarios
  - Finanzas → Cuentas, Gastos, KPIs
  - KDS (cocina filtra comandas de su local; admins ven todos)
  - TV pedidos listos (selector de local en config de pantalla)

---

## 3. Lo que NO cambia (gracias a las respuestas)
- **Productos / catálogo / precios**: globales.
- **Stock e inventario**: global, una sola bodega lógica para todos los locales.
- **Clientes y fidelización**: globales.
- **Usuarios**: cualquier usuario puede operar cualquier local (sin tabla `user_branches`).
- **Repartidores**: globales, pueden tomar pedidos de cualquier local.

---

## 4. Consideraciones críticas para no romper nada

**Operativos**
- **Cocina (KDS)**: cada local debería ver SOLO sus comandas. Filtro por `branch_id` del usuario activo en su sesión. Admin puede ver todas.
- **TV pedidos listos**: configurable por pantalla a qué local pertenece.
- **Notificaciones**: pedidos entrantes / aceptación remota deben llegar al local correcto (no avisar al restaurante de un pedido del foodtruck).
- **Numeración de órdenes**: decidir si `order_number` es único global o reinicia por local. Recomiendo mantener global (más simple, ya está implementado).

**Financieros**
- Una sola caja registradora activa por local; un usuario solo puede tener un turno abierto a la vez en un solo local.
- Transferencias entre cajas de locales distintos quedan registradas como movimientos en ambas cuentas, manteniendo trazabilidad.
- Los reportes consolidados (ej. ventas totales del día) suman todos los locales; los detallados muestran el desglose.
- Cierre diario por local independiente.

**Histórico**
- Todo lo previo a la migración queda en local "Principal"; no se pierden datos ni reportes históricos.

**Permisos**
- Solo Administrador: crear/editar locales, cambiar caja asignada, ver consolidado multi-local.
- Cajero: opera el local que seleccionó al hacer login.

---

## 5. Cambios técnicos resumidos

**Migraciones SQL**
1. `CREATE TABLE branches`.
2. `ALTER TABLE` agregando `branch_id` a `cash_sessions`, `cash_movements`, `orders`, `finance_expenses`, `finance_accounts`.
3. Crear local "Principal" + backfill + `NOT NULL` donde corresponde.
4. Triggers de propagación de `branch_id` (sesión → movimientos, sesión activa → órdenes POS).
5. Vincular `delivery_zones` a `branch_id`.
6. Actualizar RPCs: `register_account_movement`, funciones de cierre, summary, etc., para incluir `branch_id`.

**Frontend**
- Nuevo `BranchContext` + hook `useBranches` + `useActiveBranch`.
- Nueva página **Configuración → Locales** con CRUD y selector/creador de caja registradora.
- Modal `BranchSelector` post-login.
- Indicador de local activo en header (`CashSessionTopBar` o sidebar).
- Filtro "Local" en: ReportsDashboard, Ventas, Cierres, FinanceAccounts, FinanceExpenses, KDS, TV.
- Actualizar hooks: `useCashSession`, `useFinanceAccounts`, `useReportsDashboard`, `useIncomingOrders`, `useKitchenOrders`, `useDeliveryZones`, `useDeliveryOrders` para filtrar/insertar `branch_id`.
- App cliente: selector de local en checkout (retiro) y asignación automática por zona (delivery); validar horario del local antes de aceptar pedido.

**Edge functions**
- `customer-create-mp-preference` y webhooks (`mp-webhook`): asignar `branch_id` al crear órdenes online.
- `generate-manifest`: si aplica, contemplar configuración por local.

---

## 6. Orden de implementación sugerido (para minimizar riesgo)
1. **Fase 1 — Base de datos**: tabla `branches`, `branch_id` en todas las tablas, backfill, triggers.
2. **Fase 2 — Configuración de locales**: página CRUD + selector post-login + indicador en header.
3. **Fase 3 — Apertura/cierre y movimientos**: integrar `branch_id` en `useCashSession`, validar caja asignada, sincronizar saldos por local.
4. **Fase 4 — Reportes y filtros**: agregar filtro "Local" a todos los reportes y dashboards.
5. **Fase 5 — App cliente / online**: selector de local en checkout, zonas por local, horarios.
6. **Fase 6 — KDS / TV / notificaciones**: filtros por local en cocina y pantallas.

Cada fase deja la app en estado funcional sin romper lo anterior.
