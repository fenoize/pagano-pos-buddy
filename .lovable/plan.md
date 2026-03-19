

## Problem

Orders with failed/rejected MercadoPago payments stay stuck in "PendientePago" forever. Two scenarios need handling:

1. **Webhook receives rejected/cancelled payment** — currently the webhook keeps the order in "PendientePago" instead of cancelling it.
2. **Customer clicks "Cancelar y Volver al Menú"** on the payment failure page — the order remains in "PendientePago" with no cancellation logic.

## Plan

### 1. Update mp-webhook to cancel orders on rejected/cancelled payments

In `supabase/functions/mp-webhook/index.ts`, change the `rejected`/`cancelled` branch (lines 129-136) to set `status: 'Cancelado'` instead of keeping it in PendientePago.

```
} else if (payment.status === 'rejected' || payment.status === 'cancelled') {
  newStatus = 'Cancelado';
  updateData = {
    status: 'Cancelado',
    notes: `... ❌ Pago rechazado/cancelado ...`
  };
}
```

### 2. Add cancel logic to CustomerPaymentFailure page

When the customer clicks "Cancelar y Volver al Menú", update the order status to `Cancelado` before navigating away. This ensures abandoned payment attempts don't linger.

In `src/pages/customer/CustomerPaymentFailure.tsx`, add an `handleCancel` function:
- Call `supabase.from('orders').update({ status: 'Cancelado' }).eq('id', orderId)`
- Then navigate to `/menu`

### 3. Redeploy mp-webhook edge function

After updating the webhook code, redeploy the `mp-webhook` function.

### Files to modify
- `supabase/functions/mp-webhook/index.ts` — change rejected/cancelled status to Cancelado
- `src/pages/customer/CustomerPaymentFailure.tsx` — cancel order on "Cancelar" button click

