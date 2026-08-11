-- ============ CREATE RECRUITMENT APPLICATIONS TABLE ============
CREATE TABLE IF NOT EXISTS recruitment_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  country text NOT NULL,
  phone text NOT NULL,
  designation text NOT NULL,
  institution text NOT NULL,
  department text NOT NULL,
  web_of_science_id text DEFAULT '',
  google_scholar_id text DEFAULT '',
  scopus_id text DEFAULT '',
  orcid_id text DEFAULT '',
  primary_domain text NOT NULL,
  secondary_domain text DEFAULT '',
  research_keywords text NOT NULL,
  experience_years text NOT NULL,
  proposed_role text NOT NULL,
  preferred_domain text NOT NULL,
  motivation_text text NOT NULL,
  contributions text[] DEFAULT '{}',
  cv_url text NOT NULL,
  has_conflict_of_interest boolean NOT NULL DEFAULT false,
  agreed_confidentiality boolean NOT NULL DEFAULT false,
  agreed_ethics boolean NOT NULL DEFAULT false,
  agreed_recusal boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'shortlisted', 'accepted', 'rejected')),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE recruitment_applications ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (anyone can submit the application form)
CREATE POLICY "Allow public inserts on recruitment_applications" 
ON recruitment_applications 
FOR INSERT 
TO public 
WITH CHECK (true);

-- Only allow editors/admins to read the applications
CREATE POLICY "Allow editorial team to read recruitment_applications" 
ON recruitment_applications 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('editor_in_chief', 'managing_editor', 'section_editor', 'admin')
  )
);
