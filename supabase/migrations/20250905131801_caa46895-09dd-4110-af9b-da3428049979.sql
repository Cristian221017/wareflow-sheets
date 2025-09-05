-- Fix remaining functions without search_path
DO $$
DECLARE
    func_record RECORD;
BEGIN
    -- Fix functions that don't have search_path set
    FOR func_record IN 
        SELECT proname, oid, pg_get_function_identity_arguments(oid) as args
        FROM pg_proc 
        WHERE pronamespace = 'public'::regnamespace 
        AND prosecdef = true 
        AND NOT EXISTS (
            SELECT 1 FROM pg_proc_config(oid) 
            WHERE setting LIKE 'search_path%'
        )
        AND proname NOT IN ('trigger_refresh_dashboards', 'set_updated_at', 'auto_link_new_user')
    LOOP
        -- Add search_path to security definer functions
        EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path = public', 
                      func_record.proname, func_record.args);
    END LOOP;
END $$;

-- Specifically fix the trigger function
ALTER FUNCTION public.prevent_orphaned_profiles() SET search_path = public;