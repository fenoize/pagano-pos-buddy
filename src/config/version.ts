/**
 * Versión de la plataforma Paganos POS
 * Actualizar este archivo en cada release
 */

 export const APP_VERSION = "1.5.2";
 export const APP_BUILD_DATE = "2026-06-08";
export const APP_NAME = "Paganos POS";

 // Changelog de versiones
 export const CHANGELOG: { version: string; date: string; changes: string[] }[] = [
   {
     version: "1.5.1",
     date: "2026-05-29",
     changes: [
       "Badges de canal de venta diferenciados: Tienda (POS), Web y App del cliente",
       "Nuevo tipo de campaña de Fidelización: Multiplicador de Runas (x2, x3, x4, x5)",
       "Automatización de 'Pedidos online' según horario de apertura/cierre del local",
       "Soporte de horarios que cruzan medianoche en la configuración de Locales",
       "Notificación automática (push y correo) a admins si abre la hora sin caja iniciada",
       "Sincronización automática del estado de la tienda con el sitio WordPress",
       "Los nombres reales de clientes registrados ahora se muestran en KDS, Ventas y Últimas Órdenes",
       "Mejoras de estabilidad y correcciones menores"
     ]
   },
   {
     version: "1.5.0",
     date: "2026-04-28",
     changes: [
       "Nuevo sistema de Etiquetas de Clientes: permite categorizar usuarios manualmente o automáticamente",
       "Asignación automática de etiquetas a clientes registrados desde Alianzas de Marketing",
       "Nueva pestaña 'Etiquetas' en el módulo de Clientes para gestión del catálogo (crear, editar, eliminar, color)",
       "Chips de etiquetas visibles en la tabla y detalle de cada cliente, con búsqueda y creación al vuelo",
       "Selector de 'Etiqueta automática' en la configuración de Alianzas de Marketing",
       "Tooltip con el origen de cada etiqueta (manual o por alianza) en el detalle del cliente",
       "Personalización de productos en la app del cliente: imagen 1:1, selección de proteína primero",
       "Visualización del precio de cada proteína en la personalización (incluyendo $0)",
       "Corrección: la lista de clientes ahora carga correctamente al ingresar al módulo (sin requerir filtro)",
       "Corrección: creación de etiquetas funcionando con políticas RLS de staff",
       "Mejoras de estabilidad y correcciones menores"
     ]
   },
   {
     version: "1.4.0",
     date: "2026-03-28",
     changes: [
       "Nuevo sistema de Puntos de Progresión: los clientes acumulan 1 punto por cada $100 gastados en ventas reales",
       "Separación completa de Runas (moneda de canje) y Puntos (progresión de nivel)",
       "Los puntos se consumen al subir de nivel según el costo definido por cada rango",
       "Nuevo tab 'Niveles e Insignias' en el modal de Clientes del panel admin",
       "Gestión admin de puntos: agregar, restar y forzar nivel manualmente",
       "Gestión admin de insignias: otorgar y eliminar insignias desde el panel",
       "Historial de movimientos de puntos visible en el panel admin",
       "Campañas de Fidelización: sistema de desafíos de marketing con recompensas en runas",
       "Soporte para campañas de tipo: registro, compra de productos, monto acumulado y primera compra",
       "Evaluación automática de campañas tras confirmar pedido o registrar cliente",
       "Gestión de campañas desde el módulo de Fidelización (solo administradores)",
       "Visualización de nivel, puntos y barra de progreso en el perfil del cliente (app)",
       "Indicador de Runas, Nivel y Puntos en la pantalla de inicio del cliente",
       "Barra de progreso al siguiente nivel basada en puntos en el portal del cliente",
       "Mejoras de seguridad en RLS para insignias otorgadas y log de puntos",
     ]
   },
   {
     version: "1.3.5 (beta)",
     date: "2026-03-15",
     changes: [
       "Mejoras de estabilidad y correcciones menores",
       "Preparación de infraestructura para el sistema de puntos y campañas"
     ]
   },
   {
     version: "1.3.4 (beta)",
     date: "2026-02-21",
     changes: [
       "Soporte multi-rol: los usuarios ahora pueden tener más de un rol simultáneamente (ej: Cajero + Cocinero)",
       "Formulario de usuarios actualizado con selección múltiple de roles mediante checkboxes",
       "Corrección de error al editar roles de usuarios (RLS en user_roles)",
       "Nueva función sync_user_roles para sincronización segura de roles",
       "Registro de cambios de estado en historial de pedidos (order_audits)",
       "Corrección de error en Select vacío en edición masiva de turnos RRHH",
       "Mejoras de estabilidad y correcciones menores"
     ]
   },
   {
     version: "1.3.3 (beta)",
     date: "2026-02-17",
     changes: [
       "Búsqueda inteligente en Nueva Venta: al buscar una variante, se preselecciona automáticamente al abrir el producto",
       "Corrección de cobro en combos con variantes incluidas en precio base",
       "Botones Cancelar y Confirmar Pago siempre visibles en el modal de pago",
       "Mejoras de usabilidad y correcciones menores"
     ]
   },
   {
     version: "1.3.2 (beta)",
     date: "2026-02-11",
     changes: [
       "Reloj en tiempo real visible en Cocina KDS, incluyendo modo pantalla completa",
       "Nuevo sistema de Suscripción de Descuento Permanente para clientes",
       "Los clientes con suscripción reciben descuento automático en cada compra",
       "Gestión de descuentos desde la pestaña Suscripciones en Clientes",
       "Visualización de Runas como cantidad en vez de monto en pesos en la app del cliente",
       "Nuevo módulo 'Mi Configuración' para todos los usuarios del staff",
       "Todos los roles pueden cambiar tema (claro/oscuro) y actualizar la app",
       "Mejoras de estabilidad y correcciones menores"
     ]
   },
   {
     version: "1.3.0 (beta)",
     date: "2026-02-05",
     changes: [
       "Nuevo sistema de Pagos Pendientes: permite enviar pedidos a cocina sin pago inmediato",
       "Indicador visual en el header mostrando pedidos pendientes de cobro",
       "Panel lateral para gestionar y cobrar pedidos pendientes",
       "Alertas al cerrar turno con pedidos sin pagar",
       "Notificación al abrir turno sobre pedidos heredados de turnos anteriores",
       "Nuevo método de pago 'Pendiente' en el flujo de venta",
       "Modal dedicado para cobrar pedidos pendientes con cualquier método de pago"
     ]
   },
   {
     version: "1.2.8 (beta)",
     date: "2026-01-22",
     changes: [
       "Mejoras de estabilidad general",
       "Correcciones de errores menores"
     ]
   }
 ];