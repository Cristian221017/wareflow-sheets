import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Bug, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { forceRefreshAuth, clearAuthState, debugUserData } from '@/utils/authDebug';
import { toast } from 'sonner';

export function AuthRefreshButton() {
  const { user, logout } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDebugging, setIsDebugging] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const success = await forceRefreshAuth();
      if (success) {
        toast.success('Sessão atualizada! Recarregando página...');
        setTimeout(() => {
          const reload = () => window.location.reload();
          reload();
        }, 1000);
      } else {
        toast.error('Erro ao atualizar sessão');
      }
    } catch (error) {
      toast.error('Erro ao atualizar sessão');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDebug = async () => {
    if (!user?.id) return;
    
    setIsDebugging(true);
    try {
      const debugData = await debugUserData(user.id);
      toast.success('Debug executado! Verifique o console');
    } catch (error) {
      toast.error('Erro no debug');
    } finally {
      setIsDebugging(false);
    }
  };

  const handleForceLogout = async () => {
    try {
      await clearAuthState();
      toast.success('Cache limpo! Redirecionando...');
      setTimeout(() => {
        const navigate = () => window.location.href = '/';
        navigate();
      }, 1000);
    } catch (error) {
      toast.error('Erro ao limpar cache');
    }
  };

  if (!user) return null;

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <Bug className="w-5 h-5" />
          Debug de Autenticação
        </CardTitle>
        <CardDescription>
          Use estas ferramentas se estiver enfrentando problemas de login/permissões
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm space-y-1">
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Role:</strong> {user.role || 'undefined'}</p>
          <p><strong>Type:</strong> {user.type}</p>
          <p><strong>ID:</strong> {user.id}</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Atualizando...' : 'Atualizar Sessão'}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleDebug}
            disabled={isDebugging}
          >
            <Bug className="w-4 h-4 mr-2" />
            {isDebugging ? 'Debugando...' : 'Debug Usuário'}
          </Button>
          
          <Button
            variant="destructive"
            size="sm"
            onClick={handleForceLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Limpar Cache & Logout
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}