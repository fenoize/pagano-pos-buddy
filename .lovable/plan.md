
# Plan: nuevo módulo Marketing → Alianzas

## Objetivo

Crear un módulo nuevo llamado **Alianzas** dentro de **Marketing**, pensado para campañas con embajadores, empresas y aliados.

El flujo será:

```text
Poster / QR en oficina aliada
→ Cliente escanea URL exclusiva
→ Se registra en la app cliente
→ Recibe beneficios configurados
→ Compra
→ El módulo mide lecturas, registros, compras e ingresos
```

---

## 1. Nuevo módulo en Marketing

Agregaré una nueva opción en el menú lateral:

```text
Marketing
├─ Promos App
├─ Alianzas
├─ Notificaciones
└─ Contenido TV
```

Ruta interna:

```text
/pos/marketing/alianzas
```

Solo visible para **Administrador**.

---

## 2. Gestión de campañas de alianza

En el módulo **Alianzas** se podrá crear y administrar campañas como:

```text
Empresa: WeWork Providencia
Tipo: Empresa aliada
URL: https://app.paganosburger.cl/a/wework-providencia
Estado: Activa
Vigencia: abril 2026
Beneficios:
- 20 runas al registrarse
- Cupón 15% primera compra
- Delivery gratis primera compra
```

Campos principales:

- Nombre de la alianza.
- Tipo:
  - Empresa aliada
  - Embajador
  - Convenio
  - Otro
- Slug público para la URL.
- Vigencia.
- Estado activo/inactivo.
- Notas internas.
- Beneficios configurables:
  - Runas de bienvenida.
  - Cupón asociado.
  - Delivery gratis primera compra.
  - Límite de usos.
  - Una vez por cliente.

---

## 3. URL pública y QR

Cada alianza tendrá una URL exclusiva:

```text
https://app.paganosburger.cl/a/{slug}
```

Ejemplo:

```text
https://app.paganosburger.cl/a/wework-providencia
```

Al entrar a esa URL:

1. Se registra una **lectura del QR / visita**.
2. Se guarda la alianza temporalmente en el navegador.
3. Se lleva al cliente a crear cuenta.
4. Si ya tiene cuenta, se conserva la atribución para su próxima compra.

También agregaré en el módulo:

- Botón **Copiar URL**.
- Botón/área para mostrar el **QR** de la campaña.
- Texto sugerido para imprimir en poster.

---

## 4. Registro de eventos y atribución

Crearé estructura de datos para medir el embudo completo:

```text
Lectura QR
→ Registro
→ Compra
```

Se guardarán eventos como:

- `view`: alguien abrió la URL.
- `signup`: alguien creó cuenta desde esa URL.
- `reward_granted`: se entregaron beneficios.
- `purchase`: el cliente realizó una compra atribuida.
- `reward_redeemed`: se usó cupón, delivery gratis o beneficio.

Además, quedará una atribución por cliente:

```text
Cliente Diego → vino desde WeWork Providencia
```

Esto permitirá saber:

- Cuántos clientes trajo cada aliado.
- Quiénes se registraron.
- Quiénes compraron.
- Qué compra fue la primera.
- Cuánto ingreso generó la alianza.

---

## 5. Beneficios configurables

### Runas al registrarse

Si la campaña tiene runas configuradas, al completar el registro se insertará una transacción de runas:

```text
Tipo: promo
Origen: Web
Motivo: Alianza: WeWork Providencia
```

### Cupón primera compra

La alianza podrá asociarse a un cupón existente o crear uno desde el flujo.

El cupón se mostrará/cargará automáticamente en checkout cuando el cliente venga desde esa alianza.

### Delivery gratis primera compra

Implementaré delivery gratis como beneficio de alianza de un solo uso.

En checkout, si el cliente tiene ese beneficio pendiente:

```text
Delivery: $2.500
Beneficio alianza: -$2.500
Delivery final: $0
```

Después de usarlo, quedará marcado como aplicado para evitar reutilización.

---

## 6. Integración con registro de cliente

Actualizaré el flujo de `/login` para soportar campañas:

