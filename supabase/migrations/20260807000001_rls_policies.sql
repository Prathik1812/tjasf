-- ============ PROFILES ============
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON profiles;
CREATE POLICY "profiles_select_own_or_admin" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

-- ============ DOMAINS ============
DROP POLICY IF EXISTS "domains_public_read" ON domains;
CREATE POLICY "domains_public_read" ON domains FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "domains_admin_insert" ON domains;
CREATE POLICY "domains_admin_insert" ON domains FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
DROP POLICY IF EXISTS "domains_admin_update" ON domains;
CREATE POLICY "domains_admin_update" ON domains FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
DROP POLICY IF EXISTS "domains_admin_delete" ON domains;
CREATE POLICY "domains_admin_delete" ON domains FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============ EDITORIAL BOARD ============
DROP POLICY IF EXISTS "board_public_read" ON editorial_board;
CREATE POLICY "board_public_read" ON editorial_board FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "board_admin_insert" ON editorial_board;
CREATE POLICY "board_admin_insert" ON editorial_board FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
DROP POLICY IF EXISTS "board_admin_update" ON editorial_board;
CREATE POLICY "board_admin_update" ON editorial_board FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
DROP POLICY IF EXISTS "board_admin_delete" ON editorial_board;
CREATE POLICY "board_admin_delete" ON editorial_board FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============ MANUSCRIPTS ============
DROP POLICY IF EXISTS "manuscripts_select_own" ON manuscripts;
CREATE POLICY "manuscripts_select_own" ON manuscripts FOR SELECT
  TO authenticated USING (
    submitter_id = auth.uid() OR editor_id = auth.uid()
    OR EXISTS (SELECT 1 FROM reviews WHERE reviews.manuscript_id = manuscripts.id AND reviews.reviewer_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','managing_editor','editor_in_chief'))
  );
DROP POLICY IF EXISTS "manuscripts_insert_own" ON manuscripts;
CREATE POLICY "manuscripts_insert_own" ON manuscripts FOR INSERT
  TO authenticated WITH CHECK (submitter_id = auth.uid());
DROP POLICY IF EXISTS "manuscripts_update_own" ON manuscripts;
CREATE POLICY "manuscripts_update_own" ON manuscripts FOR UPDATE
  TO authenticated USING (
    submitter_id = auth.uid() OR editor_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','managing_editor','editor_in_chief'))
  ) WITH CHECK (
    submitter_id = auth.uid() OR editor_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','managing_editor','editor_in_chief'))
  );
DROP POLICY IF EXISTS "manuscripts_delete_own" ON manuscripts;
CREATE POLICY "manuscripts_delete_own" ON manuscripts FOR DELETE
  TO authenticated USING (submitter_id = auth.uid());

-- ============ MANUSCRIPT AUTHORS ============
DROP POLICY IF EXISTS "ma_select" ON manuscript_authors;
CREATE POLICY "ma_select" ON manuscript_authors FOR SELECT
  TO authenticated USING (EXISTS (SELECT 1 FROM manuscripts WHERE manuscripts.id = manuscript_authors.manuscript_id AND manuscripts.submitter_id = auth.uid()));
DROP POLICY IF EXISTS "ma_insert" ON manuscript_authors;
CREATE POLICY "ma_insert" ON manuscript_authors FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM manuscripts WHERE manuscripts.id = manuscript_authors.manuscript_id AND manuscripts.submitter_id = auth.uid()));
DROP POLICY IF EXISTS "ma_delete" ON manuscript_authors;
CREATE POLICY "ma_delete" ON manuscript_authors FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM manuscripts WHERE manuscripts.id = manuscript_authors.manuscript_id AND manuscripts.submitter_id = auth.uid()));

-- ============ REVIEWS ============
DROP POLICY IF EXISTS "reviews_select" ON reviews;
CREATE POLICY "reviews_select" ON reviews FOR SELECT
  TO authenticated USING (
    reviewer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM manuscripts WHERE manuscripts.id = reviews.manuscript_id AND (manuscripts.submitter_id = auth.uid() OR manuscripts.editor_id = auth.uid()))
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','managing_editor','editor_in_chief'))
  );
DROP POLICY IF EXISTS "reviews_insert_editor" ON reviews;
CREATE POLICY "reviews_insert_editor" ON reviews FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM manuscripts WHERE manuscripts.id = reviews.manuscript_id AND (manuscripts.editor_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','managing_editor','editor_in_chief'))))
  );
DROP POLICY IF EXISTS "reviews_update_reviewer" ON reviews;
CREATE POLICY "reviews_update_reviewer" ON reviews FOR UPDATE
  TO authenticated USING (
    reviewer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM manuscripts WHERE manuscripts.id = reviews.manuscript_id AND manuscripts.editor_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','managing_editor','editor_in_chief'))
  ) WITH CHECK (
    reviewer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM manuscripts WHERE manuscripts.id = reviews.manuscript_id AND manuscripts.editor_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','managing_editor','editor_in_chief'))
  );
