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
    confirmPassword: '',
    cpf: '',
    setor: ''
  });

  // Dados de desenvolvimento - apenas em modo dev
  const quickFillData = import.meta.env.MODE === 'development' ? {
    transportadora: {
      email: 'admin@rodiviario.com.br',
      password: 'trans123',
      confirmPassword: 'trans123'
    },
    cliente: {
      email: 'comercial@rodoveigatransportes.com.br',
      password: 'cliente123',
      confirmPassword: 'cliente123'
    }
  } : null;

  const fillQuickData = (type: 'transportadora' | 'cliente') => {
    if (!quickFillData) return;
    
    const data = quickFillData[type];
    setFormData(prev => ({
      ...prev,
      ...data
    }));
    setActiveTab('signup');
  };

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

        if (!formData.cpf) {
          toast.error('CPF é obrigatório!');
          return;
        }

        if (!formData.setor) {
          toast.error('Setor é obrigatório!');
          return;
        }

        const { error } = await signUp(formData.email, formData.password, formData.name, formData.cpf, formData.setor);
        if (error) {
          toast.error(error);
        } else {
          toast.success('Cadastro realizado com sucesso!');
          setFormData(prev => ({ ...prev, password: '', confirmPassword: '', name: '', cpf: '', setor: '' }));
        }
      }
    } catch (error) {
      toast.error('Erro interno. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="h-16 w-16 bg-gradient-to-br from-blue-600 to-green-600 rounded-xl flex items-center justify-center">
              <Warehouse className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
            WMS Sistema
          </h1>
          <p className="text-gray-600">
            Sistema de Gerenciamento de Armazém
          </p>
        </div>

        <Card>
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl">Bem-vindo</CardTitle>
            <CardDescription>
              Faça login ou crie sua conta para continuar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'login' | 'signup')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login" className="flex items-center gap-2">
                  <LogIn className="w-4 h-4" />
                  Login
                </TabsTrigger>
                <TabsTrigger value="signup" className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  Cadastro
                </TabsTrigger>
              </TabsList>
              
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <TabsContent value="login" className="space-y-4">
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
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Entrando...' : 'Entrar'}
                  </Button>
                </TabsContent>

                <TabsContent value="signup" className="space-y-4">
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
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cpf">CPF</Label>
                      <Input
                        id="cpf"
                        type="text"
                        placeholder="000.000.000-00"
                        value={formData.cpf}
                        onChange={(e) => setFormData(prev => ({ ...prev, cpf: e.target.value }))}
                        maxLength={14}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="setor">Setor</Label>
                      <Input
                        id="setor"
                        type="text"
                        placeholder="Ex: Logística"
                        value={formData.setor}
                        onChange={(e) => setFormData(prev => ({ ...prev, setor: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Senha</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      required
                      minLength={6}
                    />
                  </div>
                  
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
                  
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Criando conta...' : 'Criar Conta'}
                  </Button>
                </TabsContent>
              </form>
            </Tabs>
            
            <div className="mt-6 pt-4 border-t">
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>Esqueceu a senha?</span>
                <Link to="/reset-password" className="text-blue-600 hover:underline">
                  Redefinir
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick fill buttons apenas em desenvolvimento */}
        {import.meta.env.MODE === 'development' && (
          <div className="flex gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fillQuickData('transportadora')}
              className="text-xs"
            >
              🚛 Fill Transportadora
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fillQuickData('cliente')}
              className="text-xs"
            >
              📦 Fill Cliente
            </Button>
          </div>
        )}

        <div className="text-center">
          <div className="flex items-center justify-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <User className="w-4 h-4" />
              <span>Clientes</span>
            </div>
            <div className="w-px h-4 bg-gray-300"></div>
            <div className="flex items-center space-x-1">
              <Truck className="w-4 h-4" />
              <span>Transportadoras</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}