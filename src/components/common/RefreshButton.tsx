import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { log } from '@/utils/logger';

interface RefreshButtonProps {
  /** Tipos de dados que devem ser invalidados */
  queryTypes?: string[];
  /** Texto do botão (opcional) */
  label?: string;
  /** Mostrar apenas o ícone */
  iconOnly?: boolean;
  /** Variante do botão */
  variant?: "default" | "outline" | "secondary" | "ghost";
  /** Tamanho do botão */
  size?: "default" | "sm" | "lg" | "icon";
}

export function RefreshButton({ 
  queryTypes = ['documentos_financeiros', 'financeiro', 'dashboard'], 
  label = "Atualizar",
  iconOnly = false,
  variant = "outline",
  size = "default"
}: RefreshButtonProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleRefresh = async () => {
    try {
      log(`🔄 Iniciando refresh manual para tipos: ${queryTypes.join(', ')}`);
      
      // Invalidar usando predicate para cobertura completa
      await queryClient.invalidateQueries({
        predicate: (query) => {
          if (!Array.isArray(query.queryKey)) return false;
          const [firstKey] = query.queryKey;
          return queryTypes.includes(firstKey as string);
        }
      });

      // Aguardar um pouco para as queries se atualizarem
      await new Promise(resolve => setTimeout(resolve, 100));

      toast({
        title: "Atualizado",
        description: "Os dados foram atualizados com sucesso.",
      });

      log('✅ Refresh manual executado com sucesso');
    } catch (error) {
      log('❌ Erro no refresh manual:', error);
      toast({
        title: "Erro ao atualizar",
        description: "Ocorreu um erro ao atualizar os dados. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  if (iconOnly) {
    return (
      <Button
        variant={variant}
        size={size === "default" ? "icon" : size}
        onClick={handleRefresh}
        title={label}
      >
        <RefreshCw className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleRefresh}
    >
      <RefreshCw className="h-4 w-4 mr-2" />
      {label}
    </Button>
  );
}