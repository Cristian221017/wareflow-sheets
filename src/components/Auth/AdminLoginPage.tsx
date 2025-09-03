import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { LogIn, ArrowLeft, Users } from 'lucide-react';
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
        toast.success('Login realizado com sucesso!');
        // Don't manually navigate - let WMSLayout handle it
      } else {
        toast.error('Credenciais inválidas ou acesso negado!');
      }
    } catch (error) {
      toast.error('Erro inesperado');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <Users className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Sistema WMS</h1>
          <p className="text-muted-foreground">Gestão Integrada de Warehouse e Logística</p>
        </div>

        {/* Auth Card */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Acesso ao Sistema</CardTitle>
            <CardDescription>
              Portal para transportadoras, clientes e administração
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu.email@empresa.com"
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
                {isLoading ? (
                  'Verificando...'
                ) : (
                  <>
                    <LogIn className="w-4 h-4 mr-2" />
                    Acessar Sistema
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>


        {/* Back to Main */}
        <Card className="border-muted bg-muted/50">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-3">
                Voltar à página inicial?
              </p>
              <Link to="/">
                <Button variant="outline" className="text-muted-foreground border-muted hover:bg-muted">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Página Inicial
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}