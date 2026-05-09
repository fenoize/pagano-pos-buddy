## Objetivo
Hacer que los clientes registrados desde la alianza de CrossFit La Reina reciban y puedan usar automáticamente su beneficio en checkout cuando realmente califican.

## Hallazgos
- La alianza `cflareina` sí está activa y tiene cupón configurado.
- El registro de alianza sí se está grabando.
- La etiqueta `CFLaReina` sí se está asignando automáticamente al cliente.
- La función `get_customer_alliance_coupons(...)` sí devuelve el cupón correcto para el cliente.
- El corte más probable está en la validación frontend del cupón: hoy consulta `customer_tag_assignments` directamente, pero esa tabla solo la puede leer staff por RLS. Para un cliente normal, la validación puede rechazar el cupón aunque sí tenga la etiqueta.
- Además, hay evidencia de duplicación de beneficios/cupones de alianza al reclamar el signup varias veces; eso no bloquea el descuento, pero conviene endurecerlo.

## Plan
1. Corregir la validación de etiquetas de cupones para clientes
- Mover la comprobación de etiquetas permitidas a una función/RPC segura en Supabase con `SECURITY DEFINER`, en vez de consultar `customer_tag_assignments` directo desde el cliente.
- Mantener RLS cerrada sobre asignaciones de etiquetas para no exponer datos sensibles innecesariamente.

2. Ajustar la autoaplicación en checkout
- Actualizar `useAllianceAutoCoupon` y el flujo manual de `CustomerCouponInput` para usar la validación segura.
- Asegurar que el cupón se muestre automáticamente en checkout cuando el cliente califica y no tenga otro cupón aplicado.
- Si no califica, conservar mensajes de error correctos (por horario, mínimo, productos no elegibles, etc.).

3. Endurecer el alta de beneficios de alianza
- Revisar `claim_marketing_alliance_signup` para evitar que inserte beneficios duplicados para el mismo cliente y alianza al ejecutarse más de una vez.
- Dejar una sola fuente de verdad por beneficio pendiente/aplicado donde corresponda.

4. Validación final
- Probar con un cliente real de la alianza que tenga etiqueta `CFLaReina`.
- Verificar estos escenarios:
  - cliente con alianza + horario válido => cupón visible y descuento aplicado
  - cliente con alianza + fuera de horario => no se autoaplica
  - cliente sin etiqueta => no se autoaplica
  - checkout sigue permitiendo aplicar/remover cupón manualmente

## Detalles técnicos
- Archivos probables:
  - `src/lib/couponValidation.ts`
  - `src/hooks/useAllianceAutoCoupon.ts`
  - `src/components/customer/CustomerCouponInput.tsx`
  - migración SQL para RPC/función segura y deduplicación de beneficios
- No abriré lectura pública de `customer_tag_assignments`; la solución segura será por función SQL.
- También revisaré el warning de múltiples `GoTrueClient` si interfiere, pero no lo tomaré como causa principal salvo que aparezca evidencia adicional.