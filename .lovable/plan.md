

## Plan: Google Sign-In con Modal Obligatorio + Unificación de Formularios de Cliente

### Objetivo

1. **Integrar Google Sign-In** en el portal de cliente (`/login`) con un modal obligatorio post-autenticación para capturar teléfono y fecha de nacimiento
2. **Unificar los campos del formulario de cliente** en todas las partes del sistema (Portal, Admin, POS)
3. **Eliminar el campo RUT** de todos los formularios de cliente

---

### Vista Previa: Flujo Google Sign-In

```text
┌─────────────────────────────────────────────────────────────────┐
│                      Portal Paganos                              │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Iniciar Sesión  │  Registrarse                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  [Email]           tu@email.com                                  │
│  [Contraseña]      ********                                      │
│                                                                  │
│           [reCAPTCHA]                                            │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │            Iniciar Sesión                                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ─────────────────── o ───────────────────                       │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  [G]  Continuar con Google                               │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Vista Previa: Modal Obligatorio Post-Google

```text
┌─────────────────────────────────────────────────────────────────┐
│                 Completa tu perfil                               │
│─────────────────────────────────────────────────────────────────│
│                                                                  │
│  ¡Bienvenido! Para continuar, necesitamos algunos datos más.    │
│                                                                  │
│  Nombre:           Juan              (pre-llenado de Google)     │
│  Apellido:         Pérez             (pre-llenado de Google)     │
│                                                                  │
│  Teléfono: *       +56912345678                                  │
│  Fecha de nacimiento: *  [Selector de fecha]                     │
│                                                                  │
│  * Campos obligatorios                                           │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Completar Registro                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

### Cambios Requeridos

#### 1. Migración SQL: Actualizar Trigger `handle_new_customer_user`

El trigger actual no guarda `apellido`/`apellidos` correctamente. Actualizarlo para:
- Extraer `nombre` y `apellido` por separado desde `raw_user_meta_data`
- Guardar en ambos campos (`name`/`nombres` y `apellido`/`apellidos`) para consistencia

#### 2. Nuevo Componente: `GoogleProfileCompletionModal`

Ubicación: `src/components/customer/GoogleProfileCompletionModal.tsx`

Modal que se muestra cuando:
- El usuario se autentica con Google por primera vez
- El registro de `customers` existe pero `phone` o `fecha_nacimiento` está vacío

Campos del modal:
- **Nombres** (pre-llenado desde Google, editable)
- **Apellidos** (pre-llenado desde Google, editable)
- **Teléfono** (obligatorio)
- **Fecha de Nacimiento** (obligatorio)

Comportamiento:
- No se puede cerrar sin completar los campos obligatorios
- Al completar, actualiza el registro en `customers`
- Después de guardar, redirige al portal principal

#### 3. Modificar `CustomerAuthContext`

Agregar:
- Nueva función `signInWithGoogle()` que llama a `supabase.auth.signInWithOAuth({ provider: 'google' })`
- Estado `needsProfileCompletion: boolean` para controlar si mostrar el modal
- Lógica en `loadCustomerData()` para detectar si faltan datos obligatorios

#### 4. Modificar `CustomerLogin.tsx`

- Agregar botón "Continuar con Google" debajo del formulario de login
- Integrar el `GoogleProfileCompletionModal`
- Manejar el flujo OAuth de retorno

#### 5. Componente Unificado de Campos de Cliente

Crear: `src/components/shared/CustomerFieldsForm.tsx`

Un componente reutilizable con los campos estándar (sin RUT):
- `nombres` (string, obligatorio)
- `apellidos` (string, obligatorio)
- `email` (string, obligatorio)
- `phone` (string, opcional u obligatorio según contexto)
- `fecha_nacimiento` (date, opcional u obligatorio según contexto)

Props para controlar:
- `phoneRequired: boolean`
- `birthDateRequired: boolean`
- `showEmail: boolean` (a veces email viene de auth y no se debe editar)

#### 6. Refactorizar Formularios Existentes

