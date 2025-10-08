-- ============================================
-- CORRECCIÓN DE WARNINGS DE SEGURIDAD
-- Portal Cliente - Políticas restrictivas
-- ============================================

BEGIN;

-- ============================================
-- 1. POLÍTICAS PARA TABLAS DE VERIFICACIÓN
-- ============================================

-- customer_email_verifications: solo acceso vía funciones SECURITY DEFINER
-- Política que niega todo acceso directo
CREATE POLICY "No direct access to email verifications"
  ON public.customer_email_verifications
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- customer_password_resets: solo acceso vía funciones SECURITY DEFINER
-- Política que niega todo acceso directo
CREATE POLICY "No direct access to password resets"
  ON public.customer_password_resets
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- ============================================
-- 2. MOVER EXTENSIÓN CITEXT A ESQUEMA CORRECTO
-- ============================================

-- Crear esquema extensions si no existe
CREATE SCHEMA IF NOT EXISTS extensions;

-- Mover citext al esquema extensions
ALTER EXTENSION citext SET SCHEMA extensions;

-- Agregar extensions al search_path por defecto
ALTER DATABASE postgres SET search_path TO public, extensions;

COMMIT;