-- 1. Fix bookings SELECT policies: drop RESTRICTIVE, recreate as PERMISSIVE
DROP POLICY IF EXISTS "Users can read own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Anon can read active slot ids" ON public.bookings;

CREATE POLICY "Users can read own bookings"
  ON public.bookings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 2. Fix payments SELECT policy
DROP POLICY IF EXISTS "Users can read own payments" ON public.payments;

CREATE POLICY "Users can read own payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (booking_id IN (SELECT id FROM public.bookings WHERE user_id = auth.uid()));

-- 3. Fix penalties SELECT policy
DROP POLICY IF EXISTS "Users can read own penalties" ON public.penalties;

CREATE POLICY "Users can read own penalties"
  ON public.penalties FOR SELECT
  TO authenticated
  USING (booking_id IN (SELECT id FROM public.bookings WHERE user_id = auth.uid()));

-- 4. Fix INSERT policies to PERMISSIVE
DROP POLICY IF EXISTS "Authenticated can insert payments" ON public.payments;
CREATE POLICY "Authenticated can insert payments"
  ON public.payments FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can insert penalties" ON public.penalties;
CREATE POLICY "Authenticated can insert penalties"
  ON public.penalties FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 5. Fix bookings INSERT/UPDATE policies
DROP POLICY IF EXISTS "Users can insert own bookings" ON public.bookings;
CREATE POLICY "Users can insert own bookings"
  ON public.bookings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own bookings" ON public.bookings;
CREATE POLICY "Users can update own bookings"
  ON public.bookings FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- 6. Create SECURITY DEFINER function to get all occupied slots
CREATE OR REPLACE FUNCTION public.get_occupied_slots()
RETURNS TABLE(slot_id text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT b.slot_id
  FROM public.bookings b
  WHERE b.status = 'active';
$$;