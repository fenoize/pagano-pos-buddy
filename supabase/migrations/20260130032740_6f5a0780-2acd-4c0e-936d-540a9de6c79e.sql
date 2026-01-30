-- =============================================
-- staff_notifications RLS: Token-Based Policies
-- =============================================

-- 1) Drop existing policies
DROP POLICY IF EXISTS "Staff can view own or role notifications" ON public.staff_notifications;
DROP POLICY IF EXISTS "Staff can update own or role notifications" ON public.staff_notifications;
DROP POLICY IF EXISTS "Authenticated can insert notifications" ON public.staff_notifications;
DROP POLICY IF EXISTS "Staff can view own or role notifications (token)" ON public.staff_notifications;
DROP POLICY IF EXISTS "Staff can update own or role notifications (token)" ON public.staff_notifications;
DROP POLICY IF EXISTS "Staff can insert notifications (token)" ON public.staff_notifications;

-- 2) SELECT policy: view notifications targeted to user or their role
CREATE POLICY "Staff can view own or role notifications (token)"
ON public.staff_notifications
FOR SELECT
USING (
  (user_id IS NOT NULL AND user_id = public.get_current_staff_user_from_token())
  OR
  (
    role_target IS NOT NULL
    AND role_target = (
      SELECT u.role::text
      FROM public.users u
      WHERE u.id = public.get_current_staff_user_from_token()
    )
  )
);

-- 3) UPDATE policy: mark as read only own or role-targeted notifications
CREATE POLICY "Staff can update own or role notifications (token)"
ON public.staff_notifications
FOR UPDATE
USING (
  (user_id IS NOT NULL AND user_id = public.get_current_staff_user_from_token())
  OR
  (
    role_target IS NOT NULL
    AND role_target = (
      SELECT u.role::text
      FROM public.users u
      WHERE u.id = public.get_current_staff_user_from_token()
    )
  )
);

-- 4) INSERT policy: only staff with valid token can insert
CREATE POLICY "Staff can insert notifications (token)"
ON public.staff_notifications
FOR INSERT
WITH CHECK (
  public.get_current_staff_user_from_token() IS NOT NULL
);