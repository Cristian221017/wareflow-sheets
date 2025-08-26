import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Flag, 
  Plus, 
  Settings, 
  AlertTriangle,
  Edit,
  Save,
  X
} from 'lucide-react';
import { log, warn, error as logError } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface FeatureFlag {
  id: string;
  key: string;
  enabled: boolean;
  description?: string;
  environment: string;
  target_users: string[];
  percentage: number;
  created_at: string;
  updated_at: string;
}

export function FeatureFlagsManager() {
  const { user } = useAuth();
  const { flags, loading, isEnabled } = useFeatureFlags();
  const [allFlags, setAllFlags] = useState<FeatureFlag[]>([]);
  const [editingFlag, setEditingFlag] = useState<FeatureFlag | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newFlag, setNewFlag] = useState({
    key: '',
    description: '',
    environment: 'all',
    enabled: false
  });

  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin_transportadora';

  const fetchAllFlags = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('feature_flags')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAllFlags(data || []);
    } catch (error) {
      logError('Erro ao buscar feature flags:', error);
    }
  };

  const toggleFlag = async (flagId: string, enabled: boolean) => {
    if (!isAdmin) {
      toast.error('Apenas administradores podem modificar feature flags');
      return;
    }

    try {
      const { error } = await (supabase as any)
        .from('feature_flags')
        .update({ enabled })
        .eq('id', flagId);

      if (error) throw error;

      toast.success(`Feature flag ${enabled ? 'ativada' : 'desativada'} com sucesso!`);
      await fetchAllFlags();
    } catch (error) {
      logError('Erro ao atualizar feature flag:', error);
      toast.error('Erro ao atualizar feature flag');
    }
  };

  const createFlag = async () => {
    if (!isAdmin) {
      toast.error('Apenas administradores podem criar feature flags');
      return;
    }

    if (!newFlag.key.trim()) {
      toast.error('Chave da feature flag é obrigatória');
      return;
    }

    try {
      const { error } = await (supabase as any)
        .from('feature_flags')
        .insert([{
          key: newFlag.key.toLowerCase().replace(/\s+/g, '_'),
          description: newFlag.description,
          environment: newFlag.environment,
          enabled: newFlag.enabled
        }]);

      if (error) throw error;

      toast.success('Feature flag criada com sucesso!');
      setShowCreateDialog(false);
      setNewFlag({ key: '', description: '', environment: 'all', enabled: false });
      await fetchAllFlags();
    } catch (error) {
      logError('Erro ao criar feature flag:', error);
      toast.error('Erro ao criar feature flag');
    }
  };

  const updateFlag = async (flag: FeatureFlag) => {
    if (!isAdmin) {
      toast.error('Apenas administradores podem modificar feature flags');
      return;
    }

    try {
      const { error } = await (supabase as any)
        .from('feature_flags')
        .update({
          description: flag.description,
          environment: flag.environment,
          enabled: flag.enabled
        })
        .eq('id', flag.id);

      if (error) throw error;

      toast.success('Feature flag atualizada com sucesso!');
      setEditingFlag(null);
      await fetchAllFlags();
    } catch (error) {
      logError('Erro ao atualizar feature flag:', error);
      toast.error('Erro ao atualizar feature flag');
    }
  };

  useEffect(() => {
    fetchAllFlags();
  }, []);

  const getEnvironmentBadge = (environment: string) => {
    switch (environment) {
      case 'staging':
        return <Badge variant="secondary" className="bg-yellow-500 text-white">Staging</Badge>;
      case 'prod':
        return <Badge variant="default" className="bg-green-600 text-white">Produção</Badge>;
      case 'all':
        return <Badge variant="outline">Todos</Badge>;
      default:
        return <Badge variant="outline">{environment}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Flag className="w-5 h-5" />
                Feature Flags
              </CardTitle>
              <CardDescription>
                Gerencie funcionalidades do sistema de forma segura
              </CardDescription>
            </div>
            
            {isAdmin && (
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Feature Flag
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Criar Nova Feature Flag</DialogTitle>
                    <DialogDescription>
                      Configure uma nova feature flag para controlar funcionalidades
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="key">Chave</Label>
                      <Input
                        id="key"
                        value={newFlag.key}
                        onChange={(e) => setNewFlag({ ...newFlag, key: e.target.value })}
                        placeholder="minha_nova_funcionalidade"
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Descrição</Label>
                      <Textarea
                        id="description"
                        value={newFlag.description}
                        onChange={(e) => setNewFlag({ ...newFlag, description: e.target.value })}
                        placeholder="Descreva o que esta feature flag controla"
                      />
                    </div>
                    <div>
                      <Label htmlFor="environment">Ambiente</Label>
                      <Select
                        value={newFlag.environment}
                        onValueChange={(value) => setNewFlag({ ...newFlag, environment: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os ambientes</SelectItem>
                          <SelectItem value="staging">Apenas Staging</SelectItem>
                          <SelectItem value="prod">Apenas Produção</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="enabled"
                        checked={newFlag.enabled}
                        onCheckedChange={(enabled) => setNewFlag({ ...newFlag, enabled })}
                      />
                      <Label htmlFor="enabled">Ativar imediatamente</Label>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowCreateDialog(false)}
                      >
                        Cancelar
                      </Button>
                      <Button onClick={createFlag}>
                        Criar Feature Flag
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {!isAdmin && (
            <Alert>
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                Você pode visualizar as feature flags, mas apenas administradores podem modificá-las.
              </AlertDescription>
            </Alert>
          )}

          {allFlags.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma feature flag configurada ainda
            </p>
          ) : (
            <div className="space-y-4">
              {allFlags.map((flag) => (
                <div key={flag.id} className="border rounded-lg p-4">
                  {editingFlag?.id === flag.id ? (
                    // Edit mode
                    <div className="space-y-4">
                      <div>
                        <Label>Chave (não editável)</Label>
                        <Input value={flag.key} disabled />
                      </div>
                      <div>
                        <Label>Descrição</Label>
                        <Textarea
                          value={editingFlag.description || ''}
                          onChange={(e) => setEditingFlag({
                            ...editingFlag,
                            description: e.target.value
                          })}
                        />
                      </div>
                      <div>
                        <Label>Ambiente</Label>
                        <Select
                          value={editingFlag.environment}
                          onValueChange={(value) => setEditingFlag({
                            ...editingFlag,
                            environment: value
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos os ambientes</SelectItem>
                            <SelectItem value="staging">Apenas Staging</SelectItem>
                            <SelectItem value="prod">Apenas Produção</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={editingFlag.enabled}
                          onCheckedChange={(enabled) => setEditingFlag({
                            ...editingFlag,
                            enabled
                          })}
                        />
                        <Label>Ativada</Label>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          onClick={() => setEditingFlag(null)}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Cancelar
                        </Button>
                        <Button
                          onClick={() => updateFlag(editingFlag)}
                        >
                          <Save className="w-4 h-4 mr-2" />
                          Salvar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View mode
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-mono font-medium">{flag.key}</span>
                          {getEnvironmentBadge(flag.environment)}
                          <Switch
                            checked={flag.enabled}
                            onCheckedChange={(enabled) => toggleFlag(flag.id, enabled)}
                            disabled={!isAdmin}
                          />
                        </div>
                        {flag.description && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {flag.description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Atualizada em: {new Date(flag.updated_at).toLocaleString()}
                        </p>
                      </div>
                      
                      {isAdmin && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingFlag(flag)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}