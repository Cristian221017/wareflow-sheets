import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Truck, Package, Users, ShieldCheck } from "lucide-react";

export default function Index() {
  const { user, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  // Redireciona usuários autenticados para seus portais
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'super_admin') {
        navigate('/admin');
      } else if (user.role === 'admin_transportadora' || user.role === 'operador') {
        navigate('/transportadora');
      } else if (user.type === 'cliente') {
        navigate('/cliente');
      }
    }
  }, [isAuthenticated, user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-12 px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Sistema WMS</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Gestão Integrada de Warehouse e Logística
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Transportadoras
              </CardTitle>
              <CardDescription>
                Gestão completa de frota e operações de transporte
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full" 
                onClick={() => navigate('/system-admin')}
              >
                Portal Transportadora
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Clientes
              </CardTitle>
              <CardDescription>
                Acompanhamento de pedidos e solicitações de carregamento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full" 
                onClick={() => navigate('/system-admin')}
              >
                Portal Cliente
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Administração
              </CardTitle>
              <CardDescription>
                Gestão de usuários e configurações do sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full" 
                onClick={() => navigate('/system-admin')}
              >
                Portal Admin
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-center gap-2">
                <Users className="h-5 w-5" />
                Acesso ao Sistema
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full" 
                size="lg"
                onClick={() => navigate('/system-admin')}
              >
                Fazer Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}