
## Diagnóstico (qué está pasando y por qué)

### 1) Error al editar: “ID de dirección inválido”
- **Causa real**: `CustomerAddressCard` llama `onEdit(address.id)` (envía un string), pero en `MyAddresses` se está pasando `handleOpenDialog` que espera recibir **el objeto address completo**.
- Resultado:
  - `editingAddress` termina siendo un **string** (el uuid), no un objeto.
  - Luego `handleSaveAddress` intenta validar `editingAddress.id` ⇒ `undefined` ⇒ dispara el error “ID de dirección inválido”.
  - Además, `initialData` se construye desde `editingAddress.alias`, etc. ⇒ todo queda `undefined` ⇒ el formulario aparece “en blanco”.

### 2) Modal “Editar dirección” aparece claro (no oscuro)
- En el Customer App la UI se oscurece usando la clase `.customer-app` (variables CSS).
- **Pero** el `Dialog` de Radix renderiza en un **Portal** (cuelga del `<body>`), por lo que **no hereda** las variables de `.customer-app`.
- Por eso el modal se ve con los colores del tema global (claro).

### 3) Dropdown de sugerencias sigue apareciendo después de seleccionar
- `AddressAutocomplete` ya intenta evitarlo con `justSelected`, pero aún puede reabrirse por:
  - un `setTimeout` de debounce que quedó programado antes de la selección, o
  - foco en el input con `suggestions` no completamente reseteadas por un ciclo de render/async.
- Necesitamos “cancelar” el debounce al seleccionar y blindar el estado para que no vuelva a abrir.

### 4) Al editar una dirección guardada, el formulario no muestra los datos
- Aunque `MyAddresses` pasa `initialData`, `AddressFormWithMap` inicializa `useState(...)` solo una vez.
- Cuando abres el modal y cambia `initialData`, el estado interno **no se sincroniza** automáticamente.
- Debe agregarse un `useEffect` que actualice `formData`, `addressSearch` y `hasValidLocation` cuando cambie `initialData`.

---

## Cambios propuestos (solución)

### A) Corregir el flujo de “Editar” para pasar el objeto correcto
**Archivos:**  
- `src/components/customer/CustomerAddressCard.tsx`  
- `src/pages/customer/MyAddresses.tsx`

**Acción:**
1. Cambiar la prop `onEdit` para que reciba el objeto completo:
   - De: `onEdit: (id: string) => void`
   - A: `onEdit: (address: Address) => void`
2. En `CustomerAddressCard`, cambiar el botón:
   - De: `onClick={() => onEdit(address.id)}`
   - A: `onClick={() => onEdit(address)}`
3. En `MyAddresses`, mantener `handleOpenDialog(address?: any)` tal como está (ya soporta recibir el objeto) y pasarla correctamente:
   - `onEdit={handleOpenDialog}` quedará coherente (recibe address object).

**Resultado esperado:**
- `editingAddress` vuelve a ser un objeto con `.id`, `.alias`, etc.
- Se elimina el error “ID de dirección inválido” al editar.
- `initialData` se llena correctamente.

---

### B) Hacer que el modal de Editar Dirección sea oscuro (solo en Customer App)
**Archivo:** `src/pages/customer/MyAddresses.tsx`

**Acción:**
- Forzar el “scope” de tema en el contenido del Dialog agregando la clase `.customer-app` al `DialogContent`:
  - Ejemplo: `className="customer-app max-w-md ..."`

**Por qué así:**
- `.customer-app` define variables CSS para fondo, card, popover, etc. y funciona aunque el modal esté en un Portal.

**Resultado esperado:**
- El modal se verá oscuro (mismo look del Customer App), sin cambiar el tema global del resto del sistema.

---

### C) Evitar que el dropdown siga mostrando sugerencias después de seleccionar
**Archivo:** `src/components/pos/AddressAutocomplete.tsx`

**Acciones:**
1. En `handleSelect`:
   - Cancelar cualquier búsqueda pendiente: `clearTimeout(debounceRef.current)`
   - Resetear `debounceRef.current`
2. Endurecer la lógica para cerrar:
   - Asegurar `setSuggestions([])` + `setIsOpen(false)` antes de disparar `onChange`/`onSelect` (o mantener el `flushSync` pero agregando el clearTimeout).
3. Ajustar `performSearch`:
   - Si `justSelected === true`, retornar sin reabrir; y opcionalmente evitar que se dispare en el siguiente tick con un “guard” adicional (por ejemplo, si `query === lastSelectedValue`).

**Resultado esperado:**
- Al tocar una sugerencia, el dropdown desaparece y no vuelve a abrirse inmediatamente.

---

### D) Al editar, precargar correctamente los datos en el formulario y en el buscador
**Archivo:** `src/components/customer/AddressFormWithMap.tsx`

**Acciones:**
1. Agregar `useEffect` que re-sincronice estado cuando cambie `initialData`:
   - `setFormData(...)` con los valores iniciales
   - `setAddressSearch(...)` con `formatted_address` o `${calle} ${numero}`
   - `setHasValidLocation(!!lat && !!lng)`
2. (Recomendado) Cuando se abra para editar y existan coordenadas:
   - Hacer que el mapa muestre el marcador desde el inicio (ya lo hace si `hasValidLocation` y lat/lng están seteados; con la sincronización quedará consistente).

**Resultado esperado:**
- Al abrir “Editar dirección”, el formulario muestra alias, depto, comuna, referencias y el addressSearch precargado.
- Se comporta como edición real, no como “agregar nueva”.

---

## Validaciones y seguridad (para evitar errores futuros)
- Mantener la validación UUID en `MyAddresses`, pero al arreglar el `onEdit`, el caso “editingAddress.id undefined” desaparece.
- Agregar un “guard” adicional en `handleSaveAddress`:
  - Si `editingAddress` existe pero no tiene forma de objeto (por alguna razón), mostrar toast y no llamar a Supabase.

---

## Plan de prueba (QA rápido)
1. Entrar al Customer App, ir a **Perfil → Mis Direcciones**.
2. Crear una dirección nueva:
   - Seleccionar sugerencia, verificar que el dropdown se cierre y no reabra.
   - Guardar.
3. Editar esa dirección:
   - Abrir modal: debe verse **oscuro**.
   - Campos deben venir precargados (alias, depto, comuna, referencias).
   - Guardar cambios: debe actualizar y reflejarse en la lista.
4. Marcar “Hacer principal” y verificar que solo una quede como Principal.
5. Repetir selección de dirección y confirmar que las sugerencias no queden “pegadas”.

---

## Archivos que se tocarán
- `src/components/customer/CustomerAddressCard.tsx` (ajustar onEdit para pasar objeto address)
- `src/pages/customer/MyAddresses.tsx` (DialogContent con `.customer-app`, wiring correcto de onEdit)
- `src/components/pos/AddressAutocomplete.tsx` (cancelación de debounce + cierre robusto del dropdown)
- `src/components/customer/AddressFormWithMap.tsx` (sincronizar estados cuando cambia `initialData`)

---

## Riesgos / consideraciones
- Cambiar la firma de `onEdit` requiere revisar si `CustomerAddressCard` se usa en otro lugar. Antes de implementar, haré una búsqueda de referencias y ajustaré cualquier uso adicional si existiera.
- Forzar `.customer-app` en el `DialogContent` solo afectará ese modal (no cambia tema global).

