-- Add invitation_accepted_notified column to profiles table to ensure notification email is sent ONCE EVER per member
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS invitation_accepted_notified boolean DEFAULT false;
