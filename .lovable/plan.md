

## Plan: Alerta de turno no abierto al cobrar

### Situacion actual
En `NewSale.tsx` linea 342-354, solo se bloquea al rol "Cajero" si no hay turno abierto. Para otros roles simplemente abre el modal de pago sin aviso.

### Cambios

**Archivo: `src/pages/NewSale.tsx`**

1. Agregar estado `showNoSessionAlert` (boolean).
2. Modificar `handleCheckout()`:
   - Si `!hasActiveSession()` (para cualquier rol), mostrar el alert dialog en vez de abrir PaymentModal directamente.
   - Si hay sesion activa, abrir PaymentModal normalmente.
3. Agregar un `AlertDialog` con:
   - Titulo: "Sin turno abierto"
   - Descripcion: "Si continuas, el pedido no se guardara en ningun turno."
   - Boton "Continuar": cierra el alert y abre PaymentModal.
   - Boton "Iniciar turno": cierra el alert y abre el modal de apertura de caja (`CashSessionModal`).
4. Importar `CashSessionModal` y agregar estado para controlarlo si no existe ya en la pagina.

### Resultado
Cualquier usuario sin turno abierto vera la advertencia antes de cobrar, con la opcion de continuar sin turno o iniciar uno en ese momento.

