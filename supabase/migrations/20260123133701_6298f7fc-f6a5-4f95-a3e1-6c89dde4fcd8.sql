-- Create customer_phone_history table to store recently used phone numbers
CREATE TABLE public.customer_phone_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL,
    phone_number TEXT NOT NULL,
    label TEXT,
    last_used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    use_count INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(customer_id, phone_number)
);

-- Enable RLS
ALTER TABLE public.customer_phone_history ENABLE ROW LEVEL SECURITY;

-- Customers can only read their own phone history
CREATE POLICY "Customers read own phone history"
ON public.customer_phone_history
FOR SELECT
USING (is_authenticated_customer() AND customer_id = get_current_customer_id());

-- Admins can read all phone history
CREATE POLICY "Admins read all phone history"
ON public.customer_phone_history
FOR SELECT
USING (is_authenticated_admin());

-- No direct insert/update/delete from client - only via edge function with service role
CREATE POLICY "No public insert phone history"
ON public.customer_phone_history
FOR INSERT
WITH CHECK (false);

CREATE POLICY "No public update phone history"
ON public.customer_phone_history
FOR UPDATE
USING (false);

CREATE POLICY "No public delete phone history"
ON public.customer_phone_history
FOR DELETE
USING (false);

-- Create index for faster lookups
CREATE INDEX idx_customer_phone_history_customer_id ON public.customer_phone_history(customer_id);
CREATE INDEX idx_customer_phone_history_last_used ON public.customer_phone_history(customer_id, last_used_at DESC);