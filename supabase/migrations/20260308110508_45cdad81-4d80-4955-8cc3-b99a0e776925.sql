-- Fix vehicles foreign key: point to auth.users instead of public.users
ALTER TABLE public.vehicles DROP CONSTRAINT IF EXISTS vehicles_user_id_fkey;
ALTER TABLE public.vehicles ADD CONSTRAINT vehicles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Also fix bookings foreign key referencing public.users
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_user_id_fkey;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;