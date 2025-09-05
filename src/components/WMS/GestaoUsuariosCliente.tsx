import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { FormCadastroUsuarioCliente } from './FormCadastroUsuarioCliente';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  UserPlus, 
  Search, 
  RefreshCw,
  Users,
  User,
  Edit,
  Trash2,
  UserX
} from 'lucide-react';

interface UsuarioCliente {
  id: string;
  user_id: string;
  name: string;
  email: string;
  cpf?: string;
  setor?: string;
  created_at: string;
}

export function GestaoUsuariosCliente() {
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState<UsuarioCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const loadUsuarios = async () => {
    try {
      setLoading(true);
      
      // Buscar cliente pela correspondência de email com profiles
      const { data: clienteData, error: clienteError } = await supabase
        .from('clientes')
        .select('id, razao_social')
        .eq('email', user?.email)
        .eq('status', 'ativo')
        .single();

      if (clienteError || !clienteData) {
        console.error('Erro ao buscar cliente:', clienteError);
        toast.error('Cliente não encontrado ou email não corresponde');
        return;
      }

      // Buscar todos os profiles básicos - simplificado para mostrar apenas usuários relacionados
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, name, email, created_at')
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('Erro ao carregar profiles:', profilesError);
        toast.error('Erro ao carregar usuários');
        return;
      }

      // Filtrar apenas profiles com dados válidos do usuário atual
      const usuariosFormatados = profilesData?.filter(profile => 
        profile.email === user?.email && 
        profile.name && 
        profile.email
      ).map(profile => ({
        id: profile.user_id,
        user_id: profile.user_id,
        name: profile.name,
        email: profile.email,
        cpf: '',
        setor: '',
        created_at: profile.created_at
      })) || [];

      setUsuarios(usuariosFormatados);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      toast.error('Erro inesperado ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    try {
      // Para clientes, apenas deletar o profile (já que não há relação específica)
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('Erro ao remover usuário:', error);
        toast.error('Erro ao remover usuário');
        return;
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

  const filteredUsuarios = usuarios.filter(usuario =>
    usuario.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    usuario.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (usuario.setor && usuario.setor.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  useEffect(() => {
    if (user?.id) {
      loadUsuarios();
    }
  }, [user?.id]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-primary" />
              <CardTitle>Gestão de Usuários do Cliente</CardTitle>
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
                  <FormCadastroUsuarioCliente 
                    onSuccess={() => {
                      setIsDialogOpen(false);
                      loadUsuarios();
                    }} 
                  />
                </DialogContent>
              </Dialog>
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
                  placeholder="Buscar por nome, email ou setor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Estatísticas rápidas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{usuarios.length}</p>
                <p className="text-sm text-muted-foreground">Total de Usuários</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {new Set(usuarios.map(u => u.setor).filter(Boolean)).size}
                </p>
                <p className="text-sm text-muted-foreground">Setores Diferentes</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {usuarios.filter(u => u.user_id !== user?.id).length}
                </p>
                <p className="text-sm text-muted-foreground">Outros Usuários</p>
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
                      <TableHead>CPF</TableHead>
                      <TableHead>Setor</TableHead>
                      <TableHead>Cadastrado em</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                        {filteredUsuarios.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                              {searchTerm ? 'Nenhum usuário encontrado com os filtros aplicados' : 'Nenhum usuário cadastrado ainda'}
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredUsuarios.map((usuario) => (
                            <TableRow key={usuario.id}>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <User className="w-4 h-4 text-muted-foreground" />
                                  <div>
                                    <p className="font-medium">{usuario.name}</p>
                                    <p className="text-sm text-muted-foreground">{usuario.email}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm font-mono">
                                  {usuario.cpf || '-'}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm">
                                  {usuario.setor || '-'}
                                </span>
                              </TableCell>
                              <TableCell>
                                {new Date(usuario.created_at).toLocaleDateString('pt-BR')}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <Badge variant={usuario.user_id === user?.id ? "default" : "secondary"}>
                                    {usuario.user_id === user?.id ? 'Você' : 'Ativo'}
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end space-x-2">
                                  {/* Botão de Editar - apenas para outros usuários */}
                                  {usuario.user_id !== user?.id && (
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
                                  
                                  {/* Botão de Excluir - apenas para outros usuários */}
                                  {usuario.user_id !== user?.id && (
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