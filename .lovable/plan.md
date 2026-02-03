

## Plan: Sistema de Identificación de Cliente por QR

### Objetivo

Permitir que los clientes se identifiquen en el POS mediante el escaneo de un código QR único, agilizando el proceso de asignación de pedidos sin necesidad de dar datos personales.

---

### Vista Previa: QR en Perfil de Cliente

```text
┌─────────────────────────────────────────────────────────────────┐
│  ← Mi Perfil                                                    │
│─────────────────────────────────────────────────────────────────│
│                                                                  │
│     ┌─────────┐                                                  │
│     │  Foto   │   Juan Pérez                                     │
│     │ Usuario │   juan@email.com                                 │
│     └─────────┘                                                  │
│                                                                  │
│     ┌─────────────────────────────────────────┐                  │
│     │  [QR]  Mostrar mi QR de identificación  │  ← NUEVO BOTÓN   │
│     └─────────────────────────────────────────┘                  │
│                                                                  │
│     ┌─────────────────────────────────────────┐                  │
│     │  [📦] Mis Pedidos                       │                  │
│     └─────────────────────────────────────────┘                  │
│     ┌─────────────────────────────────────────┐                  │
│     │  [📍] Mis Direcciones                   │                  │
│     └─────────────────────────────────────────┘                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Vista Previa: Modal QR del Cliente

```text
┌─────────────────────────────────────────────────────────────────┐
│                    Mi Código QR                                  │
│─────────────────────────────────────────────────────────────────│
│                                                                  │
│                    ┌───────────────┐                             │
│                    │               │                             │
│                    │   QR CODE     │                             │
│                    │   [cliente    │                             │
│                    │     UUID]     │                             │
│                    │               │                             │
│                    └───────────────┘                             │
│                                                                  │
│         Muestra este código en caja para                         │
│         identificarte y acumular runas                           │
│                                                                  │
│                    [ Cerrar ]                                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Vista Previa: Escáner en POS

```text
┌─────────────────────────────────────────────────────────────────┐
│           Cliente (opcional)                                     │
│─────────────────────────────────────────────────────────────────│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  [🔍] Buscar por correo o teléfono...                       ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│           ─────────── o ───────────                              │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │    [📷]  Escanear QR del cliente                            ││ ← NUEVO BOTÓN
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Vista Previa: Modal de Escáner

```text
┌─────────────────────────────────────────────────────────────────┐
│               Escanear QR del Cliente                            │
│─────────────────────────────────────────────────────────────────│
│                                                                  │
│     ┌─────────────────────────────────────────────────┐          │
│     │                                                 │          │
│     │              [Vista de cámara]                  │          │
│     │                                                 │          │
│     │           ┌─────────────────┐                   │          │
│     │           │   Área de       │                   │          │
│     │           │   escaneo       │                   │          │
│     │           └─────────────────┘                   │          │
│     │                                                 │          │
│     └─────────────────────────────────────────────────┘          │
│                                                                  │
│     Apunta al código QR del cliente                              │
│                                                                  │
│     [Seleccionar cámara ▼]           [ Cancelar ]                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

### Flujo de Usuario

**Lado Cliente (App)**:
1. Cliente abre su perfil
2. Hace clic en "Mostrar mi QR"
3. Se abre modal con QR generado a partir de su `customer.id`
4. Muestra el QR al cajero

**Lado Cajero (POS)**:
1. En el modal de cliente, hace clic en "Escanear QR"
2. Se activa la cámara del dispositivo
3. Escanea el QR del cliente
4. El sistema busca el cliente por UUID
5. Si existe, lo asigna automáticamente al pedido
6. Se cierra el escáner y se muestra el cliente seleccionado

---

### Cambios Técnicos Requeridos

#### 1. Nuevas Dependencias NPM

| Librería | Versión | Propósito |
|----------|---------|-----------|
| `qrcode.react` | ^4.0.1 | Generar códigos QR como componentes React |
| `html5-qrcode` | ^2.3.8 | Escanear QR usando la cámara del dispositivo |

#### 2. Nuevos Componentes

