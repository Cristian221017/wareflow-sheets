import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Package, 
  UserPlus, 
  FileText, 
  AlertCircle,
  ExternalLink,
  MessageSquare
} from "lucide-react";

interface EmptyStateProps {
  type: 'nfs-empty' | 'cliente-no-link' | 'transportadora-no-clients' | 'no-permissions';
  userType?: 'cliente' | 'transportadora' | 'super_admin';
  onAction?: (action: string) => void;
}

export function EmptyState({ type, userType, onAction }: EmptyStateProps) {
  const getEmptyStateConfig = () => {
    switch (type) {
      case 'nfs-empty':
        if (userType === 'cliente') {
          return {
            icon: Package,
            title: "Nenhuma mercadoria encontrada",
            description: "Ainda não há mercadorias armazenadas em seu nome.",
            actions: [
              {
                label: "Contatar Transportadora",
                action: "contact-transportadora",
                variant: "default" as const,
                icon: MessageSquare
              },
              {
                label: "Ver Documentação",
                action: "view-docs",
                variant: "outline" as const,
                icon: FileText
              }
            ]
          };
        }
        return {
          icon: Package,
          title: "Nenhuma nota fiscal cadastrada",
          description: "Comece cadastrando a primeira nota fiscal no sistema.",
          actions: [
            {
              label: "Cadastrar Primeira NF",
              action: "create-nf",
              variant: "default" as const,
              icon: Package
            }
          ]
        };

      case 'cliente-no-link':
        return {
          icon: AlertCircle,
          title: "Acesso limitado detectado",
          description: "Seu usuário não está vinculado corretamente. Entre em contato com sua transportadora para resolver esta situação.",
          actions: [
            {
              label: "Contatar Suporte",
              action: "contact-support",
              variant: "default" as const,
              icon: MessageSquare
            },
            {
              label: "Ver Documentação",
              action: "view-troubleshooting",
              variant: "outline" as const,
              icon: ExternalLink
            }
          ]
        };

      case 'transportadora-no-clients':
        return {
          icon: UserPlus,
          title: "Nenhum cliente cadastrado",
          description: "Para começar a operar, cadastre seus primeiros clientes no sistema.",
          actions: [
            {
              label: "Cadastrar Cliente",
              action: "create-client",
              variant: "default" as const,
              icon: UserPlus
            },
            {
              label: "Importar Clientes",
              action: "import-clients",
              variant: "outline" as const,
              icon: FileText
            }
          ]
        };

      case 'no-permissions':
        return {
          icon: AlertCircle,
          title: "Sem permissões de acesso",
          description: "Você não tem permissão para acessar este recurso. Verifique com o administrador do sistema.",
          actions: [
            {
              label: "Contatar Administrador",
              action: "contact-admin",
              variant: "default" as const,
              icon: MessageSquare
            }
          ]
        };

      default:
        return {
          icon: AlertCircle,
          title: "Estado não encontrado",
          description: "Ocorreu um erro inesperado.",
          actions: []
        };
    }
  };

  const config = getEmptyStateConfig();
  const Icon = config.icon;

  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-muted-foreground" />
        </div>
        
        <h3 className="text-lg font-semibold mb-2">{config.title}</h3>
        <p className="text-muted-foreground mb-6 max-w-md">{config.description}</p>
        
        {config.actions.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3">
            {config.actions.map((action) => (
              <Button
                key={`${action.label}-${action.action}`}
                variant={action.variant}
                onClick={() => onAction?.(action.action)}
              >
                <action.icon className="w-4 h-4 mr-2" />
                {action.label}
              </Button>
            ))}
          </div>
        )}

        {/* Dicas contextuais */}
        {type === 'cliente-no-link' && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            <p className="font-medium mb-1">💡 Possíveis soluções:</p>
            <ul className="text-left space-y-1">
              <li>• Verifique se seu e-mail está correto no cadastro</li>
              <li>• Aguarde a transportadora confirmar seu vínculo</li>
              <li>• Entre em contato com o suporte técnico</li>
            </ul>
          </div>
        )}

        {type === 'nfs-empty' && userType === 'transportadora' && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
            <p className="font-medium mb-1">🚀 Primeiros passos:</p>
            <ul className="text-left space-y-1">
              <li>• Cadastre seus clientes primeiro</li>
              <li>• Configure integração com seu sistema ERP</li>
              <li>• Importe suas notas fiscais existentes</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}