import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { DocumentoFinanceiro, DocumentoFinanceiroFormData, FileUploadData } from '@/types/financeiro';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { saveFinanceFilePathRPC } from '@/lib/financeiro/saveFinanceFilePathRPC';
import { saveFinanceFilePathV2 } from '@/lib/financeiro/saveFinanceFilePathV2';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { notificationService } from '@/utils/notificationService';
import { log, warn, error as logError } from '@/utils/logger';
import { formatDateForDatabase, isDateOverdue } from '@/utils/date';

// Sanitização de path para uploads
function slugify(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
          .replace(/[^a-zA-Z0-9._-]/g, '_')                 // só seguro
          .replace(/_+/g, '_').toLowerCase();
}

interface FinanceiroContextType {
  documentos: DocumentoFinanceiro[];
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
  const { isEnabled } = useFeatureFlags();
  const [documentosFinanceiros, setDocumentosFinanceiros] = useState<DocumentoFinanceiro[]>([]);
  const [loading, setLoading] = useState(false);

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
        logError('❌ Erro ao buscar documentos financeiros:', error);
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
    } catch (err) {
      logError('Erro inesperado ao buscar documentos financeiros:', err);
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
        logError('Erro ao inserir documento financeiro:', error);
        throw new Error('Erro ao cadastrar documento financeiro');
      }

      await fetchDocumentosFinanceiros();
      return { id: (insertedData as any).id };
    } catch (err) {
      logError('Erro ao adicionar documento financeiro:', err);
      throw err;
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
        logError('Erro ao atualizar documento financeiro:', error);
        throw new Error('Erro ao atualizar documento financeiro');
      }

      await fetchDocumentosFinanceiros();
      toast.success('Documento financeiro atualizado com sucesso!');
    } catch (err) {
      logError('Erro ao atualizar documento financeiro:', err);
      throw err;
    }
  };

  const deleteDocumentoFinanceiro = async (id: string) => {
    try {
      const { error } = await supabase
        .from('documentos_financeiros' as any)
        .delete()
        .eq('id', id);

      if (error) {
        logError('Erro ao excluir documento financeiro:', error);
        throw new Error('Erro ao excluir documento financeiro');
      }

      await fetchDocumentosFinanceiros();
      toast.success('Documento financeiro excluído com sucesso!');
    } catch (err) {
      logError('Erro ao excluir documento financeiro:', err);
      throw err;
    }
  };

  const uploadArquivo = async (documentoId: string, fileData: FileUploadData) => {
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    try {
      // B) Salvar caminho do arquivo após upload + invalidar listas
      const safeNumber = slugify(fileData.numeroCte || 'sem_numero');
      const safeName = slugify(fileData.file.name);
      const uploadPath = `${user.id}/${safeNumber}/${fileData.type}-${safeName}`;
      log('📤 Iniciando upload:', { uploadPath, documentoId, fileType: fileData.type });
      
      // 1) Upload do arquivo
      const { error: uploadError } = await supabase.storage
        .from('financeiro-docs')
        .upload(uploadPath, fileData.file, { 
          upsert: true, 
          contentType: fileData.file.type 
        });
      
      if (uploadError) {
        logError('❌ Erro no upload para storage:', uploadError);
        throw uploadError;
      }
      
      log('✅ Upload para storage concluído');

      // 2) Salvar path no registro usando RPC segura (com versionamento)
      try {
        log('📝 Salvando path no banco de dados via RPC:', { documentoId, type: fileData.type, uploadPath });
        
        // Use v2 RPC if feature flag is enabled, fallback to v1
        if (isEnabled('enable_new_financeiro_v2', false)) {
          log('🆕 Usando RPC v2 para salvar path');
          await saveFinanceFilePathV2(documentoId, fileData.type as "boleto" | "cte", uploadPath);
        } else {
          log('📝 Usando RPC v1 para salvar path');
          await saveFinanceFilePathRPC(documentoId, fileData.type as "boleto" | "cte", uploadPath);
        }
        
        log('✅ Path salvo no banco de dados via RPC');
      } catch (pathError) {
        logError('❌ Erro ao salvar path no banco:', pathError);
        
        // Rollback defensivo: remover arquivo órfão
        await supabase.storage.from('financeiro-docs').remove([uploadPath]);
        log('🗑️ Arquivo órfão removido devido ao erro de path');
        
        throw pathError;
      }

      // 3) Invalidar listas de financeiro (cliente e transportadora) com escopo específico
      const doc = documentosFinanceiros.find(d => d.id === documentoId);
      if (doc) {
        queryClient.invalidateQueries({ queryKey: ['documentos_financeiros', 'transportadora', doc.transportadoraId] });
        queryClient.invalidateQueries({ queryKey: ['documentos_financeiros', 'cliente', doc.clienteId] });
      } else {
        // Fallback para invalidação geral
        queryClient.invalidateQueries({ queryKey: ['documentos_financeiros'] });
        queryClient.invalidateQueries({ queryKey: ['financeiro'] });
      }
      
      await fetchDocumentosFinanceiros();
      toast.success(`${fileData.type === 'boleto' ? 'Boleto' : 'CTE'} anexado com sucesso!`);
    } catch (err) {
      logError('❌ Erro completo no upload de arquivo:', err);
      throw err;
    }
  };

  const downloadArquivo = async (documentoId: string, type: 'boleto' | 'cte') => {
    try {
      log('📥 Iniciando download:', { documentoId, type });
      
      const documento = documentosFinanceiros.find(d => d.id === documentoId);
      if (!documento) {
        throw new Error('Documento não encontrado');
      }

      const filePath = type === 'boleto' ? documento.arquivoBoletoPath : documento.arquivoCtePath;
      log('📂 Path do arquivo:', filePath);
      
      if (!filePath) {
        throw new Error(`${type === 'boleto' ? 'Boleto' : 'CTE'} não encontrado`);
      }

      log('📥 Baixando arquivo do storage:', filePath);
      const { data, error: downloadError } = await supabase.storage
        .from('financeiro-docs')
        .download(filePath);

      if (!downloadError && data) {
        log('✅ Download direto bem-sucedido');
        const url = URL.createObjectURL(data);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${documento.numeroCte}_${type}.${filePath.split('.').pop()}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success(`${type === 'boleto' ? 'Boleto' : 'CTE'} baixado com sucesso!`);
        return;
      }

      // 🔁 Fallback com URL assinada (60s)
      warn('⚠️ Download direto falhou, usando fallback com URL assinada:', downloadError);
      const { data: signedData, error: signedError } = await supabase.storage
        .from('financeiro-docs')
        .createSignedUrl(filePath, 60);
      
      if (signedData?.signedUrl) {
        log('✅ URL assinada criada com sucesso');
        window.open(signedData.signedUrl, '_blank');
        toast.success(`${type === 'boleto' ? 'Boleto' : 'CTE'} baixado com sucesso!`);
        return;
      }

      // Registrar evento de falha
      logError('❌ Falha completa no download:', { downloadError, signedError, filePath });
      throw new Error(downloadError?.message || signedError?.message || 'Falha ao baixar arquivo');
    } catch (err) {
      logError('❌ Erro completo no download:', err);
      toast.error(err instanceof Error ? err.message : 'Erro ao baixar arquivo');
    }
  };

  const atualizarStatusVencidos = async () => {
    try {
      const { error } = await supabase.rpc('atualizar_status_vencidos' as any);
      
      if (error) {
        logError('Erro ao atualizar status vencidos:', error);
        return;
      }

      await fetchDocumentosFinanceiros();
    } catch (err) {
      logError('Erro ao atualizar status vencidos:', err);
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
        documentos: documentosFinanceiros,
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