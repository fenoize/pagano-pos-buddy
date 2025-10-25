# Sistema de Fidelización - Paganos Burger

## 🔥 RUNAS

### Acumulación

- **Fórmula:** Configurable en sistema, por defecto 1 runa por cada $1.000 CLP gastados
- **Mínimo de compra:** Configurable (default: $1.000 CLP)
- **Restricciones:**
  - NO se acumulan runas si se paga con runas
  - NO se acumulan runas si hay descuentos/cupones aplicados (configurable)
  - Compras menores al mínimo no acumulan

### Canje

- **Valor de canje:** Configurable, por defecto 1 runa = $1.000 CLP de descuento
- **Máximo por pedido:** Configurable (default: 50 runas)
- **Mínimo para canjear:** Configurable (default: 1 runa)
- **Aplicación:** Las runas se aplican como descuento directo en el total del pedido

### Expiración

- **Por defecto:** Las runas NO expiran
- **Configurable:** Se puede establecer un período de expiración en días desde la tabla `config`
- **Clave config:** `runas_expiration_days`

---

## 📊 NIVELES

Los niveles se calculan automáticamente en base a las runas acumuladas del cliente (campo `cantidad_runas` en tabla `customers`).

### Estructura

Los niveles están definidos en la tabla `customer_level_definitions`:

| Nivel | Código | Runas Mínimas | Runas Máximas | Color | Ícono |
|-------|--------|---------------|---------------|-------|-------|
| **Iniciado** | `iniciado` | 0 | 199 | Gris | Flame |
| **Devoto** | `devoto` | 200 | 599 | Azul | Award |
| **Fanático** | `fanatico` | 600+ | ∞ | Dorado | Crown |

### Iniciado (0-199 runas)

**Beneficios:**
- Acumulación estándar de runas
- Acceso al sistema de insignias
- Participación en el programa de fidelización

### Devoto (200-599 runas)

**Beneficios:**
- Todo lo anterior
- 5% descuento en productos seleccionados
- Prioridad en eventos especiales
- Acceso a promociones exclusivas

### Fanático (600+ runas)

**Beneficios:**
- Todo lo anterior
- 10% descuento permanente
- Acceso a productos exclusivos
- Invitaciones VIP a eventos
- Atención prioritaria

### Progreso de Niveles

El progreso se muestra en el portal del cliente con:
- Nivel actual
- Runas acumuladas
- Runas necesarias para el siguiente nivel
- Barra de progreso visual
- Beneficios del nivel actual

---

## 🏆 INSIGNIAS

Las insignias son reconocimientos especiales que se otorgan automáticamente cuando el cliente cumple ciertos criterios.

### Insignias Automáticas

#### 1. Primera Orden (`first_order`)
- **Criterio:** Completar el primer pedido exitoso
- **Categoría:** Inicio
- **Se otorga:** Automáticamente al crear el primer pedido

#### 2. 10 Órdenes (`ten_orders`)
- **Criterio:** Completar exactamente 10 pedidos exitosos (no cancelados)
- **Categoría:** Lealtad
- **Se otorga:** Al completar el décimo pedido

#### 3. Gran Gastador (`big_spender`)
- **Criterio:** Alcanzar $100.000 CLP acumulados en compras
- **Categoría:** Premium
- **Se otorga:** Cuando `valor_cliente` supera los $100.000

#### 4. Cumpleañero Pagano (`birthday_order`)
- **Criterio:** Realizar un pedido el día de su cumpleaños
- **Categoría:** Especial
- **Se otorga:** Al crear pedido si la fecha coincide con `fecha_nacimiento`

#### 5. Devoto Semanal (`weekly_loyal`)
- **Criterio:** Realizar al menos 1 pedido por semana durante 4 semanas consecutivas
- **Categoría:** Constancia
- **Se otorga:** Cuando se cumple el patrón de 4 semanas consecutivas

### Funcionamiento Técnico

1. **Verificación automática:** Cada vez que se crea un pedido en el POS, se ejecuta `checkAndAwardBadges()`
2. **Funciones RPC:** 
   - `check_and_award_badge(customer_id, badge_code)` - Otorga la insignia si no la tiene
   - `has_orders_in_last_4_weeks(customer_id)` - Verifica pedidos consecutivos
3. **Notificación:** El sistema muestra un toast al cliente/cajero cuando se otorga una nueva insignia
4. **Persistencia:** Las insignias se registran en `customer_badges_awarded` con timestamp

### Insignias Futuras (Roadmap)

