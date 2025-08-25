import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { LoginPage } from '@/components/Auth/LoginPage';

export function WMSLayout() {
  const { isAuthenticated, user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && user) {
      console.log('🚀 WMSMain - User data:', { 
        role: user.role, 
        type: user.type, 
        email: user.email,
        id: user.id 
      });
      
      // Priority order: role first, then type
      if (user.role === 'super_admin') {
        console.log('🔄 Redirecting to /admin (super_admin role)');
        navigate('/admin', { replace: true });
      } else if (user.role === 'admin_transportadora' || user.role === 'operador') {
        console.log('🔄 Redirecting to /transportadora (transportadora role)');
        navigate('/transportadora', { replace: true });
      } else if (user.type === 'cliente') {
        console.log('🔄 Redirecting to /cliente (cliente type)');
        navigate('/cliente', { replace: true });
      } else {
        console.log('🔄 Redirecting to /cliente (fallback)');
        navigate('/cliente', { replace: true });
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

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Show loading while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
        <p className="text-muted-foreground">Redirecionando...</p>
      </div>
    </div>
  );
}