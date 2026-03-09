
-- Fix profiles INSERT policy: remove user_metadata reference
-- admin_id is set by handle_new_user trigger, not by direct INSERT
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (id = auth.uid());
