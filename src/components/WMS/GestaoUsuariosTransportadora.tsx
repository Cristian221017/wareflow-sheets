import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { FormCadastroUsuarioTransportadora } from './FormCadastroUsuarioTransportadora';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { toast } from 'sonner';
import { 
  UserPlus, 
  Search, 
  Edit, 
  UserX, 
  UserCheck,
  RefreshCw,
  Users,
  Crown,
  Shield,
  User,
  Trash2
} from 'lucide-react';

interface UsuarioTransportadora {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'admin_transportadora' | 'operador';
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

export function GestaoUsuariosTransportadora() {
  const { user } = useAuth();
  const { canCreateUsers, canEditUsers, canDeleteUsers } = useUserPermissions();
  const [usuarios, setUsuarios] = useState<UsuarioTransportadora[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const loadUsuarios = async () => {
    try {
      setLoading(true);
      
      // Primeiro buscar os user_transportadoras
      const { data: userTransportadorasData, error: utError } = await supabase
        .from('user_transportadoras')
        .select('id, user_id, role, is_active, created_at')
        .eq('transportadora_id', user?.transportadoraId)
        .order('created_at', { ascending: false });

      if (utError) {
        console.error('Erro ao carregar user_transportadoras:', utError);
        toast.error('Erro ao carregar usuários');
        return;
      }

      if (!userTransportadorasData || userTransportadorasData.length === 0) {
        setUsuarios([]);
        return;
      }

      // Buscar os profiles dos usuários
      const userIds = userTransportadorasData.map(ut => ut.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, name, email')
        .in('user_id', userIds);

      if (profilesError) {
        console.error('Erro ao carregar profiles:', profilesError);
        toast.error('Erro ao carregar dados dos usuários');
        return;
      }

      // Combinar os dados - apenas usuários com profiles válidos
      const usuariosFormatados = userTransportadorasData
        .map(ut => {
          const profile = profilesData?.find(p => p.user_id === ut.user_id);
          if (!profile || !profile.name || !profile.email) {
            return null; // Pula usuários sem dados válidos
          }
          return {
            id: ut.id,
            user_id: ut.user_id,
            name: profile.name,
            email: profile.email,
            role: ut.role,
            is_active: ut.is_active,
            created_at: ut.created_at
          };
        })
        .filter(Boolean); // Remove entradas nulas

      setUsuarios(usuariosFormatados);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      toast.error('Erro inesperado ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('user_transportadoras')
        .update({ is_active: !currentStatus })
        .eq('user_id', userId)
        .eq('transportadora_id', user?.transportadoraId);

      if (error) {
        console.error('Erro ao alterar status:', error);
        toast.error('Erro ao alterar status do usuário');
        return;
      }

      toast.success(`Usuário ${!currentStatus ? 'ativado' : 'desativado'} com sucesso`);
      loadUsuarios();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast.error('Erro inesperado ao alterar status');
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    try {
      // Primeiro, deletar da tabela user_transportadoras
      const { error: utError } = await supabase
        .from('user_transportadoras')
        .delete()
        .eq('user_id', userId)
        .eq('transportadora_id', user?.transportadoraId);

      if (utError) {
        console.error('Erro ao remover vínculo:', utError);
        toast.error('Erro ao remover usuário');
        return;
      }

      // Verificar se há outros vínculos com transportadoras
      const { data: otherLinks } = await supabase
        .from('user_transportadoras')
        .select('id')
        .eq('user_id', userId);

      // Se não há outros vínculos, deletar o profile também
      if (!otherLinks || otherLinks.length === 0) {
        await supabase
          .from('profiles')
          .delete()
          .eq('user_id', userId);
      }

      toast.success(`Usuário "${userName}" removido com sucesso`);
      loadUsuarios();
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      toast.error('Erro inesperado ao excluir usuário');
    }
  };

  const handleEditUser = () => {
    // Funcionalidade de edição será implementada em breve
    toast.info('Funcionalidade de edição será implementada em breve');
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super_admin':
        return <Crown className="w-4 h-4 text-yellow-600" />;
      case 'admin_transportadora':
        return <Shield className="w-4 h-4 text-blue-600" />;
      case 'operador':
        return <User className="w-4 h-4 text-green-600" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'Super Admin';
      case 'admin_transportadora':
        return 'Admin Transportadora';
      case 'operador':
        return 'Operador';
      default:
        return role;
    }
  };

  const filteredUsuarios = usuarios.filter(usuario =>
    usuario.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    usuario.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    if (user?.transportadoraId) {
      loadUsuarios();
    }
  }, [user?.transportadoraId]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-primary" />
              <CardTitle>Gestão de Usuários da Transportadora</CardTitle>
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={loadUsuarios}
                variant="outline"
                size="sm"
                disabled={loading}
                className="gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              {canCreateUsers() && (
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <UserPlus className="w-4 h-4" />
                      Novo Usuário
                    </Button>
                  </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Cadastrar Novo Usuário</DialogTitle>
                  </DialogHeader>
                  <FormCadastroUsuarioTransportadora 
                    onSuccess={() => {
                      setIsDialogOpen(false);
                      loadUsuarios();
                    }} 
                  />
                </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Filtros */}
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Buscar por nome ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Estatísticas rápidas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{usuarios.length}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{usuarios.filter(u => u.is_active).length}</p>
                <p className="text-sm text-muted-foreground">Ativos</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-destructive">{usuarios.filter(u => !u.is_active).length}</p>
                <p className="text-sm text-muted-foreground">Inativos</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">{usuarios.filter(u => u.role === 'admin_transportadora').length}</p>
                <p className="text-sm text-muted-foreground">Admins</p>
              </div>
            </div>

            {/* Tabela de usuários */}
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                <p>Carregando usuários...</p>
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Cadastrado em</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsuarios.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          {searchTerm ? 'Nenhum usuário encontrado com os filtros aplicados' : 'Nenhum usuário cadastrado ainda'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsuarios.map((usuario) => (
                        <TableRow key={usuario.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{usuario.name}</p>
                              <p className="text-sm text-muted-foreground">{usuario.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {getRoleIcon(usuario.role)}
                              <span className="text-sm">{getRoleLabel(usuario.role)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={usuario.is_active ? "default" : "secondary"}>
                              {usuario.is_active ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(usuario.created_at).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              {/* Botão de Editar - com verificação de permissão */}
                              {usuario.user_id !== user?.id && canEditUsers() && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1"
                                  onClick={() => handleEditUser()}
                                >
                                  <Edit className="w-3 h-3" />
                                  Editar
                                </Button>
                              )}
                              
                              {/* Botão de Ativar/Desativar - com verificação de permissão */}
                              {usuario.user_id !== user?.id && canEditUsers() && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="gap-1"
                                    >
                                      {usuario.is_active ? (
                                        <>
                                          <UserX className="w-3 h-3" />
                                          Desativar
                                        </>
                                      ) : (
                                        <>
                                          <UserCheck className="w-3 h-3" />
                                          Ativar
                                        </>
                                      )}
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>
                                        {usuario.is_active ? 'Desativar' : 'Ativar'} usuário?
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        {usuario.is_active 
                                          ? `Tem certeza que deseja desativar o usuário "${usuario.name}"? Ele não poderá mais acessar o sistema.`
                                          : `Tem certeza que deseja ativar o usuário "${usuario.name}"? Ele poderá acessar o sistema novamente.`
                                        }
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleToggleStatus(usuario.user_id, usuario.is_active)}
                                      >
                                        {usuario.is_active ? 'Desativar' : 'Ativar'}
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}

                              {/* Botão de Excluir - com verificação de permissão */}
                              {usuario.user_id !== user?.id && usuario.role !== 'super_admin' && canDeleteUsers() && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="gap-1 text-destructive hover:text-destructive"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      Excluir
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Tem certeza que deseja excluir o usuário "{usuario.name}"? 
                                        Esta ação não pode ser desfeita e o usuário perderá completamente o acesso ao sistema.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction
                                        className="bg-destructive hover:bg-destructive/90"
                                        onClick={() => handleDeleteUser(usuario.user_id, usuario.name)}
                                      >
                                        Excluir
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}