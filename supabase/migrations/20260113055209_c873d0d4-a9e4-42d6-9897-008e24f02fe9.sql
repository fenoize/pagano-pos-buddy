-- Create order_feedback table for customer ratings
CREATE TABLE public.order_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  rating TEXT NOT NULL CHECK (rating IN ('positive', 'negative')),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.users(id),
  review_notes TEXT,
  CONSTRAINT unique_order_feedback UNIQUE(order_id)
);

-- Create indexes for performance
CREATE INDEX idx_order_feedback_customer ON public.order_feedback(customer_id);
CREATE INDEX idx_order_feedback_rating ON public.order_feedback(rating);
CREATE INDEX idx_order_feedback_created_at ON public.order_feedback(created_at DESC);
CREATE INDEX idx_order_feedback_reviewed ON public.order_feedback(reviewed_at) WHERE reviewed_at IS NULL;

-- Enable RLS
ALTER TABLE public.order_feedback ENABLE ROW LEVEL SECURITY;

-- Customers can insert feedback for their own orders
CREATE POLICY "Customers can insert own feedback"
ON public.order_feedback FOR INSERT
WITH CHECK (
  customer_id IN (
    SELECT id FROM public.customers 
    WHERE account_id = (SELECT id FROM public.customer_accounts WHERE id = auth.uid())
  )
);

-- Customers can view their own feedback
CREATE POLICY "Customers can view own feedback"
ON public.order_feedback FOR SELECT
USING (
  customer_id IN (
    SELECT id FROM public.customers 
    WHERE account_id = (SELECT id FROM public.customer_accounts WHERE id = auth.uid())
  )
  OR is_active_staff()
);

-- Staff can view all feedback
CREATE POLICY "Staff can view all feedback"
ON public.order_feedback FOR SELECT
USING (is_active_staff());

-- Staff can update feedback (mark as reviewed)
CREATE POLICY "Staff can update feedback"
ON public.order_feedback FOR UPDATE
USING (is_active_staff())
WITH CHECK (is_active_staff());