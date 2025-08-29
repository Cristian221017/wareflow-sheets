import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Settings, Wifi, WifiOff, CheckCircle, XCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface IntegrationConfig {
  id: string;
  transportadora_id: string;
  integration_type: 'api' | 'edi' | 'notfis' | 'proceda';
  is_active: boolean;
  endpoint_url?: string;
  api_key?: string;
  username?: string;
  password?: string;
  certificate_path?: string;
  config_data: any;
  last_sync?: string;
}

interface IntegrationLog {
  id: string;
  integration_type: string;
  operation: string;
  status: string;
  message: string;
  created_at: string;
}

const INTEGRATION_TYPES = [
  { value: 'api', label: 'API REST', description: 'Integração via API REST' },
  { value: 'edi', label: 'EDI', description: 'Electronic Data Interchange' },
  { value: 'notfis', label: 'NOTFIS', description: 'Sistema NOTFIS' },
  { value: 'proceda', label: 'PROCEDA', description: 'Sistema PROCEDA' }
];

export default function IntegrationConfig() {
  const [configs, setConfigs] = useState<IntegrationConfig[]>([]);
  const [logs, setLogs] = useState<IntegrationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadConfigs();
    loadLogs();
  }, []);

  const loadConfigs = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('integration_configs')
        .select('*')
        .order('integration_type');

      if (error) throw error;
      setConfigs(data || []);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar as configurações",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('integration_logs')
        .select('id, integration_type, operation, status, message, created_at')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setLogs(data || []);
    } catch (error: any) {
      // Falha silenciosa para logs
    }
  };

  const saveConfig = async (type: string, configData: Partial<IntegrationConfig>) => {
    setSaving(true);
    try {
      const existingConfig = configs.find(c => c.integration_type === type);
      
      if (existingConfig) {
        const { error } = await (supabase as any)
          .from('integration_configs')
          .update(configData)
          .eq('id', existingConfig.id);
        
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('integration_configs')
          .insert({
            integration_type: type,
            ...configData
          });
        
        if (error) throw error;
      }

      await loadConfigs();
      toast({
        title: "Sucesso",
        description: "Configuração salva com sucesso",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Não foi possível salvar a configuração",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const testIntegration = async (type: string) => {
    setTesting(type);
    try {
      const { data, error } = await supabase.functions.invoke('integration-sync', {
        body: {
          integration_type: type,
          operation: 'test',
          table_name: 'test',
          data: { test: true }
        }
      });

      if (error) throw error;

      toast({
        title: "Teste realizado",
        description: "Integração testada com sucesso",
      });
      
      await loadLogs();
    } catch (error: any) {
      toast({
        title: "Erro no teste",
        description: error.message || "Falha ao testar a integração",
        variant: "destructive",
      });
    } finally {
      setTesting(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Sucesso</Badge>;
      case 'error':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Erro</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5" />
        <h2 className="text-2xl font-bold">Configurações de Integração</h2>
      </div>

      <Alert>
        <AlertDescription>
          Configure as integrações para sincronização automática com sistemas externos (API, EDI, NOTFIS, PROCEDA).
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="config" className="space-y-4">
        <TabsList>
          <TabsTrigger value="config">Configurações</TabsTrigger>
          <TabsTrigger value="logs">Logs de Integração</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-4">
          <div className="grid gap-4">
            {INTEGRATION_TYPES.map((integrationType) => {
              const config = configs.find(c => c.integration_type === integrationType.value);
              
              return (
                <Card key={integrationType.value}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {config?.is_active ? (
                          <Wifi className="h-4 w-4 text-green-500" />
                        ) : (
                          <WifiOff className="h-4 w-4 text-gray-400" />
                        )}
                        {integrationType.label}
                      </CardTitle>
                      <CardDescription>{integrationType.description}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={config?.is_active || false}
                        onCheckedChange={(checked) => 
                          saveConfig(integrationType.value, { is_active: checked })
                        }
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testIntegration(integrationType.value)}
                        disabled={!config?.is_active || testing === integrationType.value}
                      >
                        {testing === integrationType.value ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Testar'
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  
                  {config?.is_active && (
                    <CardContent className="space-y-4">
                      <IntegrationForm
                        type={integrationType.value}
                        config={config}
                        onSave={(data) => saveConfig(integrationType.value, data)}
                        saving={saving}
                      />
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Logs de Integração</CardTitle>
              <CardDescription>Últimas 20 operações de integração</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{log.integration_type.toUpperCase()}</Badge>
                      <span className="font-medium">{log.operation}</span>
                      <span className="text-sm text-muted-foreground">{log.message}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(log.status)}
                      <span className="text-sm text-muted-foreground">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
                {logs.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum log de integração encontrado
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface IntegrationFormProps {
  type: string;
  config?: IntegrationConfig;
  onSave: (data: any) => void;
  saving: boolean;
}

function IntegrationForm({ type, config, onSave, saving }: IntegrationFormProps) {
  const [formData, setFormData] = useState({
    endpoint_url: config?.endpoint_url || '',
    api_key: config?.api_key || '',
    username: config?.username || '',
    password: config?.password || '',
    certificate_path: config?.certificate_path || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${type}-endpoint`}>URL do Endpoint</Label>
          <Input
            id={`${type}-endpoint`}
            value={formData.endpoint_url}
            onChange={(e) => setFormData(prev => ({ ...prev, endpoint_url: e.target.value }))}
            placeholder="https://api.exemplo.com/v1"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor={`${type}-api-key`}>API Key</Label>
          <Input
            id={`${type}-api-key`}
            type="password"
            value={formData.api_key}
            onChange={(e) => setFormData(prev => ({ ...prev, api_key: e.target.value }))}
            placeholder="Chave da API"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${type}-username`}>Usuário</Label>
          <Input
            id={`${type}-username`}
            value={formData.username}
            onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
            placeholder="Nome de usuário"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${type}-password`}>Senha</Label>
          <Input
            id={`${type}-password`}
            type="password"
            value={formData.password}
            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
            placeholder="Senha"
          />
        </div>
      </div>

      {type === 'edi' && (
        <div className="space-y-2">
          <Label htmlFor={`${type}-certificate`}>Caminho do Certificado</Label>
          <Input
            id={`${type}-certificate`}
            value={formData.certificate_path}
            onChange={(e) => setFormData(prev => ({ ...prev, certificate_path: e.target.value }))}
            placeholder="/path/to/certificate.pem"
          />
        </div>
      )}

      <Button type="submit" disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Salvar Configuração
      </Button>
    </form>
  );
}