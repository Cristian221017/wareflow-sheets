-- Fix slow RLS policies causing timeouts in AuthContext

-- 1. Simplify profiles table RLS policy to avoid complex validation
DROP POLICY IF EXISTS "Valid users can view their profile" ON public.profiles;

-- Create simpler policy that allows users to view their own profile without complex validation
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

-- 2. Add policy for super admins to view all profiles (needed for admin operations)
CREATE POLICY "Super admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'super_admin'::user_role));

-- 3. Ensure user_transportadoras has efficient policies for super_admin access
-- The existing policies should be fine, but let's make sure super_admin access is explicit

-- 4. Add index to improve performance on frequently queried columns
CREATE INDEX IF NOT EXISTS idx_user_transportadoras_user_id_active ON user_transportadoras(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_clientes_email_status ON clientes(email, status);

-- 5. Create a simpler function for checking if user exists in system (avoids validate_user_has_links complexity)
CREATE OR REPLACE FUNCTION public.user_exists_in_system(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_transportadoras ut 
    WHERE ut.user_id = _user_id AND ut.is_active = true
    UNION ALL
    SELECT 1 FROM user_clientes uc 
    WHERE uc.user_id = _user_id
    LIMIT 1
  );
$$;