## Objetivo
Estabilizar el campo **“Notas especiales”** dentro de la personalización de producto en móvil/PWA para que al abrir el teclado no se rompa la estructura visual en iPhone ni Android.

## Qué voy a implementar
1. **Refactor del contenedor móvil del modal de personalización**
   - Ajustar `CustomerProductCustomization` para que el drawer no dependa de un alto fijo `90vh` cuando aparece el teclado.
   - Pasar a una estrategia compatible con viewport móvil real (`100dvh` / altura dinámica) para evitar que el contenido “salte” o quede recortado.

2. **Layout keyboard-aware dentro del drawer**
   - Reorganizar la composición actual (imagen + contenido scrollable + barra inferior fija) para que el teclado no desarme la jerarquía.
   - Evitar la combinación problemática de:
     - contenedor fijo alto
     - scroll interno
     - action bar fija al fondo
   - Mantener siempre visible el flujo principal sin dejar grandes zonas vacías negras como en tu captura.

3. **Comportamiento correcto al enfocar el textarea**
   - Hacer que al enfocar “Notas especiales” el contenedor ajuste su altura y haga scroll al campo si hace falta.
   - Evitar que el teclado tape el textarea o empuje elementos fuera de lugar.

4. **Hardening para PWA móvil**
   - Añadir ajustes específicos para iOS/Android PWA donde el viewport visual cambia mientras el teclado está abierto.
   - Respetar safe areas y evitar regresiones con notch/home indicator.

## Resultado esperado
- Al tocar **“Notas especiales”**, el teclado se abre sin romper la interfaz.
- El modal mantiene su estructura y no aparece el espacio negro gigante.
- Al terminar de escribir, la UI permanece estable y no depende de “volver sola” a la normalidad.

## Detalles técnicos
- Archivo principal: `src/components/customer/CustomerProductCustomization.tsx`
- Posible apoyo en estilos globales: `src/index.css`
- Causa probable detectada:
  - el drawer móvil usa `max-h-[90vh] h-[90vh]`
  - tiene `overflow-y-auto` interno
  - y una barra inferior fija/separada
  - en PWA móvil, al abrir teclado, `vh` y el viewport visual no coinciden bien, especialmente en iOS
- Solución prevista:
  - reemplazar altura fija por layout con altura dinámica real
  - revisar si la barra inferior debe pasar de fija a `sticky`/integrada al mismo flujo scrollable
  - aplicar ajuste al foco del textarea para mantenerlo visible

## Validación
- Probar en viewport móvil del proyecto.
- Verificar específicamente el flujo de abrir producto → tocar “Notas especiales” → escribir → cerrar teclado.
- Confirmar que no se rompa el modal en customer app y que desktop no cambie.