-- Add status column to manuscript_authors
ALTER TABLE manuscript_authors ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'declined'));

-- Enable public select and update on manuscript_authors by ID (token-based security via UUID)
DROP POLICY IF EXISTS "ma_public_select" ON manuscript_authors;
CREATE POLICY "ma_public_select" ON manuscript_authors FOR SELECT USING (true);

DROP POLICY IF EXISTS "ma_public_update" ON manuscript_authors;
CREATE POLICY "ma_public_update" ON manuscript_authors FOR UPDATE USING (true);