- **Insignias manuales:** Otorgadas por administradores para eventos especiales
- **Insignias por referidos:** Al traer nuevos clientes
- **Insignias de temporada:** Por eventos limitados (ej: Halloween, Navidad)
- **Insignias de productos:** Por probar productos específicos

---

## 🎯 CONFIGURACIÓN DEL SISTEMA

### Tabla `config`

Todas las configuraciones del sistema de fidelización se almacenan en la tabla `config` con valores JSONB:

| Clave | Descripción | Valor por Defecto |
|-------|-------------|-------------------|
| `runas_value` | Pesos CLP por runa | `1000` |
| `runas_earn_rate` | Runas por cada 1000 CLP | `1` |
| `runas_min_purchase` | Compra mínima para acumular | `1000` |
| `runas_max_redeem` | Máximo de runas canjeables por pedido | `50` |
| `runas_min_redeem` | Mínimo de runas para canjear | `1` |
| `runas_redeem_divisor` | Divisor para calcular descuento | `3` |
| `runas_expiration_days` | Días hasta que expiran (0 = nunca) | `0` |
| `runas_exclude_if_discount` | No acumular si hay descuentos | `true` |
| `runas_exclude_categories` | Categorías que no acumulan runas | `[]` |
| `runas_exclude_if_used` | No acumular si se usaron runas | `true` |

### Módulo de Configuración

Los administradores pueden ajustar estos valores desde:
**Configuración > Fidelización**

---

## 📱 PORTAL DEL CLIENTE

### Secciones Disponibles

1. **Mis Runas** (`/my-runes`)
   - Saldo actual de runas
   - Historial de transacciones (ganadas, canjeadas, ajustes)
   - Filtros por tipo y fecha
   - Paginación de historial

2. **Mis Insignias** (`/my-badges`)
   - Todas las insignias disponibles
   - Insignias desbloqueadas (con fecha)
   - Insignias bloqueadas (próximas a desbloquear)
   - Categorías: Inicio, Lealtad, Premium, Especial

3. **Mis Pedidos** (`/my-orders`)
   - Historial completo de pedidos
   - Estado actual de cada pedido
   - Detalles de productos y precios

4. **Mis Direcciones** (`/my-addresses`)
   - Direcciones guardadas
   - Dirección por defecto
   - Gestión de direcciones de entrega

### Progreso de Nivel

En todas las páginas del portal se muestra:
- Card con nivel actual
- Barra de progreso hacia el siguiente nivel
- Runas actuales y runas necesarias para subir

---

## 🔧 TESTING

### Script de Prueba

Se incluye un script de testing en `src/lib/testBadges.ts` que permite verificar:
- Funciones RPC disponibles
- Otorgamiento de insignias
- Verificación de semanas consecutivas
- Estadísticas del cliente
- Total de pedidos

**Uso:**
```javascript
// En consola del navegador
testBadgeSystem('customer-uuid-here')
```

### Casos de Prueba

1. **Primera Orden:**
   - Crear cliente nuevo
   - Crear primer pedido
   - Verificar insignia "Primera Orden"

2. **Acumulación de Runas:**
   - Crear pedido de $10.000 CLP
   - Verificar que se acumulan 10 runas
   - Verificar que NO se acumulan si hay descuento

3. **Canje de Runas:**
   - Cliente con 20 runas
   - Crear pedido usando 10 runas
   - Verificar descuento aplicado
   - Verificar saldo actualizado

4. **Subida de Nivel:**
   - Cliente con 190 runas (Iniciado)
   - Agregar 20 runas más
   - Verificar cambio a nivel "Devoto"

---

## 🚀 ROADMAP

### Versión 1.0 (Actual)
- ✅ Sistema de runas
- ✅ 3 niveles de fidelización
- ✅ 5 insignias automáticas
- ✅ Portal del cliente
- ✅ Configuración administrativa

### Versión 1.1 (Próximo)
- [ ] Expiración automática de runas
- [ ] Notificaciones por email al ganar insignias
- [ ] Insignias manuales por administrador
- [ ] Descuentos automáticos por nivel

### Versión 2.0 (Futuro)
- [ ] Sistema de referidos
- [ ] Insignias de temporada
- [ ] Misiones/desafíos semanales
- [ ] Marketplace de recompensas
- [ ] Integración con app móvil PWA

---

## 📞 SOPORTE

Para dudas sobre el sistema de fidelización:
- Revisar esta documentación
- Ejecutar script de testing para debugging
- Revisar logs de consola (marcados con emojis 🏅 📅 ✅ ❌)
- Consultar tabla `config` para valores actuales
