import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { log, warn, error as logError } from '@/utils/logger';
import { toast } from 'sonner';
import { Building2 } from 'lucide-react';

export function FormCadastroTransportadora() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    razao_social: '',
    nome_fantasia: '',
    cnpj: '',
    email: '',
    senha_admin: '',
    telefone: '',
    endereco: '',
    cidade: '',
    estado: '',
    cep: '',
    status: 'ativo' as 'ativo' | 'inativo' | 'suspenso',
    plano: 'basico' as 'basico' | 'premium' | 'enterprise',
    limite_usuarios: 5,
    limite_clientes: 50,
    data_contrato: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. First create the transportadora
      const { data: transportadoraData, error: transportadoraError } = await supabase
        .from('transportadoras')
        .insert([{
          razao_social: formData.razao_social,
          nome_fantasia: formData.nome_fantasia,
          cnpj: formData.cnpj,
          email: formData.email,
          telefone: formData.telefone,
          endereco: formData.endereco,
          cidade: formData.cidade,
          estado: formData.estado,
          cep: formData.cep,
          status: formData.status,
          plano: formData.plano,
          limite_usuarios: formData.limite_usuarios,
          limite_clientes: formData.limite_clientes,
          data_contrato: formData.data_contrato || null
        }])
        .select()
        .single();

      if (transportadoraError) {
        logError('Error creating transportadora:', transportadoraError);
        toast.error('Erro ao criar transportadora: ' + transportadoraError.message);
        return;
      }

      // 2. Create admin user - the trigger will handle the association automatically
      const { data: userData, error: userError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.senha_admin,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            name: `Admin - ${formData.razao_social}`,
            role: 'admin_transportadora'
          }
        }
      });

      if (userError) {
        logError('Error creating admin user:', userError);
        toast.error('Transportadora criada, mas erro ao criar usuário admin: ' + userError.message);
        return;
      }

      toast.success('Transportadora e usuário admin criados com sucesso!');
      
      // Reset form
      setFormData({
        razao_social: '',
        nome_fantasia: '',
        cnpj: '',
        email: '',
        senha_admin: '',
        telefone: '',
        endereco: '',
        cidade: '',
        estado: '',
        cep: '',
        status: 'ativo',
        plano: 'basico',
        limite_usuarios: 5,
        limite_clientes: 50,
        data_contrato: ''
      });

    } catch (error) {
      logError('Error in handleSubmit:', error);
      toast.error('Erro inesperado ao criar transportadora');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Building2 className="w-5 h-5" />
          <span>Cadastrar Nova Transportadora</span>
        </CardTitle>
        <CardDescription>
          Adicione uma nova transportadora ao sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="razao_social">Razão Social *</Label>
              <Input
                id="razao_social"
                value={formData.razao_social}
                onChange={(e) => setFormData(prev => ({ ...prev, razao_social: e.target.value }))}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="nome_fantasia">Nome Fantasia</Label>
              <Input
                id="nome_fantasia"
                value={formData.nome_fantasia}
                onChange={(e) => setFormData(prev => ({ ...prev, nome_fantasia: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ *</Label>
              <Input
                id="cnpj"
                value={formData.cnpj}
                onChange={(e) => setFormData(prev => ({ ...prev, cnpj: e.target.value }))}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email (Admin) *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="senha_admin">Senha do Admin *</Label>
            <Input
              id="senha_admin"
              type="password"
              value={formData.senha_admin}
              onChange={(e) => setFormData(prev => ({ ...prev, senha_admin: e.target.value }))}
              required
              minLength={6}
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={formData.telefone}
                onChange={(e) => setFormData(prev => ({ ...prev, telefone: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cidade">Cidade</Label>
              <Input
                id="cidade"
                value={formData.cidade}
                onChange={(e) => setFormData(prev => ({ ...prev, cidade: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="estado">Estado</Label>
              <Input
                id="estado"
                value={formData.estado}
                onChange={(e) => setFormData(prev => ({ ...prev, estado: e.target.value }))}
                maxLength={2}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cep">CEP</Label>
              <Input
                id="cep"
                value={formData.cep}
                onChange={(e) => setFormData(prev => ({ ...prev, cep: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="endereco">Endereço</Label>
            <Input
              id="endereco"
              value={formData.endereco}
              onChange={(e) => setFormData(prev => ({ ...prev, endereco: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                  <SelectItem value="suspenso">Suspenso</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="plano">Plano</Label>
              <Select 
                value={formData.plano} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, plano: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basico">Básico</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="limite_usuarios">Limite Usuários</Label>
              <Input
                id="limite_usuarios"
                type="number"
                min="1"
                value={formData.limite_usuarios}
                onChange={(e) => setFormData(prev => ({ ...prev, limite_usuarios: parseInt(e.target.value) || 5 }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="limite_clientes">Limite Clientes</Label>
              <Input
                id="limite_clientes"
                type="number"
                min="1"
                value={formData.limite_clientes}
                onChange={(e) => setFormData(prev => ({ ...prev, limite_clientes: parseInt(e.target.value) || 50 }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="data_contrato">Data do Contrato</Label>
              <Input
                id="data_contrato"
                type="date"
                value={formData.data_contrato}
                onChange={(e) => setFormData(prev => ({ ...prev, data_contrato: e.target.value }))}
              />
            </div>
          </div>

          <div className="pt-4">
            <Button 
              type="submit" 
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Criando transportadora...' : 'Criar Transportadora'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}