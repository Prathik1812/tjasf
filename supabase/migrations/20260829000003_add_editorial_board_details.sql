-- Add designation, email, country columns to editorial_board
ALTER TABLE public.editorial_board ADD COLUMN IF NOT EXISTS designation text DEFAULT '';
ALTER TABLE public.editorial_board ADD COLUMN IF NOT EXISTS email text DEFAULT '';
ALTER TABLE public.editorial_board ADD COLUMN IF NOT EXISTS country text DEFAULT 'India';

-- Clear previous entries to avoid duplicate listings
DELETE FROM public.editorial_board;

-- Insert exact 3-section Editorial Board members
INSERT INTO public.editorial_board (name, role_title, designation, affiliation, email, country, sort_order, is_active) VALUES
  (
    'Dr. Rajesh Thumma',
    'Editor in Chief',
    'Associate Professor',
    'Anurag University',
    'editor@tjasf.com',
    'India',
    1,
    true
  ),
  (
    'Dr. Veera Venkata Subrahmanya Kumar Bhajana',
    'Editorial Board Member',
    'Associate Professor',
    'Kalinga Institute of Industrial Technology (KIIT) Deemed to be University',
    'bvvs.kumarfet@kiit.ac.in',
    'India',
    2,
    true
  ),
  (
    'Dr. Amrit Mukherjee',
    'Editorial Board Member',
    'Senior Assistant Professor',
    'University of South Bohemia',
    'amukherjee@jcu.cz',
    'Czech Republic',
    3,
    true
  ),
  (
    'Dr. A. Pramod Kumar',
    'Editorial Board Member',
    'Associate Professor',
    'NIT Andhra Pradesh',
    'a.pramodkumar@cmrec.ac.in',
    'India',
    4,
    true
  ),
  (
    'Dr. Abdul Aleem',
    'Editorial Board Member',
    'Assistant Professor',
    'Vidya Jyothi Institute of Technology',
    'aleemece@vjit.ac.in',
    'India',
    5,
    true
  ),
  (
    'B Prathik Kumar',
    'Managing Editor',
    '',
    'Anurag University',
    'editorial@tjasf.com',
    'India',
    6,
    true
  );
