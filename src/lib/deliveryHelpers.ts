import { Address, Comuna, DeliveryZone, User } from '@/types';

/**
 * Formatea una dirección completa para mostrar
 */
export const formatDeliveryAddress = (
  addressLine: string,
  number: string,
  comuna: string,
  reference?: string
): string => {
  let address = `${addressLine} ${number}, ${comuna}`;
  if (reference && reference.trim()) {
    address += ` (${reference})`;
  }
  return address;
};

/**
 * Crea un snapshot de la información de delivery para guardar en la orden
 */
export const createDeliverySnapshot = (
  zone: DeliveryZone,
  addressLine: string,
  addressNumber: string,
  comuna: Comuna,
  reference?: string,
  repartidor?: User
) => {
  return {
    delivery_zone_id: zone.id,
    delivery_zone_name: zone.name,
    delivery_fee: zone.delivery_fee,
    delivery_address: addressLine,
    delivery_number: addressNumber,
    delivery_comuna_id: comuna.id,
    delivery_comuna: comuna.name,
    delivery_reference: reference || null,
    delivery_person_id: repartidor?.id || null,
    delivery_person_name: repartidor?.full_name || null
  };
};

/**
 * Convierte un snapshot de dirección de orden a formato Address
 */
export const getAddressFromSnapshot = (
  addressLine: string,
  addressNumber: string,
  comunaId: string,
  comunaName: string,
  reference?: string
): Partial<Address> => {
  return {
    calle: addressLine,
    numero: addressNumber,
    comuna_id: comunaId,
    comuna: comunaName,
    ciudad: 'Santiago',
    observaciones: reference || '',
    alias: 'Delivery',
    is_default: false
  };
};

/**
 * Información de pago para repartidor
 */
export interface DeliveryPaymentInfo {
  isPaidInFull: boolean;
  methods: string[];
  amountToCollect: number;
  estimatedChange?: number;
  paidAmount: number;
  hasPartialPayment: boolean;
}

/**
 * Calcula la información de pago relevante para el repartidor
 * Usa la misma lógica que PaymentModal para calcular vuelto
 */
export const calculateDeliveryPaymentInfo = (
  order: any,
  runaRewardValue: number = 1300
): DeliveryPaymentInfo => {
  const {
    total,
    payment_efectivo = 0,
    payment_mp = 0,
    payment_pos = 0,
    payment_aplicacion = 0,
    payment_runas = 0,
    payment_method,
    status
  } = order;

  // Calcular pagos no efectivo
  const nonCashPayments = payment_mp + payment_pos + payment_aplicacion + (payment_runas * runaRewardValue);

  // Determinar métodos de pago usados
  const methods: string[] = [];
  
  // Primero revisar payment_method para determinar el método principal
  const methodLabels: Record<string, string> = {
    efectivo: 'Efectivo',
    mp: 'MercadoPago',
    pos: 'POS',
    aplicacion: 'App',
    runas: 'Runas',
    mixto: 'Mixto',
    pendiente: 'Pendiente de cobro'
  };
  
  if (payment_method) {
    const normalizedMethod = payment_method.toLowerCase();
    methods.push(methodLabels[normalizedMethod] || payment_method);
  }
  
  // Agregar métodos adicionales si hay pagos mixtos
  if (payment_mp > 0 && !methods.includes('MercadoPago')) methods.push('MercadoPago');
  if (payment_pos > 0 && !methods.includes('POS')) methods.push('POS');
  if (payment_aplicacion > 0 && !methods.includes('App')) methods.push('App');
  if (payment_runas > 0 && !methods.includes('Runas')) methods.push('Runas');

  // LÓGICA PARA DELIVERY:
  const normalizedPaymentMethod = payment_method?.toLowerCase() || '';
  const isEffectivoMethod = normalizedPaymentMethod === 'efectivo';
  const isPendienteMethod = normalizedPaymentMethod === 'pendiente';
  const needsCollection = isEffectivoMethod || isPendienteMethod;

  const isPaidInFull = needsCollection
    ? status === 'Entregado' && (order.payment_status === 'paid')
    : nonCashPayments >= total;

  // Calcular monto a cobrar
  const amountToCollect = needsCollection
    ? (status === 'Entregado' && order.payment_status === 'paid' ? 0 : total)
    : Math.max(0, total - nonCashPayments);

  // Calcular vuelto estimado SOLO si:
  // 1. Ya está entregado (para efectivo) o hay payment_efectivo > 0
  // 2. Hay efectivo registrado
  let estimatedChange: number | undefined;
  if (status === 'Entregado' && payment_efectivo > 0) {
    const amountToCoverWithCash = Math.max(0, total - nonCashPayments);
    estimatedChange = Math.max(0, payment_efectivo - amountToCoverWithCash);
  }

  return {
    isPaidInFull,
    methods,
    amountToCollect,
    estimatedChange,
    paidAmount: nonCashPayments,
    hasPartialPayment: nonCashPayments > 0 && !isPaidInFull
  };
};
