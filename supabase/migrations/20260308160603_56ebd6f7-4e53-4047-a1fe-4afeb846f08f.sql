
DROP POLICY IF EXISTS "Authenticated can insert payments" ON public.payments;
DROP POLICY IF EXISTS "Authenticated can insert penalties" ON public.penalties;
DROP POLICY IF EXISTS "Allow all config" ON public.app_config;
DROP POLICY IF EXISTS "Allow all spaces" ON public.spaces;
