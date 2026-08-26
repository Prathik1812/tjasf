-- ============ FIX RLS RECURSION BY USING SECURITY DEFINER HELPERS ============

-- 1. Helper function to check manuscript access for reviews (bypasses RLS)
CREATE OR REPLACE FUNCTION public.check_manuscript_access_for_review(manuscript_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.manuscripts
    WHERE id = manuscript_uuid
    AND (submitter_id = user_uuid OR editor_id = user_uuid)
  );
END;
$$;

-- 2. Helper function to check review access for manuscripts (bypasses RLS)
CREATE OR REPLACE FUNCTION public.check_review_access_for_manuscript(manuscript_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.reviews
    WHERE manuscript_id = manuscript_uuid
    AND reviewer_id = user_uuid
  );
END;
$$;

-- 3. Recreate the reviews select policy to use the helper function
DROP POLICY IF EXISTS "reviews_select" ON reviews;
CREATE POLICY "reviews_select" ON reviews FOR SELECT
  TO authenticated USING (
    reviewer_id = auth.uid()
    OR check_manuscript_access_for_review(manuscript_id, auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','managing_editor','editor_in_chief'))
  );

-- 4. Recreate the manuscripts select policy to use the helper function
DROP POLICY IF EXISTS "manuscripts_select_own" ON manuscripts;
CREATE POLICY "manuscripts_select_own" ON manuscripts FOR SELECT
  TO authenticated USING (
    submitter_id = auth.uid() OR editor_id = auth.uid()
    OR check_review_access_for_manuscript(id, auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','managing_editor','editor_in_chief'))
  );
