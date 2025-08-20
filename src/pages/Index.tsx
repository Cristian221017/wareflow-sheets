import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { LoginPage } from '@/components/Auth/LoginPage';

const Index = () => {
  const { isAuthenticated, user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && user && !loading) {
      console.log('Redirecting user:', user);
      
      // Redirect based on user role/type
      if (user.role === 'super_admin') {
        navigate('/admin', { replace: true });
      } else if (user.type === 'cliente') {
        navigate('/cliente', { replace: true });
      } else if (user.role === 'admin_transportadora' || user.role === 'operador') {
        navigate('/transportadora', { replace: true });
      } else {
        // Default fallback
        navigate('/cliente', { replace: true });
      }
    }
  }, [isAuthenticated, user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <div className="text-center space-y-4">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="text-muted-foreground text-lg">Carregando sistema...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Show loading while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
      <div className="text-center space-y-4">
        <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
        <p className="text-muted-foreground text-lg">Redirecionando...</p>
      </div>
    </div>
  );
};

export default Index;
