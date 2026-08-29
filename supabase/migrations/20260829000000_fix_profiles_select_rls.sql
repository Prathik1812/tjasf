-- Fix profiles SELECT RLS policy to eliminate any subquery recursion or policy blocking
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_all_authenticated" ON public.profiles;

CREATE POLICY "profiles_select_all_authenticated" ON public.profiles
  FOR SELECT TO authenticated
  USING (true);
