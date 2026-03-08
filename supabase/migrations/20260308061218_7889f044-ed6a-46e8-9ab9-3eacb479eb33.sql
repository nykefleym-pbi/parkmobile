
-- Remove overly permissive SELECT policies from users and admins tables
-- These exposed password_hash (plaintext passwords) to any anonymous client

DROP POLICY IF EXISTS "Public read users" ON public.users;
DROP POLICY IF EXISTS "Public read admins" ON public.admins;
DROP POLICY IF EXISTS "Allow all admins" ON public.admins;
