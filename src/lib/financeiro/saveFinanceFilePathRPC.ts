import { supabase } from "@/integrations/supabase/client";

type FileKind = "boleto" | "cte";

export async function saveFinanceFilePathRPC(docId: string, kind: FileKind, uploadPath: string) {
  if (!docId) throw new Error("docId vazio");
  if (!uploadPath) throw new Error("uploadPath vazio");
  if (!["boleto", "cte"].includes(kind)) throw new Error(`Tipo inválido: ${kind}`);

  const { data, error } = await supabase.rpc("set_financeiro_file_path" as any, {
    p_doc_id: docId,
    p_kind: kind,
    p_path: uploadPath
  });

  if (error) throw error;
  if (!data) throw new Error("Nenhuma linha atualizada. Verifique docId/RLS.");

  return data;
}