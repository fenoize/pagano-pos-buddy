/**
 * Módulo de Integraciones de Paganos POS
 * 
 * Este módulo centraliza todas las integraciones con servicios externos:
 * - MercadoPago: Pasarela de pagos
 * - WhatsApp (futuro): Notificaciones y comunicación
 * - Mapbox (futuro): Cálculo de distancias y tarifas de delivery
 * - Otros servicios según necesidad
 */

export * from './mercadopago';

// Aquí se agregarán más integraciones en el futuro:
// export * from './whatsapp';
// export * from './mapbox';
