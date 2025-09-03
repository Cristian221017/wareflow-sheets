import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Database, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Calendar,
  HardDrive,
  Shield,
  Play
} from 'lucide-react';

interface Backup {
  id: string;
  name: string;
  status: string;
  tables_backed_up: string[];
  backup_size_bytes: number;
  created_at: string;
  completed_at?: string;
  description?: string;
}

interface CronJob {
  jobname: string;
  schedule: string;
  active: boolean;
}

export function BackupManager() {
  const { toast } = useToast();
  const [backups, setBackups] = useState<Backup[]>([]);
  const [cronJobs, setCronJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);

  const loadBackupData = async () => {
    try {
      setLoading(true);

      const { data: backupsData } = await (supabase as any)
        .from('system_backups')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      const { data: cronData } = await (supabase as any)
        .rpc('get_backup_cron_status');

      setBackups(backupsData || []);
      setCronJobs(cronData || []);

    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const executeManualBackup = async () => {
    try {
      setExecuting(true);

      const { data } = await supabase.functions.invoke('automated-backup', {
        body: { manual: true }
      });

      toast({
        title: "Backup iniciado",
        description: "O backup manual foi iniciado com sucesso.",
        variant: "default"
      });

      setTimeout(loadBackupData, 2000);

    } catch (error: any) {
      toast({
        title: "Erro no backup",
        description: error.message || "Não foi possível executar o backup manual",
        variant: "destructive"
      });
    } finally {
      setExecuting(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const translateSchedule = (schedule: string): string => {
    if (schedule === '0 2 * * *') return 'Diário às 02:00';
    if (schedule === '0 1 * * 0') return 'Domingos às 01:00';
    return schedule;
  };

  useEffect(() => {
    loadBackupData();
    const interval = setInterval(loadBackupData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Carregando...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Database className="w-6 h-6" />
            Gerenciamento de Backup
          </h2>
          <p className="text-muted-foreground">
            Backups automáticos e manuais do sistema
          </p>
        </div>
        <Button
          onClick={executeManualBackup}
          disabled={executing}
          className="flex items-center gap-2"
        >
          <Play className="w-4 h-4" />
          {executing ? 'Executando...' : 'Backup Manual'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Agendamentos Automáticos
          </CardTitle>
          <CardDescription>
            Status dos backups agendados automaticamente
          </CardDescription>
        </CardHeader>
        <CardContent>
          {cronJobs.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              Nenhum agendamento configurado
            </div>
          ) : (
            <div className="grid gap-4">
              {cronJobs.map((job, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-blue-500" />
                    <div>
                      <div className="font-medium">
                        {job.jobname.includes('diario') ? 'Backup Diário' : 'Backup Semanal'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {translateSchedule(job.schedule)}
                      </div>
                    </div>
                  </div>
                  <Badge variant={job.active ? 'default' : 'secondary'}>
                    {job.active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="w-5 h-5" />
            Histórico de Backups
          </CardTitle>
          <CardDescription>
            Últimos backups executados no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {backups.length === 0 ? (
            <div className="text-center py-8">
              <Database className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Nenhum backup encontrado. Execute o primeiro backup manual.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {backups.map((backup) => (
                <div key={backup.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium">{backup.name}</h3>
                        <Badge 
                          variant={backup.status === 'completed' ? 'default' : 
                                   backup.status === 'failed' ? 'destructive' : 'secondary'}
                          className="flex items-center gap-1"
                        >
                          {backup.status === 'completed' ? (
                            <CheckCircle className="w-3 h-3" />
                          ) : backup.status === 'failed' ? (
                            <AlertCircle className="w-3 h-3" />
                          ) : (
                            <Clock className="w-3 h-3" />
                          )}
                          {backup.status === 'completed' ? 'Concluído' :
                           backup.status === 'failed' ? 'Falhou' : 'Em progresso'}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Tabelas:</span>
                          <div className="font-mono text-xs">
                            {backup.tables_backed_up?.length || 0} tabelas
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Tamanho:</span>
                          <div className="font-mono text-xs">
                            {formatBytes(backup.backup_size_bytes || 0)}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Criado:</span>
                          <div className="font-mono text-xs">
                            {new Date(backup.created_at).toLocaleString('pt-BR')}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Sobre os Backups
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm space-y-2">
            <p><strong>Backup Diário:</strong> Todo dia às 02:00</p>
            <p><strong>Backup Semanal:</strong> Domingos às 01:00</p>
            <p><strong>Retenção:</strong> 30 dias</p>
            <p><strong>Conteúdo:</strong> Todas as tabelas principais</p>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground pt-3 border-t">
            <CheckCircle className="w-4 h-4 text-green-500" />
            Backup automático configurado e funcionando
          </div>
        </CardContent>
      </Card>
    </div>
  );
}