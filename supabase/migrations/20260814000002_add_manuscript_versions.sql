-- Create manuscript versions table
CREATE TABLE IF NOT EXISTS manuscript_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manuscript_id uuid NOT NULL REFERENCES manuscripts(id) ON DELETE CASCADE,
  version integer NOT NULL,
  file_url text NOT NULL,
  file_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE manuscript_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mv_select" ON manuscript_versions;
CREATE POLICY "mv_select" ON manuscript_versions FOR SELECT USING (true);

DROP POLICY IF EXISTS "mv_insert" ON manuscript_versions;
CREATE POLICY "mv_insert" ON manuscript_versions FOR INSERT WITH CHECK (true);

-- Backfill manuscript_versions from existing manuscripts
INSERT INTO manuscript_versions (manuscript_id, version, file_url, file_name, created_at)
SELECT id, version, file_url, file_name, created_at
FROM manuscripts
ON CONFLICT DO NOTHING;
