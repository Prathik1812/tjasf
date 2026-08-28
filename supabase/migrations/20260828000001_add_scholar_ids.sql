-- Add academic identifier columns to the profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS google_scholar_id text DEFAULT '',
ADD COLUMN IF NOT EXISTS scopus_id text DEFAULT '',
ADD COLUMN IF NOT EXISTS researcher_id text DEFAULT '';
