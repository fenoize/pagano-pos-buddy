

## Problem

The POS runs on a desktop without a camera/barcode gun, so staff cannot scan customer QR codes. A smartphone with a camera could act as a dedicated QR reader that sends the scanned customer to the active POS session in real time.

## Solution: Remote QR Scanner via Supabase Realtime Broadcast

Use Supabase Realtime **Broadcast** (no database needed) to create a peer-to-peer link between the smartphone scanner and the desktop POS.

```text
┌──────────────────┐   Broadcast channel    ┌──────────────────┐
│  Smartphone      │  ───────────────────►   │  Desktop POS     │
│  /pos/qr-scanner │   { customer data }     │  /pos (NewSale)  │
│  (camera + scan) │                         │  (receives event)│
└──────────────────┘                         └──────────────────┘
     Same Supabase channel: "pos-qr-{store_id}"
```

### How it works

1. **Desktop POS (`NewSale.tsx`)** subscribes to a Supabase Broadcast channel `pos-qr-scan`. When it receives a `customer-scanned` event, it sets the customer on the current sale (same as `onCustomerFound` from the existing QR modal).

2. **New page `/pos/qr-scanner`** — a mobile-optimized, full-screen QR scanner page that:
   - Authenticates with the same staff token
   - Opens the camera and continuously scans QR codes
   - When a valid `PAGANOS:{uuid}` QR is read, fetches the customer via `staff-list-customers`
   - Broadcasts the customer data to the channel
   - Shows a success confirmation with the customer name, then resumes scanning

3. **No database table needed** — Broadcast is ephemeral, peer-to-peer via Supabase Realtime.

### Implementation Steps

1. **Create `src/pages/pos/QRScannerPage.tsx`**
   - Full-screen camera scanner (reuse `html5-qrcode` already installed)
   - Staff auth check (redirect to `/pos/login` if no token)
   - On successful scan → fetch customer → broadcast via `supabase.channel('pos-qr-scan').send({ type: 'broadcast', event: 'customer-scanned', payload: customer })`
   - Visual feedback: customer name + "Enviado al POS" toast
   - Auto-resume scanning after 2 seconds

2. **Add route in `App.tsx`**
   - `/pos/qr-scanner` → `QRScannerPage` (staff-protected)

3. **Update `NewSale.tsx`**
   - Subscribe to `supabase.channel('pos-qr-scan')` on mount
   - On `customer-scanned` event → call the same `setCustomer()` logic + show toast "Cliente escaneado: {name}"
   - Cleanup channel on unmount

4. **Add link/button in POS UI**
   - In `CustomerModal.tsx`, add a small info text or button: "Usa un celular como lector QR" with a link/QR to `/pos/qr-scanner`

### Key Details

- Reuses existing `html5-qrcode` library and `staff-list-customers` edge function
- No new database tables or migrations
- Channel scoped so all open POS sessions receive the scan (simple for single-store setup)
- The scanner page is mobile-optimized (full viewport camera, large touch targets)

