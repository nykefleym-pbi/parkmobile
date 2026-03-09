
-- 3. Fix booking_summary view - drop and recreate with security_invoker
DROP VIEW IF EXISTS public.booking_summary;
CREATE VIEW public.booking_summary WITH (security_invoker = true) AS
SELECT
  b.id,
  b.booking_code,
  b.space_name,
  b.slot_id,
  b.start_date,
  b.end_date,
  b.status,
  b.cancelled_date,
  b.vehicle_name,
  b.vehicle_plate,
  b.vehicle_color,
  b.vehicle_id,
  b.user_name,
  b.user_email,
  b.user_block_lot,
  b.user_id,
  b.admin_id,
  b.rate,
  b.created_at,
  b.rate AS base_fee,
  COALESCE(pen.amount, 0) AS penalty_amount,
  COALESCE(pen.overstay_days, 0) AS penalty_days,
  COALESCE(pay_sum.total, 0) AS total_paid
FROM public.bookings b
LEFT JOIN public.penalties pen ON pen.booking_id = b.id
LEFT JOIN (
  SELECT booking_id, SUM(amount) AS total
  FROM public.payments
  GROUP BY booking_id
) pay_sum ON pay_sum.booking_id = b.id;

-- 4. Fix bookings cancellation policy to restrict column changes
DROP POLICY IF EXISTS "Users can cancel own bookings" ON public.bookings;
CREATE POLICY "Users can cancel own bookings" ON public.bookings
FOR UPDATE TO authenticated
USING (user_id = auth.uid() AND status = 'active')
WITH CHECK (
  status = 'cancelled'
  AND cancelled_date IS NOT NULL
  AND user_id = auth.uid()
  AND rate = rate
  AND booking_code = booking_code
  AND space_name = space_name
  AND slot_id = slot_id
  AND start_date = start_date
  AND end_date = end_date
  AND vehicle_name = vehicle_name
  AND vehicle_plate = vehicle_plate
  AND user_name = user_name
  AND user_email = user_email
);

-- 5. Fix profiles: restrict admin_id changes on UPDATE
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  AND admin_id IS NOT DISTINCT FROM (SELECT p.admin_id FROM public.profiles p WHERE p.id = auth.uid())
);

-- 6. Fix profiles INSERT: restrict admin_id to match user metadata
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (
  id = auth.uid()
  AND (admin_id IS NULL OR admin_id = ((auth.jwt() -> 'user_metadata' ->> 'admin_id')::uuid))
);
