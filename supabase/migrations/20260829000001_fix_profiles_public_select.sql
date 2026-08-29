-- Grant SELECT on public.profiles to anon and authenticated roles to eliminate 403 Forbidden errors
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_all_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;

CREATE POLICY "profiles_select_public" ON public.profiles
  FOR SELECT TO anon, authenticated
  USING (true);
