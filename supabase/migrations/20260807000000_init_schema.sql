-- ============ PROFILES ============
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'author' CHECK (role IN ('author','reviewer','section_editor','managing_editor','editor_in_chief','admin')),
  title text DEFAULT '',
  affiliation text DEFAULT '',
  department text DEFAULT '',
  orcid text DEFAULT '',
  bio text DEFAULT '',
  avatar_url text DEFAULT '',
  reviewer_domains text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  email_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============ DOMAINS ============
CREATE TABLE IF NOT EXISTS domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- ============ EDITORIAL BOARD ============
CREATE TABLE IF NOT EXISTS editorial_board (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role_title text NOT NULL,
  affiliation text DEFAULT '',
  domain text DEFAULT '',
  bio text DEFAULT '',
  photo_url text DEFAULT '',
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ============ MANUSCRIPTS ============
CREATE TABLE IF NOT EXISTS manuscripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submitter_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  abstract text DEFAULT '',
  keywords text[] DEFAULT '{}',
  reference_text text DEFAULT '',
  domain_id uuid REFERENCES domains(id),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','technical_screening','desk_review','under_review','revision_requested','accepted','rejected','published')),
  file_url text DEFAULT '',
  file_name text DEFAULT '',
  conflict_of_interest boolean DEFAULT false,
  funding_received boolean DEFAULT false,
  ai_used boolean DEFAULT false,
  previously_submitted boolean DEFAULT false,
  original_work boolean DEFAULT false,
  copyright_agreement boolean DEFAULT false,
  policies_agreement boolean DEFAULT false,
  editor_id uuid REFERENCES profiles(id),
  version integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============ MANUSCRIPT AUTHORS ============
CREATE TABLE IF NOT EXISTS manuscript_authors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manuscript_id uuid NOT NULL REFERENCES manuscripts(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text DEFAULT '',
  corresponding boolean DEFAULT false,
  affiliation text DEFAULT '',
  department text DEFAULT '',
  sort_order integer DEFAULT 0
);

-- ============ REVIEWS ============
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manuscript_id uuid NOT NULL REFERENCES manuscripts(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending_invitation' CHECK (status IN ('pending_invitation','accepted','declined','in_progress','submitted')),
  decision text CHECK (decision IN ('accept','minor_revision','major_revision','reject')),
  comments text DEFAULT '',
  confidential_notes text DEFAULT '',
  due_date timestamptz,
  invited_at timestamptz DEFAULT now(),
  responded_at timestamptz,
  submitted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ============ VOLUMES ============
CREATE TABLE IF NOT EXISTS volumes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number integer NOT NULL,
  year integer NOT NULL,
  title text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- ============ ISSUES ============
CREATE TABLE IF NOT EXISTS issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  volume_id uuid NOT NULL REFERENCES volumes(id) ON DELETE CASCADE,
  number integer NOT NULL,
  title text DEFAULT '',
  publication_date date,
  cover_url text DEFAULT '',
  is_published boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ============ ARTICLES ============
CREATE TABLE IF NOT EXISTS articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manuscript_id uuid REFERENCES manuscripts(id) ON DELETE SET NULL,
  issue_id uuid REFERENCES issues(id) ON DELETE SET NULL,
  title text NOT NULL,
  authors text NOT NULL DEFAULT '',
  abstract text DEFAULT '',
  keywords text[] DEFAULT '{}',
  reference_text text DEFAULT '',
  domain text DEFAULT '',
  doi text DEFAULT '',
  pdf_url text DEFAULT '',
  pages text DEFAULT '',
  article_id text UNIQUE,
  publication_date date DEFAULT now(),
  views integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- ============ POLICIES ============
CREATE TABLE IF NOT EXISTS policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  category text DEFAULT '',
  content text DEFAULT '',
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- ============ ANNOUNCEMENTS ============
CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text DEFAULT '',
  date date DEFAULT now(),
  pinned boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ============ HOMEPAGE CONTENT ============
CREATE TABLE IF NOT EXISTS homepage_content (
  key text PRIMARY KEY,
  value text DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

-- ============ EMAIL TEMPLATES ============
CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event text UNIQUE NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ============ AUDIT LOG ============
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity text DEFAULT '',
  entity_id uuid,
  details text DEFAULT '',
  ip text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- ============ ENABLE RLS ON ALL ============
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE editorial_board ENABLE ROW LEVEL SECURITY;
ALTER TABLE manuscripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE manuscript_authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE volumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE homepage_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_manuscripts_submitter ON manuscripts(submitter_id);
CREATE INDEX IF NOT EXISTS idx_manuscripts_status ON manuscripts(status);
CREATE INDEX IF NOT EXISTS idx_manuscripts_editor ON manuscripts(editor_id);
CREATE INDEX IF NOT EXISTS idx_reviews_manuscript ON reviews(manuscript_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer ON reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
CREATE INDEX IF NOT EXISTS idx_articles_issue ON articles(issue_id);
CREATE INDEX IF NOT EXISTS idx_articles_publication_date ON articles(publication_date);
CREATE INDEX IF NOT EXISTS idx_policies_slug ON policies(slug);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
