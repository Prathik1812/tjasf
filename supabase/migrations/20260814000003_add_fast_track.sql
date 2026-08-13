-- Add fast_track column to manuscripts table
ALTER TABLE manuscripts ADD COLUMN IF NOT EXISTS fast_track boolean DEFAULT false;
