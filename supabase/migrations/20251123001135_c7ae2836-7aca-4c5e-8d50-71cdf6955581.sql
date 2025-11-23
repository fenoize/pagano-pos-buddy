
-- Mejorar la función handle_new_customer_user para mejor debugging
CREATE OR REPLACE FUNCTION public.handle_new_customer_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_customer_id UUID;
BEGIN
  -- Log para debug
  RAISE NOTICE 'Creating customer for user: % (email: %)', NEW.id, NEW.email;
  
  -- Verificar si ya existe el customer
  SELECT id INTO v_customer_id
  FROM public.customers
  WHERE email = NEW.email;
  
  IF v_customer_id IS NULL THEN
    -- Insertar nuevo customer
    INSERT INTO public.customers (
      auth_user_id,
      email,
      name,
      nombres,
      phone,
      fecha_nacimiento,
      estado_cliente,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
      COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
      COALESCE(NULLIF(NEW.raw_user_meta_data->>'phone', ''), NULL),
      CASE 
        WHEN NEW.raw_user_meta_data->>'birthDate' IS NOT NULL 
          AND NEW.raw_user_meta_data->>'birthDate' != '' 
        THEN (NEW.raw_user_meta_data->>'birthDate')::date
        ELSE NULL
      END,
      'Activo',
      now(),
      now()
    )
    RETURNING id INTO v_customer_id;
    
    RAISE NOTICE 'Created customer with id: %', v_customer_id;
  ELSE
    -- Actualizar auth_user_id si existe el customer pero sin auth_user_id
    UPDATE public.customers
    SET 
      auth_user_id = NEW.id,
      updated_at = now()
    WHERE id = v_customer_id 
      AND auth_user_id IS NULL;
    
    RAISE NOTICE 'Updated existing customer: %', v_customer_id;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error detallado
    RAISE WARNING 'Error in handle_new_customer_user: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    -- No bloquear el signup
    RETURN NEW;
END;
$$;

-- Agregar política RLS permisiva para inserción de customers desde trigger
DROP POLICY IF EXISTS "Allow system to insert customers" ON public.customers;
CREATE POLICY "Allow system to insert customers"
  ON public.customers
  FOR INSERT
  WITH CHECK (true);

-- Comentario
COMMENT ON FUNCTION public.handle_new_customer_user() IS 
  'Función mejorada que crea customer cuando se registra un usuario de Supabase Auth. Incluye logging detallado.';
