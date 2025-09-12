-- ===================================================================
-- FASE 1: LIMPIEZA Y RESTRUCTURACIÓN DE BASE DE DATOS - DEFINITIVA
-- Módulo de Clientes v1 - Base Limpia
-- ===================================================================

-- 1. LIMPIEZA DE DATOS EXISTENTES
-- ================================================================
DELETE FROM runas_transactions;
DELETE FROM orders;
DELETE FROM customers;

-- 2. CREAR NUEVOS ENUMS (SOLO SI NO EXISTEN)
-- ================================================================

-- Enum para estado del cliente
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_cliente') THEN
        CREATE TYPE estado_cliente AS ENUM ('Activo', 'Inactivo', 'Bloqueado');
    END IF;
END $$;

-- Enum para tipo de movimiento de runas
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'runa_movement_type') THEN
        CREATE TYPE runa_movement_type AS ENUM ('acumulacion', 'canje', 'ajuste', 'promo');
    END IF;
END $$;

-- Enum para origen de movimiento
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'origen_movimiento') THEN
        CREATE TYPE origen_movimiento AS ENUM ('POS', 'Web', 'Manual');
    END IF;
END $$;

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

-- 4. CREAR TABLA ADDRESSES (SOLO SI NO EXISTE)
-- ================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'addresses') THEN
        CREATE TABLE addresses (
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
            CONSTRAINT fk_addresses_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
        );
    END IF;
END $$;

-- Crear constraint único para is_default por cliente (solo si no existe)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'addresses_unique_default_per_customer') THEN
        CREATE UNIQUE INDEX addresses_unique_default_per_customer 
        ON addresses (customer_id) 
        WHERE is_default = true;
    END IF;
END $$;

-- Habilitar RLS en addresses
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

-- Eliminar política existente si existe y crear nueva
DROP POLICY IF EXISTS "Allow public access for POS operations to addresses" ON addresses;
CREATE POLICY "Allow public access for POS operations to addresses" 
ON addresses 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Crear trigger para updated_at en addresses (solo si no existe)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_addresses_updated_at') THEN
        CREATE TRIGGER update_addresses_updated_at
            BEFORE UPDATE ON addresses
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- 5. RESTRUCTURAR TABLA RUNAS_TRANSACTIONS
-- ================================================================

-- Eliminar la columna type existente y crearla de nuevo con el enum
ALTER TABLE runas_transactions DROP COLUMN IF EXISTS type;
ALTER TABLE runas_transactions ADD COLUMN type runa_movement_type NOT NULL DEFAULT 'acumulacion'::runa_movement_type;

-- Agregar nuevos campos a runas_transactions
ALTER TABLE runas_transactions
ADD COLUMN IF NOT EXISTS origen origen_movimiento DEFAULT 'POS'::origen_movimiento,
ADD COLUMN IF NOT EXISTS motivo TEXT,
ADD COLUMN IF NOT EXISTS responsable_id UUID;

-- 6. ÍNDICES PARA OPTIMIZACIÓN
-- ================================================================

-- Índices para customers
DROP INDEX IF EXISTS idx_customers_rut;
DROP INDEX IF EXISTS idx_customers_email; 
DROP INDEX IF EXISTS idx_customers_phone;
DROP INDEX IF EXISTS idx_customers_estado;
DROP INDEX IF EXISTS idx_customers_nombres;
DROP INDEX IF EXISTS idx_customers_apellidos;

CREATE INDEX idx_customers_rut ON customers(rut) WHERE rut IS NOT NULL;
CREATE INDEX idx_customers_email ON customers(email) WHERE email IS NOT NULL;
CREATE INDEX idx_customers_phone ON customers(phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_customers_estado ON customers(estado_cliente);
CREATE INDEX idx_customers_nombres ON customers(nombres);
CREATE INDEX idx_customers_apellidos ON customers(apellidos);

-- Índices para addresses
DROP INDEX IF EXISTS idx_addresses_customer_id;
DROP INDEX IF EXISTS idx_addresses_comuna;

CREATE INDEX idx_addresses_customer_id ON addresses(customer_id);
CREATE INDEX idx_addresses_comuna ON addresses(comuna);

-- Índices para runas_transactions
DROP INDEX IF EXISTS idx_runas_transactions_customer_id;
DROP INDEX IF EXISTS idx_runas_transactions_type;
DROP INDEX IF EXISTS idx_runas_transactions_origen;
DROP INDEX IF EXISTS idx_runas_transactions_created_at;

CREATE INDEX idx_runas_transactions_customer_id ON runas_transactions(customer_id);
CREATE INDEX idx_runas_transactions_type ON runas_transactions(type);
CREATE INDEX idx_runas_transactions_origen ON runas_transactions(origen);
CREATE INDEX idx_runas_transactions_created_at ON runas_transactions(created_at);

-- 7. CONSTRAINTS ADICIONALES
-- ================================================================

-- Eliminar constraints existentes si existen
DROP INDEX IF EXISTS customers_email_unique;
DROP INDEX IF EXISTS customers_rut_unique;

-- Crear nuevos constraints
CREATE UNIQUE INDEX customers_email_unique ON customers (email) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX customers_rut_unique ON customers (rut) WHERE rut IS NOT NULL;

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
-- FIN DE MIGRACIÓN FASE 1 - DEFINITIVA
-- Base de datos limpia y reestructurada para el nuevo módulo de clientes
-- ===================================================================