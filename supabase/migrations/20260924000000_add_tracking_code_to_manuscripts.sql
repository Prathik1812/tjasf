-- Add tracking_code, subject_code, and subject_name to manuscripts table
ALTER TABLE public.manuscripts ADD COLUMN IF NOT EXISTS tracking_code text;
ALTER TABLE public.manuscripts ADD COLUMN IF NOT EXISTS subject_code text DEFAULT '';
ALTER TABLE public.manuscripts ADD COLUMN IF NOT EXISTS subject_name text DEFAULT '';

-- Create an index on tracking_code for fast dashboard search
CREATE INDEX IF NOT EXISTS idx_manuscripts_tracking_code ON public.manuscripts (tracking_code);
