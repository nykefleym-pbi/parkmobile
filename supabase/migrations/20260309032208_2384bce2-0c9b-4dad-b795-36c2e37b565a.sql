
-- Fix booking_summary view to use security invoker
ALTER VIEW public.booking_summary SET (security_invoker = true);
