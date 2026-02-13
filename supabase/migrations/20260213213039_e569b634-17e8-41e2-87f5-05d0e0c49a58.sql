CREATE OR REPLACE FUNCTION public.validate_cash_session_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar que el usuario tiene rol Cajero/Caja o Administrador
  IF NOT EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    WHERE ur.user_id = NEW.user_id
      AND ur.role IN ('Cajero', 'Caja', 'Administrador')
  ) THEN
    RAISE EXCEPTION 'Usuario no tiene permisos para abrir sesión de caja. Solo Cajeros y Administradores pueden abrir turnos.';
  END IF;
  
  RETURN NEW;
END;
$$;