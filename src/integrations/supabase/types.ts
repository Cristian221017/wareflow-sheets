export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      clientes: {
        Row: {
          cep: string | null
          cidade: string | null
          cnpj: string
          cnpj_normalizado: string | null
          created_at: string
          edi_id: string | null
          email: string
          email_liberacao_autorizada: string | null
          email_nota_fiscal: string | null
          email_notificacao_boleto: string | null
          email_solicitacao_liberacao: string | null
          endereco: string | null
          estado: string | null
          external_id: string | null
          id: string
          integration_metadata: Json | null
          last_sync: string | null
          nome_fantasia: string | null
          razao_social: string
          status: string
          sync_status: string | null
          telefone: string | null
          transportadora_id: string
          updated_at: string
        }
        Insert: {
          cep?: string | null
          cidade?: string | null
          cnpj: string
          cnpj_normalizado?: string | null
          created_at?: string
          edi_id?: string | null
          email: string
          email_liberacao_autorizada?: string | null
          email_nota_fiscal?: string | null
          email_notificacao_boleto?: string | null
          email_solicitacao_liberacao?: string | null
          endereco?: string | null
          estado?: string | null
          external_id?: string | null
          id?: string
          integration_metadata?: Json | null
          last_sync?: string | null
          nome_fantasia?: string | null
          razao_social: string
          status?: string
          sync_status?: string | null
          telefone?: string | null
          transportadora_id: string
          updated_at?: string
        }
        Update: {
          cep?: string | null
          cidade?: string | null
          cnpj?: string
          cnpj_normalizado?: string | null
          created_at?: string
          edi_id?: string | null
          email?: string
          email_liberacao_autorizada?: string | null
          email_nota_fiscal?: string | null
          email_notificacao_boleto?: string | null
          email_solicitacao_liberacao?: string | null
          endereco?: string | null
          estado?: string | null
          external_id?: string | null
          id?: string
          integration_metadata?: Json | null
          last_sync?: string | null
          nome_fantasia?: string | null
          razao_social?: string
          status?: string
          sync_status?: string | null
          telefone?: string | null
          transportadora_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clientes_transportadora_id_fkey"
            columns: ["transportadora_id"]
            isOneToOne: false
            referencedRelation: "transportadoras"
            referencedColumns: ["id"]
          },
        ]
      }
      deployment_config: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      deployment_validations: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          result: Json | null
          status: string
          validation_type: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          result?: Json | null
          status?: string
          validation_type: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          result?: Json | null
          status?: string
          validation_type?: string
        }
        Relationships: []
      }
      documentos_financeiros: {
        Row: {
          arquivo_boleto_path: string | null
          arquivo_cte_path: string | null
          cliente_id: string
          created_at: string
          data_pagamento: string | null
          data_vencimento: string
          edi_id: string | null
          external_id: string | null
          id: string
          integration_metadata: Json | null
          last_sync: string | null
          numero_boleto: string | null
          numero_cte: string
          observacoes: string | null
          pago_em: string | null
          status: string
          sync_status: string | null
          transportadora_id: string
          updated_at: string
          valor: number | null
          valor_pago: number | null
        }
        Insert: {
          arquivo_boleto_path?: string | null
          arquivo_cte_path?: string | null
          cliente_id: string
          created_at?: string
          data_pagamento?: string | null
          data_vencimento: string
          edi_id?: string | null
          external_id?: string | null
          id?: string
          integration_metadata?: Json | null
          last_sync?: string | null
          numero_boleto?: string | null
          numero_cte: string
          observacoes?: string | null
          pago_em?: string | null
          status?: string
          sync_status?: string | null
          transportadora_id: string
          updated_at?: string
          valor?: number | null
          valor_pago?: number | null
        }
        Update: {
          arquivo_boleto_path?: string | null
          arquivo_cte_path?: string | null
          cliente_id?: string
          created_at?: string
          data_pagamento?: string | null
          data_vencimento?: string
          edi_id?: string | null
          external_id?: string | null
          id?: string
          integration_metadata?: Json | null
          last_sync?: string | null
          numero_boleto?: string | null
          numero_cte?: string
          observacoes?: string | null
          pago_em?: string | null
          status?: string
          sync_status?: string | null
          transportadora_id?: string
          updated_at?: string
          valor?: number | null
          valor_pago?: number | null
        }
        Relationships: []
      }
      event_log: {
        Row: {
          actor_id: string
          actor_role: string
          correlation_id: string | null
          created_at: string
          entity_id: string
          entity_type: string
          event_type: string
          id: string
          level: string | null
          message: string | null
          payload: Json | null
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          actor_id: string
          actor_role: string
          correlation_id?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          event_type: string
          id?: string
          level?: string | null
          message?: string | null
          payload?: Json | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          actor_id?: string
          actor_role?: string
          correlation_id?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          event_type?: string
          id?: string
          level?: string | null
          message?: string | null
          payload?: Json | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          enabled: boolean
          environment: string
          id: string
          key: string
          percentage: number | null
          target_users: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          enabled?: boolean
          environment?: string
          id?: string
          key: string
          percentage?: number | null
          target_users?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          enabled?: boolean
          environment?: string
          id?: string
          key?: string
          percentage?: number | null
          target_users?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      integration_configs: {
        Row: {
          api_key: string | null
          certificate_path: string | null
          config_data: Json | null
          created_at: string | null
          endpoint_url: string | null
          id: string
          integration_type: string
          is_active: boolean | null
          last_sync: string | null
          password: string | null
          transportadora_id: string
          updated_at: string | null
          username: string | null
        }
        Insert: {
          api_key?: string | null
          certificate_path?: string | null
          config_data?: Json | null
          created_at?: string | null
          endpoint_url?: string | null
          id?: string
          integration_type: string
          is_active?: boolean | null
          last_sync?: string | null
          password?: string | null
          transportadora_id: string
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          api_key?: string | null
          certificate_path?: string | null
          config_data?: Json | null
          created_at?: string | null
          endpoint_url?: string | null
          id?: string
          integration_type?: string
          is_active?: boolean | null
          last_sync?: string | null
          password?: string | null
          transportadora_id?: string
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      integration_logs: {
        Row: {
          created_at: string | null
          error_details: Json | null
          external_id: string | null
          id: string
          integration_type: string
          message: string | null
          operation: string
          record_id: string | null
          request_data: Json | null
          response_data: Json | null
          retry_count: number | null
          status: string
          table_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          error_details?: Json | null
          external_id?: string | null
          id?: string
          integration_type: string
          message?: string | null
          operation: string
          record_id?: string | null
          request_data?: Json | null
          response_data?: Json | null
          retry_count?: number | null
          status?: string
          table_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          error_details?: Json | null
          external_id?: string | null
          id?: string
          integration_type?: string
          message?: string | null
          operation?: string
          record_id?: string | null
          request_data?: Json | null
          response_data?: Json | null
          retry_count?: number | null
          status?: string
          table_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      nf_eventos: {
        Row: {
          anexos: Json
          created_at: string
          created_by: string | null
          data_evento: string
          id: string
          nf_id: string
          observacoes: string | null
          tipo: string
        }
        Insert: {
          anexos?: Json
          created_at?: string
          created_by?: string | null
          data_evento?: string
          id?: string
          nf_id: string
          observacoes?: string | null
          tipo: string
        }
        Update: {
          anexos?: Json
          created_at?: string
          created_by?: string | null
          data_evento?: string
          id?: string
          nf_id?: string
          observacoes?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "nf_eventos_nf_id_fkey"
            columns: ["nf_id"]
            isOneToOne: false
            referencedRelation: "notas_fiscais"
            referencedColumns: ["id"]
          },
        ]
      }
      notas_fiscais: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          cliente_id: string
          cnpj_fornecedor: string
          created_at: string
          data_agendamento_entrega: string | null
          data_embarque: string | null
          data_entrega: string | null
          data_recebimento: string
          documentos_anexos: Json | null
          edi_id: string | null
          external_id: string | null
          fornecedor: string
          id: string
          integration_metadata: Json | null
          last_sync: string | null
          localizacao: string
          nfe_key: string | null
          numero_nf: string
          numero_pedido: string
          observacoes_solicitacao: string | null
          ordem_compra: string
          peso: number
          produto: string
          quantidade: number
          requested_at: string | null
          requested_by: string | null
          status: string
          status_separacao:
            | Database["public"]["Enums"]["separacao_status"]
            | null
          sync_status: string | null
          transportadora_id: string
          updated_at: string
          volume: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          cliente_id: string
          cnpj_fornecedor: string
          created_at?: string
          data_agendamento_entrega?: string | null
          data_embarque?: string | null
          data_entrega?: string | null
          data_recebimento: string
          documentos_anexos?: Json | null
          edi_id?: string | null
          external_id?: string | null
          fornecedor: string
          id?: string
          integration_metadata?: Json | null
          last_sync?: string | null
          localizacao: string
          nfe_key?: string | null
          numero_nf: string
          numero_pedido: string
          observacoes_solicitacao?: string | null
          ordem_compra: string
          peso: number
          produto: string
          quantidade: number
          requested_at?: string | null
          requested_by?: string | null
          status?: string
          status_separacao?:
            | Database["public"]["Enums"]["separacao_status"]
            | null
          sync_status?: string | null
          transportadora_id: string
          updated_at?: string
          volume: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          cliente_id?: string
          cnpj_fornecedor?: string
          created_at?: string
          data_agendamento_entrega?: string | null
          data_embarque?: string | null
          data_entrega?: string | null
          data_recebimento?: string
          documentos_anexos?: Json | null
          edi_id?: string | null
          external_id?: string | null
          fornecedor?: string
          id?: string
          integration_metadata?: Json | null
          last_sync?: string | null
          localizacao?: string
          nfe_key?: string | null
          numero_nf?: string
          numero_pedido?: string
          observacoes_solicitacao?: string | null
          ordem_compra?: string
          peso?: number
          produto?: string
          quantidade?: number
          requested_at?: string | null
          requested_by?: string | null
          status?: string
          status_separacao?:
            | Database["public"]["Enums"]["separacao_status"]
            | null
          sync_status?: string | null
          transportadora_id?: string
          updated_at?: string
          volume?: number
        }
        Relationships: [
          {
            foreignKeyName: "notas_fiscais_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_fiscais_transportadora_id_fkey"
            columns: ["transportadora_id"]
            isOneToOne: false
            referencedRelation: "transportadoras"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos_liberacao: {
        Row: {
          cliente_id: string
          created_at: string
          data_solicitacao: string
          edi_id: string | null
          external_id: string | null
          id: string
          integration_metadata: Json | null
          last_sync: string | null
          nota_fiscal_id: string
          numero_pedido: string
          ordem_compra: string
          peso: number
          prioridade: string
          produto: string
          quantidade: number
          responsavel: string
          status: string
          sync_status: string | null
          transportadora_id: string
          updated_at: string
          volume: number
        }
        Insert: {
          cliente_id: string
          created_at?: string
          data_solicitacao?: string
          edi_id?: string | null
          external_id?: string | null
          id?: string
          integration_metadata?: Json | null
          last_sync?: string | null
          nota_fiscal_id: string
          numero_pedido: string
          ordem_compra: string
          peso: number
          prioridade?: string
          produto: string
          quantidade: number
          responsavel: string
          status?: string
          sync_status?: string | null
          transportadora_id: string
          updated_at?: string
          volume: number
        }
        Update: {
          cliente_id?: string
          created_at?: string
          data_solicitacao?: string
          edi_id?: string | null
          external_id?: string | null
          id?: string
          integration_metadata?: Json | null
          last_sync?: string | null
          nota_fiscal_id?: string
          numero_pedido?: string
          ordem_compra?: string
          peso?: number
          prioridade?: string
          produto?: string
          quantidade?: number
          responsavel?: string
          status?: string
          sync_status?: string | null
          transportadora_id?: string
          updated_at?: string
          volume?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_liberacao_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_liberacao_nota_fiscal_id_fkey"
            columns: ["nota_fiscal_id"]
            isOneToOne: false
            referencedRelation: "notas_fiscais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_liberacao_transportadora_id_fkey"
            columns: ["transportadora_id"]
            isOneToOne: false
            referencedRelation: "transportadoras"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos_liberados: {
        Row: {
          cliente_id: string
          created_at: string
          data_expedicao: string | null
          data_liberacao: string
          edi_id: string | null
          external_id: string | null
          id: string
          integration_metadata: Json | null
          last_sync: string | null
          nota_fiscal_id: string
          numero_pedido: string
          ordem_compra: string
          pedido_liberacao_id: string
          peso: number
          quantidade: number
          sync_status: string | null
          transportadora_id: string
          transportadora_responsavel: string
          updated_at: string
          volume: number
        }
        Insert: {
          cliente_id: string
          created_at?: string
          data_expedicao?: string | null
          data_liberacao?: string
          edi_id?: string | null
          external_id?: string | null
          id?: string
          integration_metadata?: Json | null
          last_sync?: string | null
          nota_fiscal_id: string
          numero_pedido: string
          ordem_compra: string
          pedido_liberacao_id: string
          peso: number
          quantidade: number
          sync_status?: string | null
          transportadora_id: string
          transportadora_responsavel: string
          updated_at?: string
          volume: number
        }
        Update: {
          cliente_id?: string
          created_at?: string
          data_expedicao?: string | null
          data_liberacao?: string
          edi_id?: string | null
          external_id?: string | null
          id?: string
          integration_metadata?: Json | null
          last_sync?: string | null
          nota_fiscal_id?: string
          numero_pedido?: string
          ordem_compra?: string
          pedido_liberacao_id?: string
          peso?: number
          quantidade?: number
          sync_status?: string | null
          transportadora_id?: string
          transportadora_responsavel?: string
          updated_at?: string
          volume?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_liberados_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_liberados_nota_fiscal_id_fkey"
            columns: ["nota_fiscal_id"]
            isOneToOne: false
            referencedRelation: "notas_fiscais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_liberados_pedido_liberacao_id_fkey"
            columns: ["pedido_liberacao_id"]
            isOneToOne: false
            referencedRelation: "pedidos_liberacao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_liberados_transportadora_id_fkey"
            columns: ["transportadora_id"]
            isOneToOne: false
            referencedRelation: "transportadoras"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          cpf: string | null
          created_at: string
          email: string
          id: string
          name: string
          setor: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cpf?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          setor?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cpf?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          setor?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      solicitacoes_carregamento: {
        Row: {
          anexos: Json
          approved_at: string | null
          approved_by: string | null
          cliente_id: string
          created_at: string
          data_agendamento: string | null
          id: string
          nf_id: string
          observacoes: string | null
          requested_at: string
          requested_by: string
          status: string
          transportadora_id: string
          updated_at: string
        }
        Insert: {
          anexos?: Json
          approved_at?: string | null
          approved_by?: string | null
          cliente_id: string
          created_at?: string
          data_agendamento?: string | null
          id?: string
          nf_id: string
          observacoes?: string | null
          requested_at?: string
          requested_by?: string
          status?: string
          transportadora_id: string
          updated_at?: string
        }
        Update: {
          anexos?: Json
          approved_at?: string | null
          approved_by?: string | null
          cliente_id?: string
          created_at?: string
          data_agendamento?: string | null
          id?: string
          nf_id?: string
          observacoes?: string | null
          requested_at?: string
          requested_by?: string
          status?: string
          transportadora_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_carregamento_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_carregamento_nf_id_fkey"
            columns: ["nf_id"]
            isOneToOne: false
            referencedRelation: "notas_fiscais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_carregamento_transportadora_id_fkey"
            columns: ["transportadora_id"]
            isOneToOne: false
            referencedRelation: "transportadoras"
            referencedColumns: ["id"]
          },
        ]
      }
      status_mappings: {
        Row: {
          created_at: string | null
          description: string | null
          external_status: string
          id: string
          integration_type: string
          internal_status: string
          table_name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          external_status: string
          id?: string
          integration_type: string
          internal_status: string
          table_name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          external_status?: string
          id?: string
          integration_type?: string
          internal_status?: string
          table_name?: string
        }
        Relationships: []
      }
      system_backups: {
        Row: {
          backup_path: string | null
          backup_size_bytes: number | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          status: string
          tables_backed_up: string[]
        }
        Insert: {
          backup_path?: string | null
          backup_size_bytes?: number | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          status?: string
          tables_backed_up: string[]
        }
        Update: {
          backup_path?: string | null
          backup_size_bytes?: number | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          status?: string
          tables_backed_up?: string[]
        }
        Relationships: []
      }
      system_health_checks: {
        Row: {
          check_type: string
          created_at: string
          id: string
          message: string | null
          metrics: Json | null
          status: string
        }
        Insert: {
          check_type: string
          created_at?: string
          id?: string
          message?: string | null
          metrics?: Json | null
          status: string
        }
        Update: {
          check_type?: string
          created_at?: string
          id?: string
          message?: string | null
          metrics?: Json | null
          status?: string
        }
        Relationships: []
      }
      system_logs: {
        Row: {
          action: string
          actor_role: string | null
          actor_user_id: string | null
          cliente_id: string | null
          correlation_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip: unknown | null
          message: string | null
          meta: Json | null
          status: Database["public"]["Enums"]["log_level"]
          transportadora_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_role?: string | null
          actor_user_id?: string | null
          cliente_id?: string | null
          correlation_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip?: unknown | null
          message?: string | null
          meta?: Json | null
          status?: Database["public"]["Enums"]["log_level"]
          transportadora_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_role?: string | null
          actor_user_id?: string | null
          cliente_id?: string | null
          correlation_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip?: unknown | null
          message?: string | null
          meta?: Json | null
          status?: Database["public"]["Enums"]["log_level"]
          transportadora_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      transportadoras: {
        Row: {
          cep: string | null
          cidade: string | null
          cnpj: string
          created_at: string
          data_contrato: string | null
          email: string
          endereco: string | null
          estado: string | null
          id: string
          limite_clientes: number | null
          limite_usuarios: number | null
          nome_fantasia: string | null
          plano: string
          razao_social: string
          status: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          cep?: string | null
          cidade?: string | null
          cnpj: string
          created_at?: string
          data_contrato?: string | null
          email: string
          endereco?: string | null
          estado?: string | null
          id?: string
          limite_clientes?: number | null
          limite_usuarios?: number | null
          nome_fantasia?: string | null
          plano?: string
          razao_social: string
          status?: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          cep?: string | null
          cidade?: string | null
          cnpj?: string
          created_at?: string
          data_contrato?: string | null
          email?: string
          endereco?: string | null
          estado?: string | null
          id?: string
          limite_clientes?: number | null
          limite_usuarios?: number | null
          nome_fantasia?: string | null
          plano?: string
          razao_social?: string
          status?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_clientes: {
        Row: {
          cliente_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_clientes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_transportadoras: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["user_role"]
          transportadora_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          transportadora_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          transportadora_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_transportadoras_transportadora_id_fkey"
            columns: ["transportadora_id"]
            isOneToOne: false
            referencedRelation: "transportadoras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_transportadoras_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      atualizar_status_vencidos: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_logs: {
        Args: { retention_days?: number }
        Returns: number
      }
      cleanup_orphaned_users: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      create_safety_backup: {
        Args: { p_backup_name: string }
        Returns: string
      }
      create_transportadora_with_admin: {
        Args: {
          p_admin_email: string
          p_admin_password: string
          p_transportadora_data: Json
        }
        Returns: string
      }
      create_user_cliente_link: {
        Args: { p_cliente_id: string; p_user_id: string }
        Returns: boolean
      }
      create_user_cliente_link_by_email: {
        Args: { p_client_email: string }
        Returns: boolean
      }
      daily_log_cleanup: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      email_matches: {
        Args: { email1: string; email2: string }
        Returns: boolean
      }
      execute_manual_backup: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      financeiro_create_documento: {
        Args: {
          p_cliente_id: string
          p_data_vencimento: string
          p_numero_cte: string
          p_observacoes?: string
          p_status?: string
          p_valor: number
        }
        Returns: string
      }
      financeiro_update_documento: {
        Args: {
          p_data_pagamento?: string
          p_documento_id: string
          p_observacoes?: string
          p_status?: string
          p_valor?: number
        }
        Returns: undefined
      }
      fix_client_transportadora_links: {
        Args: Record<PropertyKey, never>
        Returns: {
          action_taken: string
          cliente_email: string
          cliente_id: string
          details: Json
        }[]
      }
      get_backup_cron_status: {
        Args: Record<PropertyKey, never>
        Returns: {
          active: boolean
          jobname: string
          schedule: string
        }[]
      }
      get_cliente_transportadora: {
        Args: { _user_id: string }
        Returns: string
      }
      get_clientes_for_user: {
        Args: Record<PropertyKey, never>
        Returns: {
          cnpj: string
          email: string
          id: string
          name: string
          razao_social: string
          transportadora_id: string
        }[]
      }
      get_current_user_dashboard: {
        Args: Record<PropertyKey, never>
        Returns: {
          cliente_id: string
          docs_vencendo: number
          docs_vencidos: number
          nfs_armazenadas: number
          nfs_confirmadas: number
          nfs_em_viagem: number
          nfs_entregues: number
          solicitacoes_pendentes: number
          transportadora_id: string
          user_type: string
          valor_pendente: number
          valor_vencido: number
        }[]
      }
      get_dashboard_sla_metrics: {
        Args: Record<PropertyKey, never>
        Returns: {
          cliente_id: string
          entregas_atrasadas: number
          entregas_no_prazo: number
          mercadorias_em_atraso: number
          sla_cumprimento_percent: number
          tempo_medio_entrega_horas: number
          transportadora_id: string
          user_type: string
        }[]
      }
      get_deployment_config: {
        Args: { p_key: string }
        Returns: Json
      }
      get_realtime_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          actor_id: string
          entity_id: string
          entity_type: string
          last_update: string
          status: string
        }[]
      }
      get_user_clientes_info: {
        Args: Record<PropertyKey, never>
        Returns: {
          cliente_email: string
          cliente_id: string
          cliente_nome: string
          cliente_status: string
          user_email: string
          user_id: string
          user_name: string
        }[]
      }
      get_user_data_optimized: {
        Args: { p_email: string; p_user_id: string }
        Returns: {
          user_data: Json
          user_type: string
        }[]
      }
      get_user_transportadora: {
        Args: { _user_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_event: {
        Args:
          | {
              p_action: string
              p_cliente_id?: string
              p_entity_id?: string
              p_entity_type: string
              p_message?: string
              p_meta?: Json
              p_status?: Database["public"]["Enums"]["log_level"]
              p_transportadora_id?: string
            }
          | {
              p_action?: string
              p_entity_type?: string
              p_level: string
              p_message?: string
              p_meta?: Json
            }
          | {
              p_actor_id: string
              p_actor_role: string
              p_entity_id: string
              p_entity_type: string
              p_event_type: string
              p_payload?: Json
            }
        Returns: undefined
      }
      log_system_event: {
        Args: {
          p_action: string
          p_cliente_id?: string
          p_correlation_id?: string
          p_entity_id?: string
          p_entity_type: string
          p_message?: string
          p_meta?: Json
          p_status?: Database["public"]["Enums"]["log_level"]
          p_transportadora_id?: string
        }
        Returns: {
          action: string
          actor_role: string | null
          actor_user_id: string | null
          cliente_id: string | null
          correlation_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip: unknown | null
          message: string | null
          meta: Json | null
          status: Database["public"]["Enums"]["log_level"]
          transportadora_id: string | null
          user_agent: string | null
        }
      }
      monitor_security_events: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      nf_confirmar: {
        Args: { p_nf_id: string; p_user_id: string }
        Returns: undefined
      }
      nf_confirmar_embarque: {
        Args: {
          p_anexos?: Json
          p_data?: string
          p_nf_id: string
          p_observacoes?: string
        }
        Returns: undefined
      }
      nf_confirmar_entrega: {
        Args: {
          p_anexos?: Json
          p_data?: string
          p_nf_id: string
          p_observacoes?: string
        }
        Returns: undefined
      }
      nf_create: {
        Args: {
          p_cliente_cnpj: string
          p_cnpj_fornecedor: string
          p_data_recebimento: string
          p_fornecedor: string
          p_localizacao: string
          p_numero_nf: string
          p_numero_pedido: string
          p_ordem_compra: string
          p_peso: number
          p_produto: string
          p_quantidade: number
          p_volume: number
        }
        Returns: string
      }
      nf_delete: {
        Args: { p_nf_id: string; p_user_id: string }
        Returns: undefined
      }
      nf_listar_do_cliente: {
        Args: { p_status?: string }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          cliente_id: string
          cnpj_fornecedor: string
          created_at: string
          data_agendamento_entrega: string | null
          data_embarque: string | null
          data_entrega: string | null
          data_recebimento: string
          documentos_anexos: Json | null
          edi_id: string | null
          external_id: string | null
          fornecedor: string
          id: string
          integration_metadata: Json | null
          last_sync: string | null
          localizacao: string
          nfe_key: string | null
          numero_nf: string
          numero_pedido: string
          observacoes_solicitacao: string | null
          ordem_compra: string
          peso: number
          produto: string
          quantidade: number
          requested_at: string | null
          requested_by: string | null
          status: string
          status_separacao:
            | Database["public"]["Enums"]["separacao_status"]
            | null
          sync_status: string | null
          transportadora_id: string
          updated_at: string
          volume: number
        }[]
      }
      nf_recusar: {
        Args: { p_nf_id: string; p_user_id: string }
        Returns: undefined
      }
      nf_solicitar: {
        Args: { p_nf_id: string; p_user_id: string }
        Returns: undefined
      }
      nf_solicitar_agendamento: {
        Args: {
          p_anexos: Json
          p_data_agendamento: string
          p_nf_id: string
          p_observacoes: string
        }
        Returns: string
      }
      nf_update_status_separacao: {
        Args:
          | {
              p_nf_id: string
              p_novo_status: Database["public"]["Enums"]["separacao_status"]
              p_observacoes?: string
            }
          | {
              p_nf_id: string
              p_observacoes?: string
              p_status_separacao: string
            }
        Returns: undefined
      }
      refresh_dashboard_views: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      run_system_health_check: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      set_financeiro_file_path: {
        Args: { p_doc_id: string; p_kind: string; p_path: string }
        Returns: {
          arquivo_boleto_path: string | null
          arquivo_cte_path: string | null
          cliente_id: string
          created_at: string
          data_pagamento: string | null
          data_vencimento: string
          edi_id: string | null
          external_id: string | null
          id: string
          integration_metadata: Json | null
          last_sync: string | null
          numero_boleto: string | null
          numero_cte: string
          observacoes: string | null
          pago_em: string | null
          status: string
          sync_status: string | null
          transportadora_id: string
          updated_at: string
          valor: number | null
          valor_pago: number | null
        }
      }
      set_financeiro_file_path_v2: {
        Args: { p_doc_id: string; p_kind: string; p_path: string }
        Returns: {
          arquivo_boleto_path: string | null
          arquivo_cte_path: string | null
          cliente_id: string
          created_at: string
          data_pagamento: string | null
          data_vencimento: string
          edi_id: string | null
          external_id: string | null
          id: string
          integration_metadata: Json | null
          last_sync: string | null
          numero_boleto: string | null
          numero_cte: string
          observacoes: string | null
          pago_em: string | null
          status: string
          sync_status: string | null
          transportadora_id: string
          updated_at: string
          valor: number | null
          valor_pago: number | null
        }
      }
      setup_demo_user: {
        Args: {
          transportadora_cnpj?: string
          user_email: string
          user_id: string
          user_name: string
          user_role: Database["public"]["Enums"]["user_role"]
        }
        Returns: undefined
      }
      user_exists_in_system: {
        Args: { _user_id: string }
        Returns: boolean
      }
      validate_cpf: {
        Args: { cpf_input: string }
        Returns: boolean
      }
      validate_data_integrity: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      validate_user_has_links: {
        Args: { user_uuid: string }
        Returns: boolean
      }
    }
    Enums: {
      log_level: "INFO" | "WARN" | "ERROR"
      separacao_status:
        | "pendente"
        | "em_separacao"
        | "separacao_concluida"
        | "separacao_com_pendencia"
        | "em_viagem"
        | "entregue"
      user_role: "super_admin" | "admin_transportadora" | "operador" | "cliente"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      log_level: ["INFO", "WARN", "ERROR"],
      separacao_status: [
        "pendente",
        "em_separacao",
        "separacao_concluida",
        "separacao_com_pendencia",
        "em_viagem",
        "entregue",
      ],
      user_role: ["super_admin", "admin_transportadora", "operador", "cliente"],
    },
  },
} as const
