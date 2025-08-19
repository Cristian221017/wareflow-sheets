import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FormDocumentoFinanceiro } from './FormDocumentoFinanceiro';
import { FinanceiroTransportadoraTable } from './FinanceiroTransportadoraTable';
import { Receipt, FileText } from 'lucide-react';

export function FinanceiroTransportadora() {
  const [activeTab, setActiveTab] = useState('documentos');

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="documentos" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Documentos
          </TabsTrigger>
          <TabsTrigger value="cadastrar" className="flex items-center gap-2">
            <Receipt className="w-4 h-4" />
            Cadastrar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documentos">
          <FinanceiroTransportadoraTable />
        </TabsContent>

        <TabsContent value="cadastrar">
          <FormDocumentoFinanceiro onSuccess={() => setActiveTab('documentos')} />
        </TabsContent>
      </Tabs>
    </div>
  );
}