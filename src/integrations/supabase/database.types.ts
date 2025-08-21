export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      clientes: {
        Row: {
          cep: string | null
          cidade: string | null
          cnpj: string
          created_at: string
          email: string
          email_liberacao_autorizada: string | null
          email_nota_fiscal: string | null
          email_solicitacao_liberacao: string | null
          endereco: string | null
          estado: string | null
          id: string
          nome_fantasia: string | null
          razao_social: string
          status: string
          telefone: string | null
          transportadora_id: string
          updated_at: string
        }
        Insert: {
          cep?: string | null
          cidade?: string | null
          cnpj: string
          created_at?: string
          email: string
          email_liberacao_autorizada?: string | null
          email_nota_fiscal?: string | null
          email_solicitacao_liberacao?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome_fantasia?: string | null
          razao_social: string
          status?: string
          telefone?: string | null
          transportadora_id: string
          updated_at?: string
        }
        Update: {
          cep?: string | null
          cidade?: string | null
          cnpj?: string
          created_at?: string
          email?: string
          email_liberacao_autorizada?: string | null
          email_nota_fiscal?: string | null
          email_solicitacao_liberacao?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome_fantasia?: string | null
          razao_social?: string
          status?: string
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
          }
        ]
      }
      notas_fiscais: {
        Row: {
          cliente_id: string
          cnpj_fornecedor: string
          created_at: string
          data_recebimento: string
          fornecedor: string
          id: string
          localizacao: string
          numero_nf: string
          numero_pedido: string
          ordem_compra: string
          peso: number
          produto: string
          quantidade: number
          status: string
          transportadora_id: string
          updated_at: string
          volume: number
        }
        Insert: {
          cliente_id: string
          cnpj_fornecedor: string
          created_at?: string
          data_recebimento: string
          fornecedor: string
          id?: string
          localizacao: string
          numero_nf: string
          numero_pedido: string
          ordem_compra: string
          peso: number
          produto: string
          quantidade: number
          status?: string
          transportadora_id: string
          updated_at?: string
          volume: number
        }
        Update: {
          cliente_id?: string
          cnpj_fornecedor?: string
          created_at?: string
          data_recebimento?: string
          fornecedor?: string
          id?: string
          localizacao?: string
          numero_nf?: string
          numero_pedido?: string
          ordem_compra?: string
          peso?: number
          produto?: string
          quantidade?: number
          status?: string
          transportadora_id?: string
          updated_at?: string
          volume?: number
        }
        Relationships: []
      }
      pedidos_liberacao: {
        Row: {
          cliente_id: string
          created_at: string
          data_solicitacao: string
          id: string
          nota_fiscal_id: string
          numero_pedido: string
          ordem_compra: string
          peso: number
          prioridade: string
          produto: string
          quantidade: number
          responsavel: string
          status: string
          transportadora_id: string
          updated_at: string
          volume: number
        }
        Insert: {
          cliente_id: string
          created_at?: string
          data_solicitacao?: string
          id?: string
          nota_fiscal_id: string
          numero_pedido: string
          ordem_compra: string
          peso: number
          prioridade?: string
          produto: string
          quantidade: number
          responsavel: string
          status?: string
          transportadora_id: string
          updated_at?: string
          volume: number
        }
        Update: {
          cliente_id?: string
          created_at?: string
          data_solicitacao?: string
          id?: string
          nota_fiscal_id?: string
          numero_pedido?: string
          ordem_compra?: string
          peso?: number
          prioridade?: string
          produto?: string
          quantidade?: number
          responsavel?: string
          status?: string
          transportadora_id?: string
          updated_at?: string
          volume?: number
        }
        Relationships: []
      }
      pedidos_liberados: {
        Row: {
          cliente_id: string
          created_at: string
          data_expedicao: string | null
          data_liberacao: string
          id: string
          nota_fiscal_id: string
          numero_pedido: string
          ordem_compra: string
          pedido_liberacao_id: string
          peso: number
          quantidade: number
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
          id?: string
          nota_fiscal_id: string
          numero_pedido: string
          ordem_compra: string
          pedido_liberacao_id: string
          peso: number
          quantidade: number
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
          id?: string
          nota_fiscal_id?: string
          numero_pedido?: string
          ordem_compra?: string
          pedido_liberacao_id?: string
          peso?: number
          quantidade?: number
          transportadora_id?: string
          transportadora_responsavel?: string
          updated_at?: string
          volume?: number
        }
        Relationships: []
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
      user_transportadoras: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          role: "super_admin" | "admin_transportadora" | "operador"
          transportadora_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          role?: "super_admin" | "admin_transportadora" | "operador"
          transportadora_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          role?: "super_admin" | "admin_transportadora" | "operador"
          transportadora_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_transportadora: {
        Args: {
          user_id: string
        }
        Returns: string
      }
      has_role: {
        Args: {
          user_id: string
          required_role: "super_admin" | "admin_transportadora" | "operador"
        }
        Returns: boolean
      }
      nf_solicitar: {
        Args: {
          p_nf_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      nf_confirmar: {
        Args: {
          p_nf_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      nf_recusar: {
        Args: {
          p_nf_id: string
          p_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      user_role: "super_admin" | "admin_transportadora" | "operador"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}