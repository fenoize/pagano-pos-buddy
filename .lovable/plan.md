

## Plan: Sesiones Permanentes para Staff en PWA Móvil

### Resumen Ejecutivo

Se implementará un sistema de sesiones duales donde:
- **Navegador web**: Mantiene la seguridad actual (4 horas de expiración)
- **PWA móvil instalada**: Sesión permanente que no expira mientras el dispositivo esté activo

Esto permitirá que el personal del staff reciba notificaciones push y acceda a la app sin necesidad de iniciar sesión cada vez que la abran.

---

### Arquitectura de la Solución

```text
┌─────────────────────────────────────────────────────────────────┐
│                         STAFF LOGIN                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────────┐              ┌──────────────────┐        │
│   │   NAVEGADOR WEB  │              │   PWA INSTALADA  │        │
│   │                  │              │   (Standalone)   │        │
│   │  expires_at:     │              │  expires_at:     │        │
│   │  NOW + 4 hours   │              │  NOW + 365 days  │        │
│   │                  │              │                  │        │
│   │  Auto-refresh:   │              │  Auto-refresh:   │        │
│   │  Cada 10 min     │              │  Cada 6 horas    │        │
│   │  cuando < 1hr    │              │  cuando < 7 días │        │
│   │                  │              │                  │        │
│   │  Modal expiry:   │              │  Sin modal       │        │
│   │  Sí (45 seg)     │              │  (silencioso)    │        │
│   └──────────────────┘              └──────────────────┘        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

### Cambios Requeridos

#### 1. Base de Datos (Migraciones SQL)

**Modificar `create_staff_session`** para aceptar un parámetro `is_pwa`:

```sql
CREATE OR REPLACE FUNCTION create_staff_session(
  _user_id uuid,
  _is_pwa boolean DEFAULT false
)
RETURNS TABLE(token text, expires_at timestamptz)
AS $$
DECLARE
  v_expires_at timestamptz := CASE 
    WHEN _is_pwa THEN NOW() + INTERVAL '365 days'  -- PWA: 1 año
    ELSE NOW() + INTERVAL '4 hours'                -- Web: 4 horas
  END;
BEGIN
  -- ... lógica existente con v_expires_at dinámico
END;
$$;
```

**Modificar `refresh_staff_token`** para sesiones PWA:

```sql
CREATE OR REPLACE FUNCTION refresh_staff_token(
  _token text,
  _is_pwa boolean DEFAULT false
)
RETURNS TABLE(new_token text, expires_at timestamptz)
AS $$
  -- Extiende 365 días si es PWA, 4 horas si no
$$;
```

**Agregar columna `is_pwa`** a `staff_sessions`:

```sql
ALTER TABLE staff_sessions 
ADD COLUMN is_pwa boolean DEFAULT false;
```

---

#### 2. Frontend - Hook de Autenticación

**Modificar `useAuth.ts`**:

- Detectar si la app está en modo standalone (PWA instalada)
- Pasar el flag `is_pwa` al crear la sesión

```typescript
const login = async (username: string, password: string) => {
  // Detectar si es PWA standalone
  const isPWA = window.matchMedia('(display-mode: standalone)').matches 
    || (window.navigator as any).standalone === true;
  
  // Crear sesión con flag PWA
  const { data } = await supabase.rpc('create_staff_session', {
    _user_id: userId,
    _is_pwa: isPWA
  });
  
  // Guardar flag en localStorage para renovaciones
  if (isPWA) {
    localStorage.setItem(STORAGE_KEYS.STAFF_IS_PWA, 'true');
  }
};
```

---

#### 3. Frontend - Hook de Keep-Alive

**Modificar `useSessionKeepAlive.ts`**:

- Detectar si es sesión PWA
- Ajustar intervalos y umbrales según el tipo

```typescript
const isPWA = localStorage.getItem(STORAGE_KEYS.STAFF_IS_PWA) === 'true';

// Intervalos diferenciados
const REFRESH_INTERVAL = isPWA 
  ? 6 * 60 * 60 * 1000   // 6 horas para PWA
  : 10 * 60 * 1000;      // 10 minutos para web

const AUTO_REFRESH_THRESHOLD = isPWA
  ? 7 * 24 * 60 * 60 * 1000  // 7 días para PWA
  : 60 * 60 * 1000;          // 1 hora para web

// Desactivar modal de expiración para PWA
if (isPWA) {
  // Renovar silenciosamente sin mostrar modal
  await refreshToken(true);
  return;
}
```

---

#### 4. Storage Keys

**Agregar nueva key en `storageKeys.ts`**:

```typescript
export const STORAGE_KEYS = {
  // ... existentes
  STAFF_IS_PWA: 'paganos_staff_is_pwa',
} as const;

export const clearStaffStorage = () => {
  // ... existentes
  localStorage.removeItem(STORAGE_KEYS.STAFF_IS_PWA);
};
```

---

### Consideraciones de Seguridad

| Aspecto | Web (4h) | PWA (365d) |
|---------|----------|------------|
| Logout manual | ✅ Siempre disponible | ✅ Siempre disponible |
| Token único por usuario | ✅ | ✅ |
| Invalidación remota | ✅ Admin puede invalidar | ✅ Admin puede invalidar |
| Riesgo de robo | Bajo (expira rápido) | Medio (mitigado por estar en app nativa) |

**Mitigaciones adicionales:**
- El token se invalida si el usuario es desactivado en el sistema
- El administrador puede forzar cierre de sesión desde el panel
- La sesión se verifica en cada operación crítica

---

### Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `supabase/migrations/XXXXX.sql` | Nuevas funciones SQL |
| `src/lib/storageKeys.ts` | Nueva key `STAFF_IS_PWA` |
| `src/hooks/useAuth.ts` | Detectar PWA y pasar flag |
| `src/hooks/useSessionKeepAlive.ts` | Lógica diferenciada |
| `src/integrations/supabase/types.ts` | Tipos actualizados (auto) |

---

### Complejidad y Tiempo Estimado

| Aspecto | Evaluación |
|---------|------------|
| **Complejidad** | Media - cambios localizados |
| **Riesgo** | Bajo - no afecta sesiones web existentes |
| **Tiempo estimado** | 20-30 minutos |
| **Pruebas requeridas** | Login desde PWA, verificar persistencia, logout |

---

### Flujo de Usuario Final

1. Usuario instala la PWA en su celular
2. Abre la app e inicia sesión
3. Sistema detecta modo standalone → crea sesión de 365 días
4. Usuario cierra la app
5. Al reabrir (incluso días después) → sesión sigue activa
6. Notificaciones push funcionan sin interrupciones
7. Token se renueva automáticamente cada semana

