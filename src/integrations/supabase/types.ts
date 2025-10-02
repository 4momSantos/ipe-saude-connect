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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      credenciado_crms: {
        Row: {
          created_at: string | null
          credenciado_id: string
          crm: string
          especialidade: string
          id: string
          uf_crm: string
        }
        Insert: {
          created_at?: string | null
          credenciado_id: string
          crm: string
          especialidade: string
          id?: string
          uf_crm: string
        }
        Update: {
          created_at?: string | null
          credenciado_id?: string
          crm?: string
          especialidade?: string
          id?: string
          uf_crm?: string
        }
        Relationships: [
          {
            foreignKeyName: "credenciado_crms_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "credenciados"
            referencedColumns: ["id"]
          },
        ]
      }
      credenciado_historico: {
        Row: {
          created_at: string | null
          credenciado_id: string
          data_ocorrencia: string | null
          descricao: string
          id: string
          tipo: string
          usuario_responsavel: string | null
        }
        Insert: {
          created_at?: string | null
          credenciado_id: string
          data_ocorrencia?: string | null
          descricao: string
          id?: string
          tipo: string
          usuario_responsavel?: string | null
        }
        Update: {
          created_at?: string | null
          credenciado_id?: string
          data_ocorrencia?: string | null
          descricao?: string
          id?: string
          tipo?: string
          usuario_responsavel?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credenciado_historico_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "credenciados"
            referencedColumns: ["id"]
          },
        ]
      }
      credenciados: {
        Row: {
          celular: string | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          cpf: string | null
          created_at: string | null
          data_nascimento: string | null
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          nome: string
          observacoes: string | null
          porte: string | null
          rg: string | null
          status: string
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          celular?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          cpf?: string | null
          created_at?: string | null
          data_nascimento?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          porte?: string | null
          rg?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          celular?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          cpf?: string | null
          created_at?: string | null
          data_nascimento?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          porte?: string | null
          rg?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      horarios_atendimento: {
        Row: {
          created_at: string | null
          credenciado_crm_id: string
          dia_semana: string
          horario_fim: string
          horario_inicio: string
          id: string
        }
        Insert: {
          created_at?: string | null
          credenciado_crm_id: string
          dia_semana: string
          horario_fim: string
          horario_inicio: string
          id?: string
        }
        Update: {
          created_at?: string | null
          credenciado_crm_id?: string
          dia_semana?: string
          horario_fim?: string
          horario_inicio?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "horarios_atendimento_credenciado_crm_id_fkey"
            columns: ["credenciado_crm_id"]
            isOneToOne: false
            referencedRelation: "credenciado_crms"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitacoes_alteracao: {
        Row: {
          analisado_em: string | null
          analisado_por: string | null
          created_at: string | null
          credenciado_id: string
          dados_atuais: Json | null
          dados_propostos: Json
          id: string
          justificativa: string | null
          observacoes_analise: string | null
          solicitado_em: string | null
          status: string
          tipo_alteracao: string
        }
        Insert: {
          analisado_em?: string | null
          analisado_por?: string | null
          created_at?: string | null
          credenciado_id: string
          dados_atuais?: Json | null
          dados_propostos: Json
          id?: string
          justificativa?: string | null
          observacoes_analise?: string | null
          solicitado_em?: string | null
          status?: string
          tipo_alteracao: string
        }
        Update: {
          analisado_em?: string | null
          analisado_por?: string | null
          created_at?: string | null
          credenciado_id?: string
          dados_atuais?: Json | null
          dados_propostos?: Json
          id?: string
          justificativa?: string | null
          observacoes_analise?: string | null
          solicitado_em?: string | null
          status?: string
          tipo_alteracao?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_alteracao_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "credenciados"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_executions: {
        Row: {
          completed_at: string | null
          created_at: string
          current_node_id: string | null
          error_message: string | null
          id: string
          started_at: string
          started_by: string | null
          status: string
          workflow_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_node_id?: string | null
          error_message?: string | null
          id?: string
          started_at?: string
          started_by?: string | null
          status?: string
          workflow_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_node_id?: string | null
          error_message?: string | null
          id?: string
          started_at?: string
          started_by?: string | null
          status?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_executions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_form_data: {
        Row: {
          created_at: string
          execution_id: string
          form_fields: Json
          id: string
          step_execution_id: string
          submitted_at: string
          submitted_by: string | null
        }
        Insert: {
          created_at?: string
          execution_id: string
          form_fields: Json
          id?: string
          step_execution_id: string
          submitted_at?: string
          submitted_by?: string | null
        }
        Update: {
          created_at?: string
          execution_id?: string
          form_fields?: Json
          id?: string
          step_execution_id?: string
          submitted_at?: string
          submitted_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_form_data_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_form_data_step_execution_id_fkey"
            columns: ["step_execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_step_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_step_executions: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          execution_id: string
          id: string
          input_data: Json | null
          node_id: string
          node_type: string
          output_data: Json | null
          started_at: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          execution_id: string
          id?: string
          input_data?: Json | null
          node_id: string
          node_type: string
          output_data?: Json | null
          started_at?: string | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          execution_id?: string
          id?: string
          input_data?: Json | null
          node_id?: string
          node_type?: string
          output_data?: Json | null
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_step_executions_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          edges: Json
          id: string
          is_active: boolean
          name: string
          nodes: Json
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          edges: Json
          id?: string
          is_active?: boolean
          name: string
          nodes: Json
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          edges?: Json
          id?: string
          is_active?: boolean
          name?: string
          nodes?: Json
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
