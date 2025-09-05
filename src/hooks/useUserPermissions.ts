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
        .select('permissions')
        .eq('user_id', user?.id)
        .single();

      if (error) {
        console.warn('Error loading user permissions:', error);
        return;
      }

      // Verificar se o campo permissions existe e tem valor
      const userPermissions = (data as any)?.permissions;
      if (userPermissions) {
        setPermissions(userPermissions as UserPermissions);
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