import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { log, warn, error as logError } from '@/utils/logger';
import { toast } from 'sonner';
import { UserPlus } from 'lucide-react';

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
    cpf: '',
    password: '',
    confirmPassword: '',
    setor: ''
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
        logError('Error loading transportadoras:', error);
        return;
      }

      setTransportadoras(data || []);
    } catch (error) {
      logError('Error in loadTransportadoras:', error);
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

    if (!formData.cpf) {
      toast.error('CPF é obrigatório');
      return;
    }

    if (!formData.setor) {
      toast.error('Setor é obrigatório');
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
            name: formData.name,
            cpf: formData.cpf,
            setor: formData.setor
          }
        }
      });

      if (authError) {
        logError('Error creating auth user:', authError);
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
          email: formData.email,
          cpf: formData.cpf,
          setor: formData.setor
        }]);

      if (profileError) {
        warn('Profile creation warning:', profileError);
      }

      // 3. Create user-transportadora relationship with default operador role
      if (userType !== 'cliente') {
        // For transportadora users, use first available transportadora
        const firstTransportadora = transportadoras[0];
        if (firstTransportadora) {
          const { error: relationError } = await supabase
            .from('user_transportadoras')
            .insert([{
              user_id: authData.user.id,
              transportadora_id: firstTransportadora.id,
              role: userType === 'super_admin' ? 'super_admin' : 'operador',
              is_active: true
            }]);

          if (relationError) {
            warn('Warning creating user relation:', relationError);
          }
        }
      } else {
        // For clients, create basic entry in clientes table
        const firstTransportadora = transportadoras[0];
        if (firstTransportadora) {
          const { error: clienteError } = await supabase
            .from('clientes')
            .insert([{
              transportadora_id: firstTransportadora.id,
              razao_social: formData.name,
              cnpj: formData.cpf, // Use CPF as identifier
              email: formData.email,
              status: 'ativo'
            }]);

          if (clienteError) {
            warn('Warning creating cliente:', clienteError);
          }
        }
      }

      toast.success('Usuário criado com sucesso!');
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        cpf: '',
        password: '',
        confirmPassword: '',
        setor: ''
      });

      onSuccess?.();

    } catch (error) {
      logError('Error in handleSubmit:', error);
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
          Crie uma nova conta de usuário para operar o sistema
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
                placeholder="Nome completo do usuário"
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
                placeholder="email@exemplo.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cpf">CPF *</Label>
              <Input
                id="cpf"
                value={formData.cpf}
                onChange={(e) => setFormData(prev => ({ ...prev, cpf: e.target.value }))}
                required
                placeholder="000.000.000-00"
                maxLength={14}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="setor">Setor *</Label>
              <Input
                id="setor"
                value={formData.setor}
                onChange={(e) => setFormData(prev => ({ ...prev, setor: e.target.value }))}
                required
                placeholder="Ex: Logística, Comercial, Financeiro"
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
                placeholder="Mínimo 6 caracteres"
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
                placeholder="Confirme a senha"
              />
            </div>
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