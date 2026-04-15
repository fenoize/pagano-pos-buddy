
Problema real detectado: no es un fallo del formulario ni del botón. El guardado en `src/components/config/FidelizationConfig.tsx` sigue intentando hacer un `upsert` directo a `public.config`. En la red se ve un `POST /rest/v1/config?...` que responde `401/42501` con `permission denied for table config`.

Por qué pasa:
- La tabla `config` sí permite lectura pública.
- Pero en la migración `20260107062245_91ee544b-fec7-4515-9826-a09f7498ba9e.sql` se revocó `INSERT/UPDATE/DELETE` para `anon` y `PUBLIC`.
- Aunque el frontend envía `x-staff-token`, PostgREST sigue ejecutando ese write como rol `anon`.
- Entonces el error ocurre a nivel de privilegios de tabla antes de que RLS pueda autorizar nada.
- Esto además coincide con la memoria del proyecto: para pooler/RLS hay que usar `SECURITY DEFINER RPCs`, no writes directos.

Plan de solución

1. Crear un RPC seguro para guardar la configuración de Runas
- Agregar una migración con una función tipo `public.update_fidelization_settings(...)`.
- Debe ser `SECURITY DEFINER`.
- Debe recibir `p_settings jsonb` y `p_user_id uuid`.
- Debe validar explícitamente que `p_user_id` sea admin, idealmente con `public.is_user_admin(p_user_id)` o función equivalente ya existente.
- Debe hacer `INSERT ... ON CONFLICT (key) DO UPDATE` solo sobre estas llaves:
  - `runa_value`
  - `runa_reward_value`
  - `max_runas_per_order`
  - `min_purchase_for_runas`
  - `runa_expiry_days`
  - `fidelization_active`
  - `runas_exclude_if_paid_with_runas`
  - `runas_exclude_if_discounted`
  - `runas_min_eligible_amount`
- Debe devolver un `jsonb` con el resultado para refrescar UI y manejo de errores.

2. Cambiar el frontend para dejar de escribir directo en `config`
- En `src/components/config/FidelizationConfig.tsx`, reemplazar el `staffClient.from('config').upsert(...)`.
- Seguir el patrón de `useOnlineOrderSettings`:
  - leer token de staff
  - validar token con `validate_staff_token_v2`
  - obtener `user_id` e `is_admin`
  - bloquear si no es admin
  - llamar `supabase.rpc('update_fidelization_settings', { p_settings: settings, p_user_id: userId })`
- Mantener los toasts actuales, pero mostrar el mensaje real si el RPC rechaza por permisos o validación.

3. Mantener la lectura actual o migrarla después si conviene
- La lectura desde `config` funciona hoy, así que no es necesario romper eso para arreglar el problema.
- Solo se corrige la escritura.
- Si hace falta, se puede dejar preparado un `get_fidelization_settings` RPC más adelante, pero no es obligatorio para este fix.

4. Validar el flujo completo
- Probar guardar cambios desde `Fidelización > Runas`.
- Confirmar que:
  - desaparece el `permission denied for table config`
  - los valores persisten al recargar
  - un usuario no admin no pueda guardar
  - no se alteren otras claves de `config`

Archivos involucrados
- `src/components/config/FidelizationConfig.tsx`
- `supabase/migrations/...sql` nueva migración con `update_fidelization_settings`

Detalles técnicos
```text
Hoy:
UI -> REST /config upsert -> rol anon -> GRANT denegado -> 42501

Con el arreglo:
UI -> rpc(update_fidelization_settings, p_settings, p_user_id)
   -> función SECURITY DEFINER
   -> valida admin
   -> upsert interno sobre config
   -> éxito
```

Resultado esperado
- Vas a poder guardar la configuración de Runas sin el error de permisos.
- El acceso seguirá siendo seguro: solo admins podrán modificar esa configuración.
- Se corrige la causa de fondo, no solo el mensaje de error.
