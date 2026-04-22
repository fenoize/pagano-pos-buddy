

# Reporte Comercial — Impacto de Normalización de Delta de Proteína

## Hallazgo crítico previo

Al inspeccionar la BD descubrí algo que **cambia la naturaleza de la decisión**:

> **Hoy Carne y Pollo cuestan exactamente lo mismo en los 8 productos.** El "delta" que ves en BD no separa Carne de Pollo, separa "sin proteína (fila legacy)" de "con proteína elegida". En la práctica al cliente nunca se le cobra distinto por elegir Pollo vs Carne.

Esto significa que la decisión real son **dos** acopladas:
- **A) Precio base del tamaño**: ¿precio legacy (más barato) o precio Carne actual?
- **B) Delta de Pollo**: 0 (igual a Carne, como hoy) o +200 (Pollo cuesta más)

A continuación entrego el impacto bajo el escenario que pediste (**base = legacy + Pollo = +200**) y luego comparo con dos alternativas.

---

## Tabla completa — 24 filas (8 productos × 3 tamaños)

| # | Producto | Tamaño | Carne hoy | Pollo hoy | Δ histórico | Δ nuevo | Pollo nuevo | Δ Pollo | Δ Carne |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | Amerikana | Simple | 9.490 | 9.490 | +200 | +200 | 9.490 | 0 | −200 |
| 2 | Amerikana | Doble | 13.190 | 13.190 | +1.000 | +200 | 12.390 | −800 | −1.000 |
| 3 | Amerikana | Triple | 15.490 | 15.490 | +400 | +200 | 15.290 | −200 | −400 |
| 4 | Big Pagana | Simple | 7.790 | 7.790 | +100 | +200 | 7.890 | +100 | −100 |
| 5 | Big Pagana | Doble | 10.790 | 10.790 | +200 | +200 | 10.790 | 0 | −200 |
| 6 | Big Pagana | Triple | 15.790 | 15.790 | +2.300 | +200 | 13.690 | −2.100 | −2.300 |
| 7 | Cheese Burger | Simple | 7.190 | 7.190 | +200 | +200 | 7.190 | 0 | −200 |
| 8 | Cheese Burger | Doble | 10.190 | 10.190 | +300 | +200 | 10.090 | −100 | −300 |
| 9 | Cheese Burger | Triple | 13.190 | 13.190 | +400 | +200 | 12.990 | −200 | −400 |
| 10 | Loki | Simple | 8.790 | 8.790 | +500 | +200 | 8.490 | −300 | −500 |
| 11 | Loki | Doble | 11.790 | 11.790 | +710 | +200 | 11.280 | −510 | −710 |
| 12 | Loki | Triple | 14.790 | 14.790 | +920 | +200 | 14.070 | −720 | −920 |
| 13 | Melt | Simple | 9.190 | 9.190 | +200 | +200 | 9.190 | 0 | −200 |
| 14 | Melt | Doble | 12.190 | 12.190 | +300 | +200 | 12.090 | −100 | −300 |
| 15 | Melt | Triple | 15.190 | 15.190 | +400 | +200 | 14.990 | −200 | −400 |
| 16 | Old School | Simple | 7.790 | 7.790 | +100 | +200 | 7.890 | +100 | −100 |
| 17 | Old School | Doble | 10.790 | 10.790 | +200 | +200 | 10.790 | 0 | −200 |
| 18 | Old School | Triple | 13.790 | 13.790 | +300 | +200 | 13.690 | −100 | −300 |
| 19 | Paltona | Simple | 9.190 | 9.190 | 0 | +200 | 9.390 | +200 | 0 |
| 20 | Paltona | Doble | 12.190 | 12.190 | +100 | +200 | 12.290 | +100 | −100 |
| 21 | Paltona | Triple | 15.190 | 15.190 | +200 | +200 | 15.190 | 0 | −200 |
| 22 | Smoke House | Simple | 9.290 | 9.290 | +100 | +200 | 9.390 | +100 | −100 |
| 23 | Smoke House | Doble | 12.290 | 12.290 | +200 | +200 | 12.290 | 0 | −200 |
| 24 | Smoke House | Triple | 15.290 | 15.290 | +300 | +200 | 15.190 | −100 | −300 |

> CLP. Negativo = cliente paga **menos**. Positivo = cliente paga **más**.

---

## Clasificación por impacto sobre POLLO

### Sin cambio (0 CLP) — 8 filas
Amerikana Simple · Big Pagana Doble · Cheese Burger Simple · Melt Simple · Old School Doble · Paltona Triple · Smoke House Doble · *(donde el delta histórico ya era +200)*

### Cambio menor (≤ 200 CLP) — 11 filas
- Sube +100: Big Pagana Simple · Old School Simple · Paltona Doble · Smoke House Simple
- Sube +200: Paltona Simple
- Baja −100: Cheese Burger Doble · Melt Doble · Old School Triple · Smoke House Triple
- Baja −200: Amerikana Triple · Cheese Burger Triple · Melt Triple

### Cambio importante (> 200 CLP) — 5 filas
- Loki Simple: **−300**
- Loki Doble: **−510**
- Loki Triple: **−720**
- Amerikana Doble: **−800**
- Big Pagana Triple: **−2.100** (la mayor rebaja)

---

## Impacto agregado

| Métrica | Valor |
|---|---|
| Productos afectados (≥1 tamaño cambia) | **8 de 8** |
| Filas Pollo sin cambio | 8 / 24 |
| Filas Pollo modificadas | **16 / 24** |
| Filas que SUBEN | 5 (entre +100 y +200) |
| Filas que BAJAN | 11 (entre −100 y −2.100) |
| Mayor rebaja | Big Pagana Triple: −2.100 |
| Mayor alza | Paltona Simple: +200 |

### ⚠️ Impacto colateral sobre CARNE
Si la base se fija en el **precio legacy**, Carne queda en delta 0 → **24/24 filas de Carne bajan** (entre −100 y −2.300, promedio ≈ −400). Loki Triple Carne baja −920. Big Pagana Triple Carne baja −2.300.

---

## Tres opciones de migración para tu aprobación

| Opción | Base de tamaño | Δ Carne | Δ Pollo | Resultado comercial |
|---|---|---:|---:|---|
| **A** (la que pediste) | Precio legacy | 0 | +200 | Carne baja en 24/24, Pollo cambia en 16/24 |
| **B** (recomendada) | Precio Carne actual | 0 | 0 | **Cero impacto comercial.** Hoy Pollo = Carne, queda igual. |
| **C** | Precio Carne actual | 0 | +200 | Carne sin cambios. Pollo sube +200 en 24/24. |

**Recomendación**: Opción **B**. Es la única que limpia la arquitectura sin tocar precios al cliente. Si más adelante quieres cobrar Pollo más caro, basta un UPDATE de 1 fila en `variant_group_options`.

---

## Sin ejecutar nada
No corro la migración. Indícame **A**, **B** o **C** (o un escenario propio) y procedo en una sola transacción con backup previo, reporte de cambios y validación visual del flujo "Tamaño → Proteína" en el portal cliente y POS.

