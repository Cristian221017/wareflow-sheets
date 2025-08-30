import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function EmergencyTest() {
  const [testResults, setTestResults] = useState<any>({});
  
  useEffect(() => {
    const runEmergencyTests = async () => {
      console.log('🚨 === EXECUTANDO TESTES DE EMERGÊNCIA AVANÇADOS ===');
      
      const results: any = {};
      
      // Teste 1: Verificar configuração detalhada
      const fullKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      results.config = {
        url: import.meta.env.VITE_SUPABASE_URL,
        hasKey: !!fullKey,
        keyPreview: fullKey?.substring(0, 20) + '...',
        keyLength: fullKey?.length || 0,
        keyIsJWT: fullKey?.startsWith('eyJ') || false
      };
      
      console.log('🔑 Chave completa (primeiros 50 chars):', fullKey?.substring(0, 50));
      
      // Teste 2: Teste direto da API REST sem supabase-js
      try {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`, {
          headers: {
            'apikey': fullKey,
            'Authorization': `Bearer ${fullKey}`
          }
        });
        
        results.directAPI = {
          status: response.status,
          ok: response.ok,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries())
        };
        
        console.log('🌐 Resposta da API direta:', results.directAPI);
      } catch (err) {
        results.directAPI = { error: (err as Error).message };
      }
      
      // Teste 3: Teste de auth status
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        results.auth = {
          hasSession: !!session,
          error: error?.message,
          userId: session?.user?.id
        };
      } catch (err) {
        results.auth = { error: (err as Error).message };
      }
      
      // Teste 4: Teste de diferentes tabelas
      const tablesToTest = ['profiles', 'transportadoras', 'clientes'] as const;
      results.tableTests = {};
      
      for (const table of tablesToTest) {
        try {
          const { data, error } = await supabase.from(table).select('*').limit(1);
          results.tableTests[table] = {
            success: !error,
            error: error?.message,
            errorCode: error?.code,
            errorDetails: error?.details,
            hasData: data && data.length > 0
          };
        } catch (err) {
          results.tableTests[table] = { error: (err as Error).message };
        }
      }
      
      // Teste 5: Verificar se a chave JWT é válida
      try {
        if (fullKey && fullKey.startsWith('eyJ')) {
          const parts = fullKey.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            results.jwtInfo = {
              valid: true,
              iss: payload.iss,
              role: payload.role,
              exp: new Date(payload.exp * 1000).toISOString(),
              expired: payload.exp * 1000 < Date.now()
            };
          } else {
            results.jwtInfo = { valid: false, reason: 'JWT malformado' };
          }
        } else {
          results.jwtInfo = { valid: false, reason: 'Não é um JWT' };
        }
      } catch (err) {
        results.jwtInfo = { valid: false, error: (err as Error).message };
      }
      
      // Teste 6: Teste de conexão com timeout
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?select=id&limit=1`, {
          headers: {
            'apikey': fullKey,
            'Authorization': `Bearer ${fullKey}`,
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        const responseText = await response.text();
        results.connectionTest = {
          status: response.status,
          statusText: response.statusText,
          responseText: responseText.substring(0, 200),
          headers: Object.fromEntries([...response.headers.entries()])
        };
      } catch (err) {
        results.connectionTest = { error: (err as Error).message };
      }
      
      console.log('🔍 Resultados completos dos testes:', results);
      setTestResults(results);
    };
    
    runEmergencyTests();
  }, []);
  
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h1 className="text-2xl font-bold text-red-800 mb-4">
          🚨 MODO EMERGÊNCIA - DIAGNÓSTICO SUPABASE
        </h1>
        
        <div className="space-y-4">
          <div className="bg-white p-4 rounded border">
            <h2 className="font-bold text-lg mb-2">📋 Configuração</h2>
            <pre className="text-sm bg-gray-100 p-2 rounded overflow-x-auto">
              {JSON.stringify(testResults.config, null, 2)}
            </pre>
          </div>
          
          <div className="bg-white p-4 rounded border">
            <h2 className="font-bold text-lg mb-2">🌐 Teste API Direta</h2>
            <pre className="text-sm bg-gray-100 p-2 rounded overflow-x-auto">
              {JSON.stringify(testResults.directAPI, null, 2)}
            </pre>
          </div>
          
          <div className="bg-white p-4 rounded border">
            <h2 className="font-bold text-lg mb-2">🔐 Autenticação</h2>
            <pre className="text-sm bg-gray-100 p-2 rounded overflow-x-auto">
              {JSON.stringify(testResults.auth, null, 2)}
            </pre>
          </div>
          
          <div className="bg-white p-4 rounded border">
            <h2 className="font-bold text-lg mb-2">📊 Testes de Tabelas</h2>
            <pre className="text-sm bg-gray-100 p-2 rounded overflow-x-auto">
              {JSON.stringify(testResults.tableTests, null, 2)}
            </pre>
          </div>
          
          <div className="bg-white p-4 rounded border">
            <h2 className="font-bold text-lg mb-2">🔑 JWT Info</h2>
            <pre className="text-sm bg-gray-100 p-2 rounded overflow-x-auto">
              {JSON.stringify(testResults.jwtInfo, null, 2)}
            </pre>
          </div>
          
          <div className="bg-white p-4 rounded border">
            <h2 className="font-bold text-lg mb-2">🔗 Teste de Conexão</h2>
            <pre className="text-sm bg-gray-100 p-2 rounded overflow-x-auto">
              {JSON.stringify(testResults.connectionTest, null, 2)}
            </pre>
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-yellow-800 font-medium">
            ℹ️ Este componente está executando testes diretos no Supabase para identificar onde está o problema.
            Verifique o console do navegador para logs detalhados.
          </p>
        </div>
      </div>
    </div>
  );
}