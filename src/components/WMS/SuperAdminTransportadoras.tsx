import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Plus, 
  Building2, 
  Search,
  Edit,
  Eye,
  Trash2,
  Calendar
} from 'lucide-react';

interface Transportadora {
  id: string;
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  email: string;
  telefone: string;
  cidade: string;
  estado: string;
  status: 'ativo' | 'inativo' | 'suspenso';
  plano: 'basico' | 'premium' | 'enterprise';
  limite_usuarios: number;
  limite_clientes: number;
  created_at: string;
}

export function SuperAdminTransportadoras() {
  const [transportadoras, setTransportadoras] = useState<Transportadora[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransportadora, setEditingTransportadora] = useState<Transportadora | null>(null);
  const [formData, setFormData] = useState({
    razao_social: '',
    nome_fantasia: '',
    cnpj: '',
    email: '',
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

  useEffect(() => {
    loadTransportadoras();
  }, []);

  const loadTransportadoras = async () => {
    try {
      const { data, error } = await supabase
        .from('transportadoras')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading transportadoras:', error);
        toast.error('Erro ao carregar transportadoras');
        return;
      }

      setTransportadoras((data || []) as Transportadora[]);
    } catch (error) {
      console.error('Error in loadTransportadoras:', error);
      toast.error('Erro inesperado');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingTransportadora) {
        // Update
        const { error } = await supabase
          .from('transportadoras')
          .update(formData)
          .eq('id', editingTransportadora.id);

        if (error) {
          console.error('Error updating transportadora:', error);
          toast.error('Erro ao atualizar transportadora');
          return;
        }

        toast.success('Transportadora atualizada com sucesso!');
      } else {
        // Create
        const { error } = await supabase
          .from('transportadoras')
          .insert([formData]);

        if (error) {
          console.error('Error creating transportadora:', error);
          toast.error('Erro ao criar transportadora');
          return;
        }

        toast.success('Transportadora criada com sucesso!');
      }

      setIsModalOpen(false);
      setEditingTransportadora(null);
      resetForm();
      loadTransportadoras();
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      toast.error('Erro inesperado');
    }
  };

  const resetForm = () => {
    setFormData({
      razao_social: '',
      nome_fantasia: '',
      cnpj: '',
      email: '',
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
  };

  const handleEdit = (transportadora: Transportadora) => {
    setEditingTransportadora(transportadora);
    setFormData({
      razao_social: transportadora.razao_social,
      nome_fantasia: transportadora.nome_fantasia || '',
      cnpj: transportadora.cnpj,
      email: transportadora.email,
      telefone: transportadora.telefone || '',
      endereco: '',
      cidade: transportadora.cidade || '',
      estado: transportadora.estado || '',
      cep: '',
      status: transportadora.status,
      plano: transportadora.plano,
      limite_usuarios: transportadora.limite_usuarios,
      limite_clientes: transportadora.limite_clientes,
      data_contrato: ''
    });
    setIsModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      ativo: { variant: 'default' as const, className: 'bg-green-500' },
      inativo: { variant: 'secondary' as const, className: '' },
      suspenso: { variant: 'destructive' as const, className: '' }
    };
    
    const config = variants[status as keyof typeof variants] || variants.inativo;
    
    return (
      <Badge variant={config.variant} className={config.className}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getPlanoBadge = (plano: string) => {
    const variants = {
      basico: 'secondary',
      premium: 'default',
      enterprise: 'outline'
    };
    
    return (
      <Badge variant={variants[plano as keyof typeof variants] as any}>
        {plano.charAt(0).toUpperCase() + plano.slice(1)}
      </Badge>
    );
  };

  const filteredTransportadoras = transportadoras.filter(t =>
    t.razao_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.cnpj.includes(searchTerm) ||
    t.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Transportadoras</h2>
          <p className="text-muted-foreground">
            Gerencie as transportadoras do sistema
          </p>
        </div>
        
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingTransportadora(null); }}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Transportadora
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTransportadora ? 'Editar Transportadora' : 'Nova Transportadora'}
              </DialogTitle>
              <DialogDescription>
                {editingTransportadora 
                  ? 'Atualize as informações da transportadora'
                  : 'Cadastre uma nova transportadora no sistema'
                }
              </DialogDescription>
            </DialogHeader>
            
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
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingTransportadora ? 'Atualizar' : 'Criar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar por razão social, CNPJ ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building2 className="w-5 h-5" />
            <span>Transportadoras Cadastradas</span>
          </CardTitle>
          <CardDescription>
            {filteredTransportadoras.length} transportadora(s) encontrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-muted-foreground">Carregando transportadoras...</p>
            </div>
          ) : filteredTransportadoras.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma transportadora encontrada</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Razão Social</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Limites</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransportadoras.map((transportadora) => (
                  <TableRow key={transportadora.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{transportadora.razao_social}</p>
                        {transportadora.nome_fantasia && (
                          <p className="text-sm text-muted-foreground">{transportadora.nome_fantasia}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{transportadora.cnpj}</TableCell>
                    <TableCell>{transportadora.email}</TableCell>
                    <TableCell>{getStatusBadge(transportadora.status)}</TableCell>
                    <TableCell>{getPlanoBadge(transportadora.plano)}</TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <p>{transportadora.limite_usuarios} usuários</p>
                        <p>{transportadora.limite_clientes} clientes</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(transportadora.created_at).toLocaleDateString()}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEdit(transportadora)}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}