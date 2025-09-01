import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNotifications } from '@/hooks/useNotifications';
import { useLastVisit } from '@/hooks/useLastVisit';
import { NotificationBadge } from '@/components/ui/notification-badge';
import { TransportadoraStatusSeparacao } from './TransportadoraStatusSeparacao';
import { Dashboard } from './Dashboard';
import { FormNotaFiscal } from './FormNotaFiscal';
import { FormPedidoLiberacao } from './FormPedidoLiberacao';
import { FormCadastroCliente } from './FormCadastroCliente';
import { FormCadastroUsuario } from './FormCadastroUsuario';
import { ImpressaoPedidosLiberados } from './ImpressaoPedidosLiberados';
import { RelatorioControleCargas } from './RelatorioControleCargas';
import { ClientesTable } from './ClientesTable';
import { FinanceiroTransportadora } from './FinanceiroTransportadora';
import { FormDocumentoFinanceiro } from './FormDocumentoFinanceiro';
import IntegrationConfig from './IntegrationConfig';

import { SolicitacoesPendentesTable } from './SolicitacoesPendentesTable';
import { PedidosConfirmadosTransportadora } from './PedidosConfirmadosTransportadora';

import { 
  Plus,
  Warehouse,
  LogOut,
  User,
  Menu,
  Receipt,
  UserPlus
} from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';

