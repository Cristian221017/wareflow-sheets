import { useState, useMemo } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NFFilters, useNFFilterOptions } from '@/hooks/useNFsWithFilters';
import { NFStatus } from '@/types/nf';

interface NFFiltersWithSearchProps {
  filters: NFFilters;
  onFiltersChange: (filters: NFFilters) => void;
  showClienteFilter?: boolean;
}

export function NFFiltersWithSearch({
  filters,
  onFiltersChange,
  showClienteFilter = true
}: NFFiltersWithSearchProps) {
  const [searchDebounce, setSearchDebounce] = useState('');
  const { statusOptions, clienteOptions } = useNFFilterOptions();

  // Debounce para pesquisa por número da NF
  const handleSearchChange = useMemo(() => {
    const timeoutId = setTimeout(() => {
      onFiltersChange({
        ...filters,
        numeroNF: searchDebounce || undefined
      });
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchDebounce, filters, onFiltersChange]);

  const handleStatusChange = (status: string) => {
    onFiltersChange({
      ...filters,
      status: status === 'all' ? undefined : (status as NFStatus)
    });
  };

  const handleClienteChange = (cliente: string) => {
    onFiltersChange({
      ...filters,
      clienteNome: cliente === 'all' ? undefined : cliente
    });
  };

  const clearFilters = () => {
    setSearchDebounce('');
    onFiltersChange({});
  };

  const hasActiveFilters = !!(filters.numeroNF || filters.status || filters.clienteNome);
  const activeFiltersCount = [
    filters.numeroNF,
    filters.status,
    filters.clienteNome
  ].filter(Boolean).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
          {hasActiveFilters && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {activeFiltersCount} filtro{activeFiltersCount > 1 ? 's' : ''} ativo{activeFiltersCount > 1 ? 's' : ''}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4 mr-1" />
                Limpar
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-4">
          {/* Busca por número da NF */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por número da NF..."
                value={searchDebounce}
                onChange={(e) => setSearchDebounce(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Filtro por Status */}
          <div className="min-w-[160px]">
            <Select
              value={filters.status || 'all'}
              onValueChange={handleStatusChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status === 'ARMAZENADA' && 'Armazenada'}
                    {status === 'SOLICITADA' && 'Solicitada'}
                    {status === 'CONFIRMADA' && 'Confirmada'}
                    {status === 'PENDENTE' && 'Pendente'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro por Cliente (apenas para transportadoras) */}
          {showClienteFilter && clienteOptions.length > 0 && (
            <div className="min-w-[200px]">
              <Select
                value={filters.clienteNome || 'all'}
                onValueChange={handleClienteChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os clientes</SelectItem>
                  {clienteOptions.map((cliente) => (
                    <SelectItem key={cliente} value={cliente}>
                      {cliente}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Filtros ativos */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
            {filters.numeroNF && (
              <Badge variant="outline" className="flex items-center gap-1">
                NF: {filters.numeroNF}
                <X 
                  className="h-3 w-3 cursor-pointer hover:text-destructive" 
                  onClick={() => onFiltersChange({ ...filters, numeroNF: undefined })}
                />
              </Badge>
            )}
            {filters.status && (
              <Badge variant="outline" className="flex items-center gap-1">
                Status: {filters.status}
                <X 
                  className="h-3 w-3 cursor-pointer hover:text-destructive" 
                  onClick={() => onFiltersChange({ ...filters, status: undefined })}
                />
              </Badge>
            )}
            {filters.clienteNome && (
              <Badge variant="outline" className="flex items-center gap-1">
                Cliente: {filters.clienteNome}
                <X 
                  className="h-3 w-3 cursor-pointer hover:text-destructive" 
                  onClick={() => onFiltersChange({ ...filters, clienteNome: undefined })}
                />
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}