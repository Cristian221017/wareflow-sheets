import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Combobox } from '@/components/ui/combobox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { CalendarIcon, FileText, Download, BarChart3 } from 'lucide-react';
import { useAllNFs } from '@/hooks/useNFs';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formSchema = z.object({
  dataInicio: z.string().min(1, 'Data de início é obrigatória'),
  dataFim: z.string().min(1, 'Data de fim é obrigatória'),
  cliente: z.string().optional(),
  status: z.string().optional(),
  produto: z.string().optional(),
  fornecedor: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface RelatorioData {
  totalNFs: number;
  totalPeso: number;
  totalVolume: number;
  nfsPorStatus: Record<string, number>;
  nfsPorCliente: Record<string, { quantidade: number; peso: number; volume: number }>;
  detalhes: Array<{
    numeroNF: string;
    cliente: string;
    produto: string;
    quantidade: number;
    peso: number;
    volume: number;
    status: string;
    dataRecebimento: string;
    localizacao: string;
  }>;
}

export function RelatorioControleCargas() {
  const { user, clientes } = useAuth();
  const { armazenadas, solicitadas, confirmadas } = useAllNFs();
  const [relatorioData, setRelatorioData] = useState<RelatorioData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Combinar todas as NFs
  const todasNFs = [...armazenadas, ...solicitadas, ...confirmadas];

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      dataInicio: '',
      dataFim: '',
      cliente: '',
      status: '',
      produto: '',
      fornecedor: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    
    try {
      // Filtrar NFs por período e outros critérios
      let nfsFiltradas = todasNFs.filter(nf => {
        const dataRecebimento = new Date(nf.data_recebimento);
        const dataInicio = new Date(values.dataInicio);
        const dataFim = new Date(values.dataFim);
        
        const dentroPerido = dataRecebimento >= dataInicio && dataRecebimento <= dataFim;
        const cliente = clientes.find(c => c.id === nf.cliente_id);
        const clienteMatch = !values.cliente || 
          nf.cliente_id === values.cliente || 
          (cliente && cliente.name.toLowerCase().includes(values.cliente.toLowerCase()));
        const statusMatch = !values.status || nf.status === values.status;
        const produtoMatch = !values.produto || nf.produto.toLowerCase().includes(values.produto.toLowerCase());
        const fornecedorMatch = !values.fornecedor || nf.fornecedor.toLowerCase().includes(values.fornecedor.toLowerCase());
        
        return dentroPerido && clienteMatch && statusMatch && produtoMatch && fornecedorMatch;
      });

      // Calcular estatísticas
      const totalNFs = nfsFiltradas.length;
      const totalPeso = nfsFiltradas.reduce((sum, nf) => sum + Number(nf.peso), 0);
      const totalVolume = nfsFiltradas.reduce((sum, nf) => sum + Number(nf.volume), 0);

      // NFs por status
      const nfsPorStatus = nfsFiltradas.reduce((acc, nf) => {
        acc[nf.status] = (acc[nf.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // NFs por cliente
      const nfsPorCliente = nfsFiltradas.reduce((acc, nf) => {
        const cliente = clientes.find(c => c.id === nf.cliente_id);
        const clienteKey = cliente ? cliente.name : nf.cliente_id;
        if (!acc[clienteKey]) {
          acc[clienteKey] = { quantidade: 0, peso: 0, volume: 0 };
        }
        acc[clienteKey].quantidade += 1;
        acc[clienteKey].peso += Number(nf.peso);
        acc[clienteKey].volume += Number(nf.volume);
        return acc;
      }, {} as Record<string, { quantidade: number; peso: number; volume: number }>);

      // Detalhes das NFs
      const detalhes = nfsFiltradas.map(nf => {
        const cliente = clientes.find(c => c.id === nf.cliente_id);
        return {
          numeroNF: nf.numero_nf,
          cliente: cliente ? cliente.name : nf.cliente_id,
          produto: nf.produto,
          quantidade: nf.quantidade,
          peso: Number(nf.peso),
          volume: Number(nf.volume),
          status: nf.status,
          dataRecebimento: nf.data_recebimento,
          localizacao: nf.localizacao,
        };
      });

      setRelatorioData({
        totalNFs,
        totalPeso,
        totalVolume,
        nfsPorStatus,
        nfsPorCliente,
        detalhes,
      });
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportarCSV = () => {
    if (!relatorioData) return;

    const headers = [
      'Número NF',
      'Cliente',
      'Produto',
      'Quantidade',
      'Peso (kg)',
      'Volume (m³)',
      'Status',
      'Data Recebimento',
      'Localização'
    ];

    const csvContent = [
      headers.join(','),
      ...relatorioData.detalhes.map(item =>
        [
          item.numeroNF,
          item.cliente,
          item.produto,
          item.quantidade,
          item.peso,
          item.volume,
          item.status,
          item.dataRecebimento,
          item.localizacao
        ].join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_controle_cargas_${format(new Date(), 'dd-MM-yyyy')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Obter clientes únicos das NFs para o dropdown
  const clienteOptions = Array.from(new Set(todasNFs.map(nf => nf.cliente_id)))
    .filter(Boolean)
    .map(clienteId => {
      const cliente = clientes.find(c => c.id === clienteId);
      return {
        value: clienteId as string,
        label: cliente ? cliente.name : clienteId as string,
      };
    });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Em separação':
        return 'bg-blue-100 text-blue-800';
      case 'Liberada para carregar':
        return 'bg-yellow-100 text-yellow-800';
      case 'Carregamento solicitado':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Relatório de Controle de Cargas
          </CardTitle>
          <CardDescription>
            Gere relatórios detalhados sobre cargas armazenadas por período
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="dataInicio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data Início</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dataFim"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data Fim</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cliente"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cliente (Opcional)</FormLabel>
                      <FormControl>
                        <Combobox
                          options={[{ value: '', label: 'Todos os clientes' }, ...clienteOptions]}
                          value={field.value}
                          onValueChange={field.onChange}
                          placeholder="Selecione um cliente"
                          searchPlaceholder="Buscar cliente..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status (Opcional)</FormLabel>
                      <FormControl>
                        <Combobox
                          options={[
                            { value: '', label: 'Todos os status' },
                            { value: 'ARMAZENADA', label: 'Armazenada' },
                            { value: 'SOLICITADA', label: 'Solicitada' },
                            { value: 'CONFIRMADA', label: 'Confirmada' }
                          ]}
                          value={field.value}
                          onValueChange={field.onChange}
                          placeholder="Selecione um status"
                          searchPlaceholder="Buscar status..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="produto"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Produto (Opcional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Digite o nome do produto..." 
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fornecedor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fornecedor (Opcional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Digite o nome do fornecedor..." 
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-3">
              <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                <FileText className="w-4 h-4 mr-2" />
                {isLoading ? 'Gerando...' : 'Gerar Relatório'}
              </Button>
              
              <Button 
                type="button"
                variant="outline" 
                onClick={() => {
                  form.reset({
                    dataInicio: '',
                    dataFim: '',
                    cliente: '',
                    status: '',
                    produto: '',
                    fornecedor: '',
                  });
                }}
                className="w-full sm:w-auto"
              >
                Limpar Filtros
              </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {relatorioData && (
        <div className="space-y-6">
          {/* Resumo Estatístico */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-primary">{relatorioData.totalNFs}</div>
                <p className="text-xs text-muted-foreground">Total de NFs</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-primary">{(relatorioData.totalPeso || 0).toFixed(2)} kg</div>
                <p className="text-xs text-muted-foreground">Peso Total</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-primary">{(relatorioData.totalVolume || 0).toFixed(2)} m³</div>
                <p className="text-xs text-muted-foreground">Volume Total</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <Button onClick={exportarCSV} className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar CSV
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* NFs por Status */}
          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {Object.entries(relatorioData.nfsPorStatus).map(([status, quantidade]) => (
                  <Badge key={status} className={getStatusColor(status)}>
                    {status}: {quantidade}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* NFs por Cliente */}
          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Cliente</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Quantidade NFs</TableHead>
                    <TableHead>Peso Total (kg)</TableHead>
                    <TableHead>Volume Total (m³)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(relatorioData.nfsPorCliente).map(([cliente, dados]) => (
                    <TableRow key={cliente}>
                      <TableCell className="font-medium">{cliente}</TableCell>
                      <TableCell>{dados.quantidade}</TableCell>
                      <TableCell>{(dados.peso || 0).toFixed(2)}</TableCell>
                      <TableCell>{(dados.volume || 0).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Detalhes das NFs */}
          <Card>
            <CardHeader>
              <CardTitle>Detalhes das Notas Fiscais</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número NF</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>Quantidade</TableHead>
                      <TableHead>Peso (kg)</TableHead>
                      <TableHead>Volume (m³)</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data Recebimento</TableHead>
                      <TableHead>Localização</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {relatorioData.detalhes.map((nf) => (
                      <TableRow key={nf.numeroNF}>
                        <TableCell className="font-medium">{nf.numeroNF}</TableCell>
                        <TableCell>{nf.cliente}</TableCell>
                        <TableCell>{nf.produto}</TableCell>
                        <TableCell>{nf.quantidade}</TableCell>
                        <TableCell>{(nf.peso || 0).toFixed(2)}</TableCell>
                        <TableCell>{(nf.volume || 0).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(nf.status)}>
                            {nf.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{format(new Date(nf.dataRecebimento), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                        <TableCell>{nf.localizacao}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}