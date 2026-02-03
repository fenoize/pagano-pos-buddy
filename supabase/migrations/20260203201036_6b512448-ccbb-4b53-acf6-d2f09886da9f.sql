-- =====================================================
-- MIGRACIÓN: Actualizar trigger handle_new_customer_user 
-- + Normalizar campos legacy de customers
-- =====================================================

-- 1. Actualizar el trigger para extraer nombres y apellidos correctamente desde Google
CREATE OR REPLACE FUNCTION public.handle_new_customer_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_nombre TEXT;
  v_apellido TEXT;
  v_full_name TEXT;
  v_phone TEXT;
  v_birth_date DATE;
BEGIN
  -- Extraer datos desde raw_user_meta_data
  -- Google provee: full_name, name (a veces), given_name, family_name
  -- Signup manual provee: nombre, apellido
  
  -- Intentar obtener nombre
  v_nombre := COALESCE(
    NEW.raw_user_meta_data ->> 'nombre',           -- signup manual
    NEW.raw_user_meta_data ->> 'given_name',       -- Google
    NEW.raw_user_meta_data ->> 'name',             -- fallback
    SPLIT_PART(NEW.raw_user_meta_data ->> 'full_name', ' ', 1)
  );
  
  -- Intentar obtener apellido
  v_apellido := COALESCE(
    NEW.raw_user_meta_data ->> 'apellido',         -- signup manual
    NEW.raw_user_meta_data ->> 'family_name',      -- Google
    NULLIF(TRIM(REGEXP_REPLACE(COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''), '^' || COALESCE(v_nombre, '') || '\s*', '')), '')
  );
  
  -- Full name combinado
  v_full_name := TRIM(COALESCE(v_nombre, '') || ' ' || COALESCE(v_apellido, ''));
  
  -- Teléfono (solo de signup manual, Google no lo provee)
  v_phone := NEW.raw_user_meta_data ->> 'phone';
  
  -- Fecha de nacimiento (solo de signup manual)
  BEGIN
    v_birth_date := (NEW.raw_user_meta_data ->> 'birthDate')::DATE;
  EXCEPTION WHEN OTHERS THEN
    v_birth_date := NULL;
  END;

  INSERT INTO public.customers (
    auth_user_id,
    email,
    -- Campos nuevos normalizados
    nombres,
    apellidos,
    -- Campos legacy (mantener sincronizados)
    name,
    apellido,
    -- Otros campos
    phone,
    fecha_nacimiento,
    estado_cliente
  )
  VALUES (
    NEW.id,
    NEW.email,
    v_nombre,
    v_apellido,
    v_nombre,  -- legacy: name = nombres
    v_apellido, -- legacy: apellido = apellidos
    v_phone,
    v_birth_date,
    'Activo'
  );

  RETURN NEW;
END;
$function$;

-- 2. Sincronizar campos legacy existentes: copiar entre name/nombres y apellido/apellidos
UPDATE public.customers
SET 
  -- Si nombres está vacío pero name tiene valor, copiar
  nombres = COALESCE(NULLIF(nombres, ''), name),
  -- Si apellidos está vacío pero apellido tiene valor, copiar
  apellidos = COALESCE(NULLIF(apellidos, ''), apellido),
  -- Viceversa: si name está vacío pero nombres tiene valor
  name = COALESCE(NULLIF(name, ''), nombres),
  -- Si apellido está vacío pero apellidos tiene valor
  apellido = COALESCE(NULLIF(apellido, ''), apellidos)
WHERE 
  (nombres IS DISTINCT FROM name) OR 
  (apellidos IS DISTINCT FROM apellido) OR
  (nombres IS NULL AND name IS NOT NULL) OR
  (name IS NULL AND nombres IS NOT NULL) OR
  (apellidos IS NULL AND apellido IS NOT NULL) OR
  (apellido IS NULL AND apellidos IS NOT NULL);