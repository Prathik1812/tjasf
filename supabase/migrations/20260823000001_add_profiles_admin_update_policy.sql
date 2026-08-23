-- ============ ALLOW ADMINS TO UPDATE PROFILES ============
-- This migration enables users with the 'admin' role to permanently edit other profiles (like changing roles).

DROP POLICY IF EXISTS "profiles_admin_update" ON public.profiles;

CREATE POLICY "profiles_admin_update" ON public.profiles
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));
