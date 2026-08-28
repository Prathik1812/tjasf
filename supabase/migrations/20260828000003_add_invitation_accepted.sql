-- Add invitation_accepted tracking column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS invitation_accepted boolean DEFAULT false;
