import { useAuth } from '@/contexts/SimplifiedAuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { AdminLoginPage } from '@/components/Auth/AdminLoginPage';

const SystemAdminLogin = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && user) {
      // Redirect based on user role/type
      if (user.role === 'super_admin') {
        navigate('/admin', { replace: true });
      } else if (user.type === 'cliente') {
        navigate('/cliente', { replace: true });
      } else {
        navigate('/transportadora', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  return <AdminLoginPage />;
};

export default SystemAdminLogin;