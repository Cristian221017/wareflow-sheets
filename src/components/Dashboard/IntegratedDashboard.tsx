import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DashboardStatsComponent } from "./DashboardStats";
import { NotificationCenter } from "../Notifications/NotificationCenter";
import { subscribeCentralizedChanges } from "@/lib/realtimeCentralized";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, BarChart3 } from "lucide-react";

interface IntegratedDashboardProps {
  onDeepLink?: (path: string) => void;
}

export function IntegratedDashboard({ onDeepLink }: IntegratedDashboardProps) {
  const queryClient = useQueryClient();
  const once = useRef(false);
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Configurar realtime centralizado
  useEffect(() => {
    if (once.current) return;
    once.current = true;
    console.log('🔄 Configurando realtime centralizado para Dashboard');
    return subscribeCentralizedChanges(queryClient);
  }, [queryClient]);

  // Lidar com deep links via URL params
  useEffect(() => {
    const tab = searchParams.get('tab');
    const highlight = searchParams.get('highlight');
    
    if (tab || highlight) {
      console.log('🔗 Deep link detectado:', { tab, highlight });
      // Aqui você pode implementar a navegação automática baseada nos parâmetros
    }
  }, [searchParams]);

  const handleInternalDeepLink = (path: string) => {
    // Atualizar URL params para deep linking
    const params = new URLSearchParams(path.split('?')[1] || '');
    setSearchParams(params);
    
    if (onDeepLink) {
      onDeepLink(path);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Atividade Recente
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <DashboardStatsComponent onDeepLink={handleInternalDeepLink} />
        </TabsContent>
        
        <TabsContent value="activity" className="space-y-6">
          <NotificationCenter onDeepLink={handleInternalDeepLink} />
        </TabsContent>
      </Tabs>

      {/* Seção de atividade sempre visível na overview */}
      <Card className="lg:hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Última Atividade
          </CardTitle>
        </CardHeader>
        <CardContent>
          <NotificationCenter onDeepLink={handleInternalDeepLink} />
        </CardContent>
      </Card>

      {/* Layout lado a lado para desktop */}
      <div className="hidden lg:grid lg:grid-cols-3 gap-6">
        <div className="col-span-2">
          <DashboardStatsComponent onDeepLink={handleInternalDeepLink} />
        </div>
        <div>
          <NotificationCenter onDeepLink={handleInternalDeepLink} />
        </div>
      </div>

      {/* Footer informativo */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div className="text-center text-sm text-muted-foreground">
            <p className="font-medium mb-1">🔄 Sistema de Comunicação Unificado</p>
            <div className="flex flex-wrap justify-center gap-4 text-xs">
              <span>✅ Event Log para auditoria completa</span>
              <span>✅ RPCs como única fonte de escrita</span>
              <span>✅ Realtime centralizado</span>
              <span>✅ Deep links para navegação direta</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}