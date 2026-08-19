# Fix notificaciones POS: banner de conexión + alarma de pedidos por aprobar

Nota de nomenclatura: en esta base de datos el estado se llama `PendienteAceptacion` (no `PendienteAprobacion`). El plan usa el estado real.

## Estado actual verificado

- `src/hooks/useIncomingOrders.ts` ya crea el canal Realtime `incoming-orders` filtrado por `status=eq.PendienteAceptacion`, con reconexión y polling de respaldo cada 20s, pero **no expone el estado del canal** (`SUBSCRIBED` / `CLOSED` / `CHANNEL_ERROR`).
- `src/components/pos/ConnectionAlarmBanner.tsx` + `src/hooks/useConnectionAlarm.ts` existen y se montan en `StaffLayout` (`src/App.tsx`), pero el chequeo de salud busca canales por nombre y solo considera desconexión el estado `closed`, además de exigir sesión de caja activa. Por eso deja de avisar en casos de `CHANNEL_ERROR`.
- El sonido (`IncomingOrderSound`) se monta dentro de `IncomingOrderBanner`, que retorna `null` si no hay pedidos o si la caja no acepta pedidos de app; el `AudioContext` se crea recién al sonar, así que si el navegador lo bloquea no hay audio y no hay reintento.
- No existe `audioManager` singleton, ni badge en `document.title`, ni Notification API para pedidos entrantes.

## Cambios propuestos

### 1. Estado del canal expuesto por el hook
En `useIncomingOrders.ts`: agregar estado `channelStatus` ('SUBSCRIBED' | 'CLOSED' | 'CHANNEL_ERROR' | 'TIMED_OUT' | 'CONNECTING'), actualizarlo en el callback de `.subscribe()` y devolverlo. No se cambia la lógica de reconexión ni el polling.

### 2. Banner de conexión
Reescribir `ConnectionAlarmBanner` para que muestre el aviso cuando `navigator.onLine === false` o el canal esté en `CLOSED` / `CHANNEL_ERROR` / `TIMED_OUT` de forma sostenida (~5s de debounce para evitar parpadeos en reconexiones normales):
- Fondo `#7f1d1d`, texto blanco, fijo arriba, z-index alto.
- Texto: "⚠ Sin conexión — No se están recibiendo pedidos".
- Desaparece solo al volver `online` + canal `SUBSCRIBED`.
- Se mantiene el botón de reconectar manual.
Como el banner y el hook viven en componentes distintos, se comparte el estado del canal mediante un pequeño store módulo (suscripción tipo listener) que `useIncomingOrders` actualiza y el banner lee. Así el banner no necesita duplicar la suscripción.

### 3. `src/lib/audioManager.ts` (nuevo singleton)
- `unlockAudio()`: crea/resume el `AudioContext` en la primera interacción.
- `playAlarm()`: patrón de osciladores 880/660/880 Hz, sin archivos de audio.
Se llama `unlockAudio()` en el primer `click`/`keydown` dentro del `StaffLayout`.

### 4. Alarma persistente mientras haya pedidos pendientes
Nuevo componente montado siempre en `StaffLayout` (independiente de que el banner de pedidos se renderice):
- Suena de inmediato al detectar un pedido nuevo y repite cada 8s mientras exista al menos un pedido `PendienteAceptacion` sin atender.
- Se detiene al llegar a cero pedidos pendientes.
- Sustituye el uso de `IncomingOrderSound` para pedidos entrantes (se deja el componente para otros usos si los hay).

### 5. Badge en el título de la pestaña
`document.title = "(N) ⚡ Pedido nuevo — Paganos POS"` cuando hay pendientes; restaurar el título original cuando no hay.

### 6. Notificación del sistema
- Pedir permiso `Notification` al entrar al POS (se integra con `StaffStartupChecks`, que ya gestiona el modal de permisos, para no duplicar prompts).
- Al detectar un pedido nuevo, disparar `new Notification('⚡ Nuevo pedido en Paganos', { body: 'Pedido #N esperando aprobación', requireInteraction: true })`.

## Archivos afectados

- Nuevo: `src/lib/audioManager.ts`, `src/lib/incomingOrdersChannelStore.ts`, `src/components/pos/PendingOrdersAlarm.tsx`
- Editados: `src/hooks/useIncomingOrders.ts`, `src/components/pos/ConnectionAlarmBanner.tsx`, `src/hooks/useConnectionAlarm.ts`, `src/App.tsx` (StaffLayout), `src/components/pos/StaffStartupChecks.tsx`

Sin cambios de base de datos.
