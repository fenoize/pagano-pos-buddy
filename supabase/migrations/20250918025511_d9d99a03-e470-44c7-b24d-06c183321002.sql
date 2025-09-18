-- Create order audit table for tracking changes
CREATE TABLE public.order_audits (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL,
    user_id UUID,
    field_name TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.order_audits ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public access for order audits" 
ON public.order_audits 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Add index for performance
CREATE INDEX idx_order_audits_order_id ON public.order_audits(order_id);
CREATE INDEX idx_order_audits_created_at ON public.order_audits(created_at);