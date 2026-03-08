ALTER TABLE public.bookings ALTER COLUMN vehicle_id DROP NOT NULL;
ALTER TABLE public.bookings DROP CONSTRAINT bookings_vehicle_id_fkey;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_vehicle_id_fkey
  FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE SET NULL;