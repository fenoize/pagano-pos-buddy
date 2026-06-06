
CREATE OR REPLACE FUNCTION public.send_session_close_email(p_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'net'
AS $function$
DECLARE
  v_session       RECORD;
  v_cajero_name   text;
  v_branch_name   text;
  v_resend_key    text;
  v_admin_emails  jsonb;
  v_subject       text;
  v_detail_url    text;
  v_html          text;
  v_orders_rows   text := '';
  v_moves_html    text := '';
  v_obs_html      text := '';
  v_total_pedidos int := 0;
  v_total_ventas  bigint := 0;
  v_sum_ef        bigint := 0;
  v_sum_mp        bigint := 0;
  v_sum_pos       bigint := 0;
  v_sum_ap        bigint := 0;
  v_n_ef          int := 0;
  v_n_mp          int := 0;
  v_n_pos         int := 0;
  v_n_ap          int := 0;
  v_n_mix         int := 0;
  v_n_moves       int := 0;
  r               RECORD;
  v_periodo       text;
  v_fecha_cierre  text;
  v_bg            text;
  v_i             int := 0;
  v_color         text;
  v_arrow         text;
  v_sign          text;
  v_amt           bigint;
  v_is_egreso     boolean;
BEGIN
  -- 1) Sesión + cajero + sucursal
  SELECT cs.*,
         COALESCE(u.full_name, u.username, 'Cajero') AS cajero,
         COALESCE(b.name, 'Sucursal')                AS branch
    INTO v_session
  FROM public.cash_sessions cs
  LEFT JOIN public.users u    ON u.id = cs.user_id
  LEFT JOIN public.branches b ON b.id = cs.branch_id
  WHERE cs.id = p_session_id;

  IF NOT FOUND OR v_session.closed_at IS NULL THEN
    RETURN;
  END IF;

  v_cajero_name := v_session.cajero;
  v_branch_name := v_session.branch;

  -- 2) Resend API key
  SELECT trim(both '"' from value::text) INTO v_resend_key
  FROM public.config
  WHERE key ILIKE '%resend%'
  LIMIT 1;

  IF v_resend_key IS NULL OR v_resend_key = '' THEN
    RAISE WARNING 'send_session_close_email: RESEND key not found in config';
    RETURN;
  END IF;

  -- 3) Correos administradores
  SELECT COALESCE(jsonb_agg(email), '[]'::jsonb) INTO v_admin_emails
  FROM (
    SELECT DISTINCT email
    FROM public.users
    WHERE role = 'Administrador'
      AND active = TRUE
      AND email IS NOT NULL
      AND email ~ '^.+@.+\..+$'
  ) s;

  IF jsonb_array_length(v_admin_emails) = 0 THEN
    RAISE WARNING 'send_session_close_email: no admin emails';
    RETURN;
  END IF;

  -- 4) Totales por método de pago
  FOR r IN
    SELECT order_number, fulfillment, total, created_at,
           COALESCE(payment_efectivo,0)    AS ef,
           COALESCE(payment_mp,0)          AS mp,
           COALESCE(payment_pos,0)         AS pos,
           COALESCE(payment_aplicacion,0)  AS ap
    FROM public.orders
    WHERE branch_id = v_session.branch_id
      AND created_at >= v_session.opened_at
      AND created_at <= v_session.closed_at
      AND status <> 'Cancelado'
    ORDER BY created_at ASC
  LOOP
    v_total_pedidos := v_total_pedidos + 1;
    v_total_ventas  := v_total_ventas + COALESCE(r.total,0);
    v_sum_ef  := v_sum_ef  + r.ef;
    v_sum_mp  := v_sum_mp  + r.mp;
    v_sum_pos := v_sum_pos + r.pos;
    v_sum_ap  := v_sum_ap  + r.ap;

    IF r.mp  > 0 THEN v_n_mp  := v_n_mp  + 1; END IF;
    IF r.pos > 0 THEN v_n_pos := v_n_pos + 1; END IF;
    IF r.ap  > 0 THEN v_n_ap  := v_n_ap  + 1; END IF;
    IF r.ef  > 0 AND r.mp = 0 AND r.pos = 0 AND r.ap = 0 THEN
      v_n_ef := v_n_ef + 1;
    END IF;
    IF ((r.ef>0)::int + (r.mp>0)::int + (r.pos>0)::int + (r.ap>0)::int) > 1 THEN
      v_n_mix := v_n_mix + 1;
    END IF;

    IF v_i < 50 THEN
      v_bg := CASE WHEN v_i % 2 = 0 THEN '#ffffff' ELSE '#fafafa' END;
      v_orders_rows := v_orders_rows ||
        '<tr style="background:'||v_bg||';">'||
        '<td style="padding:10px 12px;font-weight:600;color:#1a1a1a;border-bottom:1px solid #eee;font-family:Arial,sans-serif;font-size:13px;">#'|| COALESCE(r.order_number::text,'') ||'</td>'||
        '<td style="padding:10px 12px;color:#555;border-bottom:1px solid #eee;font-family:Arial,sans-serif;font-size:13px;">'|| CASE WHEN r.fulfillment='delivery' THEN 'Delivery' ELSE 'Retiro' END ||'</td>'||
        '<td style="padding:10px 12px;color:#555;border-bottom:1px solid #eee;font-family:Arial,sans-serif;font-size:13px;">'|| to_char(r.created_at AT TIME ZONE 'America/Santiago','HH24:MI') ||'</td>'||
        '<td align="right" style="padding:10px 12px;color:#1a1a1a;border-bottom:1px solid #eee;font-family:Arial,sans-serif;font-size:13px;">$'|| to_char(COALESCE(r.total,0),'FM999G999G999') ||'</td>'||
        '</tr>';
      v_i := v_i + 1;
    END IF;
  END LOOP;

  IF v_orders_rows = '' THEN
    v_orders_rows := '<tr><td colspan="4" style="padding:16px;text-align:center;color:#888;font-family:Arial,sans-serif;font-size:13px;">Sin pedidos en este turno.</td></tr>';
  END IF;

  -- 5) Movimientos
  FOR r IN
    SELECT amount, note, type, created_at
    FROM public.cash_movements
    WHERE session_id = p_session_id
    ORDER BY created_at ASC
  LOOP
    v_n_moves := v_n_moves + 1;
    v_is_egreso := (lower(r.type::text) LIKE '%egreso%') OR (COALESCE(r.amount,0) < 0);
    v_color := CASE WHEN v_is_egreso THEN '#dc2626' ELSE '#16a34a' END;
    v_arrow := CASE WHEN v_is_egreso THEN '↓' ELSE '↑' END;
    v_sign  := CASE WHEN v_is_egreso THEN '-' ELSE '+' END;
    v_amt   := abs(COALESCE(r.amount,0));
    v_moves_html := v_moves_html ||
      '<div style="display:block;padding:12px 0;border-bottom:1px solid #eee;font-family:Arial,sans-serif;">'||
        '<div style="font-size:13px;color:#1a1a1a;">'||
          '<span style="color:'||v_color||';font-weight:700;">'||v_arrow||' '|| COALESCE(r.type::text,'') ||'</span>'||
          '<span style="color:#888;font-size:11px;margin-left:8px;">'|| to_char(r.created_at AT TIME ZONE 'America/Santiago','DD/MM/YYYY HH24:MI') ||'</span>'||
        '</div>'||
        '<div style="font-size:12px;color:#555;margin-top:4px;">'|| COALESCE(replace(replace(replace(r.note,'&','&amp;'),'<','&lt;'),'>','&gt;'),'') ||'</div>'||
        '<div style="font-size:14px;color:'||v_color||';font-weight:700;margin-top:4px;">'||v_sign||'$'|| to_char(v_amt,'FM999G999G999') ||'</div>'||
      '</div>';
  END LOOP;

  IF v_n_moves > 0 THEN
    v_moves_html :=
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;margin:16px;width:calc(100% - 32px);">'||
      '<tr><td style="padding:24px;">'||
      '<h2 style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:16px;color:#1a1a1a;">Movimientos de Caja ('||v_n_moves||')</h2>'||
      v_moves_html ||
      '</td></tr></table>';
  END IF;

  IF v_session.observaciones IS NOT NULL AND length(trim(v_session.observaciones)) > 0 THEN
    v_obs_html :=
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff8e1;border-left:4px solid #f59e0b;border-radius:4px;margin:16px;width:calc(100% - 32px);">'||
      '<tr><td style="padding:16px;">'||
      '<h2 style="margin:0 0 8px 0;font-family:Arial,sans-serif;font-size:14px;color:#92400e;">Observaciones</h2>'||
      '<p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:#1a1a1a;white-space:pre-wrap;">'||
        replace(replace(replace(v_session.observaciones,'&','&amp;'),'<','&lt;'),'>','&gt;') ||
      '</p></td></tr></table>';
  END IF;

  v_periodo := to_char(v_session.opened_at AT TIME ZONE 'America/Santiago','DD/MM/YYYY HH24:MI') ||
               ' → ' ||
               to_char(v_session.closed_at AT TIME ZONE 'America/Santiago','HH24:MI');
  v_fecha_cierre := to_char(v_session.closed_at AT TIME ZONE 'America/Santiago','DD/MM/YYYY HH24:MI');
  v_subject := '🔒 Cierre de Turno — ' || v_cajero_name || ' | ' || v_fecha_cierre;
  v_detail_url := 'https://app.paganosburger.cl/pos/cierres-diarios?session=' || v_session.id::text;

  v_html :=
