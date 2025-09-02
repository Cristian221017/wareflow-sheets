import { useState, useEffect } from 'react';
import { log, error as logError } from '@/utils/logger';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { AlterarSenhaDialog } from './AlterarSenhaDialog';
import { toast } from 'sonner';
import { 
  Users, 
  Search,
  UserCheck,
  UserX,
  Calendar,
  Building2,
  KeyRound,
  Edit,
  Trash2,
  UserPlus,
  Shield
} from 'lucide-react';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  created_at: string;
  role: 'super_admin' | 'admin_transportadora' | 'operador';
  is_active: boolean;
  transportadora_id?: string;
  transportadora_nome?: string;
}

interface Transportadora {
  id: string;
  razao_social: string;
}

export function AdminScopedUserManagement() {
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [transportadoras, setTransportadoras] = useState<Transportadora[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    email: string; 
    transportadora_id: string;
    role: 'super_admin' | 'admin_transportadora' | 'operador';
  }>({
    name: '',
    email: '',
    transportadora_id: '',
    role: 'operador'
  });
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [passwordChangeUser, setPasswordChangeUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Carregar apenas usuários administrativos (que têm role em user_transportadoras)
      const { data: adminUsersData, error: adminError } = await supabase
        .from('user_transportadoras')
        .select(`
          user_id,
          role,
          is_active,
          transportadora_id,
          profiles!inner(
            name,
            email,
            created_at
          ),
          transportadoras(
            razao_social
          )
        `)
        .order('created_at', { ascending: false });

      if (adminError) {
        logError('Erro ao carregar usuários administrativos:', adminError);
        toast.error('Erro ao carregar usuários administrativos');
        return;
      }

      const formattedAdminUsers: AdminUser[] = (adminUsersData || []).map((item: any) => ({
        id: item.user_id,
        name: item.profiles.name,
        email: item.profiles.email,
        created_at: item.profiles.created_at,
        role: item.role,
        is_active: item.is_active,
        transportadora_id: item.transportadora_id,
        transportadora_nome: item.transportadoras?.razao_social
      }));
      
      setAdminUsers(formattedAdminUsers);

      // Carregar transportadoras
      const { data: transportadorasData, error: transpError } = await supabase
        .from('transportadoras')
        .select('id, razao_social')
        .eq('status', 'ativo')
        .order('razao_social');

      if (transpError) {
        logError('Erro ao carregar transportadoras:', transpError);
        toast.error('Erro ao carregar transportadoras');
      } else {
        setTransportadoras(transportadorasData || []);
      }
    } catch (error) {
      logError('Erro em loadData:', error);
      toast.error('Erro inesperado');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!formData.name || !formData.email || !formData.transportadora_id) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      // Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: Math.random().toString(36).slice(-8), // Senha temporária
        options: {
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (authError) {
        logError('Erro ao criar usuário:', authError);
        toast.error('Erro ao criar usuário: ' + authError.message);
        return;
      }

      const userId = authData.user?.id;
      if (!userId) {
        toast.error('Erro ao obter ID do usuário criado');
        return;
      }

      // Criar perfil
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{
          user_id: userId,
          name: formData.name,
          email: formData.email
        }]);

      if (profileError) {
        logError('Erro ao criar perfil:', profileError);
        toast.error('Erro ao criar perfil do usuário');
        return;
      }

      // Criar vínculo com transportadora
      const { error: assignmentError } = await supabase
        .from('user_transportadoras')
        .insert([{
          user_id: userId,
          transportadora_id: formData.transportadora_id,
          role: formData.role,
          is_active: true
        }]);

      if (assignmentError) {
        logError('Erro ao criar vínculo:', assignmentError);
        toast.error('Erro ao vincular usuário à transportadora');
        return;
      }

      toast.success('Usuário administrativo criado com sucesso!');
      setIsCreateModalOpen(false);
      setFormData({ name: '', email: '', transportadora_id: '', role: 'operador' });
      loadData();
    } catch (error) {
      logError('Erro em handleCreateUser:', error);
      toast.error('Erro inesperado');
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser || !formData.transportadora_id) {
      toast.error('Dados incompletos para atualização');
      return;
    }

    try {
      // Atualizar perfil
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          name: formData.name,
          email: formData.email
        })
        .eq('user_id', selectedUser.id);

      if (profileError) {
        logError('Erro ao atualizar perfil:', profileError);
        toast.error('Erro ao atualizar perfil');
        return;
      }

      // Atualizar vínculo com transportadora
      const { error: assignmentError } = await supabase
        .from('user_transportadoras')
        .update({
          transportadora_id: formData.transportadora_id,
          role: formData.role
        })
        .eq('user_id', selectedUser.id);

      if (assignmentError) {
        logError('Erro ao atualizar vínculo:', assignmentError);
        toast.error('Erro ao atualizar vínculo com transportadora');
        return;
      }

      toast.success('Usuário atualizado com sucesso!');
      setIsEditModalOpen(false);
      setSelectedUser(null);
      setFormData({ name: '', email: '', transportadora_id: '', role: 'operador' });
      loadData();
    } catch (error) {
      logError('Erro em handleUpdateUser:', error);
      toast.error('Erro inesperado');
    }
  };

  const handleToggleUserStatus = async (user: AdminUser) => {
    try {
      const { error } = await supabase
        .from('user_transportadoras')
        .update({ is_active: !user.is_active })
        .eq('user_id', user.id);

      if (error) {
        logError('Erro ao alterar status:', error);
        toast.error('Erro ao alterar status do usuário');
        return;
      }

      toast.success(`Usuário ${!user.is_active ? 'ativado' : 'desativado'} com sucesso!`);
      loadData();
    } catch (error) {
      logError('Erro em handleToggleUserStatus:', error);
      toast.error('Erro inesperado');
    }
  };

  const handleDeleteUser = async (user: AdminUser) => {
    if (user.role === 'super_admin') {
      toast.error('Não é possível excluir usuários Super Admin');
      return;
    }

    if (window.confirm(`Tem certeza que deseja excluir o usuário "${user.name}"?`)) {
      try {
        // Remove vínculo com transportadora
        const { error: assignmentError } = await supabase
          .from('user_transportadoras')
          .delete()
          .eq('user_id', user.id);

        if (assignmentError) {
          logError('Erro ao remover vínculo:', assignmentError);
          toast.error('Erro ao remover vínculo do usuário');
          return;
        }

        // Remove perfil
        const { error: profileError } = await supabase
          .from('profiles')
          .delete()
          .eq('user_id', user.id);

        if (profileError) {
          logError('Erro ao remover perfil:', profileError);
          toast.error('Erro ao remover perfil do usuário');
          return;
        }

        toast.success('Usuário excluído com sucesso');
        loadData();
      } catch (error) {
        logError('Erro ao excluir usuário:', error);
        toast.error('Erro ao excluir usuário');
      }
    }
  };

  const getRoleBadge = (role: string) => {
    const variants = {
      super_admin: { variant: 'destructive' as const, label: 'Super Admin', icon: Shield },
      admin_transportadora: { variant: 'default' as const, label: 'Admin Transportadora', icon: Building2 },
      operador: { variant: 'secondary' as const, label: 'Operador', icon: Users }
    };
    
    const config = variants[role as keyof typeof variants] || variants.operador;
    const IconComponent = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <IconComponent className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const getStatusBadge = (isActive: boolean) => {
    return (
      <Badge variant={isActive ? 'default' : 'secondary'} className={isActive ? 'bg-green-500' : ''}>
        {isActive ? 'Ativo' : 'Inativo'}
      </Badge>
    );
  };

  const filteredUsers = adminUsers.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.transportadora_nome?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6" />
            Usuários Administrativos
          </h2>
          <p className="text-muted-foreground">
            Gerencie usuários com acesso ao painel administrativo
          </p>
        </div>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="w-4 h-4 mr-2" />
              Novo Usuário Admin
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Usuário Administrativo</DialogTitle>
              <DialogDescription>
                Crie um novo usuário com acesso ao painel administrativo
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nome do usuário"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="email@exemplo.com"
                />
              </div>

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
                        {transportadora.razao_social}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Perfil *</Label>
                <Select 
                  value={formData.role} 
                  onValueChange={(value: 'super_admin' | 'admin_transportadora' | 'operador') => 
                    setFormData(prev => ({ ...prev, role: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operador">Operador</SelectItem>
                    <SelectItem value="admin_transportadora">Admin Transportadora</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateUser}>
                Criar Usuário
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar por nome, email ou transportadora..."
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
            <Users className="w-5 h-5" />
            <span>Usuários Administrativos</span>
          </CardTitle>
          <CardDescription>
            {filteredUsers.length} usuário(s) administrativo(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-muted-foreground">Carregando usuários...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum usuário administrativo encontrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Transportadora</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{user.transportadora_nome}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getRoleBadge(user.role)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(user.is_active)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(user.created_at).toLocaleDateString()}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setPasswordChangeUser(user);
                            setIsPasswordDialogOpen(true);
                          }}
                          title="Alterar senha"
                        >
                          <KeyRound className="w-3 h-3" />
                        </Button>
                        
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleToggleUserStatus(user)}
                          title="Ativar/Desativar usuário"
                        >
                          {user.is_active ? (
                            <UserX className="w-3 h-3" />
                          ) : (
                            <UserCheck className="w-3 h-3" />
                          )}
                        </Button>
                        
                        <Dialog 
                          open={isEditModalOpen && selectedUser?.id === user.id} 
                          onOpenChange={(open) => {
                            setIsEditModalOpen(open);
                            if (!open) setSelectedUser(null);
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user);
                                setFormData({
                                  name: user.name,
                                  email: user.email,
                                  transportadora_id: user.transportadora_id || '',
                                  role: user.role
                                });
                              }}
                              title="Editar usuário"
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Editar Usuário Administrativo</DialogTitle>
                              <DialogDescription>
                                Atualize as informações do usuário administrativo
                              </DialogDescription>
                            </DialogHeader>
                            
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label htmlFor="edit-name">Nome *</Label>
                                <Input
                                  id="edit-name"
                                  value={formData.name}
                                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                  placeholder="Nome do usuário"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="edit-email">Email *</Label>
                                <Input
                                  id="edit-email"
                                  type="email"
                                  value={formData.email}
                                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                  placeholder="email@exemplo.com"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="edit-transportadora">Transportadora *</Label>
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
                                        {transportadora.razao_social}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="edit-role">Perfil *</Label>
                                <Select 
                                  value={formData.role} 
                                  onValueChange={(value: 'super_admin' | 'admin_transportadora' | 'operador') => 
                                    setFormData(prev => ({ ...prev, role: value }))}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="operador">Operador</SelectItem>
                                    <SelectItem value="admin_transportadora">Admin Transportadora</SelectItem>
                                    <SelectItem value="super_admin">Super Admin</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <DialogFooter>
                              <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                                Cancelar
                              </Button>
                              <Button onClick={handleUpdateUser}>
                                Atualizar
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        
                        {user.role !== 'super_admin' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteUser(user)}
                            className="text-destructive hover:text-destructive"
                            title="Excluir usuário"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      {isPasswordDialogOpen && passwordChangeUser && (
        <AlterarSenhaDialog
          isOpen={isPasswordDialogOpen}
          onClose={() => setIsPasswordDialogOpen(false)}
          userEmail={passwordChangeUser.email}
          userName={passwordChangeUser.name}
        />
      )}
    </div>
  );
}