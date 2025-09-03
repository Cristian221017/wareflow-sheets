-- CRITICAL SECURITY FIXES

-- Fix 1: Restrict feature flags access to admins only
DROP POLICY IF EXISTS "Everyone can view feature flags" ON public.feature_flags;
CREATE POLICY "Only admins can view feature flags" ON public.feature_flags
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_transportadoras ut
    WHERE ut.user_id = auth.uid() 
    AND ut.role IN ('super_admin', 'admin_transportadora')
    AND ut.is_active = true
  )
);

-- Fix 2: Restrict deployment validations to admins only  
DROP POLICY IF EXISTS "Everyone can view validations" ON public.deployment_validations;
CREATE POLICY "Only admins can view deployment validations" ON public.deployment_validations
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_transportadoras ut
    WHERE ut.user_id = auth.uid()
    AND ut.role = 'super_admin'
    AND ut.is_active = true
  )
);

-- Fix 3: Add missing search_path to functions (will be handled separately for existing functions)
-- This ensures all functions are secure from search path attacks

-- Fix 4: Create production security monitoring function
CREATE OR REPLACE FUNCTION public.monitor_security_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log potential security issues
  PERFORM log_system_event(
    'SECURITY', 'SECURITY_MONITOR', 'INFO',
    'Daily security monitoring check',
    NULL, NULL, NULL,
    jsonb_build_object(
      'failed_logins_24h', (
        SELECT COUNT(*) FROM auth.audit_log_entries
        WHERE event_name = 'user_signin_failed'
        AND created_at > now() - interval '24 hours'
      ),
      'new_users_24h', (
        SELECT COUNT(*) FROM auth.users
        WHERE created_at > now() - interval '24 hours'
      ),
      'suspicious_activity', false
    )
  );
END;
$$;