| Formulario | Acción |
|------------|--------|
| `src/components/clientes/CustomerForm.tsx` | Usar `CustomerFieldsForm`, eliminar campo RUT |
| `src/components/pos/CustomerForm.tsx` | Usar `CustomerFieldsForm`, eliminar campo RUT |
| `src/components/pos/CustomerModal.tsx` | Usar `CustomerFieldsForm` para nuevo cliente |
| `src/pages/customer/CustomerLogin.tsx` (signup) | Usar `CustomerFieldsForm` |

#### 7. Migración SQL: Normalizar Campos Existentes

Crear función que sincronice datos entre campos duplicados:
- Si `name` tiene valor pero `nombres` está vacío, copiar a `nombres`
- Si `apellido` tiene valor pero `apellidos` está vacío, copiar a `apellidos`
- Viceversa para mantener consistencia

---

### Flujo Técnico: Google Sign-In

```text
1. Usuario hace clic en "Continuar con Google"
   |
2. CustomerAuthContext.signInWithGoogle()
   -> supabase.auth.signInWithOAuth({ provider: 'google', redirectTo: '/login' })
   |
3. Usuario se autentica en Google
   |
4. Redirect de vuelta a /login
   |
5. onAuthStateChange detecta nueva sesión
   |
6. loadCustomerData() verifica:
   - Existe customer con auth_user_id?
   - Tiene phone y fecha_nacimiento?
   |
7. Si faltan datos obligatorios:
   - setNeedsProfileCompletion(true)
   - Mostrar GoogleProfileCompletionModal
   |
8. Usuario completa modal
   -> completeProfile() actualiza customers
   -> setNeedsProfileCompletion(false)
   |
9. Redirect a portal principal
```

---

### Archivos a Crear

| Archivo | Descripción |
|---------|-------------|
| `src/components/customer/GoogleProfileCompletionModal.tsx` | Modal obligatorio post-Google |
| `src/components/shared/CustomerFieldsForm.tsx` | Componente unificado de campos |

### Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `src/contexts/CustomerAuthContext.tsx` | Agregar `signInWithGoogle`, `needsProfileCompletion`, `completeProfile` |
| `src/pages/customer/CustomerLogin.tsx` | Agregar botón Google + integrar modal |
| `src/components/clientes/CustomerForm.tsx` | Usar campos unificados, eliminar RUT |
| `src/components/pos/CustomerForm.tsx` | Usar campos unificados, eliminar RUT |
| `src/components/pos/CustomerModal.tsx` | Usar campos unificados para nuevo cliente |
| SQL Migration | Actualizar trigger + sincronizar campos legacy |

---

### Configuración Requerida en Supabase (Manual)

El usuario deberá configurar el proveedor Google OAuth en el dashboard de Supabase:

1. Ir a **Authentication > Providers > Google**
2. Habilitar Google
3. Configurar Client ID y Client Secret desde Google Cloud Console
4. Agregar URLs de redirect:
   - Preview: `https://id-preview--6a944ba5-d26c-4168-b9d4-80e417d9dea0.lovable.app`
   - Producción: `https://pagano-pos-buddy.lovable.app`

---

### Matriz de Campos Unificados (Sin RUT)

| Campo DB | Campo UI | Admin Form | POS Modal | Customer Signup | Google Modal |
|----------|----------|------------|-----------|-----------------|--------------|
| `nombres` | Nombres | Obligatorio | Obligatorio | Obligatorio | Pre-llenado |
| `apellidos` | Apellidos | Obligatorio | Obligatorio | Obligatorio | Pre-llenado |
| `email` | Email | Obligatorio | Obligatorio | Obligatorio | De Google |
| `phone` | Teléfono | Opcional | Opcional | Opcional | Obligatorio |
| `fecha_nacimiento` | Fecha Nac. | Opcional | No | Opcional | Obligatorio |

---

### Consideraciones de Seguridad

1. **Validación de datos**: El modal valida que teléfono y fecha sean válidos antes de guardar
2. **No se puede saltar**: El modal es obligatorio - no tiene botón de cerrar si faltan datos
3. **Datos de Google**: Solo se confía en email verificado de Google; nombre/apellido son editables
4. **RLS**: Las políticas existentes de `customers` aplican normalmente

