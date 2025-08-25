import { useRealtimeEvents } from "@/hooks/useDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Bell, 
  Package, 
  Clock, 
  CheckCircle, 
  DollarSign, 
  User,
  ExternalLink,
  AlertTriangle
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface NotificationCenterProps {
  onDeepLink?: (path: string) => void;
}

export function NotificationCenter({ onDeepLink }: NotificationCenterProps) {
  const { data: events, isLoading } = useRealtimeEvents();
  const navigate = useNavigate();

  const handleDeepLink = (path: string) => {
    if (onDeepLink) {
      onDeepLink(path);
    } else {
      navigate(path);
    }
  };

  const getEventIcon = (entityType: string, eventType: string) => {
    if (entityType === 'nota_fiscal') {
      if (eventType.includes('solicitacao')) return Clock;
      if (eventType.includes('confirmacao')) return CheckCircle;
      if (eventType.includes('recusa')) return AlertTriangle;
      return Package;
    }
    if (entityType === 'documento_financeiro') return DollarSign;
    return Bell;
  };

  const getEventColor = (entityType: string, eventType: string) => {
    if (entityType === 'nota_fiscal') {
      if (eventType.includes('solicitacao')) return 'text-orange-600 bg-orange-100';
      if (eventType.includes('confirmacao')) return 'text-green-600 bg-green-100';
      if (eventType.includes('recusa')) return 'text-red-600 bg-red-100';
      return 'text-blue-600 bg-blue-100';
    }
    if (entityType === 'documento_financeiro') return 'text-purple-600 bg-purple-100';
    return 'text-gray-600 bg-gray-100';
  };

  const getEventTitle = (entityType: string, eventType: string) => {
    const titles: Record<string, string> = {
      'solicitacao_carregamento': 'Nova Solicitação de Carregamento',
      'confirmacao_carregamento': 'Carregamento Confirmado',
      'recusa_carregamento': 'Carregamento Recusado',
      'nf_criada': 'Nova Nota Fiscal Cadastrada',
      'documento_criado': 'Novo Documento Financeiro',
      'documento_atualizado': 'Documento Financeiro Atualizado',
    };
    return titles[eventType] || 'Evento do Sistema';
  };

  const getEventDescription = (entityType: string, eventType: string, status?: string) => {
    if (entityType === 'nota_fiscal') {
      if (eventType.includes('solicitacao')) return 'Aguardando aprovação da transportadora';
      if (eventType.includes('confirmacao')) return 'Carregamento autorizado para retirada';
      if (eventType.includes('recusa')) return 'Solicitação recusada, NF retornada para armazenada';
      if (eventType.includes('criada')) return 'Nova mercadoria armazenada';
    }
    if (entityType === 'documento_financeiro') {
      if (eventType.includes('criado')) return 'Documento gerado no sistema';
      if (eventType.includes('atualizado')) return `Status alterado: ${status || 'Atualizado'}`;
    }
    return 'Evento registrado no sistema';
  };

  const getDeepLink = (entityType: string, entityId: string, eventType: string) => {
    if (entityType === 'nota_fiscal') {
      if (eventType.includes('solicitacao')) return '?tab=solicitacoes&highlight=' + entityId;
      if (eventType.includes('confirmacao')) return '?tab=confirmadas&highlight=' + entityId;
      return '?tab=nfs&highlight=' + entityId;
    }
    if (entityType === 'documento_financeiro') {
      return '?tab=financeiro&highlight=' + entityId;
    }
    return '';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Atividade Recente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
                <div className="flex-1 space-y-1">
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3 animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!events || events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Atividade Recente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Nenhuma atividade recente</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Atividade Recente
          </div>
          <Badge variant="secondary">{events.length} eventos</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          <div className="space-y-4">
            {events.map((event, index) => {
              const Icon = getEventIcon(event.entityType, event.entityType);
              const colorClasses = getEventColor(event.entityType, event.entityType);
              const title = getEventTitle(event.entityType, event.entityType);
              const description = getEventDescription(event.entityType, event.entityType, event.status);
              const deepLink = getDeepLink(event.entityType, event.entityId, event.entityType);
              const timeAgo = formatDistanceToNow(new Date(event.lastUpdate), {
                addSuffix: true,
                locale: ptBR
              });

              return (
                <div key={`${event.entityId}-${index}`} className="flex items-start space-x-3 p-3 rounded-lg border bg-card">
                  <div className={`p-2 rounded-full ${colorClasses}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium truncate">{title}</h4>
                      <time className="text-xs text-muted-foreground">{timeAgo}</time>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{description}</p>
                    {event.status && (
                      <Badge variant="outline" className="mt-2 text-xs">
                        {event.status}
                      </Badge>
                    )}
                    {deepLink && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 h-7 px-2 text-xs"
                        onClick={() => handleDeepLink(deepLink)}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Ver Detalhes
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center">
                    <User className="h-3 w-3 text-muted-foreground" />
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}