// Verifica horarios de los locales y activa/desactiva accepts_online_orders
// según horario y existencia de turno de caja abierto. Corre vía pg_cron cada 5 min.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

type DayHours = { open: string; close: string; closed: boolean; closes_next_day?: boolean }

const toMin = (s: string) => {
  const [h, m] = (s || '00:00').split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

// Devuelve { weekdayIdx (0=Sun..6=Sat), minutes (0..1439) } en la timezone dada
function nowInTz(tz: string): { weekdayIdx: number; minutes: number } {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts = fmt.formatToParts(new Date())
  const wd = parts.find((p) => p.type === 'weekday')?.value || 'Sun'
  const hh = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10)
  const mm = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10)
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  return { weekdayIdx: map[wd] ?? 0, minutes: (hh % 24) * 60 + mm }
}

const within3 = (target: number, current: number) => Math.abs(target - current) <= 3

async function notifyNoShift(
  supabase: any,
  branchName: string,
  expectedTime: string
) {
  // ── OneSignal push a Administradores ──
  try {
    const oneSignalKey = Deno.env.get('ONESIGNAL_REST_API_KEY')
    const { data: cfg } = await supabase
      .from('config')
      .select('value')
      .eq('key', 'onesignal_app_id')
      .maybeSingle()
    const appId = cfg?.value

    if (oneSignalKey && appId) {
      const resp = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${oneSignalKey}`,
        },
        body: JSON.stringify({
          app_id: appId,
          filters: [
            { field: 'tag', key: 'role', relation: '=', value: 'Administrador' },
          ],
          headings: { es: `⚠ Sin turno activo — ${branchName}` },
          contents: {
            es: `Son las ${expectedTime} y no hay turno de caja abierto en ${branchName}. Los pedidos online NO se activaron automáticamente.`,
          },
          priority: 10,
        }),
      })
      if (!resp.ok) {
        console.error('[schedule-checker] OneSignal error', resp.status, await resp.text())
      }
    }
  } catch (e) {
    console.error('[schedule-checker] OneSignal exception', e)
  }

  // ── Email Resend a administradores ──
  try {
    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) return

    const { data: admins } = await supabase
      .from('users')
      .select('email')
      .eq('role', 'Administrador')
      .eq('active', true)
      .not('email', 'is', null)

    const emails = (admins || []).map((a: any) => a.email).filter(Boolean)
    if (emails.length === 0) return

    const html = `
      <h2>⚠ Sin turno de caja activo</h2>
      <p>El sistema intentó activar los pedidos online a las <strong>${expectedTime}</strong> en <strong>${branchName}</strong>, pero no encontró un turno de caja abierto.</p>
      <p>Los pedidos web y de la app <strong>no están siendo recibidos</strong>.</p>
      <p>Inicia sesión en el POS y abre el turno para reactivarlos.</p>
    `

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Paganos Burger <sistema@paganosburger.cl>',
        to: emails,
        subject: `⚠ Sin turno activo — ${branchName}`,
        html,
      }),
    })
    if (!resp.ok) {
      console.error('[schedule-checker] Resend error', resp.status, await resp.text())
    }
  } catch (e) {
    console.error('[schedule-checker] Resend exception', e)
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const summary = {
    checked: 0,
    openedCount: 0,
    closedCount: 0,
    noShiftCount: 0,
    sessionsDisabled: 0,
    sessionsEnabled: 0,
    errors: 0,
  }

  try {
    const { data: branches, error } = await supabase
      .from('branches')
      .select('id, name, timezone, opening_hours, accepts_online_orders, is_active')
      .eq('is_active', true)
      .not('opening_hours', 'is', null)

    if (error) throw error

    for (const branch of branches || []) {
      summary.checked++
      try {
        const tz = branch.timezone || 'America/Santiago'
        const { weekdayIdx, minutes: currentMin } = nowInTz(tz)
        const hours = branch.opening_hours as Record<string, DayHours>
        const today = hours[DAY_KEYS[weekdayIdx]]
        const prev = hours[DAY_KEYS[(weekdayIdx + 6) % 7]]

        // ── Determinar de forma DETERMINISTA si el local debe estar abierto ahora ──
        // Considera horario del día actual (con posible cierre al día siguiente)
        // y horario del día anterior con closes_next_day que aún no cerró.
        let shouldBeOpen = false

        if (today && today.closed === false) {
          const openMin = toMin(today.open)
          const closeMin = toMin(today.close)
          if (today.closes_next_day === true) {
            // Abre hoy y cierra mañana → desde openMin hasta fin del día
            if (currentMin >= openMin) shouldBeOpen = true
          } else {
            // Mismo día: [open, close)
            if (currentMin >= openMin && currentMin < closeMin) shouldBeOpen = true
          }
        }

        if (!shouldBeOpen && prev && prev.closed === false && prev.closes_next_day === true) {
          // Ventana de cierre cruzado del día anterior: [00:00, close)
          const closeMin = toMin(prev.close)
          if (currentMin < closeMin) shouldBeOpen = true
        }

        // ── Reconciliar branches.accepts_online_orders ──
        if (shouldBeOpen !== branch.accepts_online_orders) {
          await supabase
            .from('branches')
            .update({ accepts_online_orders: shouldBeOpen })
            .eq('id', branch.id)
          if (shouldBeOpen) summary.openedCount++
          else summary.closedCount++
        }

        // ── Reconciliar el "badge" por sesión de caja abierta ──
        // Este es el flag real que consume la app cliente (cash_sessions.accept_app_orders).
        const { data: openSessions } = await supabase
          .from('cash_sessions')
          .select('id, accept_app_orders')
          .eq('branch_id', branch.id)
          .is('closed_at', null)

        if (shouldBeOpen) {
          // En horario: activar el badge en sesiones que lo tengan en false
          // (respeta desactivaciones manuales SOLO al cierre; al abrir el ciclo lo reactiva)
          const openMin = today ? toMin(today.open) : -1
          const isOpeningEdge = today && today.closed === false && within3(openMin, currentMin)

          if (isOpeningEdge && (!openSessions || openSessions.length === 0)) {
            await notifyNoShift(supabase, branch.name, today!.open)
            summary.noShiftCount++
          }

          if (isOpeningEdge && openSessions) {
            for (const s of openSessions) {
              if (!s.accept_app_orders) {
                await supabase
                  .from('cash_sessions')
                  .update({ accept_app_orders: true })
                  .eq('id', s.id)
                summary.sessionsEnabled++
              }
            }
          }
        } else {
          // Fuera de horario: forzar badge en OFF para toda sesión abierta.
          if (openSessions) {
            for (const s of openSessions) {
              if (s.accept_app_orders) {
                await supabase
                  .from('cash_sessions')
                  .update({ accept_app_orders: false })
                  .eq('id', s.id)
                summary.sessionsDisabled++
              }
            }
          }
        }
      } catch (e) {
        summary.errors++
        console.error('[schedule-checker] branch error', branch.id, e)
      }
    }

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (e) {
    console.error('[schedule-checker] fatal', e)
    return new Response(JSON.stringify({ error: String(e), summary }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
