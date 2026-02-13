

## Mejoras al Modulo Pedido Listo (TV)

### Problema actual
1. **Carga lenta al inicio**: La pantalla carga todos los pedidos con configuracion por defecto antes de recibir la configuracion guardada, causando una doble consulta.
2. **No recuerda configuracion**: Si se recarga la pagina sin parametro `?screen=`, pierde la configuracion seleccionada.
3. **Sin boton de forzar actualizacion**: El boton de refresh actual solo recarga pedidos, no la configuracion ni el contenido promocional.

### Solucion

#### 1. Persistir configuracion en localStorage
- Al cargar o cambiar una configuracion de pantalla, guardar el `screen_config_id` en `localStorage` con clave `paganos_tv_screen_id`.
- Al iniciar la pagina, la prioridad sera:
  1. Parametro URL `?screen=` (si existe)
  2. ID guardado en `localStorage`
  3. Configuracion marcada como `is_default` en la base de datos

#### 2. Evitar carga innecesaria de pedidos
- No ejecutar la consulta de pedidos (`useReadyOrders`) hasta que la configuracion este cargada (para usar los `visible_statuses` correctos desde el inicio).
- Mostrar un spinner mientras se resuelve la configuracion, evitando la doble consulta.

#### 3. Boton de forzar actualizacion completa
- Agregar un boton dedicado (con icono diferenciado) que invalide las queries de:
  - Configuracion de pantalla (`tv-screen-config`)
  - Contenido TV (`active-tv-screen-content`)
  - Pedidos (`ready-orders`)
- Mostrar un toast confirmando la actualizacion.

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/pages/ReadyOrdersTV.tsx` | Logica de persistencia en localStorage, esperar config antes de cargar pedidos, boton de forzar actualizacion completa |
| `src/hooks/useReadyOrders.ts` | Agregar opcion `enabled` para no ejecutar la consulta hasta que la config este lista |
| `src/lib/storageKeys.ts` | Agregar clave `TV_SCREEN_ID` |

### Detalle tecnico

**localStorage key**: `paganos_tv_screen_id`

**Flujo de inicio optimizado**:
```text
Inicio -> Resolver screenId (URL > localStorage > default)
       -> Cargar config desde DB con ese ID
       -> Una vez cargada -> activar useReadyOrders con visible_statuses correctos
       -> Renderizar layout
```

**Boton forzar actualizacion**: Usara `queryClient.invalidateQueries` para invalidar todas las queries relevantes de una vez, forzando re-fetch desde Supabase.

