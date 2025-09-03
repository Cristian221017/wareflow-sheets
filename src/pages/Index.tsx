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
    if (!loading && isAuthenticated && user) {
      const timer = setTimeout(() => {
        if (user.role === 'super_admin') {
          navigate('/admin', { replace: true });
        } else if (user.type === 'transportadora' && (user.role === 'admin_transportadora' || user.role === 'operador')) {
          navigate('/transportadora', { replace: true });
        } else if (user.type === 'cliente') {
          navigate('/cliente', { replace: true });
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [loading, isAuthenticated, user, navigate]);

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

        <div className="flex justify-center">
          <Card className="max-w-lg mx-auto">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2 text-2xl">
                <ShieldCheck className="h-6 w-6" />
                Acesso ao Sistema
              </CardTitle>
              <CardDescription className="text-base">
                Portal unificado para transportadoras, clientes e administração
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4 mb-6 text-center">
                <div className="flex flex-col items-center gap-2">
                  <Truck className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Transportadoras</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Package className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Clientes</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Users className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Administração</span>
                </div>
              </div>
              <Button 
                className="w-full" 
                size="lg"
                onClick={() => navigate('/system-admin')}
              >
                Acessar Sistema
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}