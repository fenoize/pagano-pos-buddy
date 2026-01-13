-- Create staff_notifications table for in-app notifications
CREATE TABLE public.staff_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  role_target TEXT, -- NULL = specific user, 'Administrador' = all admins, etc.
  type TEXT NOT NULL, -- 'cash_session_open', 'cash_session_close', 'cash_movement', 'order_assigned', 'order_delivered'
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices for performance
CREATE INDEX idx_staff_notifications_user ON staff_notifications(user_id);
CREATE INDEX idx_staff_notifications_role ON staff_notifications(role_target);
CREATE INDEX idx_staff_notifications_read ON staff_notifications(read_at);
CREATE INDEX idx_staff_notifications_created ON staff_notifications(created_at DESC);

-- Enable RLS
ALTER TABLE staff_notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Staff can view their own notifications OR notifications targeted to their role
CREATE POLICY "Staff can view own or role notifications"
ON staff_notifications FOR SELECT
USING (
  user_id = (current_setting('app.current_user_id', true))::uuid
  OR (
    role_target IS NOT NULL 
    AND role_target = (
      SELECT role::text FROM users WHERE id = (current_setting('app.current_user_id', true))::uuid
    )
  )
);

-- Policy: Staff can mark as read their own notifications or role-targeted ones
CREATE POLICY "Staff can update own or role notifications"
ON staff_notifications FOR UPDATE
USING (
  user_id = (current_setting('app.current_user_id', true))::uuid
  OR (
    role_target IS NOT NULL 
    AND role_target = (
      SELECT role::text FROM users WHERE id = (current_setting('app.current_user_id', true))::uuid
    )
  )
);

-- Policy: System can insert notifications (service role or authenticated)
CREATE POLICY "Authenticated can insert notifications"
ON staff_notifications FOR INSERT
WITH CHECK (true);

-- Enable realtime for staff_notifications
ALTER PUBLICATION supabase_realtime ADD TABLE staff_notifications;