'<!doctype html><html><head><meta charset="utf-8"><title>Cierre de Turno</title></head>'||
'<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">'||
'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:24px 0;"><tr><td align="center">'||
'<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#f4f4f4;">'||

'<tr><td style="background:#1a1a1a;padding:24px;border-radius:8px 8px 0 0;">'||
'<div style="font-family:Arial,sans-serif;color:#cc2525;font-weight:700;font-size:22px;letter-spacing:1px;">PAGANOS BURGER</div>'||
'<div style="font-family:Arial,sans-serif;color:#ffffff;font-size:14px;margin-top:4px;">Cierre de Turno</div>'||
'<div style="font-family:Arial,sans-serif;color:#cccccc;font-size:12px;margin-top:12px;"><strong style="color:#fff;">'|| v_cajero_name ||'</strong> &nbsp;|&nbsp; '|| v_branch_name ||' &nbsp;|&nbsp; '|| v_periodo ||'</div>'||
'</td></tr>'||

'<tr><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;margin:16px;width:calc(100% - 32px);">'||
'<tr><td style="padding:24px;">'||
'<h2 style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:16px;color:#1a1a1a;">$ Resumen Financiero</h2>'||
'<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>'||
'<td valign="top" width="50%" style="padding-right:12px;font-family:Arial,sans-serif;font-size:13px;color:#1a1a1a;">'||
'<div style="padding:6px 0;"><span style="color:#666;">Efectivo Inicial:</span> <strong style="float:right;">$'|| to_char(COALESCE(v_session.opening_cash,0),'FM999G999G999') ||'</strong></div>'||
'<div style="padding:6px 0;"><span style="color:#666;">Efectivo Final:</span> <strong style="float:right;">$'|| to_char(COALESCE(v_session.closing_cash,0),'FM999G999G999') ||'</strong></div>'||
'<div style="border-top:1px solid #eee;margin-top:6px;padding-top:10px;"><span style="color:#1a1a1a;font-weight:700;">Total Ventas:</span><strong style="float:right;color:#1a1a1a;">$'|| to_char(v_total_ventas,'FM999G999G999') ||'</strong></div>'||
'</td>'||
'<td valign="top" width="50%" style="padding-left:12px;font-family:Arial,sans-serif;font-size:12px;color:#1a1a1a;border-left:1px solid #f0f0f0;">'||
'<div style="padding:5px 0;"><span style="color:#555;">Efectivo</span> <strong style="float:right;">$'|| to_char(v_sum_ef,'FM999G999G999') ||' <span style="color:#888;font-weight:400;">· '|| v_n_ef ||'</span></strong></div>'||
'<div style="padding:5px 0;"><span style="color:#555;">Mercado Pago</span> <strong style="float:right;">$'|| to_char(v_sum_mp,'FM999G999G999') ||' <span style="color:#888;font-weight:400;">· '|| v_n_mp ||'</span></strong></div>'||
'<div style="padding:5px 0;"><span style="color:#555;">POS (Tarjeta)</span> <strong style="float:right;">$'|| to_char(v_sum_pos,'FM999G999G999') ||' <span style="color:#888;font-weight:400;">· '|| v_n_pos ||'</span></strong></div>'||
'<div style="padding:5px 0;"><span style="color:#555;">App (Uber/PY)</span> <strong style="float:right;">$'|| to_char(v_sum_ap,'FM999G999G999') ||' <span style="color:#888;font-weight:400;">· '|| v_n_ap ||'</span></strong></div>'||
'<div style="padding:5px 0;"><span style="color:#555;">Pagos Mixtos</span> <strong style="float:right;color:#888;">— <span style="color:#888;font-weight:400;">· '|| v_n_mix ||'</span></strong></div>'||
'</td></tr></table>'||
'<div style="border-top:1px solid #eee;margin-top:16px;padding-top:14px;font-family:Arial,sans-serif;">'||
'<span style="font-size:14px;color:#1a1a1a;font-weight:700;">Total Ventas Real:</span>'||
'<strong style="float:right;font-size:18px;color:#cc2525;">$'|| to_char(v_total_ventas,'FM999G999G999') ||'</strong>'||
'<div style="clear:both;"></div>'||
'<div style="font-size:11px;color:#888;margin-top:4px;">Total sin incluir runas canjeadas</div>'||
'</div></td></tr></table></td></tr>'||

