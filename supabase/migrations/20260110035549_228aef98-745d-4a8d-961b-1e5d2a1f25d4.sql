-- Add webhook_attempts table for server-side rate limiting / audit of webhook calls
CREATE TABLE IF NOT EXISTS public.webhook_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempted_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  ref_id text,
  success boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_webhook_attempts_ip_attempted_at
  ON public.webhook_attempts (ip_address, attempted_at DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_attempts_ref_id_attempted_at
  ON public.webhook_attempts (ref_id, attempted_at DESC);

-- Lock down with RLS (service role bypasses RLS for function use)
ALTER TABLE public.webhook_attempts ENABLE ROW LEVEL SECURITY;

-- Default deny: no client role can read/write this table
DROP POLICY IF EXISTS "No public access webhook attempts" ON public.webhook_attempts;
CREATE POLICY "No public access webhook attempts"
ON public.webhook_attempts
FOR ALL
USING (false)
WITH CHECK (false);
