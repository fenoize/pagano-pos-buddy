

## Plan: Sesiones Múltiples para Administradores y Persistencia PWA

### Objetivo

Modificar el sistema de sesiones del staff para:
1. **Administradores**: Permitir hasta 3 sesiones simultáneas (en lugar de invalidar todas al crear una nueva)
2. **Otros roles**: Mantener el comportamiento actual (1 sesión activa)
3. **PWA de Administradores**: Garantizar que las sesiones PWA nunca se desconecten automáticamente para recibir notificaciones push siempre

---

### Cambios Requeridos

#### 1. Modificar función `create_staff_session` (SQL)

La lógica actual invalida **todas** las sesiones anteriores. La nueva lógica será:

```text
SI el usuario es Administrador:
  1. Contar sesiones activas
  2. Si hay >= 3 sesiones activas:
     - Invalidar la sesión más antigua (solo 1)
  3. Crear nueva sesión (ahora hay máximo 3)
SINO (otros roles):
  - Mantener comportamiento actual: invalidar todas las sesiones anteriores
  - Crear nueva sesión (máximo 1)
```

#### 2. Modificar función `refresh_staff_token` (SQL)

Para Administradores con sesión PWA, asegurar que la renovación siempre funcione sin límites de tiempo, extendiendo 365 días cada vez.

#### 3. Hook `useSessionKeepAlive` - Comportamiento PWA Administrador

Para Administradores en PWA:
- Mantener renovación silenciosa automática sin modal de expiración
- Garantizar que la sesión se renueve incluso en background

---

### Detalle Técnico: Nueva Función SQL

```sql
CREATE OR REPLACE FUNCTION public.create_staff_session(
  _user_id uuid,
  _is_pwa boolean DEFAULT false
)
RETURNS TABLE(token text, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token text;
  v_expires_at timestamptz;
  v_user_role text;
  v_active_session_count int;
  v_max_sessions int;
BEGIN
  -- Obtener el rol del usuario
  SELECT role INTO v_user_role FROM public.users WHERE id = _user_id;
  
  -- Determinar máximo de sesiones según rol
  IF v_user_role = 'Administrador' THEN
    v_max_sessions := 3;
  ELSE
    v_max_sessions := 1;
  END IF;
  
  -- Contar sesiones activas actuales
  SELECT COUNT(*) INTO v_active_session_count
  FROM public.staff_sessions s
  WHERE s.user_id = _user_id
    AND s.expires_at > now();
  
  -- Si ya tiene el máximo de sesiones, invalidar las más antiguas
  IF v_active_session_count >= v_max_sessions THEN
    -- Invalidar las sesiones más antiguas para dejar espacio a la nueva
    UPDATE public.staff_sessions
    SET expires_at = now()
    WHERE id IN (
      SELECT id 
      FROM public.staff_sessions
      WHERE user_id = _user_id
        AND expires_at > now()
      ORDER BY created_at ASC
      LIMIT (v_active_session_count - v_max_sessions + 1)
    );
  END IF;
  
  -- Generar token
  v_token := replace(gen_random_uuid()::text, '-', '') || 
             replace(gen_random_uuid()::text, '-', '');

  -- Duración según PWA
  v_expires_at := CASE
    WHEN _is_pwa THEN now() + interval '365 days'
    ELSE now() + interval '4 hours'
  END;

  -- Crear nueva sesión
  INSERT INTO public.staff_sessions (user_id, token, expires_at, is_pwa)
  VALUES (_user_id, v_token, v_expires_at, _is_pwa);

  RETURN QUERY SELECT v_token, v_expires_at;
END;
$$;
```

---

### Matriz de Comportamiento

| Rol | Dispositivo | Max Sesiones | Duración Sesión | Renovación |
|-----|-------------|--------------|-----------------|------------|
| Administrador | Web | 3 | 4 horas | Modal + auto |
| Administrador | PWA | 3 | 365 días | Silenciosa siempre |
| Cajero | Web | 1 | 4 horas | Modal + auto |
| Cajero | PWA | 1 | 365 días | Silenciosa siempre |
| Cocina | Web/PWA | 1 | 4h / 365d | Igual que Cajero |
| Reparto | Web/PWA | 1 | 4h / 365d | Igual que Cajero |

---

### Escenario de Ejemplo: Administrador

1. **Sesión 1**: Login desde PC oficina (web) → Sesión de 4 horas
2. **Sesión 2**: Login desde teléfono (PWA) → Sesión de 365 días
3. **Sesión 3**: Login desde tablet (PWA) → Sesión de 365 días
4. **Sesión 4**: Login desde otro PC → **Invalida la sesión 1 (la más antigua)**, crea sesión 4

Las sesiones PWA siguen activas, recibiendo notificaciones push sin problemas.

---

### Archivos a Modificar

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| Nueva migración SQL | Crear | `create_staff_session` con lógica de sesiones múltiples |
| `src/hooks/useSessionKeepAlive.ts` | Verificar | Confirmar que PWA siempre renueva sin mostrar modal |

---

### Consideraciones de Seguridad

1. **Solo Administradores** tienen privilegio de sesiones múltiples
2. El límite de 3 sesiones previene abuse (compartir credenciales masivamente)
3. Las sesiones PWA tienen renovación automática para garantizar notificaciones
4. Las sesiones web siguen teniendo el modal de expiración como fallback

