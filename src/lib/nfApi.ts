import { supabase } from "@/integrations/supabase/client";

export async function solicitarNF(nfId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Usuário não autenticado');
  }

  const { error } = await supabase.rpc("nf_solicitar", { 
    p_nf_id: nfId, 
    p_user_id: user.id 
  });
  
  if (error) throw error;
}

export async function confirmarNF(nfId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Usuário não autenticado');
  }

  const { error } = await supabase.rpc("nf_confirmar", { 
    p_nf_id: nfId, 
    p_user_id: user.id 
  });
  
  if (error) throw error;
}

export async function recusarNF(nfId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Usuário não autenticado');
  }

  const { error } = await supabase.rpc("nf_recusar", { 
    p_nf_id: nfId, 
    p_user_id: user.id 
  });
  
  if (error) throw error;
}