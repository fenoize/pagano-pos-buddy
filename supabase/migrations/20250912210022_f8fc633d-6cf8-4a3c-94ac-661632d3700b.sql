-- ===================================================================
-- FASE 1: LIMPIEZA Y RESTRUCTURACIÓN DE BASE DE DATOS
-- Módulo de Clientes v1 - Base Limpia
-- ===================================================================

-- 1. LIMPIEZA DE DATOS EXISTENTES
-- ================================================================
DELETE FROM runas_transactions;
DELETE FROM orders;
DELETE FROM customers;

-- 2. CREAR NUEVOS ENUMS
-- ================================================================

-- Enum para estado del cliente
CREATE TYPE estado_cliente AS ENUM ('Activo', 'Inactivo', 'Bloqueado');

-- Agregar nuevos valores al enum existente runa_movement_type
-- (primero verificamos si existen, si no los agregamos)
DO $$
BEGIN
    -- Agregar 'acumulacion' si no existe
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'acumulacion' AND enumtypid = 'runa_movement_type'::regtype) THEN
        ALTER TYPE runa_movement_type ADD VALUE 'acumulacion';
    END IF;
    
    -- Agregar 'canje' si no existe  
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'canje' AND enumtypid = 'runa_movement_type'::regtype) THEN
        ALTER TYPE runa_movement_type ADD VALUE 'canje';
    END IF;
    
    -- Agregar 'ajuste' si no existe
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ajuste' AND enumtypid = 'runa_movement_type'::regtype) THEN
        ALTER TYPE runa_movement_type ADD VALUE 'ajuste';
    END IF;
    
    -- Agregar 'promo' si no existe
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'promo' AND enumtypid = 'runa_movement_type'::regtype) THEN
        ALTER TYPE runa_movement_type ADD VALUE 'promo';
    END IF;
END $$;

-- Nuevo enum para origen de movimiento
CREATE TYPE origen_movimiento AS ENUM ('POS', 'Web', 'Manual');

-- 3. RESTRUCTURAR TABLA CUSTOMERS
-- ================================================================

-- Agregar nuevos campos a la tabla customers
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS nombres TEXT,
ADD COLUMN IF NOT EXISTS apellidos TEXT,
ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE,
ADD COLUMN IF NOT EXISTS estado_cliente estado_cliente DEFAULT 'Activo'::estado_cliente,
ADD COLUMN IF NOT EXISTS motivo_estado TEXT,
ADD COLUMN IF NOT EXISTS created_by_user_id UUID,
ADD COLUMN IF NOT EXISTS updated_by_user_id UUID;

-- Remover campos de dirección individuales (serán migrados a tabla addresses)
ALTER TABLE customers 
DROP COLUMN IF EXISTS direccion,
DROP COLUMN IF EXISTS numeracion,
DROP COLUMN IF EXISTS comuna;

-- Actualizar el campo name existente para ser nombres + apellidos si hay datos
-- (esto será útil para mantener compatibilidad durante la transición)

-- 4. CREAR TABLA ADDRESSES
-- ================================================================

CREATE TABLE IF NOT EXISTS addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL,
    alias TEXT NOT NULL DEFAULT 'Principal',
    calle TEXT NOT NULL,
    numero TEXT NOT NULL,
    depto TEXT,
    comuna TEXT NOT NULL,
    ciudad TEXT DEFAULT 'Santiago',
    observaciones TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Foreign key constraint
    CONSTRAINT fk_addresses_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Constraint: solo una dirección default por cliente
    CONSTRAINT unique_default_per_customer EXCLUDE USING btree (customer_id WITH =) WHERE (is_default = true)
);

-- Habilitar RLS en addresses
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

-- Política RLS para addresses - acceso público para operaciones POS
CREATE POLICY "Allow public access for POS operations to addresses" 
ON addresses 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Trigger para updated_at en addresses
CREATE TRIGGER update_addresses_updated_at
    BEFORE UPDATE ON addresses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. MEJORAR TABLA RUNAS_TRANSACTIONS
