/**
 * Versión de la plataforma Paganos POS
 * Actualizar este archivo en cada release
 */

 export const APP_VERSION = "1.3.4 (beta)";
 export const APP_BUILD_DATE = "2026-02-21";
export const APP_NAME = "Paganos POS";

 // Changelog de versiones
 export const CHANGELOG: { version: string; date: string; changes: string[] }[] = [
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