DROP POLICY IF EXISTS "reviews_delete_editor" ON reviews;
CREATE POLICY "reviews_delete_editor" ON reviews FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM manuscripts WHERE manuscripts.id = reviews.manuscript_id AND (manuscripts.editor_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','managing_editor','editor_in_chief'))))
  );

-- ============ VOLUMES ============
DROP POLICY IF EXISTS "volumes_public_read" ON volumes;
CREATE POLICY "volumes_public_read" ON volumes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "volumes_admin_insert" ON volumes;
CREATE POLICY "volumes_admin_insert" ON volumes FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
DROP POLICY IF EXISTS "volumes_admin_update" ON volumes;
CREATE POLICY "volumes_admin_update" ON volumes FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
DROP POLICY IF EXISTS "volumes_admin_delete" ON volumes;
CREATE POLICY "volumes_admin_delete" ON volumes FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============ ISSUES ============
DROP POLICY IF EXISTS "issues_public_read" ON issues;
CREATE POLICY "issues_public_read" ON issues FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "issues_admin_insert" ON issues;
CREATE POLICY "issues_admin_insert" ON issues FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
DROP POLICY IF EXISTS "issues_admin_update" ON issues;
CREATE POLICY "issues_admin_update" ON issues FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
DROP POLICY IF EXISTS "issues_admin_delete" ON issues;
CREATE POLICY "issues_admin_delete" ON issues FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============ ARTICLES ============
DROP POLICY IF EXISTS "articles_public_read" ON articles;
CREATE POLICY "articles_public_read" ON articles FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "articles_admin_insert" ON articles;
CREATE POLICY "articles_admin_insert" ON articles FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','managing_editor','editor_in_chief')));
DROP POLICY IF EXISTS "articles_admin_update" ON articles;
CREATE POLICY "articles_admin_update" ON articles FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','managing_editor','editor_in_chief')));
DROP POLICY IF EXISTS "articles_admin_delete" ON articles;
CREATE POLICY "articles_admin_delete" ON articles FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','managing_editor','editor_in_chief')));

-- ============ POLICIES ============
DROP POLICY IF EXISTS "policies_public_read" ON policies;
CREATE POLICY "policies_public_read" ON policies FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "policies_admin_insert" ON policies;
CREATE POLICY "policies_admin_insert" ON policies FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
DROP POLICY IF EXISTS "policies_admin_update" ON policies;
CREATE POLICY "policies_admin_update" ON policies FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
DROP POLICY IF EXISTS "policies_admin_delete" ON policies;
CREATE POLICY "policies_admin_delete" ON policies FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============ ANNOUNCEMENTS ============
DROP POLICY IF EXISTS "ann_public_read" ON announcements;
CREATE POLICY "ann_public_read" ON announcements FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "ann_admin_insert" ON announcements;
CREATE POLICY "ann_admin_insert" ON announcements FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
DROP POLICY IF EXISTS "ann_admin_update" ON announcements;
CREATE POLICY "ann_admin_update" ON announcements FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
DROP POLICY IF EXISTS "ann_admin_delete" ON announcements;
CREATE POLICY "ann_admin_delete" ON announcements FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============ HOMEPAGE CONTENT ============
DROP POLICY IF EXISTS "hp_public_read" ON homepage_content;
CREATE POLICY "hp_public_read" ON homepage_content FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "hp_admin_insert" ON homepage_content;
CREATE POLICY "hp_admin_insert" ON homepage_content FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
DROP POLICY IF EXISTS "hp_admin_update" ON homepage_content;
CREATE POLICY "hp_admin_update" ON homepage_content FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============ EMAIL TEMPLATES ============
DROP POLICY IF EXISTS "email_admin_read" ON email_templates;
CREATE POLICY "email_admin_read" ON email_templates FOR SELECT
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
DROP POLICY IF EXISTS "email_admin_insert" ON email_templates;
CREATE POLICY "email_admin_insert" ON email_templates FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
DROP POLICY IF EXISTS "email_admin_update" ON email_templates;
CREATE POLICY "email_admin_update" ON email_templates FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
DROP POLICY IF EXISTS "email_admin_delete" ON email_templates;
CREATE POLICY "email_admin_delete" ON email_templates FOR DELETE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============ AUDIT LOG ============
DROP POLICY IF EXISTS "audit_admin_read" ON audit_log;
CREATE POLICY "audit_admin_read" ON audit_log FOR SELECT
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
DROP POLICY IF EXISTS "audit_insert_any" ON audit_log;
CREATE POLICY "audit_insert_any" ON audit_log FOR INSERT
  TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
