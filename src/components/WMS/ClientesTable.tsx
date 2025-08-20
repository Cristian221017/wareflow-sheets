import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { FormCadastroCliente } from './FormCadastroCliente';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Edit, 
  UserX, 
  UserCheck, 
  Plus, 
  Users 
} from 'lucide-react';

interface Cliente {
  id: string;
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  email: string;
  telefone?: string;
  status: string;
  created_at: string;
  email_nota_fiscal?: string;
  email_solicitacao_liberacao?: string;
  email_liberacao_autorizada?: string;
  email_notificacao_boleto?: string;
}

export function ClientesTable() {
  const { user } = useAuth();
  const { toast: showToast } = useToast();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);

  const loadClientes = async () => {
    if (!user?.transportadoraId) return;

    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('transportadora_id', user.transportadoraId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      showToast({
        title: 'Erro',
        description: 'Não foi possível carregar os clientes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleClienteStatus = async (clienteId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ativo' ? 'inativo' : 'ativo';
    
    try {
      const { error } = await supabase
        .from('clientes')
        .update({ status: newStatus })
        .eq('id', clienteId);

      if (error) throw error;

      await loadClientes();
      showToast({
        title: 'Sucesso',
        description: `Cliente ${newStatus === 'ativo' ? 'ativado' : 'inativado'} com sucesso`,
        variant: 'default',
      });
    } catch (error) {
      console.error('Erro ao alterar status do cliente:', error);
      showToast({
        title: 'Erro',
        description: 'Não foi possível alterar o status do cliente',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    loadClientes();
  }, [user?.transportadoraId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Carregando clientes...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Gestão de Clientes
            </CardTitle>
            <CardDescription>
              Gerencie os clientes cadastrados na sua transportadora
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-info text-info-foreground hover:bg-info/80">
                <Plus className="w-4 h-4 mr-2" />
                Novo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
              <FormCadastroCliente />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Razão Social</TableHead>
                <TableHead>Nome Fantasia</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data Cadastro</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                    Nenhum cliente cadastrado
                  </TableCell>
                </TableRow>
              ) : (
                clientes.map((cliente) => (
                  <TableRow key={cliente.id}>
                    <TableCell className="font-medium">{cliente.razao_social}</TableCell>
                    <TableCell>{cliente.nome_fantasia || '-'}</TableCell>
                    <TableCell>{cliente.cnpj}</TableCell>
                    <TableCell>{cliente.email}</TableCell>
                    <TableCell>{cliente.telefone || '-'}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={cliente.status === 'ativo' ? 'default' : 'secondary'}
                        className={cliente.status === 'ativo' 
                          ? 'bg-success text-success-foreground' 
                          : 'bg-muted text-muted-foreground'
                        }
                      >
                        {cliente.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(cliente.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingCliente(cliente)}
                              title="Editar cliente"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                            <FormCadastroCliente 
                              clienteToEdit={{
                                id: cliente.id,
                                name: cliente.razao_social,
                                email: cliente.email,
                                cnpj: cliente.cnpj,
                                emailNotaFiscal: cliente.email_nota_fiscal || '',
                                emailSolicitacaoLiberacao: cliente.email_solicitacao_liberacao || '',
                                emailLiberacaoAutorizada: cliente.email_liberacao_autorizada || '',
                                emailNotificacaoBoleto: cliente.email_notificacao_boleto || '',
                              }}
                              onSuccess={() => {
                                loadClientes();
                                setEditingCliente(null);
                              }}
                            />
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleClienteStatus(cliente.id, cliente.status)}
                          title={cliente.status === 'ativo' ? 'Inativar cliente' : 'Ativar cliente'}
                        >
                          {cliente.status === 'ativo' ? (
                            <UserX className="w-4 h-4" />
                          ) : (
                            <UserCheck className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}