'<tr><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;margin:16px;width:calc(100% - 32px);">'||
'<tr><td style="padding:24px;">'||
'<h2 style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:16px;color:#1a1a1a;">Pedidos del Turno ('|| v_total_pedidos ||')</h2>'||
'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">'||
'<thead><tr style="background:#1a1a1a;color:#ffffff;">'||
'<th align="left" style="padding:10px 12px;font-family:Arial,sans-serif;font-size:12px;font-weight:600;"># Orden</th>'||
'<th align="left" style="padding:10px 12px;font-family:Arial,sans-serif;font-size:12px;font-weight:600;">Tipo</th>'||
'<th align="left" style="padding:10px 12px;font-family:Arial,sans-serif;font-size:12px;font-weight:600;">Hora</th>'||
'<th align="right" style="padding:10px 12px;font-family:Arial,sans-serif;font-size:12px;font-weight:600;">Total</th>'||
'</tr></thead><tbody>'|| v_orders_rows ||'</tbody></table>'||
CASE WHEN v_total_pedidos > 50 THEN '<p style="margin:12px 0 0 0;font-family:Arial,sans-serif;font-size:12px;color:#888;text-align:center;">+ '||(v_total_pedidos-50)||' pedidos adicionales. Ver detalle completo en el sistema.</p>' ELSE '' END ||
'</td></tr></table></td></tr>'||

