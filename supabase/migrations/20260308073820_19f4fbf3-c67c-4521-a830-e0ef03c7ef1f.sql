
-- 1. Create profiles table linked to auth.users
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  block_lot TEXT,
  residence_type TEXT DEFAULT 'Resident',
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS: users can read/update their own profile
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 2. Update bookings: add FK to auth.users, update RLS
-- First drop existing permissive policies
DROP POLICY IF EXISTS "Public read bookings" ON public.bookings;
DROP POLICY IF EXISTS "Allow insert bookings" ON public.bookings;
DROP POLICY IF EXISTS "Allow update bookings" ON public.bookings;

-- User can read own bookings
CREATE POLICY "Users can read own bookings"
  ON public.bookings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- User can insert own bookings
CREATE POLICY "Users can insert own bookings"
  ON public.bookings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- User can update own bookings (cancel)
CREATE POLICY "Users can update own bookings"
  ON public.bookings FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Anon can read slot_id for occupied slots check
CREATE POLICY "Anon can read active slot ids"
  ON public.bookings FOR SELECT
  TO anon
  USING (status = 'active');

-- 3. Update vehicles RLS
DROP POLICY IF EXISTS "Public read vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Allow insert vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Allow update vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Allow delete vehicles" ON public.vehicles;

CREATE POLICY "Users can read own vehicles"
  ON public.vehicles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own vehicles"
  ON public.vehicles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own vehicles"
  ON public.vehicles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own vehicles"
  ON public.vehicles FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- 4. Update payments RLS - users can read payments for their bookings
DROP POLICY IF EXISTS "Public read payments" ON public.payments;
DROP POLICY IF EXISTS "Allow insert payments" ON public.payments;

CREATE POLICY "Users can read own payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (
    booking_id IN (SELECT id FROM public.bookings WHERE user_id = auth.uid())
  );

CREATE POLICY "Authenticated can insert payments"
  ON public.payments FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 5. Update penalties RLS
DROP POLICY IF EXISTS "Public read penalties" ON public.penalties;
DROP POLICY IF EXISTS "Allow insert penalties" ON public.penalties;

CREATE POLICY "Users can read own penalties"
  ON public.penalties FOR SELECT
  TO authenticated
  USING (
    booking_id IN (SELECT id FROM public.bookings WHERE user_id = auth.uid())
  );

CREATE POLICY "Authenticated can insert penalties"
  ON public.penalties FOR INSERT
  TO authenticated
  WITH CHECK (true);
