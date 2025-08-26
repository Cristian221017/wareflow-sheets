-- Corrigir políticas RLS para system_logs
DROP POLICY IF EXISTS "Super admins can view all system logs" ON system_logs;
DROP POLICY IF EXISTS "Users can view logs from their transportadora" ON system_logs;
DROP POLICY IF EXISTS "System can insert logs" ON system_logs;

-- Políticas para system_logs
CREATE POLICY "Super admins can view all system logs" ON system_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_transportadoras ut
      WHERE ut.user_id = auth.uid() 
      AND ut.role = 'super_admin'
      AND ut.is_active = true
    )
  );

CREATE POLICY "Users can view logs from their transportadora" ON system_logs
  FOR SELECT USING (
    transportadora_id = (
      SELECT ut.transportadora_id
      FROM user_transportadoras ut
      WHERE ut.user_id = auth.uid() AND ut.is_active = true
      LIMIT 1
    )
  );

CREATE POLICY "System can insert logs" ON system_logs
  FOR INSERT WITH CHECK (true);

-- Para event_log usar política de INSERT também
CREATE POLICY "System can insert event logs" ON event_log
  FOR INSERT WITH CHECK (true);