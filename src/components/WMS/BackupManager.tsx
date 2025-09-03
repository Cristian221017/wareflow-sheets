import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  Database, 
  Download, 
  Calendar,
  Clock,
  FileText,
  Shield,
  AlertCircle,
  CheckCircle,
  Play
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface BackupRecord {
  id: string;
  name: string;
  description: string;
  status: string;
  tables_backed_up: string[];
  backup_size_bytes: number;
  created_at: string;
  completed_at: string;
}

interface CronJob {
  jobname: string;
  schedule: string;
  active: boolean;
}

export function BackupManager() {
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [cronJobs, setCronJobs] = useState<CronJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExecutingManual, setIsExecutingManual] = useState(false);

  useEffect(() => {
    loadBackupData();
  }, []);

  const loadBackupData = async () => {
    setIsLoading(true);
    try {
      // Carregar histórico de backups - usar any para contornar tipos
      const { data: backupsData, error: backupsError } = await (supabase as any)
        .from('system_backups')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (backupsError) throw backupsError;
      setBackups(backupsData || []);

      // Carregar status dos cron jobs - usar any para contornar tipos
      const { data: cronData, error: cronError } = await (supabase as any)
        .rpc('get_backup_cron_status');

      if (cronError) throw cronError;
      setCronJobs(cronData || []);

    } catch (error) {
      console.error('Erro ao carregar dados de backup:', error);
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar informações de backup',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const executeManualBackup = async () => {
    setIsExecutingManual(true);
    try {
      const { data, error } = await (supabase as any).rpc('execute_manual_backup');

      if (error) throw error;

      toast({
        title: 'Backup iniciado',
        description: 'Backup manual iniciado com sucesso. Aguarde alguns minutos.',
        variant: 'default'
      });

      // Recarregar dados após 5 segundos
      setTimeout(() => {
        loadBackupData();
      }, 5000);

    } catch (error: any) {
      console.error('Erro ao executar backup manual:', error);
      toast({
        title: 'Erro no backup',
        description: error.message || 'Falha ao executar backup manual',
        variant: 'destructive'
      });
    } finally {
      setIsExecutingManual(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Concluído</Badge>;
      case 'creating':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Processando</Badge>;
      case 'failed':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Falha</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getCronScheduleDescription = (schedule: string) => {
    switch (schedule) {
      case '0 2 * * *':
        return 'Diário às 02:00';
      case '0 1 * * 0':
        return 'Semanal - Domingo 01:00';
      default:
        return schedule;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Gerenciamento de Backup
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status dos Agendamentos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Backup Automático
          </CardTitle>
          <CardDescription>
            Status dos agendamentos de backup do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cronJobs.map((job) => (
              <div key={job.jobname} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="font-medium">{job.jobname.replace('sistema-wms-backup-', '').toUpperCase()}</div>
                  <div className="text-sm text-muted-foreground">
                    {getCronScheduleDescription(job.schedule)}
                  </div>
                </div>
                <Badge variant={job.active ? "default" : "secondary"}>
                  {job.active ? "Ativo" : "Inativo"}
                </Badge>
              </div>
            ))}
          </div>

          <Separator className="my-4" />

          <div className="flex items-center gap-4">
            <Button 
              onClick={executeManualBackup}
              disabled={isExecutingManual}
              className="flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              {isExecutingManual ? 'Executando...' : 'Backup Manual'}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={loadBackupData}
              className="flex items-center gap-2"
            >
              <Database className="w-4 h-4" />
              Atualizar Status
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Histórico de Backups */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Histórico de Backups
          </CardTitle>
          <CardDescription>
            Últimos 10 backups executados no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {backups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum backup encontrado</p>
              <p className="text-sm">Execute o primeiro backup manual para começar</p>
            </div>
          ) : (
            <div className="space-y-4">
              {backups.map((backup) => (
                <div key={backup.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium">{backup.name}</h4>
                      <p className="text-sm text-muted-foreground">{backup.description}</p>
                    </div>
                    {getStatusBadge(backup.status)}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="font-medium text-muted-foreground">Tabelas</div>
                      <div>{backup.tables_backed_up?.length || 0} tabelas</div>
                    </div>
                    <div>
                      <div className="font-medium text-muted-foreground">Tamanho</div>
                      <div>{formatBytes(backup.backup_size_bytes || 0)}</div>
                    </div>
                    <div>
                      <div className="font-medium text-muted-foreground">Criado</div>
                      <div>{formatDistanceToNow(new Date(backup.created_at), { addSuffix: true, locale: ptBR })}</div>
                    </div>
                    <div>
                      <div className="font-medium text-muted-foreground">Status</div>
                      <div>{backup.completed_at ? 'Concluído' : 'Pendente'}</div>
                    </div>
                  </div>

                  {backup.tables_backed_up && backup.tables_backed_up.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="text-sm text-muted-foreground mb-2">Tabelas incluídas:</div>
                      <div className="flex flex-wrap gap-1">
                        {backup.tables_backed_up.map((table) => (
                          <Badge key={table} variant="outline" className="text-xs">
                            {table}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Informações de Segurança */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Segurança dos Backups
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Backups criptografados e seguros</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Retenção automática de 30 dias</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Acesso restrito a super administradores</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Logs completos de auditoria</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}