-- Restrict manuscript deletion exclusively to administrators

-- 1. Update RLS policy on manuscripts: only admins can DELETE
DROP POLICY IF EXISTS "manuscripts_delete_own" ON public.manuscripts;
DROP POLICY IF EXISTS "manuscripts_admin_delete" ON public.manuscripts;

CREATE POLICY "manuscripts_admin_delete" ON public.manuscripts FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- 2. Update delete_manuscript RPC: strictly check role = 'admin'
CREATE OR REPLACE FUNCTION public.delete_manuscript(target_manuscript_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Strict permission check: ONLY administrators can delete manuscripts
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access Denied: Only administrators can delete manuscripts.';
  END IF;

  DELETE FROM public.reviews WHERE manuscript_id = target_manuscript_id;
  DELETE FROM public.editor_assignments WHERE manuscript_id = target_manuscript_id;
  DELETE FROM public.manuscript_versions WHERE manuscript_id = target_manuscript_id;
  DELETE FROM public.manuscript_authors WHERE manuscript_id = target_manuscript_id;
  DELETE FROM public.articles WHERE manuscript_id = target_manuscript_id;
  DELETE FROM public.manuscripts WHERE id = target_manuscript_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_manuscript(uuid) TO authenticated;
