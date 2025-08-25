import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { DocumentoFinanceiro, DocumentoFinanceiroFormData, FileUploadData } from '@/types/financeiro';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

// Utilitários para padronizar datas
const formatDateForDatabase = (dateString: string): string => {
  if (!dateString) return '';
  // Garante que a data seja interpretada corretamente no timezone local
  return dateString;
};

const isDateOverdue = (dateString: string, status: string): boolean => {
  if (!dateString || status !== 'Em aberto') return false;
  const date = new Date(dateString + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
};

interface FinanceiroContextType {
  documentosFinanceiros: DocumentoFinanceiro[];
  loading: boolean;
  addDocumentoFinanceiro: (data: DocumentoFinanceiroFormData) => Promise<{ id: string } | null>;
  updateDocumentoFinanceiro: (id: string, data: Partial<DocumentoFinanceiroFormData>) => Promise<void>;
  deleteDocumentoFinanceiro: (id: string) => Promise<void>;
  uploadArquivo: (documentoId: string, fileData: FileUploadData) => Promise<void>;
  downloadArquivo: (documentoId: string, type: 'boleto' | 'cte') => Promise<void>;
  atualizarStatusVencidos: () => Promise<void>;
  refetch: () => Promise<void>;
}

const FinanceiroContext = createContext<FinanceiroContextType | undefined>(undefined);

export function FinanceiroProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [documentosFinanceiros, setDocumentosFinanceiros] = useState<DocumentoFinanceiro[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDocumentosFinanceiros = async () => {
    if (!isAuthenticated || !user) {
      setDocumentosFinanceiros([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Query direta para documentos financeiros 
      const { data, error } = await supabase
        .from('documentos_financeiros' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erro ao buscar documentos financeiros:', error);
        toast.error('Erro ao carregar documentos financeiros');
        return;
      }

      const documentosFormatados = data?.map((doc: any) => ({
        id: doc.id,
        transportadoraId: doc.transportadora_id,
        clienteId: doc.cliente_id,
        numeroCte: doc.numero_cte,
        dataVencimento: doc.data_vencimento,
        valor: doc.valor,
        status: doc.status,
        observacoes: doc.observacoes,
        arquivoBoletoPath: doc.arquivo_boleto_path,
        arquivoCtePath: doc.arquivo_cte_path,
        dataPagamento: doc.data_pagamento,
        createdAt: doc.created_at,
        updatedAt: doc.updated_at
      })) as DocumentoFinanceiro[];

      setDocumentosFinanceiros(documentosFormatados || []);
    } catch (error) {
      console.error('Erro inesperado ao buscar documentos financeiros:', error);
      toast.error('Erro inesperado ao carregar documentos');
    } finally {
      setLoading(false);
    }
  };

  const addDocumentoFinanceiro = async (data: DocumentoFinanceiroFormData) => {
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    try {
      // Primeiro, buscar a transportadora do usuário usando função RPC
      const { data: userTransportadora, error: userError } = await supabase
        .rpc('get_user_transportadora', { _user_id: user.id } as any);

      if (userError || !userTransportadora) {
        throw new Error('Erro ao identificar transportadora do usuário');
      }

      const documentoData = {
        transportadora_id: userTransportadora,
        cliente_id: data.clienteId,
        numero_cte: data.numeroCte,
        data_vencimento: formatDateForDatabase(data.dataVencimento),
        valor: data.valor,
        observacoes: data.observacoes,
        status: data.status || 'Em aberto',
        data_pagamento: data.dataPagamento ? formatDateForDatabase(data.dataPagamento) : null
      };

      const { data: insertedData, error } = await supabase
        .from('documentos_financeiros' as any)
        .insert([documentoData])
        .select()
        .single();

      if (error) {
        console.error('Erro ao inserir documento financeiro:', error);
        throw new Error('Erro ao cadastrar documento financeiro');
      }

      await fetchDocumentosFinanceiros();
      return { id: (insertedData as any).id };
    } catch (error) {
      console.error('Erro ao adicionar documento financeiro:', error);
      throw error;
    }
  };

  const updateDocumentoFinanceiro = async (id: string, data: Partial<DocumentoFinanceiroFormData>) => {
    try {
      const updateData: any = {};
      
      if (data.status !== undefined) updateData.status = data.status;
      if (data.valor !== undefined) updateData.valor = data.valor;
      if (data.observacoes !== undefined) updateData.observacoes = data.observacoes;
      if (data.dataPagamento !== undefined) {
        updateData.data_pagamento = data.dataPagamento ? formatDateForDatabase(data.dataPagamento) : null;
      }

      const { error } = await supabase
        .from('documentos_financeiros' as any)
        .update(updateData)
        .eq('id', id);

      if (error) {
        console.error('Erro ao atualizar documento financeiro:', error);
        throw new Error('Erro ao atualizar documento financeiro');
      }

      await fetchDocumentosFinanceiros();
      toast.success('Documento financeiro atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar documento financeiro:', error);
      throw error;
    }
  };

  const deleteDocumentoFinanceiro = async (id: string) => {
    try {
      const { error } = await supabase
        .from('documentos_financeiros' as any)
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao excluir documento financeiro:', error);
        throw new Error('Erro ao excluir documento financeiro');
      }

      await fetchDocumentosFinanceiros();
      toast.success('Documento financeiro excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir documento financeiro:', error);
      throw error;
    }
  };

  const uploadArquivo = async (documentoId: string, fileData: FileUploadData) => {
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    try {
      // B) Salvar caminho do arquivo após upload + invalidar listas
      const uploadPath = `${user.id}/${fileData.numeroCte}/${fileData.type}-${fileData.file.name}`;
      console.log('📤 Iniciando upload:', { uploadPath, documentoId, fileType: fileData.type });
      
      const { error: uploadError } = await supabase.storage
        .from('financeiro-docs')
        .upload(uploadPath, fileData.file, { 
          upsert: true, 
          contentType: fileData.file.type 
        });
      
      if (uploadError) {
        console.error('❌ Erro no upload para storage:', uploadError);
        throw uploadError;
      }
      
      console.log('✅ Upload para storage concluído');

      // Atualizar o registro com o path do arquivo
      const updateField = fileData.type === 'boleto' ? 'arquivo_boleto_path' : 'arquivo_cte_path';
      console.log('📝 Atualizando banco de dados:', { updateField, uploadPath, documentoId });
      
      const { data: updateResult, error: updErr } = await supabase
        .from('documentos_financeiros' as any)
        .update({ [updateField]: uploadPath })
        .eq('id', documentoId)
        .select();

      if (updErr) {
        console.error('❌ Erro ao atualizar path no banco:', updErr);
        throw updErr;
      }

      if (!updateResult || updateResult.length === 0) {
        console.error('❌ Nenhum documento foi atualizado - documento não encontrado');
        throw new Error('Documento não encontrado para atualização');
      }

      console.log('✅ Path atualizado no banco de dados:', updateResult[0]);

      // Invalidar listas de financeiro (cliente e transportadora)
      queryClient.invalidateQueries({ queryKey: ['documentos_financeiros'] });
      queryClient.invalidateQueries({ queryKey: ['financeiro'] });
      
      await fetchDocumentosFinanceiros();
      toast.success(`${fileData.type === 'boleto' ? 'Boleto' : 'CTE'} anexado com sucesso!`);
    } catch (error) {
      console.error('❌ Erro completo no upload de arquivo:', error);
      throw error;
    }
  };

  const downloadArquivo = async (documentoId: string, type: 'boleto' | 'cte') => {
    try {
      console.log('📥 Iniciando download:', { documentoId, type });
      
      const documento = documentosFinanceiros.find(d => d.id === documentoId);
      if (!documento) {
        throw new Error('Documento não encontrado');
      }

      const filePath = type === 'boleto' ? documento.arquivoBoletoPath : documento.arquivoCtePath;
      console.log('📂 Path do arquivo:', filePath);
      
      if (!filePath) {
        throw new Error(`${type === 'boleto' ? 'Boleto' : 'CTE'} não encontrado`);
      }

      console.log('📥 Baixando arquivo do storage:', filePath);
      const { data, error } = await supabase.storage
        .from('financeiro-docs')
        .download(filePath);

      if (error) {
        console.error('❌ Erro no download:', error);
        throw new Error('Erro ao baixar arquivo');
      }

      console.log('✅ Arquivo baixado com sucesso');
      
      // Criar URL de download e disparar download
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${documento.numeroCte}_${type}.${filePath.split('.').pop()}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`${type === 'boleto' ? 'Boleto' : 'CTE'} baixado com sucesso!`);
    } catch (error) {
      console.error('❌ Erro completo no download:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao baixar arquivo');
    }
  };

  const atualizarStatusVencidos = async () => {
    try {
      const { error } = await supabase.rpc('atualizar_status_vencidos' as any);
      
      if (error) {
        console.error('Erro ao atualizar status vencidos:', error);
        return;
      }

      await fetchDocumentosFinanceiros();
    } catch (error) {
      console.error('Erro ao atualizar status vencidos:', error);
    }
  };

  const refetch = async () => {
    await fetchDocumentosFinanceiros();
  };

  useEffect(() => {
    fetchDocumentosFinanceiros();
  }, [isAuthenticated, user]);

  // Atualizar status vencidos automaticamente ao carregar
  useEffect(() => {
    if (documentosFinanceiros.length > 0) {
      atualizarStatusVencidos();
    }
  }, []);

  return (
    <FinanceiroContext.Provider
      value={{
        documentosFinanceiros,
        loading,
        addDocumentoFinanceiro,
        updateDocumentoFinanceiro,
        deleteDocumentoFinanceiro,
        uploadArquivo,
        downloadArquivo,
        atualizarStatusVencidos,
        refetch
      }}
    >
      {children}
    </FinanceiroContext.Provider>
  );
}

export function useFinanceiro() {
  const context = useContext(FinanceiroContext);
  if (context === undefined) {
    throw new Error('useFinanceiro deve ser usado dentro de um FinanceiroProvider');
  }
  return context;
}