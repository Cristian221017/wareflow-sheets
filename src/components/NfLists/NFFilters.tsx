import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export interface NFFilterState {
  searchNF: string;
  searchPedido: string;
  cliente: string;
  produto: string;
  fornecedor: string;
  dataInicio: string;
  dataFim: string;
  localizacao: string;
}

interface NFFiltersProps {
  filters: NFFilterState;
  onFiltersChange: (filters: NFFilterState) => void;
  showClientFilter?: boolean;
  className?: string;
}

export function NFFilters({ 
  filters, 
  onFiltersChange, 
  showClientFilter = false,
  className = "" 
}: NFFiltersProps) {
  const { clientes } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);

  const updateFilter = (key: keyof NFFilterState, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      searchNF: '',
      searchPedido: '',
      cliente: '',
      produto: '',
      fornecedor: '',
      dataInicio: '',
      dataFim: '',
      localizacao: '',
    });
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== '');

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Linha principal com pesquisa e toggle */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por número da NF..."
                value={filters.searchNF}
                onChange={(e) => updateFilter('searchNF', e.target.value)}
                className="pl-8"
              />
            </div>
            <Button
              variant={isExpanded ? "secondary" : "outline"}
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="whitespace-nowrap"
            >
              <Filter className="w-4 h-4 mr-1" />
              Filtros {hasActiveFilters && `(${Object.values(filters).filter(v => v !== '').length})`}
            </Button>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="whitespace-nowrap"
              >
                <X className="w-4 h-4 mr-1" />
                Limpar
              </Button>
            )}
          </div>

          {/* Filtros expandidos */}
          {isExpanded && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t">
              <div className="space-y-2">
                <Label htmlFor="searchPedido">Número do Pedido</Label>
                <Input
                  id="searchPedido"
                  placeholder="Digite o número do pedido..."
                  value={filters.searchPedido}
                  onChange={(e) => updateFilter('searchPedido', e.target.value)}
                />
              </div>

              {showClientFilter && (
                <div className="space-y-2">
                  <Label htmlFor="cliente">Cliente</Label>
                  <Select 
                    value={filters.cliente} 
                    onValueChange={(value) => updateFilter('cliente', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os clientes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos os clientes</SelectItem>
                      {clientes.map((cliente) => (
                        <SelectItem key={cliente.id} value={cliente.id}>
                          {cliente.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="produto">Produto</Label>
                <Input
                  id="produto"
                  placeholder="Digite o nome do produto..."
                  value={filters.produto}
                  onChange={(e) => updateFilter('produto', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fornecedor">Fornecedor</Label>
                <Input
                  id="fornecedor"
                  placeholder="Digite o nome do fornecedor..."
                  value={filters.fornecedor}
                  onChange={(e) => updateFilter('fornecedor', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="localizacao">Localização</Label>
                <Input
                  id="localizacao"
                  placeholder="Digite a localização..."
                  value={filters.localizacao}
                  onChange={(e) => updateFilter('localizacao', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dataInicio">Data Início</Label>
                <Input
                  id="dataInicio"
                  type="date"
                  value={filters.dataInicio}
                  onChange={(e) => updateFilter('dataInicio', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dataFim">Data Fim</Label>
                <Input
                  id="dataFim"
                  type="date"
                  value={filters.dataFim}
                  onChange={(e) => updateFilter('dataFim', e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}