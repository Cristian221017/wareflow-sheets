import { supabase } from "@/integrations/supabase/client";
import { logFlow } from "@/types/nf";

/**
 * API Client para operações de NF
 * IMPORTANTE: Todas as operações passam pelas RPCs para garantir transições atômicas
 */

export async function solicitarNF(nfId: string): Promise<void> {
  logFlow('solicitarNF - início', nfId);
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    const { error } = await supabase.rpc("nf_solicitar", { 
      p_nf_id: nfId, 
      p_user_id: user.id 
    });
    
    if (error) {
      logFlow('solicitarNF - erro RPC', nfId, undefined, error.message);
      throw new Error(error.message);
    }
    
    logFlow('solicitarNF - sucesso', nfId, 'SOLICITADA');
  } catch (error) {
    logFlow('solicitarNF - erro', nfId, undefined, error instanceof Error ? error.message : 'Erro desconhecido');
    throw error;
  }
}

export async function confirmarNF(nfId: string): Promise<void> {
  logFlow('confirmarNF - início', nfId);
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    const { error } = await supabase.rpc("nf_confirmar", { 
      p_nf_id: nfId, 
      p_user_id: user.id 
    });
    
    if (error) {
      logFlow('confirmarNF - erro RPC', nfId, undefined, error.message);
      throw new Error(error.message);
    }
    
    logFlow('confirmarNF - sucesso', nfId, 'CONFIRMADA');
  } catch (error) {
    logFlow('confirmarNF - erro', nfId, undefined, error instanceof Error ? error.message : 'Erro desconhecido');
    throw error;
  }
}

export async function recusarNF(nfId: string): Promise<void> {
  logFlow('recusarNF - início', nfId);
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    const { error } = await supabase.rpc("nf_recusar", { 
      p_nf_id: nfId, 
      p_user_id: user.id 
    });
    
    if (error) {
      logFlow('recusarNF - erro RPC', nfId, undefined, error.message);
      throw new Error(error.message);
    }
    
    logFlow('recusarNF - sucesso', nfId, 'ARMAZENADA');
  } catch (error) {
    logFlow('recusarNF - erro', nfId, undefined, error instanceof Error ? error.message : 'Erro desconhecido');
    throw error;
  }
}