| Componente | Ubicación | Descripción |
|------------|-----------|-------------|
| `CustomerQRModal.tsx` | `src/components/customer/` | Modal que muestra el QR del cliente |
| `QRScannerModal.tsx` | `src/components/pos/` | Modal con el escáner de cámara para el POS |

#### 3. Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `src/pages/customer/CustomerProfile.tsx` | Agregar botón "Mostrar mi QR" + integrar `CustomerQRModal` |
| `src/components/pos/CustomerModal.tsx` | Agregar botón "Escanear QR" + integrar `QRScannerModal` |

---

### Detalle de Implementación

#### Componente: `CustomerQRModal.tsx`

Este componente muestra un código QR con el UUID del cliente.

Características:
- Usa `qrcode.react` para generar el QR
- El contenido del QR es `PAGANOS:${customer.id}` (prefijo para validación)
- Diseño centrado con instrucciones claras
- Tamaño optimizado para escaneo (256x256)

#### Componente: `QRScannerModal.tsx`

Este componente activa la cámara y escanea códigos QR.

Características:
- Usa `html5-qrcode` para el escaneo
- Soporte para múltiples cámaras (selector)
- Validación del formato `PAGANOS:{uuid}`
- Al detectar QR válido, busca cliente en Supabase
- Manejo de errores (cliente no encontrado, QR inválido)
- Limpieza correcta de recursos de cámara al cerrar

---

### Flujo Técnico: Escaneo QR

```text
1. Usuario hace clic en "Escanear QR"
   |
2. Se abre QRScannerModal
   -> Solicita permiso de cámara
   -> Inicializa html5-qrcode
   |
3. Usuario escanea QR
   |
4. onScanSuccess recibe: "PAGANOS:abc123-uuid-..."
   |
5. Validar formato con regex
   -> Si inválido: mostrar error "QR no válido"
   |
6. Extraer customer_id del QR
   |
7. Buscar cliente en Supabase
   -> SELECT * FROM customers WHERE id = 'abc123-uuid-...'
   |
8. Si encontrado:
   -> onCustomerChange(customer)
   -> Cerrar modal
   -> Mostrar toast "Cliente identificado"
   |
9. Si no encontrado:
   -> Mostrar error "Cliente no encontrado"
   -> Permitir reintentar
```

---

### Consideraciones de Seguridad

1. **UUID como identificador**: Los UUIDs v4 son prácticamente imposibles de adivinar (122 bits de entropía)

2. **Prefijo de validación**: El formato `PAGANOS:{uuid}` evita que se confunda con otros QR codes

3. **Solo lectura**: El QR solo permite identificar al cliente, no modificar datos

4. **Sin datos sensibles**: El QR no contiene nombre, email ni teléfono

5. **Permisos de cámara**: El navegador solicitará permiso explícito

---

### Compatibilidad de Dispositivos

| Dispositivo | Cámara | Soporte |
|-------------|--------|---------|
| Laptop/PC | Webcam integrada | Completo |
| Monitor externo + webcam USB | Webcam USB | Completo |
| Terminal POS con cámara | Cámara integrada | Completo |
| Tablet Android/iPad | Cámara frontal/trasera | Completo |
| Smartphone | Cámara frontal/trasera | Completo |

La librería `html5-qrcode` soporta cambiar entre cámaras disponibles.

---

### Archivos Nuevos

| Archivo | Propósito |
|---------|-----------|
| `src/components/customer/CustomerQRModal.tsx` | Modal para mostrar QR del cliente |
| `src/components/pos/QRScannerModal.tsx` | Modal con escáner de cámara |

### Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `package.json` | Agregar `qrcode.react` y `html5-qrcode` |
| `src/pages/customer/CustomerProfile.tsx` | Agregar botón QR y modal |
| `src/components/pos/CustomerModal.tsx` | Agregar botón escanear y modal |

---

### Beneficios Esperados

1. **Rapidez**: El cliente no necesita dictar su teléfono o email
2. **Precisión**: Elimina errores de tipeo o búsqueda incorrecta
3. **Experiencia premium**: Moderniza el proceso de identificación
4. **Acumulación de runas**: Garantiza que el cliente siempre esté vinculado a su pedido
5. **Sin fricción**: Funciona sin conexión a internet del lado del cliente (el QR está en su app)

