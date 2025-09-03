import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BackupResult {
  success: boolean;
  message: string;
  tables_backed_up: string[];
  backup_size_bytes: number;
  created_at: string;
  backup_id: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🔄 Iniciando backup automático...');

    // Tabelas principais para backup
    const tablesToBackup = [
      'transportadoras',
      'clientes', 
      'notas_fiscais',
      'documentos_financeiros',
      'pedidos_liberacao',
      'pedidos_liberados',
      'solicitacoes_carregamento',
      'nf_eventos',
      'user_transportadoras',
      'user_clientes',
      'profiles'
    ];

    const backupData: Record<string, any[]> = {};
    let totalRecords = 0;

    // Fazer backup de cada tabela
    for (const table of tablesToBackup) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*');

        if (error) {
          console.error(`❌ Erro ao fazer backup da tabela ${table}:`, error);
          continue;
        }

        backupData[table] = data || [];
        totalRecords += (data || []).length;
        console.log(`✅ Backup de ${table}: ${(data || []).length} registros`);

      } catch (err) {
        console.error(`❌ Erro inesperado na tabela ${table}:`, err);
      }
    }

    // Calcular tamanho do backup (aproximado)
    const backupJson = JSON.stringify(backupData);
    const backupSizeBytes = new TextEncoder().encode(backupJson).length;

    // Criar registro do backup na tabela system_backups
    const backupId = crypto.randomUUID();
    const { error: backupError } = await supabase
      .from('system_backups')
      .insert({
        id: backupId,
        name: `backup-automatico-${new Date().toISOString().split('T')[0]}`,
        description: `Backup automático executado em ${new Date().toISOString()}`,
        status: 'completed',
        tables_backed_up: tablesToBackup,
        backup_size_bytes: backupSizeBytes,
        completed_at: new Date().toISOString(),
        backup_path: `automated-backups/${backupId}.json`,
        created_by: null // Sistema automático
      });

    if (backupError) {
      console.error('❌ Erro ao registrar backup:', backupError);
    }

    // Salvar backup no storage (opcional - para backups maiores)
    if (backupSizeBytes < 50 * 1024 * 1024) { // Menor que 50MB
      try {
        const { error: storageError } = await supabase.storage
          .from('system-backups')
          .upload(`automated/${backupId}.json`, backupJson, {
            contentType: 'application/json'
          });

        if (storageError) {
          console.error('⚠️ Erro ao salvar no storage:', storageError);
        } else {
          console.log('💾 Backup salvo no storage com sucesso');
        }
      } catch (err) {
        console.error('⚠️ Erro inesperado no storage:', err);
      }
    }

    // Limpeza de backups antigos (manter apenas os últimos 30 dias)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { error: cleanupError } = await supabase
      .from('system_backups')
      .delete()
      .lt('created_at', thirtyDaysAgo.toISOString())
      .eq('name', 'backup-automatico-%');

    if (cleanupError) {
      console.error('⚠️ Erro na limpeza de backups antigos:', cleanupError);
    } else {
      console.log('🧹 Limpeza de backups antigos concluída');
    }

    // Log de sistema
    await supabase.rpc('log_system_event', {
      p_entity_type: 'BACKUP',
      p_action: 'AUTOMATED_BACKUP_COMPLETED',
      p_status: 'INFO',
      p_message: `Backup automático concluído com sucesso`,
      p_meta: {
        backup_id: backupId,
        tables_count: tablesToBackup.length,
        total_records: totalRecords,
        backup_size_bytes: backupSizeBytes,
        execution_time: new Date().toISOString()
      }
    });

    const result: BackupResult = {
      success: true,
      message: `Backup automático concluído com sucesso. ${totalRecords} registros de ${tablesToBackup.length} tabelas.`,
      tables_backed_up: tablesToBackup,
      backup_size_bytes: backupSizeBytes,
      created_at: new Date().toISOString(),
      backup_id: backupId
    };

    console.log('✅ Backup automático concluído:', result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Erro no backup automático:', error);

    // Log de erro
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    await supabase.rpc('log_system_event', {
      p_entity_type: 'BACKUP',
      p_action: 'AUTOMATED_BACKUP_FAILED',
      p_status: 'ERROR',
      p_message: `Falha no backup automático: ${error.message}`,
      p_meta: {
        error_details: error.toString(),
        execution_time: new Date().toISOString()
      }
    });

    return new Response(JSON.stringify({
      success: false,
      message: `Erro no backup automático: ${error.message}`,
      tables_backed_up: [],
      backup_size_bytes: 0,
      created_at: new Date().toISOString(),
      backup_id: null
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});