```text
/a/wework-providencia
→ /login?mode=signup&ally=wework-providencia
```

Cambios:

- Abrir automáticamente la pestaña **Registrarse**.
- Mostrar una tarjeta contextual, por ejemplo:
  ```text
  Beneficio exclusivo WeWork Providencia
  Crea tu cuenta y recibe tus beneficios para tu primera compra.
  ```
- Al crear la cuenta, registrar el evento `signup`.
- Entregar los beneficios configurados.

También consideraré registro con Google si está habilitado, conservando el mismo código de alianza.

---

## 7. Integración con compra

Actualizaré los flujos de compra de la app cliente para registrar conversión.

Se considerará compra atribuida cuando el cliente tenga una alianza asociada y cree/pague un pedido.

Puntos de integración:

- Checkout normal con MercadoPago.
- Compra pagada con runas.
- Confirmación de pago MercadoPago.
- Pedidos asociados al cliente desde POS, si corresponde.

Se registrará:

```text
Cliente
Pedido
Alianza
Fecha
Total
Descuento usado
Delivery gratis usado
Cupón usado
```

---

## 8. Dashboard de KPIs

El módulo **Alianzas** tendrá una vista de indicadores por campaña.

KPIs principales:

```text
Lecturas QR
Registros
Compras
Tasa registro / lectura
Tasa compra / registro
Ingresos generados
Ticket promedio
Runas entregadas
Descuentos entregados
Delivery gratis usados
```

También tendrá filtro mensual:

```text
Este mes
Mes anterior
Rango personalizado
```

Y tabla por aliado:

| Alianza | Lecturas | Registros | Compras | Conversión | Ingresos |
|---|---:|---:|---:|---:|---:|
| WeWork Providencia | 120 | 34 | 11 | 32.4% | $185.900 |
| Embajador Diego | 90 | 22 | 8 | 36.3% | $121.500 |

---

## 9. Vista de detalle por alianza

Al abrir una alianza se verá:

- Datos generales.
- URL y QR.
- Beneficios configurados.
- KPIs del periodo.
- Clientes registrados.
- Clientes que compraron.
- Pedidos atribuidos.
- Historial de eventos.

Ejemplo:

```text
Cliente              Evento       Fecha          Pedido      Total
Diego Pérez          Registro     22/04 10:31   —           —
Diego Pérez          Compra       22/04 13:04   #1542       $18.900
Camila Soto          Lectura      22/04 15:20   —           —
```

---

## 10. Cambios técnicos

### Base de datos

Crearé tablas nuevas para:

- Campañas de alianza.
- Eventos de alianza.
- Atribución cliente ↔ alianza.
- Beneficios pendientes/aplicados.

También agregaré índices para consultas mensuales y por campaña.

### Seguridad

- La gestión de alianzas será solo para administradores.
- La URL pública solo podrá registrar eventos seguros como lectura.
- La entrega de beneficios se hará mediante RPC `SECURITY DEFINER`, no confiando en datos manipulables del navegador.
- La compra se atribuirá usando el `customer_id` real del pedido.

### Frontend

Agregaré:

- Página `MarketingAlianzas`.
- Hook `useMarketingAlliances`.
- Modal/formulario de alianza.
- Página pública `/a/:slug`.
- Integración con `CustomerLogin`.
- Integración con checkout para beneficios automáticos.
- Integración con confirmación de pedido/pago para conversión.

---

## 11. Validación final

Validaré el flujo completo:

```text
1. Crear alianza desde Marketing → Alianzas
2. Copiar URL o abrir QR
3. Entrar a /a/{slug}
4. Ver que se registra lectura
5. Crear cuenta nueva
6. Ver que se registra signup
7. Ver que se entregan beneficios
8. Hacer primera compra
9. Ver que se registra purchase
10. Confirmar KPIs mensuales en dashboard
```

Resultado esperado:

```text
Alianza activa
→ QR medible
→ Registro atribuido
→ Beneficios automáticos
→ Compra atribuida
→ KPIs mensuales por aliado/embajador
```
