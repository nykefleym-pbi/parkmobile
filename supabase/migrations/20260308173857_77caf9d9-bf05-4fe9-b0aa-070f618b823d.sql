
-- Add invite_code to admins
ALTER TABLE public.admins ADD COLUMN invite_code TEXT UNIQUE;

-- Add admin_id to app_config (one-to-one)
ALTER TABLE public.app_config ADD COLUMN admin_id UUID REFERENCES public.admins(id) ON DELETE CASCADE;
ALTER TABLE public.app_config ADD CONSTRAINT app_config_admin_unique UNIQUE (admin_id);

-- Add admin_id to spaces
ALTER TABLE public.spaces ADD COLUMN admin_id UUID REFERENCES public.admins(id) ON DELETE CASCADE;

-- Add admin_id to profiles
ALTER TABLE public.profiles ADD COLUMN admin_id UUID REFERENCES public.admins(id) ON DELETE SET NULL;

-- Add admin_id to bookings
ALTER TABLE public.bookings ADD COLUMN admin_id UUID REFERENCES public.admins(id) ON DELETE SET NULL;

-- Generate invite codes for existing admins
UPDATE public.admins SET invite_code = upper(substr(md5(random()::text), 1, 8));

-- Migrate existing data to first admin
DO $$
DECLARE
  first_admin_id UUID;
BEGIN
  SELECT id INTO first_admin_id FROM public.admins ORDER BY created_at LIMIT 1;
  IF first_admin_id IS NOT NULL THEN
    UPDATE public.app_config SET admin_id = first_admin_id WHERE admin_id IS NULL;
    UPDATE public.spaces SET admin_id = first_admin_id WHERE admin_id IS NULL;
    UPDATE public.profiles SET admin_id = first_admin_id WHERE admin_id IS NULL;
    UPDATE public.bookings SET admin_id = first_admin_id WHERE admin_id IS NULL;
  END IF;
END $$;

-- Update handle_new_user trigger to store admin_id from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, name, email, phone, block_lot, residence_type, admin_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    NULLIF(NEW.raw_user_meta_data->>'phone', ''),
    NULLIF(NEW.raw_user_meta_data->>'block_lot', ''),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'residence_type', ''), 'Resident'),
    (NEW.raw_user_meta_data->>'admin_id')::UUID
  );
  
  IF NEW.raw_user_meta_data->>'car_name' IS NOT NULL AND NEW.raw_user_meta_data->>'car_plate' IS NOT NULL THEN
    INSERT INTO public.vehicles (user_id, name, plate, color, is_primary)
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'car_name',
      NEW.raw_user_meta_data->>'car_plate',
      COALESCE(NEW.raw_user_meta_data->>'car_color', 'White'),
      true
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update get_occupied_slots to filter by admin_id
CREATE OR REPLACE FUNCTION public.get_occupied_slots(_admin_id UUID DEFAULT NULL)
 RETURNS TABLE(slot_id text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT DISTINCT b.slot_id
  FROM public.bookings b
  WHERE b.status = 'active'
    AND (_admin_id IS NULL OR b.admin_id = _admin_id);
$function$;

-- Update booking_summary view to include admin_id
DROP VIEW IF EXISTS public.booking_summary;
CREATE VIEW public.booking_summary AS
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
  b.rate,
  b.created_at,
  b.admin_id,
  (b.rate * (DATE_PART('year', AGE(b.end_date, b.start_date)) * 12 + DATE_PART('month', AGE(b.end_date, b.start_date))))::numeric AS base_fee,
  COALESCE((SELECT SUM(p.amount) FROM public.payments p WHERE p.booking_id = b.id), 0)::numeric AS total_paid,
  (SELECT pen.overstay_days FROM public.penalties pen WHERE pen.booking_id = b.id LIMIT 1) AS penalty_days,
  (SELECT pen.amount FROM public.penalties pen WHERE pen.booking_id = b.id LIMIT 1) AS penalty_amount
FROM public.bookings b;
