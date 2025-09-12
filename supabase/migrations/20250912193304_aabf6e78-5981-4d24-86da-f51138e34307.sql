-- Add missing columns to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email text;

-- Add RLS policies for users table to allow CRUD operations
-- Policy for INSERT - Only admins can create users
CREATE POLICY "Allow admin to insert users" 
ON public.users 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'Administrador'
  )
);

-- Policy for UPDATE - Only admins can update users
CREATE POLICY "Allow admin to update users" 
ON public.users 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'Administrador'
  )
);

-- Policy for DELETE - Only admins can delete users
CREATE POLICY "Allow admin to delete users" 
ON public.users 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'Administrador'
  )
);

-- Create unique constraint on username
ALTER TABLE public.users ADD CONSTRAINT users_username_unique UNIQUE (username);

-- Create unique constraint on email (optional, allow nulls)
ALTER TABLE public.users ADD CONSTRAINT users_email_unique UNIQUE (email) DEFERRABLE INITIALLY DEFERRED;