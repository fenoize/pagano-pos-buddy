
CREATE TABLE IF NOT EXISTS public.user_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role text,
  invited_by_username text,
  status text NOT NULL DEFAULT 'pendiente',
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz
);

GRANT ALL ON public.user_invitations TO service_role;

ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_user_invitations_email
  ON public.user_invitations (lower(email));

CREATE OR REPLACE FUNCTION public.log_user_invitation(
  p_email text,
  p_role text,
  p_invited_by text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.user_invitations (email, role, invited_by_username)
  VALUES (lower(trim(p_email)), p_role, p_invited_by)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_invitation_accepted()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NOT NULL THEN
    UPDATE public.user_invitations
    SET status = 'aceptada', accepted_at = now()
    WHERE lower(email) = lower(NEW.email)
      AND status = 'pendiente';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mark_invitation_accepted ON public.users;
CREATE TRIGGER trg_mark_invitation_accepted
AFTER INSERT ON public.users
FOR EACH ROW EXECUTE FUNCTION public.mark_invitation_accepted();
