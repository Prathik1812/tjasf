-- Create delete_manuscript RPC and allow admins/editors to delete manuscripts

DROP POLICY IF EXISTS "manuscripts_delete_own" ON public.manuscripts;
CREATE POLICY "manuscripts_delete_own" ON public.manuscripts FOR DELETE
  TO authenticated USING (
    submitter_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'editor_in_chief', 'managing_editor', 'section_editor', 'associate_editor')
    )
  );

DROP POLICY IF EXISTS "mv_delete" ON public.manuscript_versions;
CREATE POLICY "mv_delete" ON public.manuscript_versions FOR DELETE TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.delete_manuscript(target_manuscript_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_submitter_id uuid;
  v_user_role text;
BEGIN
  -- Get submitter of manuscript
  SELECT submitter_id INTO v_submitter_id FROM public.manuscripts WHERE id = target_manuscript_id;
  
  IF v_submitter_id IS NULL THEN
    RETURN true; -- already deleted or not found
  END IF;

  -- Get current caller role
  SELECT role INTO v_user_role FROM public.profiles WHERE id = auth.uid();

  -- Allow if caller is submitter OR editor/admin
  IF v_submitter_id = auth.uid() OR v_user_role IN ('admin', 'editor_in_chief', 'managing_editor', 'section_editor', 'associate_editor') THEN
    DELETE FROM public.reviews WHERE manuscript_id = target_manuscript_id;
    DELETE FROM public.editor_assignments WHERE manuscript_id = target_manuscript_id;
    DELETE FROM public.manuscript_versions WHERE manuscript_id = target_manuscript_id;
    DELETE FROM public.manuscript_authors WHERE manuscript_id = target_manuscript_id;
    DELETE FROM public.articles WHERE manuscript_id = target_manuscript_id;
    DELETE FROM public.manuscripts WHERE id = target_manuscript_id;
    RETURN true;
  ELSE
    RAISE EXCEPTION 'Access Denied: You do not have permission to delete this manuscript.';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_manuscript(uuid) TO authenticated;
