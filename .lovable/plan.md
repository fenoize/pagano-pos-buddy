# Automatización de "Pedidos online" según horario del local

## Resumen
Tres bloques: (1) soporte cross-midnight en JSONB + UI del modal de Locales, (2) Edge Function `schedule-checker` con cron cada 5 min, (3) notificación a administradores cuando no hay turno activo al momento de la apertura.

## Hallazgos clave del schema (verificados)
- `cash_sessions`: sesión **activa** = `closed_at IS NULL` (filtrada por `branch_id`). Además tiene `accept_app_orders` propio del turno (no se toca aquí).
- No existe tabla `app_config`. Hay `config(key, value)` con `onesignal_app_id` y `onesignal_enabled`, pero **las API keys de OneSignal y Resend NO están en DB**: viven como secrets de Edge Functions (`ONESIGNAL_REST_API_KEY`, `RESEND_API_KEY`).
- No existe `profiles`. Los admins son `users` con `role = 'Administrador'` y `email IS NOT NULL`.

> Por esto, la notificación se hará desde la **Edge Function** (que sí tiene acceso a los secrets) en vez de un RPC `notify_no_shift`. Se mantiene el mismo efecto (push OneSignal + email Resend a admins), pero sin depender de claves en DB.

---

## Parte 1 — JSONB + UI cross-midnight

### Migración (data, vía insert tool — no es schema change)
```sql
UPDATE branches SET opening_hours = (
  SELECT jsonb_object_agg(
    day_key,
    day_val || jsonb_build_object('closes_next_day', false)
  )
  FROM jsonb_each(opening_hours) AS t(day_key, day_val)
)
WHERE opening_hours IS NOT NULL
  AND NOT (opening_hours->'mon' ? 'closes_next_day');
```

### `src/components/branches/BranchFormDialog.tsx`
- Extender `DEFAULT_HOURS` con `closes_next_day: false`.
- En el render de cada día: comparar `h.open` y `h.close` como `HH:MM`. Si `close < open` → mostrar chip gris "+1 día" junto al input de cierre. Sin toggle adicional.
- En `handleSave`, antes de armar `opening_hours`, recorrer los 7 días y setear `closes_next_day = (close < open)`.
- Sin cambios en `Branch` interface más allá de tipar el objeto del día con el campo opcional `closes_next_day?: boolean`.

---

## Parte 2 — Edge Function `schedule-checker`

`supabase/functions/schedule-checker/index.ts` (con `verify_jwt = false` en `config.toml`):

- Cliente Supabase con `SUPABASE_SERVICE_ROLE_KEY`.
- Leer `branches` con `is_active = true` y `opening_hours IS NOT NULL` (incluir `id, name, timezone, opening_hours, accepts_online_orders`).
- Para cada branch:
  1. `tz = branch.timezone || 'America/Santiago'`.
  2. Calcular `now` en esa tz con `Intl.DateTimeFormat('en-US', { timeZone: tz, weekday, hour, minute, hour12:false })` → obtener `weekdayIdx` (0=Sun…6=Sat) y `HH:MM` actual en minutos.
  3. `DAY_KEYS = ['sun','mon','tue','wed','thu','fri','sat']`; `today = opening_hours[DAY_KEYS[weekdayIdx]]`; `prev = opening_hours[DAY_KEYS[(weekdayIdx+6)%7]]`.
  4. Helper `within3(target, current)` → `Math.abs(target - current) <= 3` en minutos.
  5. **Apertura**: si `today && !today.closed && within3(today.open, current)`:
     - Buscar `cash_sessions` con `branch_id = branch.id AND closed_at IS NULL` (limit 1).
     - Si existe → `update branches set accepts_online_orders = true`.
     - Si no existe → llamar helper `notifyNoShift(branch.name, today.open)` (ver Parte 3). **No** activar el toggle.
  6. **Cierre mismo día**: si `today && !today.closed && !today.closes_next_day && within3(today.close, current)` → `accepts_online_orders = false`.
  7. **Cierre cruzado del día anterior**: si `prev && !prev.closed && prev.closes_next_day && within3(prev.close, current)` → `accepts_online_orders = false`.
- Devolver resumen JSON `{ checked, openedCount, closedCount, noShiftCount }`.

### Cron (cada 5 min)
Vía `supabase--read_query`/insert: usar `pg_cron + pg_net` apuntando a la URL pública de la función con header `apikey: <ANON_KEY>`. Sólo se programa una vez.

---

## Parte 3 — Notificación "sin turno"

Implementada en la misma Edge Function (no RPC), porque las API keys están en secrets:

`notifyNoShift(branchName, expectedTime)`:
1. **OneSignal push** (si `ONESIGNAL_REST_API_KEY` definido):
   - `POST https://onesignal.com/api/v1/notifications`
   - `app_id` = leer de tabla `config` key `onesignal_app_id`.
   - Filtro `{ field:'tag', key:'role', relation:'=', value:'Administrador' }`.
   - Heading `⚠ Sin turno activo — {branchName}`, contenido `"Son las {expectedTime} y no hay turno de caja abierto en {branchName}. Los pedidos online NO se activaron automáticamente."`.
2. **Email Resend** (si `RESEND_API_KEY` definido):
   - Query `users` donde `role='Administrador' AND email IS NOT NULL AND active=true` → array de emails.
   - `POST https://api.resend.com/emails` con `from: 'Paganos Burger <sistema@paganosburger.cl>'`, mismo subject, HTML simple con el motivo + call-to-action "Inicia sesión y abre el turno".
3. Cualquier fallo se loguea, **nunca** bloquea el resto del loop.

---

## Restricciones respetadas
- El toggle manual "Pedidos online" en `BranchFormDialog` sigue editable igual que hoy; la EF sólo lo actualiza en los tres eventos (±3 min de open/close).
- No se tocan componentes fuera del modal de Locales y la nueva EF.
- Toda comparación de hora usa `timezone` del branch; nunca UTC implícito.

## Archivos a crear / editar
- **Editar** `src/components/branches/BranchFormDialog.tsx` (chip "+1 día" y `closes_next_day` al guardar).
- **Crear** `supabase/functions/schedule-checker/index.ts`.
- **Editar** `supabase/config.toml` (`[functions.schedule-checker] verify_jwt = false`).
- **Migración SQL** para rellenar `closes_next_day` en branches existentes.
- **Cron job** vía `pg_cron + pg_net` cada 5 minutos.
