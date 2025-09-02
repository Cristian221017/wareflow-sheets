import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SystemHealthDashboard } from '@/components/system/SystemHealthDashboard';
import { CodeCleanupTools } from '@/components/system/CodeCleanupTools';
import { Shield, Wrench, Activity } from 'lucide-react';

export function SystemMaintenanceTab() {
  const [activeSubTab, setActiveSubTab] = useState("health");

  const subTabs = [
    { value: "health", label: "Health Check", icon: Activity },
    { value: "cleanup", label: "Limpeza de Código", icon: Wrench },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-primary" />
            <CardTitle>Manutenção do Sistema</CardTitle>
          </div>
          <CardDescription>
            Ferramentas avançadas para monitoramento, diagnóstico e manutenção do sistema
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          {subTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger 
                key={tab.value} 
                value={tab.value} 
                className="flex items-center space-x-2"
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="health">
          <SystemHealthDashboard />
        </TabsContent>

        <TabsContent value="cleanup">
          <CodeCleanupTools />
        </TabsContent>
      </Tabs>
    </div>
  );
}