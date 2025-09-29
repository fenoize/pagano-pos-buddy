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
