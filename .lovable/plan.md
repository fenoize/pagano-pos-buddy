# Aviso confiable de pedidos "Pendiente de aceptación" en el POS

## Objetivo
Que el cajero se entere de un pedido de la app en segundos, sin refrescar, y que el sistema avise claramente cuando no está en condiciones de recibir pedidos.

## Cómo funciona hoy (verificado)
- El aviso instantáneo llega por conexión en vivo con el servidor.
- Como respaldo, el POS vuelve a consultar cada 10 segundos.
- Si pasa más de 1 minuto sin una lectura exitosa, aparece la barra roja "Sin conexión" con alarma.

## Cambios propuestos

1. Consulta de respaldo cada 30 segundos (en vez de 10), con dos excepciones para no perder velocidad:
   - Si la conexión en vivo está caída o con error, vuelve automáticamente a 10 segundos hasta recuperarse.
   - Consulta inmediata al volver a la pestaña, al enfocar la ventana y al recuperar internet.
   El aviso normal sigue siendo instantáneo por la conexión en vivo; los 30 segundos son solo el paracaídas.

2. Ajustar el aviso de "sin conexión": como la consulta de respaldo pasa a 30 segundos, el umbral de "sistema ciego" sube de 60 a 90 segundos para evitar falsas alarmas, manteniendo la alarma sonora y el botón RECONECTAR.

3. Reforzar el aviso al cajero cuando llega un pedido:
   - Alarma sonora ascendente y banner rojo mientras haya pedidos por aceptar (ya existe; se verifica).
   - Notificación del sistema del computador con `requireInteraction` (no se cierra sola) y contador en el título de la pestaña.
   - El aviso suena aunque el interruptor "aceptar pedidos de la app" esté apagado.

4. Verificación de arranque visible: al iniciar sesión en el POS, si faltan permisos de sonido o notificaciones, o la conexión en vivo no queda establecida, mostrar un aviso persistente en pantalla con el botón para activarlos. Así nunca queda "silencioso sin que nadie lo note".

5. Latido de salud visible: un indicador discreto en la barra del POS con la hora de la última lectura correcta ("Pedidos al día 20:57"), para que el cajero pueda confirmar de un vistazo que el sistema está escuchando.

## Para que no vuelva a perderse a futuro
- Guardar como regla permanente del proyecto: cualquier pedido que pase a "Pendiente de aceptación" debe disparar aviso en el POS (sonido + banner + notificación del sistema), sin depender del interruptor de la caja; y la vigilancia de conexión no se elimina en cambios posteriores.
- Dejar las piezas de aviso concentradas en un solo lugar del código para que una modificación de pantallas no las desactive por accidente.

## Alternativas recomendadas (opcionales, si quieres redundancia total)
- **Push al dispositivo** (ya hay envío de notificaciones push): que el pedido nuevo también dispare push al equipo de caja. Funciona aunque el navegador esté minimizado o la pestaña cerrada; es la red de seguridad más fuerte.
- **Segundo canal de aviso**: mensaje a un grupo de WhatsApp/Telegram o correo si un pedido lleva más de 2 minutos sin aceptarse. Cubre el caso de computador apagado o congelado.
- **Modo pantalla siempre activa**: dejar el POS abierto en pantalla completa con la pestaña fijada, y bloquear la suspensión del equipo; evita que el sistema operativo congele la pestaña.

## Detalle técnico
- `src/hooks/useIncomingOrders.ts`: intervalo de respaldo dinámico (30s sano / 10s degradado) según el estado del canal; mantener refetch en `visibilitychange`, `focus` y `online`.
- `src/components/pos/ConnectionAlarmBanner.tsx`: `STALE_MS` 60000 → 90000.
- `src/lib/incomingOrdersChannelStore.ts`: exponer `lastSyncAt` para el indicador de latido.
- `src/components/pos/IncomingOrderBanner.tsx`: notificación nativa con `requireInteraction`, badge en `document.title`.
- `src/components/pos/StaffStartupChecks.tsx`: bloquear/alertar si faltan permisos de audio o notificaciones.
