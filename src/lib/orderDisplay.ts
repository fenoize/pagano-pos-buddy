/**
 * Helpers to obtain the display name of an order's customer.
 *
 * Resolution priority:
 *   1. If the order has a `customer_id` → resolve the name from the joined
 *      `customers` row (COALESCE of nombres+apellidos, or legacy name+apellido).
 *      Optionally fall back to a provided customers list if the inline join
 *      did not return data.
 *   2. If the order does NOT have a `customer_id` → use the free-text
 *      `nombre_resumen` snapshot typed by the cashier.
 *   3. Otherwise → return the fallback label (default: "Sin cliente").
 */

type AnyCustomer = {
  id?: string | null;
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

export function getOrderDisplayName(
  order: AnyOrder,
  customersList?: AnyCustomer[],
  fallback: string = 'Sin cliente',
): string {
  // 1. Registered customer (customer_id present)
  if (order?.customer_id) {
    const fromInline = getCustomerFullName(order?.customer);
    if (fromInline) return fromInline;

    if (customersList?.length) {
      const found = customersList.find((c: any) => c && c.id === order.customer_id);
      const fromList = getCustomerFullName(found);
      if (fromList) return fromList;
    }
    // customer_id exists but no resolvable name → fall through to snapshot/fallback
  }

  // 2. Free-text name typed by the cashier
  const snapshot = (order?.nombre_resumen || '').trim();
  if (snapshot && snapshot.toLowerCase() !== 'cliente') return snapshot;

  // 3. Nothing usable
  return fallback;
}
