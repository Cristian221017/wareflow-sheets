import { supabase } from "@/integrations/supabase/client";

type FileKind = "boleto" | "cte";

export async function saveFinanceFilePath(docId: string, kind: FileKind, uploadPath: string) {
  const field =
    kind === "boleto" ? "arquivo_boleto_path" :
    kind === "cte"    ? "arquivo_cte_path"    : null;

  if (!field) throw new Error(`Tipo inválido: ${kind}`);
  if (!docId) throw new Error("docId vazio");
  if (!uploadPath) throw new Error("uploadPath vazio");

  // update com chave dinâmica
  const payload: Record<string, string> = { [field]: uploadPath };

  const { data, error, count } = await supabase
    .from("documentos_financeiros")
    .update(payload)
    .eq("id", docId)
    .select("id, numero_cte, arquivo_boleto_path, arquivo_cte_path", { count: "exact" })
    .single();

  if (error) throw error;
  if (!count || !data) throw new Error("Nenhuma linha atualizada. Verifique docId/RLS.");

  return data;
}