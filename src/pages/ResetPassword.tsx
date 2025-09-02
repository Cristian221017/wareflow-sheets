import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function ResetPassword() {
  const [password, setPassword] = useState('cliente123');
  const [confirmPassword, setConfirmPassword] = useState('cliente123');
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Verificar se temos tokens na URL (vindos do link de email)
        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');
        const type = searchParams.get('type');

        if (accessToken && refreshToken && type === 'recovery') {
          // Definir a sessão usando os tokens do email
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            toast.error('Link de redefinição inválido ou expirado');
            navigate('/');
            return;
          }

          setSessionReady(true);
          toast.success('Link válido! Você pode redefinir sua senha agora.');
        } else {
          // Verificar se já existe uma sessão válida
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            setSessionReady(true);
          } else {
            toast.error('Link de redefinição necessário');
            navigate('/');
          }
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        toast.error('Erro ao processar link de redefinição');
        navigate('/');
      }
    };

    handleAuthCallback();
  }, [searchParams, navigate]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sessionReady) {
      toast.error('Sessão não está pronta. Use o link do email.');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      // Verificar a sessão atual antes de tentar atualizar
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        toast.error('Sessão inválida. Use o link do email.');
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        toast.error(`Erro ao redefinir senha: ${error.message}`);
        return;
      }

      toast.success('Senha redefinida com sucesso!');
      
      // Fazer logout e redirecionar para login
      await supabase.auth.signOut();
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 2000);

    } catch (error) {
      toast.error('Erro ao redefinir senha');
      console.error('Reset password error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!sessionReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Processando...</CardTitle>
            <CardDescription>
              Validando link de redefinição de senha
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground">
              Por favor, aguarde...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Redefinir Senha</CardTitle>
          <CardDescription>
            Digite sua nova senha abaixo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label htmlFor="password" className="text-sm font-medium">
                Nova Senha
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite a nova senha"
                required
              />
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirmar Senha
              </label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirme a nova senha"
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Redefinindo...' : 'Redefinir Senha'}
            </Button>
          </form>
          
          <div className="mt-4 text-center">
            <Button 
              variant="link" 
              onClick={() => navigate('/')}
              className="text-sm"
            >
              Voltar ao login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}