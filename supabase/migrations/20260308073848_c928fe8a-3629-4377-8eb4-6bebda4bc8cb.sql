
-- Fix security definer view - recreate with security_invoker
DROP VIEW IF EXISTS public.booking_summary;
CREATE VIEW public.booking_summary
WITH (security_invoker = on) AS
SELECT
  b.id, b.booking_code, b.space_name, b.slot_id,
  b.vehicle_name, b.vehicle_plate, b.vehicle_color,
  b.start_date, b.end_date, b.cancelled_date,
  b.vehicle_id, b.created_at, b.user_id, b.rate,
  b.user_block_lot, b.user_email, b.user_name, b.status,
  (b.rate) AS base_fee,
  COALESCE(pm.total_paid, 0) AS total_paid,
  pen.overstay_days AS penalty_days,
  COALESCE(pen.amount, 0) AS penalty_amount
FROM public.bookings b
LEFT JOIN (
  SELECT booking_id, SUM(amount) AS total_paid
  FROM public.payments GROUP BY booking_id
) pm ON pm.booking_id = b.id
LEFT JOIN public.penalties pen ON pen.booking_id = b.id;
