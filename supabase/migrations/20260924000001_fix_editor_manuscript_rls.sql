-- ============ FIX RLS FOR EDITORS AND EDITORIAL ASSIGNMENTS ============

-- 1. Ensure all editors and invited editors can SELECT manuscripts
DROP POLICY IF EXISTS "manuscripts_select_own" ON manuscripts;
CREATE POLICY "manuscripts_select_own" ON manuscripts FOR SELECT
  TO authenticated USING (
    submitter_id = auth.uid() 
    OR editor_id = auth.uid()
    OR check_review_access_for_manuscript(id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'managing_editor', 'editor_in_chief', 'section_editor', 'associate_editor', 'editorial_board_member')
    )
    OR EXISTS (
      SELECT 1 FROM editor_assignments 
      WHERE editor_assignments.manuscript_id = manuscripts.id 
      AND editor_assignments.editor_id = auth.uid()
    )
  );

-- 2. Allow submitters, assigned editors, EIC/admin, and invited editors to UPDATE manuscripts
DROP POLICY IF EXISTS "manuscripts_update_own" ON manuscripts;
CREATE POLICY "manuscripts_update_own" ON manuscripts FOR UPDATE
  TO authenticated USING (
    submitter_id = auth.uid() 
    OR editor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'managing_editor', 'editor_in_chief')
    )
    OR EXISTS (
      SELECT 1 FROM editor_assignments 
      WHERE editor_assignments.manuscript_id = manuscripts.id 
      AND editor_assignments.editor_id = auth.uid()
    )
  ) WITH CHECK (
    submitter_id = auth.uid() 
    OR editor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'managing_editor', 'editor_in_chief')
    )
    OR EXISTS (
      SELECT 1 FROM editor_assignments 
      WHERE editor_assignments.manuscript_id = manuscripts.id 
      AND editor_assignments.editor_id = auth.uid()
    )
  );

-- 3. Ensure editor_assignments table has full open permissions for authenticated users
ALTER TABLE editor_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ea_select" ON editor_assignments;
CREATE POLICY "ea_select" ON editor_assignments FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "ea_insert" ON editor_assignments;
CREATE POLICY "ea_insert" ON editor_assignments FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "ea_update" ON editor_assignments;
CREATE POLICY "ea_update" ON editor_assignments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "ea_delete" ON editor_assignments;
CREATE POLICY "ea_delete" ON editor_assignments FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "ea_all" ON editor_assignments;
CREATE POLICY "ea_all" ON editor_assignments FOR ALL TO authenticated USING (true);

-- 4. Ensure manuscript_authors can be viewed by all editors
DROP POLICY IF EXISTS "ma_select" ON manuscript_authors;
CREATE POLICY "ma_select" ON manuscript_authors FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM manuscripts 
      WHERE manuscripts.id = manuscript_authors.manuscript_id 
      AND (
        manuscripts.submitter_id = auth.uid() 
        OR manuscripts.editor_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = auth.uid() 
          AND role IN ('admin', 'managing_editor', 'editor_in_chief', 'section_editor', 'associate_editor', 'editorial_board_member')
        )
      )
    )
  );
