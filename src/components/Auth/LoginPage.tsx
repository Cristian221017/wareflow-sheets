import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Warehouse, Truck, User } from 'lucide-react';

export function LoginPage() {
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
        toast.success('Login realizado com sucesso!');
      } else {
        toast.error('Credenciais inválidas!');
      }
    } catch (error) {
      toast.error('Erro ao fazer login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = (userType: 'transportadora' | 'cliente') => {
    const demoCredentials = {
      transportadora: { email: 'transportadora@abc.com', password: '123456' },
      cliente: { email: 'cliente@premium.com', password: '123456' }
    };

    setFormData(demoCredentials[userType]);
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

        {/* Login Card */}
        <Card>
          <CardHeader>
            <CardTitle>Acesso ao Sistema</CardTitle>
            <CardDescription>
              Entre com suas credenciais para acessar o sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                  placeholder="Sua senha"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  required
                />
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Demo Access */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Acesso Demo</CardTitle>
            <CardDescription className="text-xs">
              Clique para preencher automaticamente as credenciais
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="transportadora" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="transportadora">Transportadora</TabsTrigger>
                <TabsTrigger value="cliente">Cliente</TabsTrigger>
              </TabsList>
              
              <TabsContent value="transportadora" className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => handleDemoLogin('transportadora')}
                >
                  <Truck className="w-4 h-4 mr-2" />
                  Transportadora ABC
                </Button>
                <p className="text-xs text-muted-foreground">
                  Acesso completo: Dashboard, cadastros, liberações
                </p>
              </TabsContent>
              
              <TabsContent value="cliente" className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => handleDemoLogin('cliente')}
                >
                  <User className="w-4 h-4 mr-2" />
                  Cliente Premium
                </Button>
                <p className="text-xs text-muted-foreground">
                  Acesso limitado: Consultas e solicitações
                </p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}