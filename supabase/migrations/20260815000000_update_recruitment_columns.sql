-- ============ UPDATE RECRUITMENT APPLICATIONS COLUMNS ============
-- This migration appends new fields matching the google recruitment form schema.

ALTER TABLE recruitment_applications ADD COLUMN IF NOT EXISTS title text DEFAULT '';
ALTER TABLE recruitment_applications ADD COLUMN IF NOT EXISTS highest_qualification text DEFAULT '';
ALTER TABLE recruitment_applications ADD COLUMN IF NOT EXISTS official_email text DEFAULT '';
ALTER TABLE recruitment_applications ADD COLUMN IF NOT EXISTS alternative_email text DEFAULT '';
ALTER TABLE recruitment_applications ADD COLUMN IF NOT EXISTS linkedin_profile text DEFAULT '';
ALTER TABLE recruitment_applications ADD COLUMN IF NOT EXISTS researchgate_profile text DEFAULT '';
ALTER TABLE recruitment_applications ADD COLUMN IF NOT EXISTS scopus_h_index text DEFAULT '';
ALTER TABLE recruitment_applications ADD COLUMN IF NOT EXISTS google_scholar_h_index text DEFAULT '';
ALTER TABLE recruitment_applications ADD COLUMN IF NOT EXISTS research_interests text DEFAULT '';
ALTER TABLE recruitment_applications ADD COLUMN IF NOT EXISTS total_publications text DEFAULT '';
ALTER TABLE recruitment_applications ADD COLUMN IF NOT EXISTS recent_publications text DEFAULT '';
ALTER TABLE recruitment_applications ADD COLUMN IF NOT EXISTS served_editorial_board boolean DEFAULT false;
ALTER TABLE recruitment_applications ADD COLUMN IF NOT EXISTS editorial_board_details text DEFAULT '';
ALTER TABLE recruitment_applications ADD COLUMN IF NOT EXISTS agreed_growth boolean DEFAULT false;
ALTER TABLE recruitment_applications ADD COLUMN IF NOT EXISTS final_declaration boolean DEFAULT false;
