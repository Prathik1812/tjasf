-- Create a secure function to allow admin users to delete other users from auth.users
CREATE OR REPLACE FUNCTION delete_user_by_admin(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Bypasses RLS to delete from auth schema
AS $$
BEGIN
  -- Check if the current authenticated user executing this function is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access Denied: Only administrators can delete users.';
  END IF;

  -- Delete the user from auth.users (which cascades to public.profiles)
  DELETE FROM auth.users WHERE id = user_id;
END;
$$;