-- ================================================================

-- Agregar nuevos campos a runas_transactions
ALTER TABLE runas_transactions
ADD COLUMN IF NOT EXISTS origen origen_movimiento DEFAULT 'POS'::origen_movimiento,
ADD COLUMN IF NOT EXISTS motivo TEXT,
ADD COLUMN IF NOT EXISTS responsable_id UUID;

-- Actualizar el campo type para usar el enum mejorado
-- (los datos existentes ya fueron eliminados, así que esto es seguro)

-- 6. ÍNDICES PARA OPTIMIZACIÓN
-- ================================================================

-- Índices para customers
CREATE INDEX IF NOT EXISTS idx_customers_rut ON customers(rut) WHERE rut IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_estado ON customers(estado_cliente);
CREATE INDEX IF NOT EXISTS idx_customers_nombres ON customers(nombres);
CREATE INDEX IF NOT EXISTS idx_customers_apellidos ON customers(apellidos);

-- Índices para addresses
CREATE INDEX IF NOT EXISTS idx_addresses_customer_id ON addresses(customer_id);
CREATE INDEX IF NOT EXISTS idx_addresses_comuna ON addresses(comuna);
CREATE INDEX IF NOT EXISTS idx_addresses_is_default ON addresses(customer_id, is_default) WHERE is_default = true;

-- Índices para runas_transactions
CREATE INDEX IF NOT EXISTS idx_runas_transactions_customer_id ON runas_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_runas_transactions_type ON runas_transactions(type);
CREATE INDEX IF NOT EXISTS idx_runas_transactions_origen ON runas_transactions(origen);
CREATE INDEX IF NOT EXISTS idx_runas_transactions_created_at ON runas_transactions(created_at);

-- 7. CONSTRAINTS ADICIONALES
-- ================================================================

-- Constraint para email único en customers
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'customers_email_unique' 
        AND table_name = 'customers'
    ) THEN
        ALTER TABLE customers ADD CONSTRAINT customers_email_unique UNIQUE (email);
    END IF;
END $$;

-- Constraint para RUT único en customers (solo si no es null)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'customers_rut_unique' 
        AND table_name = 'customers'
    ) THEN
        CREATE UNIQUE INDEX customers_rut_unique ON customers (rut) WHERE rut IS NOT NULL;
    END IF;
END $$;

-- 8. COMENTARIOS PARA DOCUMENTACIÓN
-- ================================================================

COMMENT ON TABLE customers IS 'Tabla principal de clientes con información personal y estado';
COMMENT ON COLUMN customers.nombres IS 'Nombres del cliente (separado de apellidos)';
COMMENT ON COLUMN customers.apellidos IS 'Apellidos del cliente (separado de nombres)';
COMMENT ON COLUMN customers.estado_cliente IS 'Estado actual del cliente: Activo, Inactivo, Bloqueado';
COMMENT ON COLUMN customers.motivo_estado IS 'Motivo del estado (obligatorio si está Bloqueado)';
COMMENT ON COLUMN customers.fecha_nacimiento IS 'Fecha de nacimiento para beneficios y promociones';

COMMENT ON TABLE addresses IS 'Direcciones múltiples por cliente para delivery';
COMMENT ON COLUMN addresses.is_default IS 'Indica si es la dirección principal del cliente (solo una por cliente)';
COMMENT ON COLUMN addresses.alias IS 'Nombre descriptivo de la dirección (Casa, Trabajo, etc.)';

COMMENT ON COLUMN runas_transactions.origen IS 'Canal donde se originó el movimiento: POS, Web, Manual';
COMMENT ON COLUMN runas_transactions.motivo IS 'Motivo del movimiento (obligatorio para ajustes manuales)';
COMMENT ON COLUMN runas_transactions.responsable_id IS 'Usuario responsable del movimiento (especialmente para ajustes manuales)';

-- ===================================================================
-- FIN DE MIGRACIÓN FASE 1
-- Base de datos limpia y reestructurada para el nuevo módulo de clientes
-- ===================================================================