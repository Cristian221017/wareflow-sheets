// Interfaces para tipagem segura das APIs e RPCs
export interface DashboardRPCResult {
  user_type: 'transportadora' | 'cliente';
  transportadora_id: string;
  cliente_id?: string;
  solicitacoes_pendentes: number;
  nfs_armazenadas: number;
  nfs_confirmadas: number;
  nfs_em_viagem: number;
  nfs_entregues: number;
  docs_vencendo: number;
  docs_vencidos: number;
  valor_pendente?: number;
  valor_vencido?: number;
}

export interface RealtimeStatsRPCResult {
  entity_type: string;
  entity_id: string;
  last_update: string;
  status: string;
  actor_id: string;
}

export interface FeatureFlagData {
  key: string;
  enabled: boolean;
  description?: string;
  environment: string;
  percentage?: number;
  target_users?: string[];
}

export interface IntegrationConfigData {
  id: string;
  transportadora_id: string;
  integration_type: string;
  endpoint_url?: string;
  username?: string;
  api_key?: string;
  certificate_path?: string;
  config_data: Record<string, unknown>;
  is_active: boolean;
  last_sync?: string;
}

export interface DocumentoFinanceiroData {
  id: string;
  transportadora_id: string;
  cliente_id: string;
  numero_cte: string;
  data_vencimento: string;
  valor?: number;
  data_pagamento?: string;
  status: 'Em aberto' | 'Pago' | 'Vencido' | 'Cancelado';
  arquivo_cte_path?: string;
  arquivo_boleto_path?: string;
  observacoes?: string;
  external_id?: string;
  edi_id?: string;
  sync_status: 'pending' | 'synced' | 'error';
  integration_metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AnexoData {
  id: string;
  name: string;
  filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_at: string;
  uploaded_by: string;
}

export interface SystemLogData {
  id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  actor_user_id?: string;
  transportadora_id?: string;
  cliente_id?: string;
  status: 'INFO' | 'WARN' | 'ERROR';
  message?: string;
  meta: Record<string, unknown>;
  correlation_id?: string;
  ip?: string;
  user_agent?: string;
  created_at: string;
}

// Tipos para validação de entrada
export interface CreateUserClienteLinkParams {
  p_user_id: string;
  p_cliente_id: string;
}

export interface UpdateStatusSeparacaoParams {
  p_nf_id: string;
  p_status: 'pendente' | 'separando' | 'separada' | 'conferida' | 'expedida';
}

export interface SolicitarAgendamentoParams {
  p_nf_id: string;
  p_data_agendamento?: string;
  p_observacoes?: string;
  p_anexos?: string; // JSON string
}

// Tipos para responses de mutations
export interface MutationResponse<TData = unknown> {
  data?: TData;
  error?: string;
  success: boolean;
}

// Utility types para forms
export type FormState<T> = {
  data: T;
  loading: boolean;
  error?: string;
}

export type AsyncOperationState = {
  loading: boolean;
  error?: string;
  success?: boolean;
}