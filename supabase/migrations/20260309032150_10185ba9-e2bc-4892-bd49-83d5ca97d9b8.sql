
-- 1. Restrict bookings UPDATE to only allow cancellation
DROP POLICY IF EXISTS "Users can update own bookings" ON public.bookings;
CREATE POLICY "Users can cancel own bookings"
ON public.bookings FOR UPDATE TO authenticated
USING (user_id = auth.uid() AND status = 'active')
WITH CHECK (status = 'cancelled' AND cancelled_date IS NOT NULL);

-- 2. Drop direct INSERT policy (booking creation moves to edge function)
DROP POLICY IF EXISTS "Users can insert own bookings" ON public.bookings;