v_moves_html || v_obs_html ||

'<tr><td style="background:#1a1a1a;padding:24px;text-align:center;border-radius:0 0 8px 8px;margin:16px;">'||
'<a href="'|| v_detail_url ||'" style="display:inline-block;background:#cc2525;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;font-family:Arial,sans-serif;font-size:14px;font-weight:600;">Ver detalle en el sistema →</a>'||
'<div style="font-family:Arial,sans-serif;font-size:11px;color:#888;margin-top:16px;">Paganos Burger · Reporte automático de cierre de turno</div>'||
'</td></tr>'||

'</table></td></tr></table></body></html>';

  -- 6) Envío via Resend
  PERFORM net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_resend_key
    ),
    body := jsonb_build_object(
      'from', 'Paganos Burger <sistema@notify.paganosburger.cl>',
      'to', v_admin_emails,
      'subject', v_subject,
      'html', v_html
    )
  );

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'send_session_close_email failed: %', SQLERRM;
END;
$function$;

-- Replace trigger function to call SQL directly
CREATE OR REPLACE FUNCTION public.notify_cash_session_closed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'net'
AS $function$
BEGIN
  IF OLD.closed_at IS NULL AND NEW.closed_at IS NOT NULL THEN
    PERFORM public.send_session_close_email(NEW.id);
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_cash_session_closed failed: %', SQLERRM;
  RETURN NEW;
END;
$function$;
