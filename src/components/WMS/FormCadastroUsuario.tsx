import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UserPlus, Building2 } from 'lucide-react';

interface Transportadora {
  id: string;
  razao_social: string;
}

interface FormCadastroUsuarioProps {
  userType?: 'super_admin' | 'admin_transportadora' | 'cliente';
  onSuccess?: () => void;
}

export function FormCadastroUsuario({ userType = 'super_admin', onSuccess }: FormCadastroUsuarioProps) {
  const [transportadoras, setTransportadoras] = useState<Transportadora[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'operador' as 'super_admin' | 'admin_transportadora' | 'operador' | 'cliente',
    transportadora_id: ''
  });

  useEffect(() => {
    loadTransportadoras();
  }, []);

  const loadTransportadoras = async () => {
    try {
      const { data, error } = await supabase
        .from('transportadoras')
        .select('id, razao_social')
        .eq('status', 'ativo')
        .order('razao_social');

      if (error) {
        console.error('Error loading transportadoras:', error);
        return;
      }

      setTransportadoras(data || []);
    } catch (error) {
      console.error('Error in loadTransportadoras:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (!formData.transportadora_id && formData.role !== 'super_admin') {
      toast.error('Selecione uma transportadora');
      return;
    }

    setLoading(true);

    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            name: formData.name
          }
        }
      });

      if (authError) {
        console.error('Error creating auth user:', authError);
        toast.error('Erro ao criar usuário: ' + authError.message);
        return;
      }

      if (!authData.user) {
        toast.error('Erro ao criar usuário');
        return;
      }

      // 2. Create profile (will be handled by trigger, but we can also ensure it exists)
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert([{
          user_id: authData.user.id,
          name: formData.name,
          email: formData.email
        }]);

      if (profileError) {
        console.warn('Profile creation warning:', profileError);
      }

      // 3. Create user-transportadora relationship (if not super_admin and not cliente)
      if (formData.role !== 'super_admin' && formData.role !== 'cliente' && formData.transportadora_id) {
        const { error: relationError } = await supabase
          .from('user_transportadoras')
          .insert([{
            user_id: authData.user.id,
            transportadora_id: formData.transportadora_id,
            role: formData.role as 'admin_transportadora' | 'operador',
            is_active: true
          }]);

        if (relationError) {
          console.error('Error creating user-transportadora relation:', relationError);
          toast.error('Erro ao associar usuário à transportadora');
          return;
        }
      } else if (formData.role === 'super_admin') {
        // For super admin, associate with the first transportadora
        const firstTransportadora = transportadoras[0];
        if (firstTransportadora) {
          const { error: relationError } = await supabase
            .from('user_transportadoras')
            .insert([{
              user_id: authData.user.id,
              transportadora_id: firstTransportadora.id,
              role: 'super_admin',
              is_active: true
            }]);

          if (relationError) {
            console.warn('Warning creating super admin relation:', relationError);
          }
        }
      } else if (formData.role === 'cliente' && formData.transportadora_id) {
        // For clients, create entry in clientes table
        const { error: clienteError } = await supabase
          .from('clientes')
          .insert([{
            transportadora_id: formData.transportadora_id,
            razao_social: formData.name,
            cnpj: '', // Will be filled later
            email: formData.email,
            status: 'ativo'
          }]);

        if (clienteError) {
          console.error('Error creating cliente:', clienteError);
          toast.error('Erro ao criar cliente');
          return;
        }
      }

      toast.success('Usuário criado com sucesso!');
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'operador',
        transportadora_id: ''
      });

      onSuccess?.();

    } catch (error) {
      console.error('Error in handleSubmit:', error);
      toast.error('Erro inesperado ao criar usuário');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <UserPlus className="w-5 h-5" />
          <span>Cadastrar Novo Usuário</span>
        </CardTitle>
        <CardDescription>
          Crie uma nova conta de usuário para o sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="password">Senha *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                required
                minLength={6}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha *</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                required
                minLength={6}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="role">Perfil de Acesso *</Label>
              <Select 
                value={formData.role} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, role: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {userType === 'super_admin' && (
                    <SelectItem value="super_admin">Super Administrador</SelectItem>
                  )}
                  <SelectItem value="admin_transportadora">Administrador</SelectItem>
                  <SelectItem value="operador">Operador</SelectItem>
                  {userType === 'cliente' && (
                    <SelectItem value="cliente">Cliente</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {formData.role !== 'super_admin' && (
              <div className="space-y-2">
                <Label htmlFor="transportadora">Transportadora *</Label>
                <Select 
                  value={formData.transportadora_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, transportadora_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma transportadora" />
                  </SelectTrigger>
                  <SelectContent>
                    {transportadoras.map((transportadora) => (
                      <SelectItem key={transportadora.id} value={transportadora.id}>
                        <div className="flex items-center space-x-2">
                          <Building2 className="w-4 h-4" />
                          <span>{transportadora.razao_social}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="pt-4">
            <Button 
              type="submit" 
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Criando usuário...' : 'Criar Usuário'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}