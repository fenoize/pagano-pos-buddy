
Objetivo
- Que las notificaciones de “Apertura de caja”, “Cierre de turno” y “Movimientos (ingreso/egreso)” se registren y se VEAN en la campana del Administrador en /pos, de forma “tiempo real” (sin recargar), sin errores.

Diagnóstico (qué está pasando ahora)
1) La tabla `staff_notifications` sí está recibiendo registros.
   - En TEST hay 59 notificaciones recientes, incluyendo cash_session_open / cash_session_close / cash_movement con `role_target='Administrador'`.
2) Pero el Administrador no las ve porque las políticas RLS de `staff_notifications` no están evaluando al usuario correctamente:
   - Las policies de SELECT/UPDATE usan `current_setting('app.current_user_id', true)` para identificar al usuario.
   - Nuestro “contexto staff” actual setea `app.user_id` (via `set_staff_context`) y además es poco confiable con pooling.
   - Resultado: SELECT devuelve 0 filas y la campana muestra “No tienes notificaciones”.
3) “Tiempo real” con `postgres_changes` no es confiable en este proyecto porque el staff NO usa Supabase Auth (JWT).
   - La suscripción realtime termina conectando como anon, y con RLS activa no recibirá eventos filtrados por usuario/rol.
   - Solución práctica: “pseudo-realtime” con polling rápido + refetch al abrir campana (se siente como realtime).

Solución (enfoque)
A) Corregir la identidad del staff para RLS usando el token del staff (header `x-staff-token`)
- Ya existe la función DB `get_current_staff_user_from_token()` que extrae el usuario desde `request.headers`.
- También existe el `getStaffSupabaseClient()` que envía automáticamente el header `x-staff-token`.
- Vamos a:
  1) Ajustar las policies de `staff_notifications` para que usen `get_current_staff_user_from_token()` en vez de `app.current_user_id`.
  2) Endurecer INSERT policy (ahora está en `true`, lo cual permite que cualquiera inserte notificaciones con la anon key; es un riesgo real).
  3) Cambiar el frontend de notificaciones (lectura/mark-as-read) a usar el “staff client” (con `x-staff-token`) y dejar de depender de `setStaffContext/withStaffContext` para esta feature.

B) Pseudo-realtime robusto (sin Supabase Auth)
- Implementar polling en `useStaffNotifications` cada 3–5s cuando:
  - el usuario está logueado,
  - y el rol corresponde (en este caso Administrador; opcionalmente para todos los roles para futuro).
- Al abrir la campana: refetch inmediato.
- Esto asegura que tras un egreso/ingreso o apertura/cierre, la campana se actualiza en segundos.

Cambios concretos propuestos

1) Base de datos (migración SQL en `supabase/migrations/*`)
1.1. Reemplazar policies de `staff_notifications` para SELECT/UPDATE usando token
- El objetivo es que:
  - Si `staff_notifications.user_id` coincide con el usuario del token -> puede verla/actualizarla.
  - Si `staff_notifications.role_target` coincide con el rol del usuario (según tabla `users`) -> puede verla/actualizarla.
- SQL aproximado:

```sql
-- 1) Quitar policies actuales (ajustar nombres exactos según pg_policies)
DROP POLICY IF EXISTS "Staff can view own or role notifications" ON public.staff_notifications;
DROP POLICY IF EXISTS "Staff can update own or role notifications" ON public.staff_notifications;

-- 2) Crear policy SELECT segura basada en token
CREATE POLICY "Staff can view own or role notifications (token)"
ON public.staff_notifications
FOR SELECT
USING (
  -- usuario desde token
  (user_id IS NOT NULL AND user_id = public.get_current_staff_user_from_token())
  OR
  (
    role_target IS NOT NULL
    AND role_target = (
      SELECT u.role::text
      FROM public.users u
      WHERE u.id = public.get_current_staff_user_from_token()
    )
  )
);

-- 3) Crear policy UPDATE segura basada en token (marcar read_at)
CREATE POLICY "Staff can update own or role notifications (token)"
ON public.staff_notifications
FOR UPDATE
USING (
  (user_id IS NOT NULL AND user_id = public.get_current_staff_user_from_token())
  OR
  (
    role_target IS NOT NULL
    AND role_target = (
      SELECT u.role::text
      FROM public.users u
      WHERE u.id = public.get_current_staff_user_from_token()
    )
  )
);
```

1.2. Arreglar INSERT policy (seguridad) para impedir spam externo
- Hoy INSERT está efectivamente abierto (`WITH CHECK true`), lo que permite insertar notificaciones desde cualquier navegador con la anon key.
- La política correcta: solo staff con token válido puede insertar.
- SQL:

```sql
DROP POLICY IF EXISTS "Authenticated can insert notifications" ON public.staff_notifications;

CREATE POLICY "Staff can insert notifications (token)"
ON public.staff_notifications
FOR INSERT
WITH CHECK (
  public.get_current_staff_user_from_token() IS NOT NULL
);
```

Nota: Si la creación de notificación la hace un “actor staff” (Ignacio) desde el POS, esto seguirá funcionando porque ya existe el token en localStorage.

2) Frontend: notificaciones (campana) debe usar el staff client + polling

2.1. `src/hooks/useStaffNotifications.ts`
- Cambios:
  - Reemplazar `supabase` + `withStaffContext` por `getStaffSupabaseClient()` (desde `src/lib/supabaseClient.ts`).
  - En cada `fetchNotifications`, instanciar `const staff = getStaffSupabaseClient()` y consultar con ese cliente.
  - Implementar polling:
    - `setInterval(fetchNotifications, 4000)` (por ejemplo) mientras esté montado y exista `user.id`.
    - Limpiar interval al unmount.
  - Mantener el filtro:
    - `.or(\`user_id.eq.${user.id},role_target.eq.${user.role}\`)`
  - Realtime (`postgres_changes`) se puede desactivar o dejar como “best-effort” pero NO depender de él.

2.2. `src/components/notifications/StaffNotificationBell.tsx`
- Añadir refetch al abrir:
  - Cuando `open` pase a true -> llamar `refetch()` para que siempre muestre lo último.
- Esto ayuda a que aunque el polling se atrase, al abrir el usuario vea lo nuevo.

2.3. `src/components/notifications/StaffNotificationItem.tsx` (opcional)
- Si el click solo marca leído, ok.
- (Opcional futuro) navegar al módulo relacionado usando `payload` (caja/ventas), pero no es necesario para “que funcione”.

3) Frontend: creación de notificaciones (triggers) debe usar staff client (para consistencia)
Aunque ya se están insertando filas, lo vamos a dejar coherente y blindado al cambio de policy INSERT.

3.1. `src/lib/staffNotificationTriggers.ts`
- Reemplazar `supabase` por un `const staff = getStaffSupabaseClient()` dentro de `createStaffNotification`.
- Insert en `staff_notifications` con `staff.from(...).insert(...)`.
- Invocación de edge function:
  - `staff.functions.invoke('send-staff-push', ...)`
  - Esto mantiene el header y evita problemas si la edge function o futuras policies dependen del token.

4) Verificación end-to-end (QA) que haremos al terminar
Checklist de pruebas con cuentas reales:
1) Login como “Ignacio” (Cajero/Caja) -> abrir turno:
   - En DB debe crearse un registro `cash_session_open` role_target=Administrador.
   - En cuenta Admin (en /pos), la campana debe incrementarse en ~4s.
2) Desde Ignacio: registrar egreso $3.000 con nota “test”:
   - Debe aparecer “Egreso de Caja” con monto y nota en la campana admin.
3) Desde Ignacio: cerrar turno:
   - Debe aparecer “Turno Cerrado” con efectivo, ventas y cantidad de pedidos.
4) Admin: abrir campana y marcar una como leída:
   - Debe cambiar el dot/estado y bajar el contador.
5) Seguridad:
   - Desde un navegador sin token staff, intentar insertar en `staff_notifications` con anon key (debe fallar por RLS).

Riesgos y mitigaciones
- Realtime “real” con postgres_changes no es viable sin Supabase Auth. Mitigación: polling cada 3–5s + refetch al abrir (se percibe realtime).
- Cambiar policies puede afectar otros módulos si consultan `staff_notifications` con el client antiguo. Mitigación: actualizamos el hook y triggers para usar staff client; y (si existiese otro consumo) lo migramos también.

Entregable
- Notificaciones de apertura/cierre/movimientos visibles para Administradores en la campana en /pos, actualizando en segundos sin recargar, y sin duplicados.
- RLS corregido y más seguro (sin inserciones anónimas).

Implementación (secuenciación)
1) Agregar migración SQL para policies de `staff_notifications` (SELECT/UPDATE/INSERT).
2) Actualizar `useStaffNotifications` a staff client + polling + refetch on open.
3) Actualizar `staffNotificationTriggers` a staff client.
4) Probar flujo completo Ignacio -> Admin (apertura, egreso, cierre) y validar contador/lecturas.
