import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface IntegrationRequest {
  integration_type: 'api' | 'edi' | 'notfis' | 'proceda';
  operation: 'sync' | 'send' | 'receive';
  table_name: string;
  record_id?: string;
  data?: any;
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// Função para mapear status interno para externo
async function mapStatus(integration_type: string, table_name: string, internal_status: string) {
  const { data, error } = await supabase
    .from('status_mappings')
    .select('external_status')
    .eq('integration_type', integration_type)
    .eq('table_name', table_name)
    .eq('internal_status', internal_status)
    .single();

  if (error || !data) {
    console.log(`Status mapping not found for ${integration_type}/${table_name}/${internal_status}`);
    return internal_status;
  }

  return data.external_status;
}

// Função para log de integração
async function logIntegration(log_data: any) {
  const { error } = await supabase
    .from('integration_logs')
    .insert(log_data);

  if (error) {
    console.error('Error logging integration:', error);
  }
}

// Função para sincronizar dados
async function syncData(req: IntegrationRequest, transportadora_id: string) {
  const { integration_type, operation, table_name, record_id, data } = req;

  // Buscar configuração da integração
  const { data: config, error: configError } = await supabase
    .from('integration_configs')
    .select('*')
    .eq('transportadora_id', transportadora_id)
    .eq('integration_type', integration_type)
    .eq('is_active', true)
    .single();

  if (configError || !config) {
    throw new Error(`Integration config not found or inactive for ${integration_type}`);
  }

  let result;
  let log_data = {
    integration_type,
    operation,
    table_name,
    record_id,
    status: 'pending',
    message: '',
    request_data: data || {},
    response_data: {},
    error_details: {}
  };

  try {
    switch (integration_type) {
      case 'api':
        result = await syncWithAPI(config, operation, table_name, record_id, data);
        break;
      case 'edi':
        result = await syncWithEDI(config, operation, table_name, record_id, data);
        break;
      case 'notfis':
        result = await syncWithNOTFIS(config, operation, table_name, record_id, data);
        break;
      case 'proceda':
        result = await syncWithPROCEDA(config, operation, table_name, record_id, data);
        break;
      default:
        throw new Error(`Unsupported integration type: ${integration_type}`);
    }

    log_data.status = 'success';
    log_data.response_data = result;
    log_data.message = `${operation} completed successfully`;

    // Atualizar registro com dados de sincronização
    if (record_id) {
      await supabase
        .from(table_name)
        .update({
          last_sync: new Date().toISOString(),
          sync_status: 'synced',
          integration_metadata: result.metadata || {}
        })
        .eq('id', record_id);
    }

  } catch (error: any) {
    log_data.status = 'error';
    log_data.error_details = { message: error.message, stack: error.stack };
    log_data.message = `Error during ${operation}: ${error.message}`;
    
    // Atualizar registro com status de erro
    if (record_id) {
      await supabase
        .from(table_name)
        .update({
          last_sync: new Date().toISOString(),
          sync_status: 'error'
        })
        .eq('id', record_id);
    }
    
    throw error;
  } finally {
    await logIntegration(log_data);
  }

  return result;
}

// Implementações específicas para cada tipo de integração
async function syncWithAPI(config: any, operation: string, table_name: string, record_id?: string, data?: any) {
  const response = await fetch(config.endpoint_url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.api_key}`,
      ...config.config_data.headers || {}
    },
    body: JSON.stringify({
      operation,
      table_name,
      record_id,
      data
    })
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

async function syncWithEDI(config: any, operation: string, table_name: string, record_id?: string, data?: any) {
  // Implementação básica para EDI
  // Aqui você implementaria a lógica específica para EDI
  console.log('EDI sync:', { operation, table_name, record_id, data });
  
  return {
    success: true,
    edi_message_id: `EDI_${Date.now()}`,
    metadata: {
      processed_at: new Date().toISOString(),
      edi_format: 'X12',
      transaction_type: operation
    }
  };
}

async function syncWithNOTFIS(config: any, operation: string, table_name: string, record_id?: string, data?: any) {
  // Implementação básica para NOTFIS
  console.log('NOTFIS sync:', { operation, table_name, record_id, data });
  
  return {
    success: true,
    notfis_id: `NOTFIS_${Date.now()}`,
    metadata: {
      processed_at: new Date().toISOString(),
      document_type: 'NFe',
      status: 'processed'
    }
  };
}

async function syncWithPROCEDA(config: any, operation: string, table_name: string, record_id?: string, data?: any) {
  // Implementação básica para PROCEDA
  console.log('PROCEDA sync:', { operation, table_name, record_id, data });
  
  return {
    success: true,
    proceda_id: `PROC_${Date.now()}`,
    metadata: {
      processed_at: new Date().toISOString(),
      system: 'PROCEDA',
      transaction_status: 'completed'
    }
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { integration_type, operation, table_name, record_id, data }: IntegrationRequest = await req.json();

    if (!integration_type || !operation || !table_name) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: integration_type, operation, table_name" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Obter o usuário da requisição
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Obter transportadora do usuário
    const { data: userTransportadora, error: userError } = await supabase
      .from('user_transportadoras')
      .select('transportadora_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (userError || !userTransportadora) {
      return new Response(
        JSON.stringify({ error: "User transportadora not found" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const result = await syncData(
      { integration_type, operation, table_name, record_id, data },
      userTransportadora.transportadora_id
    );

    return new Response(
      JSON.stringify({ success: true, result }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in integration-sync function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);