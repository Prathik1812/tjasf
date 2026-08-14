-- Create editor assignments table
CREATE TABLE IF NOT EXISTS editor_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manuscript_id uuid NOT NULL REFERENCES manuscripts(id) ON DELETE CASCADE,
  editor_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (manuscript_id, editor_id)
);

-- Enable RLS
ALTER TABLE editor_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ea_select" ON editor_assignments;
CREATE POLICY "ea_select" ON editor_assignments FOR SELECT USING (true);

DROP POLICY IF EXISTS "ea_all" ON editor_assignments;
CREATE POLICY "ea_all" ON editor_assignments FOR ALL USING (true);