export function TransportadoraLayout() {
  const { user, logout } = useAuth();
  const notifications = useNotifications();
  const { markAsVisited } = useLastVisit();
  const [isNFDialogOpen, setIsNFDialogOpen] = useState(false);
  const [isPedidoDialogOpen, setIsPedidoDialogOpen] = useState(false);
  const [isDocumentoDialogOpen, setIsDocumentoDialogOpen] = useState(false);
  const [isIntegracaoDialogOpen, setIsIntegracaoDialogOpen] = useState(false);
  const [isCadastroUserDialogOpen, setIsCadastroUserDialogOpen] = useState(false);
  const [showClientes, setShowClientes] = useState(false);

  if (showClientes) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-card shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 sm:py-6 gap-4">
              <div className="flex items-center">
                <Warehouse className="w-6 h-6 sm:w-8 sm:h-8 text-primary mr-2 sm:mr-3" />
                <div>
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Sistema WMS - Transportadora</h1>
                  <p className="text-sm sm:text-base text-muted-foreground">Bem-vindo, {user?.name}</p>
                </div>
              </div>
              <div className="flex gap-2 sm:gap-3">
                <Button 
                  onClick={() => setShowClientes(false)}
                  variant="outline"
                  size="sm"
                >
                  Voltar
                </Button>
                <Button onClick={logout} variant="outline" size="sm">
                  <LogOut className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Sair</span>
                  <span className="sm:hidden">Sair</span>
                </Button>
              </div>
            </div>
          </div>
        </header>
        
        <main className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
          <div className="px-0 sm:px-0">
            <ClientesTable />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 sm:py-6 gap-4">
            <div className="flex items-center">
              <Warehouse className="w-6 h-6 sm:w-8 sm:h-8 text-primary mr-2 sm:mr-3" />
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Sistema WMS - Transportadora</h1>
                <p className="text-sm sm:text-base text-muted-foreground">Bem-vindo, {user?.name}</p>
              </div>
            </div>
            
            {/* Desktop Actions */}
            <div className="hidden lg:flex gap-2 xl:gap-3">
              <Button 
                onClick={() => setShowClientes(true)}
                className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
              >
                <User className="w-4 h-4 mr-2" />
                Clientes
              </Button>

              <Dialog open={isNFDialogOpen} onOpenChange={setIsNFDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
                    <Plus className="w-4 h-4 mr-2" />
                    Nova NF
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Nova Nota Fiscal</DialogTitle>
                    <DialogDescription>Cadastrar uma nova nota fiscal no sistema</DialogDescription>
                  </DialogHeader>
                  <FormNotaFiscal />
                </DialogContent>
              </Dialog>

              <Dialog open={isDocumentoDialogOpen} onOpenChange={setIsDocumentoDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-muted hover:bg-muted/90 text-muted-foreground">
                    <Receipt className="w-4 h-4 mr-2" />
                    Novo Boleto
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Novo Documento Financeiro</DialogTitle>
                    <DialogDescription>Cadastrar um novo documento financeiro</DialogDescription>
                  </DialogHeader>
                  <FormDocumentoFinanceiro onSuccess={() => setIsDocumentoDialogOpen(false)} />
                </DialogContent>
              </Dialog>

              <Dialog open={isIntegracaoDialogOpen} onOpenChange={setIsIntegracaoDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
                    <Menu className="w-4 h-4 mr-2" />
                    Integrações
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[95vw] sm:max-w-6xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Configurações de Integração</DialogTitle>
                    <DialogDescription>Configurar integrações do sistema</DialogDescription>
                  </DialogHeader>
                  <IntegrationConfig />
                </DialogContent>
              </Dialog>

              <Dialog open={isCadastroUserDialogOpen} onOpenChange={setIsCadastroUserDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Cadastro Usuários
                  </Button>
                </DialogTrigger>
                      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Novo Usuário Transportadora</DialogTitle>
                          <DialogDescription>Cadastrar um novo usuário para a transportadora</DialogDescription>
                        </DialogHeader>
                        <FormCadastroUsuario 
                          userType="admin_transportadora" 
                          onSuccess={() => setIsCadastroUserDialogOpen(false)} 
                        />
                      </DialogContent>
              </Dialog>

              <Button onClick={logout} variant="outline">
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>

            {/* Mobile Actions */}
            <div className="lg:hidden flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div className="flex gap-2">
                <Button onClick={logout} variant="outline" size="sm" className="flex-1 sm:flex-none">
                  <LogOut className="w-4 h-4 mr-1" />
                  Sair
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
                      <Menu className="h-4 w-4 mr-1" />
                      Menu
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={() => setShowClientes(true)}>
                      <User className="w-4 h-4 mr-2" />
                      Clientes
                    </DropdownMenuItem>

                    <Dialog open={isNFDialogOpen} onOpenChange={setIsNFDialogOpen}>
                      <DialogTrigger asChild>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                          <Plus className="w-4 h-4 mr-2" />
                          Nova NF
                        </DropdownMenuItem>
                      </DialogTrigger>
                      <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Nova Nota Fiscal</DialogTitle>
                          <DialogDescription>Cadastrar uma nova nota fiscal no sistema</DialogDescription>
                        </DialogHeader>
                        <FormNotaFiscal />
                      </DialogContent>
                    </Dialog>

                    <Dialog open={isDocumentoDialogOpen} onOpenChange={setIsDocumentoDialogOpen}>
                      <DialogTrigger asChild>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                          <Receipt className="w-4 h-4 mr-2" />
                          Novo Boleto
                        </DropdownMenuItem>
                      </DialogTrigger>
                      <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Novo Documento Financeiro</DialogTitle>
                          <DialogDescription>Cadastrar um novo documento financeiro</DialogDescription>
                        </DialogHeader>
                        <FormDocumentoFinanceiro onSuccess={() => setIsDocumentoDialogOpen(false)} />
                      </DialogContent>
                    </Dialog>

                    <Dialog open={isIntegracaoDialogOpen} onOpenChange={setIsIntegracaoDialogOpen}>
                      <DialogTrigger asChild>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                          <Menu className="w-4 h-4 mr-2" />
                          Integrações
                        </DropdownMenuItem>
                      </DialogTrigger>
                      <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Configurações de Integração</DialogTitle>
                          <DialogDescription>Configurar integrações do sistema</DialogDescription>
                        </DialogHeader>
                        <IntegrationConfig />
                      </DialogContent>
                    </Dialog>

                    <Dialog open={isCadastroUserDialogOpen} onOpenChange={setIsCadastroUserDialogOpen}>
                      <DialogTrigger asChild>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                          <UserPlus className="w-4 h-4 mr-2" />
                          Cadastro Usuários
                        </DropdownMenuItem>
                      </DialogTrigger>
                      <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Novo Usuário Transportadora</DialogTitle>
                          <DialogDescription>Cadastrar um novo usuário para a transportadora</DialogDescription>
                        </DialogHeader>
                        <FormCadastroUsuario 
                          userType="admin_transportadora" 
                          onSuccess={() => setIsCadastroUserDialogOpen(false)} 
                        />
                      </DialogContent>
                    </Dialog>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-4 sm:py-6 px-2 sm:px-4 lg:px-8">
        <div className="w-full">
          <Tabs defaultValue="dashboard" className="w-full">
            {/* Mobile: Horizontal scroll tabs */}
            <div className="lg:hidden w-full overflow-x-auto mb-6">
              <TabsList className="flex w-max min-w-full h-auto p-1 gap-1">
                <TabsTrigger value="dashboard" className="text-xs px-2 py-2 whitespace-nowrap">Dashboard</TabsTrigger>
                <TabsTrigger value="fluxo-nfs" className="text-xs px-2 py-2 whitespace-nowrap">Mercadorias Armazenadas</TabsTrigger>
                <TabsTrigger 
                  value="pedidos-liberacao" 
                  className="text-xs px-2 py-2 whitespace-nowrap relative"
                  onClick={() => setTimeout(() => markAsVisited('solicitacoes-pendentes'), 100)}
                >
                  Solicitações Pendentes
                  <NotificationBadge count={notifications.solicitacoesPendentes} className="absolute -top-1 -right-1 scale-50" />
                </TabsTrigger>
                <TabsTrigger value="pedidos-liberados" className="text-xs px-2 py-2 whitespace-nowrap">Solicitações Confirmadas</TabsTrigger>
                <TabsTrigger 
                  value="financeiro" 
                  className="text-xs px-2 py-2 whitespace-nowrap"
                >
                  Financeiro
                </TabsTrigger>
                <TabsTrigger value="relatorios" className="text-xs px-2 py-2 whitespace-nowrap">Relatórios</TabsTrigger>
              </TabsList>
            </div>
            
            {/* Desktop: Grid layout */}
            <div className="hidden lg:block mb-6">
              <TabsList className="grid w-full grid-cols-6 gap-1">
                <TabsTrigger value="dashboard" className="text-sm">Dashboard</TabsTrigger>
                <TabsTrigger value="fluxo-nfs" className="text-sm">Mercadorias Armazenadas</TabsTrigger>
                <TabsTrigger 
                  value="pedidos-liberacao" 
                  className="text-sm relative"
                  onClick={() => setTimeout(() => markAsVisited('solicitacoes-pendentes'), 100)}
                >
                  Solicitações Pendentes
                  <NotificationBadge count={notifications.solicitacoesPendentes} className="absolute -top-2 -right-2 scale-75" />
                </TabsTrigger>
                <TabsTrigger value="pedidos-liberados" className="text-sm">Solicitações Confirmadas</TabsTrigger>
                <TabsTrigger 
                  value="financeiro" 
                  className="text-sm"
                >
                  Financeiro
                </TabsTrigger>
                <TabsTrigger value="relatorios" className="text-sm">Relatórios</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="dashboard" className="space-y-4">
              <Dashboard />
            </TabsContent>

            <TabsContent value="fluxo-nfs" className="space-y-4">
              <TransportadoraStatusSeparacao />
            </TabsContent>


            <TabsContent value="pedidos-liberacao" className="space-y-4">
              <SolicitacoesPendentesTable />
            </TabsContent>

            <TabsContent value="pedidos-liberados" className="space-y-4">
              <PedidosConfirmadosTransportadora />
            </TabsContent>

            <TabsContent value="financeiro" className="space-y-4">
              <FinanceiroTransportadora />
            </TabsContent>
            
            <TabsContent value="relatorios" className="space-y-4">
              <RelatorioControleCargas />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}