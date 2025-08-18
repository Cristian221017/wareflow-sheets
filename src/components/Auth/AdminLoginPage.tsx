import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Shield, LogIn, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export function AdminLoginPage() {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const success = await login(formData.email, formData.password);
      if (success) {
        toast.success('Login de administrador realizado com sucesso!');
      } else {
        toast.error('Credenciais inválidas ou acesso negado!');
      }
    } catch (error) {
      toast.error('Erro inesperado');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    try {
      const success = await login('superadmin@sistema.com', 'admin123');
      if (success) {
        toast.success('Login de administrador realizado com sucesso!');
      } else {
        toast.error('Credenciais inválidas ou acesso negado!');
      }
    } catch (error) {
      toast.error('Erro inesperado');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-900/20 to-purple-900/20 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <Shield className="w-12 h-12 text-red-600" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Administração Sistema</h1>
          <p className="text-muted-foreground">Painel de Gestão WMS</p>
        </div>

        {/* Auth Card */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-800">Acesso Administrativo</CardTitle>
            <CardDescription>
              Área restrita para administradores do sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email do Administrador</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@sistema.com"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Sua senha de administrador"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  required
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-red-600 hover:bg-red-700" 
                disabled={isLoading}
              >
                {isLoading ? (
                  'Verificando...'
                ) : (
                  <>
                    <LogIn className="w-4 h-4 mr-2" />
                    Acessar Painel
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Demo Account */}
        <Card className="border-purple-200 bg-purple-50">
          <CardHeader>
            <CardTitle className="text-sm text-purple-800">Conta Demo</CardTitle>
            <CardDescription className="text-xs text-purple-700">
              Para demonstração do sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              className="w-full justify-start text-purple-700 border-purple-200 hover:bg-purple-100"
              onClick={handleDemoLogin}
            >
              <Shield className="w-4 h-4 mr-2" />
              Usar Conta Demo (Super Admin)
            </Button>
            
            <div className="mt-3 p-2 bg-purple-100 rounded-md">
              <p className="text-xs text-purple-800 font-medium">Credenciais Demo:</p>
              <p className="text-xs text-purple-700 mt-1">
                Email: superadmin@sistema.com<br />
                Senha: admin123
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Back to Client Login */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-blue-800 mb-3">
                Não é administrador?
              </p>
              <Link to="/">
                <Button variant="outline" className="text-blue-700 border-blue-200 hover:bg-blue-100">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar ao Login Principal
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}