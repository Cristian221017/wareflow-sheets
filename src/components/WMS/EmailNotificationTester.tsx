import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Mail, Send, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';

type EmailType = 'nf_cadastrada' | 'solicitacao_carregamento' | 'confirmacao_autorizada' | 'boleto_cadastrado' | 'cliente_cadastrado' | 'embarque_confirmado' | 'entrega_confirmada';

const emailTypes = [
  { value: 'nf_cadastrada', label: 'NF Cadastrada', description: 'Quando uma NF é registrada no sistema' },
  { value: 'solicitacao_carregamento', label: 'Solicitação de Carregamento', description: 'Cliente solicita carregamento' },
  { value: 'confirmacao_autorizada', label: 'Confirmação Autorizada', description: 'Transportadora aprova carregamento' },
  { value: 'boleto_cadastrado', label: 'Boleto Cadastrado', description: 'Novo documento financeiro criado' },
  { value: 'cliente_cadastrado', label: 'Cliente Cadastrado', description: 'Boas-vindas ao novo cliente' },
  { value: 'embarque_confirmado', label: 'Embarque Confirmado', description: 'Mercadoria embarcada' },
  { value: 'entrega_confirmada', label: 'Entrega Confirmada', description: 'Mercadoria entregue' },
] as const;

export function EmailNotificationTester() {
  const [email, setEmail] = useState('');
  const [emailType, setEmailType] = useState<EmailType>('nf_cadastrada');
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<Array<{ type: string; status: 'success' | 'error'; message: string; timestamp: Date }>>([]);

  const sendTestEmail = async () => {
    if (!email) {
      toast.error('Por favor, insira um email válido');
      return;
    }

    setIsLoading(true);
    
    try {
      const selectedType = emailTypes.find(t => t.value === emailType);
      
      const testData = {
        nome: 'Cliente Teste',
        numeroDocumento: `TEST-${Date.now()}`,
        cliente: 'Empresa Teste Ltda',
        transportadora: 'Transportadora Exemplo',
        email: email,
        senha: emailType === 'cliente_cadastrado' ? 'teste123' : undefined,
      };

      // Enviando email de teste

      const { data, error } = await supabase.functions.invoke('send-notification-email', {
        body: {
          to: email,
          subject: `[TESTE] ${selectedType?.label} - Sistema WMS`,
          type: emailType,
          data: testData
        }
      });

      if (error) {
        throw error;
      }

      setTestResults(prev => [{
        type: selectedType?.label || emailType,
        status: 'success',
        message: data?.message || 'Email enviado com sucesso',
        timestamp: new Date()
      }, ...prev.slice(0, 9)]); // Keep last 10 results

      toast.success(`✅ Email de teste enviado para ${email}`);
      
    } catch (error: any) {
      console.error('❌ Erro ao enviar email de teste:', error);
      
      setTestResults(prev => [{
        type: emailTypes.find(t => t.value === emailType)?.label || emailType,
        status: 'error',
        message: error.message || 'Erro desconhecido',
        timestamp: new Date()
      }, ...prev.slice(0, 9)]);

      toast.error(`❌ Erro ao enviar email: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testAllEmailTypes = async () => {
    if (!email) {
      toast.error('Por favor, insira um email válido');
      return;
    }

    setIsLoading(true);
    toast.info('🧪 Iniciando teste completo de todos os tipos de email...');
    
    let successCount = 0;
    let errorCount = 0;

    for (const emailTypeConfig of emailTypes) {
      try {
        const testData = {
          nome: 'Cliente Teste',
          numeroDocumento: `TEST-${emailTypeConfig.value}-${Date.now()}`,
          cliente: 'Empresa Teste Ltda',
          transportadora: 'Transportadora Exemplo',
          email: email,
          senha: emailTypeConfig.value === 'cliente_cadastrado' ? 'teste123' : undefined,
        };

        const { error } = await supabase.functions.invoke('send-notification-email', {
          body: {
            to: email,
            subject: `[TESTE COMPLETO] ${emailTypeConfig.label} - Sistema WMS`,
            type: emailTypeConfig.value,
            data: testData
          }
        });

        if (error) {
          throw error;
        }

        setTestResults(prev => [{
          type: emailTypeConfig.label,
          status: 'success',
          message: 'Email enviado com sucesso',
          timestamp: new Date()
        }, ...prev]);

        successCount++;
        
        // Wait 500ms between emails to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error: any) {
        console.error(`❌ Erro ao enviar ${emailTypeConfig.label}:`, error);
        
        setTestResults(prev => [{
          type: emailTypeConfig.label,
          status: 'error',
          message: error.message || 'Erro desconhecido',
          timestamp: new Date()
        }, ...prev]);

        errorCount++;
      }
    }

    setIsLoading(false);
    
    if (errorCount === 0) {
      toast.success(`🎉 Teste completo finalizado! ${successCount} emails enviados com sucesso.`);
    } else {
      toast.warning(`⚠️ Teste completo finalizado: ${successCount} sucessos, ${errorCount} erros.`);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            Testador de Notificações por Email
          </CardTitle>
          <CardDescription>
            Teste o sistema de envio de emails de notificação para verificar se está funcionando corretamente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="test-email">Email de Teste</Label>
              <Input
                id="test-email"
                type="email"
                placeholder="teste@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo de Notificação</Label>
              <Select value={emailType} onValueChange={(value: EmailType) => setEmailType(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo de email" />
                </SelectTrigger>
                <SelectContent>
                  {emailTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div>
                        <div className="font-medium">{type.label}</div>
                        <div className="text-sm text-muted-foreground">{type.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button onClick={sendTestEmail} disabled={isLoading || !email}>
                <Send className="w-4 h-4 mr-2" />
                {isLoading ? 'Enviando...' : 'Enviar Teste'}
              </Button>
              
              <Button variant="outline" onClick={testAllEmailTypes} disabled={isLoading || !email}>
                <Mail className="w-4 h-4 mr-2" />
                {isLoading ? 'Testando...' : 'Testar Todos os Tipos'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Resultados dos Testes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {testResults.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    {result.status === 'success' ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                    )}
                    <div>
                      <div className="font-medium">{result.type}</div>
                      <div className="text-sm text-muted-foreground">{result.message}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={result.status === 'success' ? 'default' : 'destructive'}>
                      {result.status === 'success' ? 'Sucesso' : 'Erro'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {result.timestamp.toLocaleTimeString('pt-BR')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status das Notificações por Etapa */}
      <Card>
        <CardHeader>
          <CardTitle>Status das Notificações por Etapa</CardTitle>
          <CardDescription>
            Verificação das notificações implementadas em cada etapa do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
              <div>
                <div className="font-medium text-green-800">✅ NF Cadastrada</div>
                <div className="text-sm text-green-600">Implementado - Email enviado quando NF é registrada</div>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
              <div>
                <div className="font-medium text-green-800">✅ Solicitação de Carregamento</div>
                <div className="text-sm text-green-600">Implementado - Email enviado quando cliente solicita</div>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
              <div>
                <div className="font-medium text-green-800">✅ Confirmação Autorizada</div>
                <div className="text-sm text-green-600">Implementado - Email enviado quando transportadora aprova</div>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
              <div>
                <div className="font-medium text-green-800">✅ Boleto Cadastrado</div>
                <div className="text-sm text-green-600">Implementado - Email enviado quando documento é criado</div>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div>
                <div className="font-medium text-blue-800">🆕 Embarque Confirmado</div>
                <div className="text-sm text-blue-600">Novo - Email enviado quando mercadoria é embarcada</div>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div>
                <div className="font-medium text-blue-800">🆕 Entrega Confirmada</div>
                <div className="text-sm text-blue-600">Novo - Email enviado quando mercadoria é entregue</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}