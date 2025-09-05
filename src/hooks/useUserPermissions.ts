import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UserPermissions {
  users: {
    create: boolean;
    edit: boolean;
    delete: boolean;
  };
}

export function useUserPermissions() {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<UserPermissions>({
    users: {
      create: false,
      edit: false,
      delete: false,
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadUserPermissions();
    } else {
      setLoading(false);
    }
  }, [user?.id]);

  const loadUserPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) {
        console.warn('Error loading user permissions:', error);
        setLoading(false);
        return;
      }

      // Verificar se o campo permissions existe e tem valor usando any para evitar erro de tipos
      const profile = data as any;
      if (profile?.permissions) {
        // Garantir que a estrutura de permissões está correta
        const userPermissions = profile.permissions;
        const validPermissions: UserPermissions = {
          users: {
            create: userPermissions?.users?.create === true,
            edit: userPermissions?.users?.edit === true,
            delete: userPermissions?.users?.delete === true,
          }
        };
        setPermissions(validPermissions);
      } else {
        // Se não tem permissões definidas, usar valores padrão
        const defaultPermissions: UserPermissions = {
          users: {
            create: false,
            edit: false, 
            delete: false,
          }
        };
        setPermissions(defaultPermissions);
      }
    } catch (error) {
      console.error('Error in loadUserPermissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (resource: keyof UserPermissions, action: string): boolean => {
    // Super admins têm todas as permissões
    if (user?.role === 'super_admin') {
      return true;
    }

    // Admin transportadora tem todas as permissões de usuários
    if (user?.role === 'admin_transportadora' && resource === 'users') {
      return true;
    }

    // Clientes (user.type === 'cliente') são admin por padrão na gestão de usuários
    if (user?.type === 'cliente' && resource === 'users') {
      return true;
    }

    // Verificar permissões específicas
    const resourcePermissions = permissions[resource];
    if (!resourcePermissions) {
      return false;
    }

    return (resourcePermissions as any)[action] === true;
  };

  const canCreateUsers = () => hasPermission('users', 'create');
  const canEditUsers = () => hasPermission('users', 'edit');
  const canDeleteUsers = () => hasPermission('users', 'delete');

  return {
    permissions,
    loading,
    hasPermission,
    canCreateUsers,
    canEditUsers,
    canDeleteUsers,
    refetch: loadUserPermissions,
  };
}