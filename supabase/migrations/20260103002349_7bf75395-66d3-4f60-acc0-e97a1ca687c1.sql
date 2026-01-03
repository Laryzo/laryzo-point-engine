-- Allow insert for system_settings
CREATE POLICY "Allow admin insert system settings" 
ON public.system_settings 
FOR INSERT 
WITH CHECK (true);

-- Enable realtime for customers and point_history (orders already enabled)
ALTER TABLE public.customers REPLICA IDENTITY FULL;
ALTER TABLE public.point_history REPLICA IDENTITY FULL;