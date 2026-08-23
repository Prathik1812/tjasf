-- ============ ADD NEW ROLES TO CHECK CONSTRAINT ============
-- This migration updates the profiles.role check constraint to support "associate_editor" and "editorial_board_member".

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('author','reviewer','section_editor','editor_in_chief','admin','associate_editor','editorial_board_member'));
