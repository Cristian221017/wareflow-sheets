import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface DeploymentValidation {
  id: string;
  validation_type: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  result: any;
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

interface SystemBackup {
  id: string;
  name: string;
  description?: string;
  status: 'creating' | 'completed' | 'failed' | 'restored';
  tables_backed_up: string[];
  created_at: string;
  completed_at?: string;
}

interface HealthCheck {
  id: string;
  check_type: string;
  status: 'healthy' | 'warning' | 'critical';
  metrics: any;
  message?: string;
  created_at: string;
}

export function useDeploymentSafety() {
  const { user } = useAuth();
  const [validations, setValidations] = useState<DeploymentValidation[]>([]);
  const [backups, setBackups] = useState<SystemBackup[]>([]);
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([]);
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = user?.role === 'super_admin';

  // Fetch deployment validations
  const fetchValidations = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('deployment_validations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setValidations(data || []);
    } catch (error) {
      console.error('Erro ao buscar validações:', error);
    }
  };

  // Fetch system backups
  const fetchBackups = async () => {
    if (!isSuperAdmin) return;

    try {
      const { data, error } = await (supabase as any)
        .from('system_backups')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setBackups(data || []);
    } catch (error) {
      console.error('Erro ao buscar backups:', error);
    }
  };

  // Fetch health checks
  const fetchHealthChecks = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('system_health_checks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setHealthChecks(data || []);
    } catch (error) {
      console.error('Erro ao buscar health checks:', error);
    }
  };

  // Run data integrity validation
  const runDataValidation = async () => {
    try {
      toast.info('Iniciando validação de integridade dos dados...');
      
      const { data, error } = await (supabase as any).rpc('validate_data_integrity');

      if (error) throw error;

      const result = data[0];
      if (result.status === 'passed') {
        toast.success('Validação de dados passou com sucesso! Nenhum problema encontrado.');
      } else {
        toast.error(`Validação falhou: ${result.issues_found} problemas encontrados.`);
      }

      await fetchValidations();
      return result;
    } catch (error) {
      console.error('Erro na validação:', error);
      toast.error('Erro ao executar validação de dados');
      throw error;
    }
  };

  // Create safety backup
  const createBackup = async (backupName: string) => {
    if (!isSuperAdmin) {
      toast.error('Apenas super admins podem criar backups');
      return;
    }

    try {
      toast.info('Criando backup de segurança...');
      
      const { data, error } = await (supabase as any).rpc('create_safety_backup', {
        p_backup_name: backupName
      });

      if (error) throw error;

      toast.success('Backup criado com sucesso!');
      await fetchBackups();
      return data;
    } catch (error) {
      console.error('Erro ao criar backup:', error);
      toast.error('Erro ao criar backup de segurança');
      throw error;
    }
  };

  // Run system health check
  const runHealthCheck = async () => {
    try {
      toast.info('Executando verificação de saúde do sistema...');
      
      const { error } = await (supabase as any).rpc('run_system_health_check');

      if (error) throw error;

      toast.success('Verificação de saúde concluída!');
      await fetchHealthChecks();
    } catch (error) {
      console.error('Erro no health check:', error);
      toast.error('Erro ao executar verificação de saúde');
      throw error;
    }
  };

  // Pre-deployment safety check
  const runPreDeploymentCheck = async () => {
    try {
      toast.info('Executando verificações de segurança pré-deployment...');
      
      // 1. Criar backup automático se configurado
      const autoBackup = await (supabase as any).rpc('get_deployment_config', {
        p_key: 'auto_backup_before_deploy'
      });

      if (autoBackup.data === true) {
        const backupName = `pre-deploy-${new Date().toISOString().split('T')[0]}`;
        await createBackup(backupName);
      }

      // 2. Executar validação de dados
      const validation = await runDataValidation();

      // 3. Executar health check
      await runHealthCheck();

      // 4. Verificar se é necessário passar nas validações
      const requireValidation = await (supabase as any).rpc('get_deployment_config', {
        p_key: 'require_validation_pass'
      });

      if (requireValidation.data === true && validation.status !== 'passed') {
        throw new Error('Validação de dados deve passar para prosseguir com deployment');
      }

      toast.success('Todas as verificações de segurança passaram! ✅');
      return true;
    } catch (error) {
      console.error('Erro nas verificações pré-deployment:', error);
      toast.error('Falha nas verificações de segurança pré-deployment');
      return false;
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchValidations(),
        fetchBackups(),
        fetchHealthChecks()
      ]);
      setLoading(false);
    };

    if (user) {
      loadData();
    }
  }, [user, isSuperAdmin]);

  return {
    validations,
    backups,
    healthChecks,
    loading,
    isSuperAdmin,
    runDataValidation,
    createBackup,
    runHealthCheck,
    runPreDeploymentCheck,
    refreshData: () => Promise.all([fetchValidations(), fetchBackups(), fetchHealthChecks()])
  };
}