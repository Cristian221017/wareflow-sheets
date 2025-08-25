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
          numero_cte: string
          observacoes: string | null
          status: string
          sync_status: string | null
          transportadora_id: string
          updated_at: string
          valor: number | null
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
          numero_cte: string
          observacoes?: string | null
          status?: string
          sync_status?: string | null
          transportadora_id: string
          updated_at?: string
          valor?: number | null
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
          numero_cte?: string
          observacoes?: string | null
          status?: string
          sync_status?: string | null
          transportadora_id?: string
          updated_at?: string
          valor?: number | null
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
          payload: Json | null
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
          payload?: Json | null
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
          payload?: Json | null
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
      notas_fiscais: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          cliente_id: string
          cnpj_fornecedor: string
          created_at: string
          data_recebimento: string
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
          ordem_compra: string
          peso: number
          produto: string
          quantidade: number
          requested_at: string | null
          requested_by: string | null
          status: string
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
          data_recebimento: string
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
          ordem_compra: string
          peso: number
          produto: string
          quantidade: number
          requested_at?: string | null
          requested_by?: string | null
          status?: string
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
          data_recebimento?: string
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
          ordem_compra?: string
          peso?: number
          produto?: string
          quantidade?: number
          requested_at?: string | null
          requested_by?: string | null
          status?: string
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
          created_at: string
          email: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      create_transportadora_with_admin: {
        Args: {
          p_admin_email: string
          p_admin_password: string
          p_transportadora_data: Json
        }
        Returns: string
      }
      email_matches: {
        Args: { email1: string; email2: string }
        Returns: boolean
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
      get_cliente_transportadora: {
        Args: { _user_id: string }
        Returns: string
      }
      get_current_user_dashboard: {
        Args: Record<PropertyKey, never>
        Returns: {
          cliente_id: string
          docs_vencendo: number
          docs_vencidos: number
          nfs_armazenadas: number
          nfs_confirmadas: number
          solicitacoes_pendentes: number
          transportadora_id: string
          user_type: string
          valor_pendente: number
          valor_vencido: number
        }[]
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
        Args: {
          p_actor_id: string
          p_actor_role: string
          p_entity_id: string
          p_entity_type: string
          p_event_type: string
          p_payload?: Json
        }
        Returns: string
      }
      nf_confirmar: {
        Args: { p_nf_id: string; p_user_id: string }
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
      nf_recusar: {
        Args: { p_nf_id: string; p_user_id: string }
        Returns: undefined
      }
      nf_solicitar: {
        Args: { p_nf_id: string; p_user_id: string }
        Returns: undefined
      }
      refresh_dashboard_views: {
        Args: Record<PropertyKey, never>
        Returns: undefined
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
    }
    Enums: {
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
      user_role: ["super_admin", "admin_transportadora", "operador", "cliente"],
    },
  },
} as const
