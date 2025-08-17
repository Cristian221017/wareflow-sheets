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
  Users, 
  Search,
  UserCheck,
  UserX,
  Calendar,
  Building2
} from 'lucide-react';

interface Usuario {
  id: string;
  name: string;
  email: string;
  created_at: string;
  user_transportadoras?: {
    role: string;
    is_active: boolean;
    transportadora_id: string;
    transportadoras: {
      razao_social: string;
    };
  }[];
}

interface Transportadora {
  id: string;
  razao_social: string;
}

export function SuperAdminUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [transportadoras, setTransportadoras] = useState<Transportadora[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Usuario | null>(null);
  const [assignmentData, setAssignmentData] = useState({
    transportadora_id: '',
    role: 'operador' as const
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          *,
          user_transportadoras(
            role,
            is_active,
            transportadora_id,
            transportadoras(razao_social)
          )
        `)
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('Error loading profiles:', profilesError);
        toast.error('Erro ao carregar usuários');
      } else {
        setUsuarios(profiles || []);
      }

      // Load transportadoras
      const { data: transportadorasData, error: transpError } = await supabase
        .from('transportadoras')
        .select('id, razao_social')
        .eq('status', 'ativo')
        .order('razao_social');

      if (transpError) {
        console.error('Error loading transportadoras:', transpError);
        toast.error('Erro ao carregar transportadoras');
      } else {
        setTransportadoras(transportadorasData || []);
      }
    } catch (error) {
      console.error('Error in loadData:', error);
      toast.error('Erro inesperado');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignUser = async () => {
    if (!selectedUser || !assignmentData.transportadora_id) {
      toast.error('Selecione uma transportadora');
      return;
    }

    try {
      // Check if user already has assignment
      const existingAssignment = selectedUser.user_transportadoras?.find(
        ut => ut.transportadora_id === assignmentData.transportadora_id
      );

      if (existingAssignment) {
        // Update existing assignment
        const { error } = await supabase
          .from('user_transportadoras')
          .update({
            role: assignmentData.role,
            is_active: true
          })
          .eq('user_id', selectedUser.id)
          .eq('transportadora_id', assignmentData.transportadora_id);

        if (error) {
          console.error('Error updating assignment:', error);
          toast.error('Erro ao atualizar atribuição');
          return;
        }
      } else {
        // Create new assignment
        const { error } = await supabase
          .from('user_transportadoras')
          .insert([{
            user_id: selectedUser.id,
            transportadora_id: assignmentData.transportadora_id,
            role: assignmentData.role,
            is_active: true
          }]);

        if (error) {
          console.error('Error creating assignment:', error);
          toast.error('Erro ao criar atribuição');
          return;
        }
      }

      toast.success('Usuário atribuído com sucesso!');
      setIsModalOpen(false);
      setSelectedUser(null);
      setAssignmentData({ transportadora_id: '', role: 'operador' });
      loadData();
    } catch (error) {
      console.error('Error in handleAssignUser:', error);
      toast.error('Erro inesperado');
    }
  };

  const handleToggleUserStatus = async (usuario: Usuario, transportadoraId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('user_transportadoras')
        .update({ is_active: !currentStatus })
        .eq('user_id', usuario.id)
        .eq('transportadora_id', transportadoraId);

      if (error) {
        console.error('Error toggling user status:', error);
        toast.error('Erro ao alterar status do usuário');
        return;
      }

      toast.success(`Usuário ${!currentStatus ? 'ativado' : 'desativado'} com sucesso!`);
      loadData();
    } catch (error) {
      console.error('Error in handleToggleUserStatus:', error);
      toast.error('Erro inesperado');
    }
  };

  const getRoleBadge = (role: string) => {
    const variants = {
      super_admin: { variant: 'destructive' as const, label: 'Super Admin' },
      admin_transportadora: { variant: 'default' as const, label: 'Admin' },
      operador: { variant: 'secondary' as const, label: 'Operador' },
      cliente: { variant: 'outline' as const, label: 'Cliente' }
    };
    
    const config = variants[role as keyof typeof variants] || variants.operador;
    
    return (
      <Badge variant={config.variant}>
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

  const filteredUsuarios = usuarios.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Usuários</h2>
          <p className="text-muted-foreground">
            Gerencie os usuários e suas atribuições
          </p>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar por nome ou email..."
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
            <span>Usuários Cadastrados</span>
          </CardTitle>
          <CardDescription>
            {filteredUsuarios.length} usuário(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-muted-foreground">Carregando usuários...</p>
            </div>
          ) : filteredUsuarios.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum usuário encontrado</p>
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
                {filteredUsuarios.map((usuario) => {
                  const assignment = usuario.user_transportadoras?.[0];
                  
                  return (
                    <TableRow key={usuario.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{usuario.name}</p>
                          <p className="text-sm text-muted-foreground">{usuario.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {assignment ? (
                          <div className="flex items-center space-x-2">
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{assignment.transportadoras.razao_social}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Não atribuído</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {assignment ? getRoleBadge(assignment.role) : (
                          <Badge variant="outline">Sem perfil</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {assignment ? getStatusBadge(assignment.is_active) : (
                          <Badge variant="secondary">Pendente</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(usuario.created_at).toLocaleDateString()}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          {assignment ? (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleToggleUserStatus(
                                usuario, 
                                assignment.transportadora_id, 
                                assignment.is_active
                              )}
                            >
                              {assignment.is_active ? (
                                <UserX className="w-3 h-3" />
                              ) : (
                                <UserCheck className="w-3 h-3" />
                              )}
                            </Button>
                          ) : null}
                          
                          <Dialog 
                            open={isModalOpen && selectedUser?.id === usuario.id} 
                            onOpenChange={(open) => {
                              setIsModalOpen(open);
                              if (!open) setSelectedUser(null);
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setSelectedUser(usuario);
                                  setAssignmentData({
                                    transportadora_id: assignment?.transportadora_id || '',
                                    role: (assignment?.role as any) || 'operador'
                                  });
                                }}
                              >
                                {assignment ? 'Editar' : 'Atribuir'}
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>
                                  {assignment ? 'Editar Atribuição' : 'Atribuir Usuário'}
                                </DialogTitle>
                                <DialogDescription>
                                  {assignment 
                                    ? 'Atualize a atribuição do usuário'
                                    : 'Atribua o usuário a uma transportadora'
                                  }
                                </DialogDescription>
                              </DialogHeader>
                              
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label>Usuário</Label>
                                  <div className="p-3 bg-muted rounded-md">
                                    <p className="font-medium">{usuario.name}</p>
                                    <p className="text-sm text-muted-foreground">{usuario.email}</p>
                                  </div>
                                </div>
                                
                                <div className="space-y-2">
                                  <Label htmlFor="transportadora">Transportadora</Label>
                                  <Select 
                                    value={assignmentData.transportadora_id}
                                    onValueChange={(value) => setAssignmentData(prev => ({ ...prev, transportadora_id: value }))}
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
                                  <Label htmlFor="role">Perfil</Label>
                                  <Select 
                                    value={assignmentData.role}
                                    onValueChange={(value) => setAssignmentData(prev => ({ ...prev, role: value as any }))}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="super_admin">Super Admin</SelectItem>
                                      <SelectItem value="admin_transportadora">Admin Transportadora</SelectItem>
                                      <SelectItem value="operador">Operador</SelectItem>
                                      <SelectItem value="cliente">Cliente</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              
                              <DialogFooter>
                                <Button 
                                  variant="outline" 
                                  onClick={() => {
                                    setIsModalOpen(false);
                                    setSelectedUser(null);
                                  }}
                                >
                                  Cancelar
                                </Button>
                                <Button onClick={handleAssignUser}>
                                  {assignment ? 'Atualizar' : 'Atribuir'}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}