-- Add RPC function for logging security events
CREATE OR REPLACE FUNCTION log_security_event(
  p_event_type TEXT,
  p_severity TEXT,
  p_user_id UUID DEFAULT NULL,
  p_user_email TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}',
  p_ip INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO system_logs (
    entity_type,
    action,
    status,
    message,
    meta,
    actor_user_id,
    ip,
    user_agent,
    created_at
  )
  VALUES (
    'SECURITY',
    p_event_type,
    CASE 
      WHEN p_severity IN ('high', 'critical') THEN 'ERROR'::log_level
      WHEN p_severity = 'medium' THEN 'WARN'::log_level
      ELSE 'INFO'::log_level
    END,
    format('%s security event: %s', p_severity, p_event_type),
    jsonb_build_object(
      'event_type', p_event_type,
      'severity', p_severity,
      'user_email', p_user_email,
      'metadata', p_metadata
    ),
    p_user_id,
    p_ip,
    p_user_agent,
    now()
  );
END;
$$;

-- Create index for security event queries
CREATE INDEX IF NOT EXISTS idx_system_logs_security_events 
ON system_logs (entity_type, action, created_at DESC) 
WHERE entity_type = 'SECURITY';

-- Add function to check for suspicious login patterns
CREATE OR REPLACE FUNCTION check_login_security(
  p_email TEXT,
  p_ip INET DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_failed_count INTEGER := 0;
  v_last_failure TIMESTAMP WITH TIME ZONE;
  v_is_locked BOOLEAN := FALSE;
  v_lockout_duration INTERVAL := INTERVAL '15 minutes';
BEGIN
  -- Count failed login attempts in the last 15 minutes
  SELECT COUNT(*), MAX(created_at)
  INTO v_failed_count, v_last_failure
  FROM system_logs
  WHERE entity_type = 'SECURITY'
    AND action = 'failed_login'
    AND (meta->>'userEmail')::TEXT = p_email
    AND created_at > now() - v_lockout_duration;
  
  -- Check if account should be locked
  v_is_locked := v_failed_count >= 5 AND 
                 v_last_failure > now() - v_lockout_duration;
  
  RETURN jsonb_build_object(
    'isLocked', v_is_locked,
    'failedAttempts', v_failed_count,
    'lastFailure', v_last_failure,
    'remainingLockoutTime', 
    CASE 
      WHEN v_is_locked THEN 
        EXTRACT(EPOCH FROM (v_last_failure + v_lockout_duration - now()))
      ELSE 0 
    END
  );
END;
$$;