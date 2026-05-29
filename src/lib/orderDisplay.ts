/**
 * Helpers to obtain the display name of an order's customer.
 * Always prefer the registered customer's real name over the legacy
 * `nombre_resumen` snapshot, since the snapshot is frequently empty
 * or set to the generic literal "Cliente".
 */

type AnyCustomer = {
  nombres?: string | null;
  apellidos?: string | null;
  name?: string | null;
  apellido?: string | null;
} | null | undefined;

export function getCustomerFullName(customer: AnyCustomer): string {
  if (!customer) return '';
  const fromNombres = `${customer.nombres || ''} ${customer.apellidos || ''}`.trim();
  if (fromNombres) return fromNombres;
  const fromName = `${customer.name || ''} ${customer.apellido || ''}`.trim();
  return fromName;
}

type AnyOrder = {
  customer?: AnyCustomer;
  customer_id?: string | null;
  nombre_resumen?: string | null;
};

/**
 * Returns the best display name for an order.
 * Priority: joined customer (nombres/apellidos → name/apellido)
 *        → fallback list (same priority)
 *        → nombre_resumen snapshot
 *        → "Cliente"
 */
export function getOrderDisplayName(
  order: AnyOrder,
  customersList?: AnyCustomer[],
  fallback: string = 'Cliente',
): string {
  const fromInline = getCustomerFullName(order?.customer);
  if (fromInline) return fromInline;

  if (order?.customer_id && customersList?.length) {
    const found = customersList.find((c: any) => c && c.id === order.customer_id);
    const fromList = getCustomerFullName(found);
    if (fromList) return fromList;
  }

  const snapshot = (order?.nombre_resumen || '').trim();
  if (snapshot && snapshot.toLowerCase() !== 'cliente') return snapshot;
  return snapshot || fallback;
}
