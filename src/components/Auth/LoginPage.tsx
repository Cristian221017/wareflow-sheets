import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Warehouse, UserPlus, LogIn, Truck, User } from 'lucide-react';
import { Link } from 'react-router-dom';

export function LoginPage() {
  const { login, signUp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    confirmPassword: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (activeTab === 'login') {
        const success = await login(formData.email, formData.password);
        if (success) {
          toast.success('Login realizado com sucesso!');
        } else {
          toast.error('Credenciais inválidas!');
        }
      } else {
        // Sign up
        if (formData.password !== formData.confirmPassword) {
          toast.error('As senhas não coincidem!');
          return;
        }

        if (formData.password.length < 6) {
          toast.error('A senha deve ter pelo menos 6 caracteres!');
          return;
        }

        const { error } = await signUp(formData.email, formData.password, formData.name);
        if (error) {
          toast.error(error);
        } else {
          toast.success('Conta criada com sucesso! Verifique seu email para confirmar.');
          setActiveTab('login');
          setFormData(prev => ({ ...prev, password: '', confirmPassword: '', name: '' }));
        }
      }
    } catch (error) {
      toast.error('Erro inesperado');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = (userType: 'admin' | 'transportadora' | 'cliente') => {
    const demoCredentials = {
      admin: { email: 'admin@sistema.com', password: 'admin123' },
      transportadora: { email: 'transportadora@abc.com', password: '123456' },
      cliente: { email: 'cliente@premium.com', password: '123456' }
    };

    setFormData(prev => ({ 
      ...prev, 
      ...demoCredentials[userType] 
    }));
    setActiveTab('login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <Warehouse className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Sistema WMS</h1>
          <p className="text-muted-foreground">Warehouse Management System</p>
        </div>

        {/* Auth Card */}
        <Card>
          <CardHeader>
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'login' | 'signup')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Criar Conta</TabsTrigger>
              </TabsList>
              
              <div className="mt-4">
                <CardTitle>
                  {activeTab === 'login' ? 'Acesso ao Sistema' : 'Criar Nova Conta'}
                </CardTitle>
                <CardDescription>
                  {activeTab === 'login' 
                    ? 'Entre com suas credenciais para acessar o sistema'
                    : 'Crie sua conta para acessar o sistema WMS'
                  }
                </CardDescription>
              </div>
            </Tabs>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {activeTab === 'signup' && (
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Seu nome completo"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
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
                  placeholder={activeTab === 'signup' ? 'Mínimo 6 caracteres' : 'Sua senha'}
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  required
                  minLength={activeTab === 'signup' ? 6 : undefined}
                />
              </div>

              {activeTab === 'signup' && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirme sua senha"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    required
                  />
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? (
                  activeTab === 'login' ? 'Entrando...' : 'Criando conta...'
                ) : (
                  <>
                    {activeTab === 'login' ? (
                      <>
                        <LogIn className="w-4 h-4 mr-2" />
                        Entrar
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Criar Conta
                      </>
                    )}
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {activeTab === 'signup' && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-6">
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-2">Após criar sua conta:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Verifique seu email para confirmar a conta</li>
                  <li>Aguarde a liberação do acesso por um administrador</li>
                  <li>Você será associado a uma transportadora</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions for getting started */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-2">Para começar a usar o sistema:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Clique em "Criar Conta" acima</li>
                <li>Use seu email e defina uma senha</li>
                <li>Confirme sua conta pelo email enviado</li>
                <li>Entre normalmente com suas credenciais</li>
                <li>Um administrador irá configurar suas permissões</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* Demo Accounts Section */}
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-sm text-green-800">Contas Demo</CardTitle>
            <CardDescription className="text-xs text-green-700">
              Crie diferentes tipos de conta para testar o sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start text-blue-700 border-blue-200 hover:bg-blue-50"
                onClick={() => {
                  setFormData(prev => ({ 
                    ...prev, 
                    email: 'admin@transportadora.com',
                    name: 'Admin Transportadora',
                    password: 'trans123',
                    confirmPassword: 'trans123'
                  }));
                  setActiveTab('signup');
                }}
              >
                <Truck className="w-4 h-4 mr-2" />
                Admin Transportadora
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full justify-start text-green-700 border-green-200 hover:bg-green-50"
                onClick={() => {
                  setFormData(prev => ({ 
                    ...prev, 
                    email: 'cliente@empresa.com',
                    name: 'Cliente Empresa',
                    password: 'cliente123',
                    confirmPassword: 'cliente123'
                  }));
                  setActiveTab('signup');
                }}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Cliente Empresarial
              </Button>
              
              <div className="mt-3 p-2 bg-green-100 rounded-md">
                <p className="text-xs text-green-800 font-medium">Como usar:</p>
                <ol className="text-xs text-green-700 mt-1 space-y-1">
                  <li>1. Clique no tipo de conta desejado</li>
                  <li>2. Clique em "Criar Conta" para registrar</li>
                  <li>3. Após criação, faça login normalmente</li>
                  <li>4. O sistema definirá as permissões automaticamente</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Admin Access Link */}
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-red-800 mb-3">
                Administrador do sistema?
              </p>
              <Link to="/system-admin">
                <Button variant="outline" className="text-red-700 border-red-200 hover:bg-red-100">
                  <User className="w-4 h-4 mr-2" />
                  Acessar Painel de Administração
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}