

## Problem

The current QR scanner page (`/pos/qr-scanner`) broadcasts to a generic `pos-qr-scan` channel with no session awareness. The user wants:

1. **Dedicated app experience** -- like Pedido Listo TV, the phone opens directly into a scanner-only mode (no POS navigation)
2. **Session binding** -- the phone selects which active cash session (turno) to pair with, so scans go to the correct POS terminal (critical for multi-branch: local vs foodtruck)
3. **Keep existing generic scanner** as-is

## Solution

### 1. New dedicated page: `/pos/qr-reader`

A standalone, full-screen scanner page (similar to ReadyOrdersTV's dedicated experience):

- **Step 1 - Setup**: Staff logs in (reuses existing staff auth). Then sees a list of **active cash sessions** (open, not closed) fetched from `cash_sessions`. Each shows the cashier name and opened time. The user picks which session to pair with.
- **Step 2 - Scanning**: Full-screen camera scanner, locked to the selected session. The broadcast channel becomes `pos-qr-scan-{session_id}` instead of the generic `pos-qr-scan`. Header shows a small badge with the paired session info. No other navigation -- just scanning.
- Camera selector, success/error overlays reused from existing scanner.
- A "Cambiar turno" button in header to go back to session selection.

### 2. Update `NewSale.tsx` listener

Currently listens on generic channel `pos-qr-scan`. Update to **also** listen on session-specific channel `pos-qr-scan-{currentSession.id}` when a cash session is active. Keep the generic channel as fallback (backward compat with the existing `/pos/qr-scanner` page).

### 3. Route registration

Add `/pos/qr-reader` route in `App.tsx`, wrapped in `StaffProtectedRoute`.

### 4. Storage key for persistence

Add `QR_READER_SESSION` to `STORAGE_KEYS` so the phone remembers which session it's paired with (survives page refresh). On load, verify the session is still open; if closed, go back to session picker.

## Files to create/modify

| File | Action |
|------|--------|
| `src/pages/pos/QRReaderPage.tsx` | **Create** -- dedicated scanner with session picker |
| `src/App.tsx` | **Modify** -- add route |
| `src/pages/NewSale.tsx` | **Modify** -- add session-specific channel listener |
| `src/lib/storageKeys.ts` | **Modify** -- add `QR_READER_SESSION` key |

## Technical detail

```text
Phone (QR Reader)                    Desktop (NewSale)
┌─────────────────┐                  ┌─────────────────┐
│ 1. Login        │                  │                  │
│ 2. Pick session │                  │ cash_session.id  │
│    (turno)      │                  │ = "abc-123"      │
│ 3. Scan QR      │                  │                  │
│    ──────────── broadcast ──────►  │ Listens on:      │
│    channel:     │  customer data   │ pos-qr-scan-     │
│    pos-qr-scan- │                  │ abc-123           │
│    abc-123      │                  │                  │
└─────────────────┘                  └─────────────────┘
```

- The session picker fetches `cash_sessions` where `closed_at IS NULL`, joined with `users` to show the cashier name
- Channel name: `pos-qr-scan-{session_id}` ensures scans only reach the correct POS terminal
- The generic `pos-qr-scan` channel from the original scanner page continues to work as before

