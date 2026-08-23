-- ============ FIX PROFILES RLS RECURSION ============
-- This migration fixes the 500 server error caused by infinite RLS recursion on SELECT.

-- 1. Create a security definer function to check if a user is an admin (bypasses RLS stack limit)
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = 'admin'
  );
END;
$$;

-- 2. Recreate the SELECT policy using the security definer function
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;

CREATE POLICY "profiles_select_own_or_admin" ON public.profiles 
FOR SELECT 
TO authenticated 
USING (auth.uid() = id OR public.is_admin(auth.uid()));
