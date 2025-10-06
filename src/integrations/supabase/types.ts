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
      app_notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string | null
          read_at: string | null
          related_id: string | null
          related_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          read_at?: string | null
          related_id?: string | null
          related_type?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          read_at?: string | null
          related_id?: string | null
          related_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          new_values: Json | null
          old_values: Json | null
          resource_id: string | null
          resource_type: string
          user_agent: string | null
          user_email: string | null
          user_id: string
          user_role: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
          user_email?: string | null
          user_id: string
          user_role?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string
          user_role?: string | null
        }
        Relationships: []
      }
      credenciado_crms: {
        Row: {
          created_at: string | null
          credenciado_id: string
          crm: string
          especialidade: string
          especialidade_id: string | null
          id: string
          uf_crm: string
        }
        Insert: {
          created_at?: string | null
          credenciado_id: string
          crm: string
          especialidade: string
          especialidade_id?: string | null
          id?: string
          uf_crm: string
        }
        Update: {
          created_at?: string | null
          credenciado_id?: string
          crm?: string
          especialidade?: string
          especialidade_id?: string | null
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
          {
            foreignKeyName: "credenciado_crms_especialidade_id_fkey"
            columns: ["especialidade_id"]
            isOneToOne: false
            referencedRelation: "especialidades_medicas"
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
          inscricao_id: string | null
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
          inscricao_id?: string | null
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
          inscricao_id?: string | null
          nome?: string
          observacoes?: string | null
          porte?: string | null
          rg?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credenciados_inscricao_id_fkey"
            columns: ["inscricao_id"]
            isOneToOne: false
            referencedRelation: "inscricoes_edital"
            referencedColumns: ["id"]
          },
        ]
      }
      editais: {
        Row: {
          anexos: Json | null
          created_at: string | null
          created_by: string | null
          criterio_julgamento: string | null
          data_autorizacao: string | null
          data_fim: string
          data_inicio: string
          data_licitacao: string | null
          data_publicacao: string | null
          descricao: string | null
          documentos_habilitacao: Json | null
          especialidade: string | null
          fonte_recursos: string | null
          garantia_execucao: number | null
          gestor_autorizador_id: string | null
          historico_alteracoes: Json | null
          id: string
          local_portal: string | null
          numero_edital: string | null
          objeto: string | null
          observacoes_autorizacao: string | null
          participacao_permitida: Json | null
          possui_vagas: boolean | null
          prazo_validade_proposta: number | null
          processo_inscricao_id: string | null
          regras_me_epp: string | null
          status: string
          titulo: string
          updated_at: string | null
          vagas: number | null
          workflow_id: string | null
          workflow_version: number | null
        }
        Insert: {
          anexos?: Json | null
          created_at?: string | null
          created_by?: string | null
          criterio_julgamento?: string | null
          data_autorizacao?: string | null
          data_fim: string
          data_inicio: string
          data_licitacao?: string | null
          data_publicacao?: string | null
          descricao?: string | null
          documentos_habilitacao?: Json | null
          especialidade?: string | null
          fonte_recursos?: string | null
          garantia_execucao?: number | null
          gestor_autorizador_id?: string | null
          historico_alteracoes?: Json | null
          id?: string
          local_portal?: string | null
          numero_edital?: string | null
          objeto?: string | null
          observacoes_autorizacao?: string | null
          participacao_permitida?: Json | null
          possui_vagas?: boolean | null
          prazo_validade_proposta?: number | null
          processo_inscricao_id?: string | null
          regras_me_epp?: string | null
          status?: string
          titulo: string
          updated_at?: string | null
          vagas?: number | null
          workflow_id?: string | null
          workflow_version?: number | null
        }
        Update: {
          anexos?: Json | null
          created_at?: string | null
          created_by?: string | null
          criterio_julgamento?: string | null
          data_autorizacao?: string | null
          data_fim?: string
          data_inicio?: string
          data_licitacao?: string | null
          data_publicacao?: string | null
          descricao?: string | null
          documentos_habilitacao?: Json | null
          especialidade?: string | null
          fonte_recursos?: string | null
          garantia_execucao?: number | null
          gestor_autorizador_id?: string | null
          historico_alteracoes?: Json | null
          id?: string
          local_portal?: string | null
          numero_edital?: string | null
          objeto?: string | null
          observacoes_autorizacao?: string | null
          participacao_permitida?: Json | null
          possui_vagas?: boolean | null
          prazo_validade_proposta?: number | null
          processo_inscricao_id?: string | null
          regras_me_epp?: string | null
          status?: string
          titulo?: string
          updated_at?: string | null
          vagas?: number | null
          workflow_id?: string | null
          workflow_version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "editais_processo_inscricao_id_fkey"
            columns: ["processo_inscricao_id"]
            isOneToOne: false
            referencedRelation: "inscription_processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "editais_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      edital_especialidades: {
        Row: {
          created_at: string | null
          edital_id: string
          especialidade_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          edital_id: string
          especialidade_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          edital_id?: string
          especialidade_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "edital_especialidades_edital_id_fkey"
            columns: ["edital_id"]
            isOneToOne: false
            referencedRelation: "editais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edital_especialidades_especialidade_id_fkey"
            columns: ["especialidade_id"]
            isOneToOne: false
            referencedRelation: "especialidades_medicas"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body: string
          category: string | null
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          subject: string
          updated_at: string | null
          variables: Json | null
        }
        Insert: {
          body: string
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          subject: string
          updated_at?: string | null
          variables?: Json | null
        }
        Update: {
          body?: string
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          subject?: string
          updated_at?: string | null
          variables?: Json | null
        }
        Relationships: []
      }
      especialidades_medicas: {
        Row: {
          ativa: boolean | null
          codigo: string | null
          created_at: string | null
          created_by: string | null
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          ativa?: boolean | null
          codigo?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          ativa?: boolean | null
          codigo?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      form_templates: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          fields: Json
          id: string
          is_active: boolean
          is_system: boolean | null
          name: string
          tags: string[] | null
          updated_at: string
          usage_count: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          fields?: Json
          id?: string
          is_active?: boolean
          is_system?: boolean | null
          name: string
          tags?: string[] | null
          updated_at?: string
          usage_count?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          fields?: Json
          id?: string
          is_active?: boolean
          is_system?: boolean | null
          name?: string
          tags?: string[] | null
          updated_at?: string
          usage_count?: number | null
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
      inscricao_documentos: {
        Row: {
          analisado_em: string | null
          analisado_por: string | null
          arquivo_nome: string
          arquivo_tamanho: number | null
          arquivo_url: string
          created_at: string | null
          id: string
          inscricao_id: string
          observacoes: string | null
          ocr_confidence: number | null
          ocr_processado: boolean | null
          ocr_resultado: Json | null
          status: string | null
          tipo_documento: string
          updated_at: string | null
          uploaded_by: string | null
          versao: number | null
        }
        Insert: {
          analisado_em?: string | null
          analisado_por?: string | null
          arquivo_nome: string
          arquivo_tamanho?: number | null
          arquivo_url: string
          created_at?: string | null
          id?: string
          inscricao_id: string
          observacoes?: string | null
          ocr_confidence?: number | null
          ocr_processado?: boolean | null
          ocr_resultado?: Json | null
          status?: string | null
          tipo_documento: string
          updated_at?: string | null
          uploaded_by?: string | null
          versao?: number | null
        }
        Update: {
          analisado_em?: string | null
          analisado_por?: string | null
          arquivo_nome?: string
          arquivo_tamanho?: number | null
          arquivo_url?: string
          created_at?: string | null
          id?: string
          inscricao_id?: string
          observacoes?: string | null
          ocr_confidence?: number | null
          ocr_processado?: boolean | null
          ocr_resultado?: Json | null
          status?: string | null
          tipo_documento?: string
          updated_at?: string | null
          uploaded_by?: string | null
          versao?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inscricao_documentos_inscricao_id_fkey"
            columns: ["inscricao_id"]
            isOneToOne: false
            referencedRelation: "inscricoes_edital"
            referencedColumns: ["id"]
          },
        ]
      }
      inscricoes_edital: {
        Row: {
          analisado_em: string | null
          analisado_por: string | null
          candidato_id: string
          created_at: string | null
          dados_inscricao: Json | null
          edital_id: string
          id: string
          is_rascunho: boolean | null
          motivo_rejeicao: string | null
          status: string
          updated_at: string | null
          workflow_execution_id: string | null
        }
        Insert: {
          analisado_em?: string | null
          analisado_por?: string | null
          candidato_id: string
          created_at?: string | null
          dados_inscricao?: Json | null
          edital_id: string
          id?: string
          is_rascunho?: boolean | null
          motivo_rejeicao?: string | null
          status?: string
          updated_at?: string | null
          workflow_execution_id?: string | null
        }
        Update: {
          analisado_em?: string | null
          analisado_por?: string | null
          candidato_id?: string
          created_at?: string | null
          dados_inscricao?: Json | null
          edital_id?: string
          id?: string
          is_rascunho?: boolean | null
          motivo_rejeicao?: string | null
          status?: string
          updated_at?: string | null
          workflow_execution_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inscricoes_edital_candidato_profile_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inscricoes_edital_edital_id_fkey"
            columns: ["edital_id"]
            isOneToOne: false
            referencedRelation: "editais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inscricoes_edital_workflow_execution_id_fkey"
            columns: ["workflow_execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      inscription_processes: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
          usage_count: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          usage_count?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          usage_count?: number | null
        }
        Relationships: []
      }
      process_steps: {
        Row: {
          conditional_rules: Json | null
          created_at: string
          id: string
          is_required: boolean
          process_id: string
          step_name: string
          step_number: number
          template_id: string | null
        }
        Insert: {
          conditional_rules?: Json | null
          created_at?: string
          id?: string
          is_required?: boolean
          process_id: string
          step_name: string
          step_number: number
          template_id?: string | null
        }
        Update: {
          conditional_rules?: Json | null
          created_at?: string
          id?: string
          is_required?: boolean
          process_id?: string
          step_name?: string
          step_number?: number
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "process_steps_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "inscription_processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_steps_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "form_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          nome: string | null
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
          nome?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          nome?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      signature_requests: {
        Row: {
          completed_at: string | null
          created_at: string | null
          document_url: string | null
          external_id: string | null
          id: string
          metadata: Json | null
          provider: string
          signers: Json
          status: string
          step_execution_id: string | null
          updated_at: string | null
          workflow_execution_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          document_url?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json | null
          provider?: string
          signers?: Json
          status?: string
          step_execution_id?: string | null
          updated_at?: string | null
          workflow_execution_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          document_url?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json | null
          provider?: string
          signers?: Json
          status?: string
          step_execution_id?: string | null
          updated_at?: string | null
          workflow_execution_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signature_requests_step_execution_id_fkey"
            columns: ["step_execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_step_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signature_requests_workflow_execution_id_fkey"
            columns: ["workflow_execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_executions"
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
          user_id: string | null
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
          user_id?: string | null
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
          user_id?: string | null
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
      user_roles: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      workflow_approvals: {
        Row: {
          approver_id: string
          comments: string | null
          created_at: string
          decision: string
          id: string
          step_execution_id: string
          updated_at: string
        }
        Insert: {
          approver_id: string
          comments?: string | null
          created_at?: string
          decision: string
          id?: string
          step_execution_id: string
          updated_at?: string
        }
        Update: {
          approver_id?: string
          comments?: string | null
          created_at?: string
          decision?: string
          id?: string
          step_execution_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_approvals_step_execution_id_fkey"
            columns: ["step_execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_step_executions"
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
      workflow_messages: {
        Row: {
          content: string
          created_at: string | null
          execution_id: string
          id: string
          inscricao_id: string | null
          is_read: boolean | null
          sender_id: string
          sender_type: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          execution_id: string
          id?: string
          inscricao_id?: string | null
          is_read?: boolean | null
          sender_id: string
          sender_type: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          execution_id?: string
          id?: string
          inscricao_id?: string | null
          is_read?: boolean | null
          sender_id?: string
          sender_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_messages_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_messages_inscricao_id_fkey"
            columns: ["inscricao_id"]
            isOneToOne: false
            referencedRelation: "inscricoes_edital"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_queue: {
        Row: {
          attempts: number
          created_at: string
          error_message: string | null
          id: string
          input_data: Json | null
          inscricao_id: string
          max_attempts: number
          processed_at: string | null
          processing_started_at: string | null
          status: string
          workflow_id: string
          workflow_version: number
        }
        Insert: {
          attempts?: number
          created_at?: string
          error_message?: string | null
          id?: string
          input_data?: Json | null
          inscricao_id: string
          max_attempts?: number
          processed_at?: string | null
          processing_started_at?: string | null
          status?: string
          workflow_id: string
          workflow_version: number
        }
        Update: {
          attempts?: number
          created_at?: string
          error_message?: string | null
          id?: string
          input_data?: Json | null
          inscricao_id?: string
          max_attempts?: number
          processed_at?: string | null
          processing_started_at?: string | null
          status?: string
          workflow_id?: string
          workflow_version?: number
        }
        Relationships: [
          {
            foreignKeyName: "workflow_queue_inscricao_id_fkey"
            columns: ["inscricao_id"]
            isOneToOne: true
            referencedRelation: "inscricoes_edital"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_queue_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
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
      cleanup_orphan_workflows: {
        Args: Record<PropertyKey, never>
        Returns: {
          cleaned_executions: number
          reset_queue_items: number
        }[]
      }
      enqueue_orphan_inscricoes: {
        Args: Record<PropertyKey, never>
        Returns: {
          result_inscricao_id: string
          result_message: string
          result_status: string
          result_workflow_id: string
        }[]
      }
      get_gestores: {
        Args: Record<PropertyKey, never>
        Returns: {
          email: string
          id: string
          nome: string
        }[]
      }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: {
          role: Database["public"]["Enums"]["app_role"]
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_audit_event: {
        Args: {
          p_action: string
          p_metadata?: Json
          p_new_values?: Json
          p_old_values?: Json
          p_resource_id?: string
          p_resource_type: string
        }
        Returns: string
      }
      process_orphan_inscricoes: {
        Args: Record<PropertyKey, never>
        Returns: {
          action_taken: string
          edital_id: string
          inscricao_id: string
          workflow_id: string
        }[]
      }
      process_workflow_queue: {
        Args: Record<PropertyKey, never>
        Returns: {
          inscricao_id: string
          message: string
          queue_id: string
          status: string
          workflow_id: string
        }[]
      }
      retry_orphan_workflows: {
        Args: Record<PropertyKey, never>
        Returns: {
          action: string
          edital_id: string
          inscricao_id: string
          status: string
          workflow_id: string
        }[]
      }
    }
    Enums: {
      app_role: "candidato" | "analista" | "gestor" | "admin"
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
      app_role: ["candidato", "analista", "gestor", "admin"],
    },
  },
} as const
