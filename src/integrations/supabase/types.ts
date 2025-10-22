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
      acoes_prazos: {
        Row: {
          created_at: string | null
          credenciado_id: string
          data_anterior: string | null
          data_nova: string | null
          executado_por: string | null
          executado_por_nome: string | null
          id: string
          justificativa: string | null
          metadata: Json | null
          prazo_id: string
          tipo_acao: string
        }
        Insert: {
          created_at?: string | null
          credenciado_id: string
          data_anterior?: string | null
          data_nova?: string | null
          executado_por?: string | null
          executado_por_nome?: string | null
          id?: string
          justificativa?: string | null
          metadata?: Json | null
          prazo_id: string
          tipo_acao: string
        }
        Update: {
          created_at?: string | null
          credenciado_id?: string
          data_anterior?: string | null
          data_nova?: string | null
          executado_por?: string | null
          executado_por_nome?: string | null
          id?: string
          justificativa?: string | null
          metadata?: Json | null
          prazo_id?: string
          tipo_acao?: string
        }
        Relationships: [
          {
            foreignKeyName: "acoes_prazos_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "credenciados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acoes_prazos_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "documentos_completos"
            referencedColumns: ["credenciado_id"]
          },
          {
            foreignKeyName: "acoes_prazos_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "v_dados_regularidade"
            referencedColumns: ["credenciado_id"]
          },
          {
            foreignKeyName: "acoes_prazos_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "view_geocode_failures_last_24h"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acoes_prazos_prazo_id_fkey"
            columns: ["prazo_id"]
            isOneToOne: false
            referencedRelation: "prazos_credenciamento"
            referencedColumns: ["id"]
          },
        ]
      }
      afastamentos_credenciados: {
        Row: {
          analisado_em: string | null
          analisado_por: string | null
          created_at: string | null
          credenciado_id: string
          data_fim: string | null
          data_inicio: string
          documentos_anexos: Json | null
          id: string
          justificativa: string
          motivo: string | null
          observacoes_analise: string | null
          status: string | null
          tipo: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          analisado_em?: string | null
          analisado_por?: string | null
          created_at?: string | null
          credenciado_id: string
          data_fim?: string | null
          data_inicio: string
          documentos_anexos?: Json | null
          id?: string
          justificativa: string
          motivo?: string | null
          observacoes_analise?: string | null
          status?: string | null
          tipo: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          analisado_em?: string | null
          analisado_por?: string | null
          created_at?: string | null
          credenciado_id?: string
          data_fim?: string | null
          data_inicio?: string
          documentos_anexos?: Json | null
          id?: string
          justificativa?: string
          motivo?: string | null
          observacoes_analise?: string | null
          status?: string | null
          tipo?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "afastamentos_credenciados_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "credenciados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "afastamentos_credenciados_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "documentos_completos"
            referencedColumns: ["credenciado_id"]
          },
          {
            foreignKeyName: "afastamentos_credenciados_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "v_dados_regularidade"
            referencedColumns: ["credenciado_id"]
          },
          {
            foreignKeyName: "afastamentos_credenciados_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "view_geocode_failures_last_24h"
            referencedColumns: ["id"]
          },
        ]
      }
      alertas_enviados: {
        Row: {
          credenciado_id: string
          email_enviado_para: string
          enviado_em: string | null
          erro_envio: string | null
          id: string
          metadata: Json | null
          prazo_id: string
          status_envio: string | null
          tipo_alerta: string
        }
        Insert: {
          credenciado_id: string
          email_enviado_para: string
          enviado_em?: string | null
          erro_envio?: string | null
          id?: string
          metadata?: Json | null
          prazo_id: string
          status_envio?: string | null
          tipo_alerta: string
        }
        Update: {
          credenciado_id?: string
          email_enviado_para?: string
          enviado_em?: string | null
          erro_envio?: string | null
          id?: string
          metadata?: Json | null
          prazo_id?: string
          status_envio?: string | null
          tipo_alerta?: string
        }
        Relationships: [
          {
            foreignKeyName: "alertas_enviados_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "credenciados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alertas_enviados_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "documentos_completos"
            referencedColumns: ["credenciado_id"]
          },
          {
            foreignKeyName: "alertas_enviados_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "v_dados_regularidade"
            referencedColumns: ["credenciado_id"]
          },
          {
            foreignKeyName: "alertas_enviados_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "view_geocode_failures_last_24h"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alertas_enviados_prazo_id_fkey"
            columns: ["prazo_id"]
            isOneToOne: false
            referencedRelation: "prazos_credenciamento"
            referencedColumns: ["id"]
          },
        ]
      }
      alertas_vencimento: {
        Row: {
          ativo: boolean | null
          categoria: string | null
          criado_em: string | null
          dias_antecedencia: number[] | null
          emails_adicionais: string[] | null
          entidade_tipo: string
          grupos_notificar: string[] | null
          id: string
          notificar_credenciado: boolean | null
          notificar_gestores: boolean | null
          prioridade: string | null
          template_mensagem: string | null
          template_titulo: string | null
        }
        Insert: {
          ativo?: boolean | null
          categoria?: string | null
          criado_em?: string | null
          dias_antecedencia?: number[] | null
          emails_adicionais?: string[] | null
          entidade_tipo: string
          grupos_notificar?: string[] | null
          id?: string
          notificar_credenciado?: boolean | null
          notificar_gestores?: boolean | null
          prioridade?: string | null
          template_mensagem?: string | null
          template_titulo?: string | null
        }
        Update: {
          ativo?: boolean | null
          categoria?: string | null
          criado_em?: string | null
          dias_antecedencia?: number[] | null
          emails_adicionais?: string[] | null
          entidade_tipo?: string
          grupos_notificar?: string[] | null
          id?: string
          notificar_credenciado?: boolean | null
          notificar_gestores?: boolean | null
          prioridade?: string | null
          template_mensagem?: string | null
          template_titulo?: string | null
        }
        Relationships: []
      }
      analises: {
        Row: {
          analisado_em: string | null
          analista_id: string | null
          campos_reprovados: Json | null
          created_at: string | null
          documentos_analisados: Json | null
          documentos_reprovados: Json | null
          id: string
          inscricao_id: string
          motivo_reprovacao: string | null
          parecer: string | null
          prazo_correcao: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          analisado_em?: string | null
          analista_id?: string | null
          campos_reprovados?: Json | null
          created_at?: string | null
          documentos_analisados?: Json | null
          documentos_reprovados?: Json | null
          id?: string
          inscricao_id: string
          motivo_reprovacao?: string | null
          parecer?: string | null
          prazo_correcao?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          analisado_em?: string | null
          analista_id?: string | null
          campos_reprovados?: Json | null
          created_at?: string | null
          documentos_analisados?: Json | null
          documentos_reprovados?: Json | null
          id?: string
          inscricao_id?: string
          motivo_reprovacao?: string | null
          parecer?: string | null
          prazo_correcao?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analises_inscricao_id_fkey"
            columns: ["inscricao_id"]
            isOneToOne: true
            referencedRelation: "inscricoes_edital"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analises_inscricao_id_fkey"
            columns: ["inscricao_id"]
            isOneToOne: true
            referencedRelation: "view_inscricoes_validacao_pendente"
            referencedColumns: ["inscricao_id"]
          },
        ]
      }
      anexos_mensagens: {
        Row: {
          enviado_em: string | null
          enviado_por: string | null
          id: string
          mensagem_id: string | null
          mime_type: string | null
          nome_arquivo: string
          nome_original: string
          storage_bucket: string | null
          storage_path: string
          tamanho_bytes: number | null
          url_publica: string | null
          virus_scan_status: string | null
        }
        Insert: {
          enviado_em?: string | null
          enviado_por?: string | null
          id?: string
          mensagem_id?: string | null
          mime_type?: string | null
          nome_arquivo: string
          nome_original: string
          storage_bucket?: string | null
          storage_path: string
          tamanho_bytes?: number | null
          url_publica?: string | null
          virus_scan_status?: string | null
        }
        Update: {
          enviado_em?: string | null
          enviado_por?: string | null
          id?: string
          mensagem_id?: string | null
          mime_type?: string | null
          nome_arquivo?: string
          nome_original?: string
          storage_bucket?: string | null
          storage_path?: string
          tamanho_bytes?: number | null
          url_publica?: string | null
          virus_scan_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "anexos_mensagens_mensagem_id_fkey"
            columns: ["mensagem_id"]
            isOneToOne: false
            referencedRelation: "v_mensagens_completas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anexos_mensagens_mensagem_id_fkey"
            columns: ["mensagem_id"]
            isOneToOne: false
            referencedRelation: "workflow_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys_externas: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          criada_por: string | null
          id: string
          key_hash: string
          key_prefix: string
          metadata: Json | null
          nome: string
          quota_diaria: number | null
          quota_utilizada: number | null
          ultima_utilizacao: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          criada_por?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          metadata?: Json | null
          nome: string
          quota_diaria?: number | null
          quota_utilizada?: number | null
          ultima_utilizacao?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          criada_por?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          metadata?: Json | null
          nome?: string
          quota_diaria?: number | null
          quota_utilizada?: number | null
          ultima_utilizacao?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
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
          user_id: string | null
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
          user_id?: string | null
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
          user_id?: string | null
          user_role?: string | null
        }
        Relationships: []
      }
      avaliacoes_prestadores: {
        Row: {
          avaliador_id: string | null
          created_at: string | null
          credenciado_id: string
          criterios: Json
          finalizada_em: string | null
          id: string
          metadata: Json | null
          periodo_referencia: string
          pontos_melhoria: string | null
          pontos_positivos: string | null
          pontuacao_geral: number | null
          recomendacoes: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          avaliador_id?: string | null
          created_at?: string | null
          credenciado_id: string
          criterios?: Json
          finalizada_em?: string | null
          id?: string
          metadata?: Json | null
          periodo_referencia: string
          pontos_melhoria?: string | null
          pontos_positivos?: string | null
          pontuacao_geral?: number | null
          recomendacoes?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          avaliador_id?: string | null
          created_at?: string | null
          credenciado_id?: string
          criterios?: Json
          finalizada_em?: string | null
          id?: string
          metadata?: Json | null
          periodo_referencia?: string
          pontos_melhoria?: string | null
          pontos_positivos?: string | null
          pontuacao_geral?: number | null
          recomendacoes?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "avaliacoes_prestadores_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "credenciados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_prestadores_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "documentos_completos"
            referencedColumns: ["credenciado_id"]
          },
          {
            foreignKeyName: "avaliacoes_prestadores_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "v_dados_regularidade"
            referencedColumns: ["credenciado_id"]
          },
          {
            foreignKeyName: "avaliacoes_prestadores_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "view_geocode_failures_last_24h"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacoes_publicas: {
        Row: {
          avaliador_anonimo: boolean | null
          avaliador_email: string | null
          avaliador_nome: string | null
          avaliador_verificado: boolean | null
          comentario: string
          comentario_profissional: string | null
          comprovante_url: string | null
          created_at: string
          credenciado_id: string
          data_atendimento: string | null
          denunciada: boolean | null
          denunciada_em: string | null
          denunciada_por: string | null
          id: string
          moderacao_ia_motivo: string | null
          moderacao_ia_score: number | null
          moderado_em: string | null
          moderador_id: string | null
          motivo_denuncia: string | null
          nota_estrelas: number
          nota_profissional: number | null
          profissional_id: string | null
          respondido_em: string | null
          respondido_por: string | null
          resposta_profissional: string | null
          status: string
          tipo_servico: string | null
          updated_at: string
        }
        Insert: {
          avaliador_anonimo?: boolean | null
          avaliador_email?: string | null
          avaliador_nome?: string | null
          avaliador_verificado?: boolean | null
          comentario: string
          comentario_profissional?: string | null
          comprovante_url?: string | null
          created_at?: string
          credenciado_id: string
          data_atendimento?: string | null
          denunciada?: boolean | null
          denunciada_em?: string | null
          denunciada_por?: string | null
          id?: string
          moderacao_ia_motivo?: string | null
          moderacao_ia_score?: number | null
          moderado_em?: string | null
          moderador_id?: string | null
          motivo_denuncia?: string | null
          nota_estrelas: number
          nota_profissional?: number | null
          profissional_id?: string | null
          respondido_em?: string | null
          respondido_por?: string | null
          resposta_profissional?: string | null
          status?: string
          tipo_servico?: string | null
          updated_at?: string
        }
        Update: {
          avaliador_anonimo?: boolean | null
          avaliador_email?: string | null
          avaliador_nome?: string | null
          avaliador_verificado?: boolean | null
          comentario?: string
          comentario_profissional?: string | null
          comprovante_url?: string | null
          created_at?: string
          credenciado_id?: string
          data_atendimento?: string | null
          denunciada?: boolean | null
          denunciada_em?: string | null
          denunciada_por?: string | null
          id?: string
          moderacao_ia_motivo?: string | null
          moderacao_ia_score?: number | null
          moderado_em?: string | null
          moderador_id?: string | null
          motivo_denuncia?: string | null
          nota_estrelas?: number
          nota_profissional?: number | null
          profissional_id?: string | null
          respondido_em?: string | null
          respondido_por?: string | null
          resposta_profissional?: string | null
          status?: string
          tipo_servico?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "avaliacoes_publicas_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "credenciados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_publicas_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "documentos_completos"
            referencedColumns: ["credenciado_id"]
          },
          {
            foreignKeyName: "avaliacoes_publicas_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "v_dados_regularidade"
            referencedColumns: ["credenciado_id"]
          },
          {
            foreignKeyName: "avaliacoes_publicas_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "view_geocode_failures_last_24h"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_publicas_profissional_id_fkey"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "estatisticas_profissionais"
            referencedColumns: ["profissional_id"]
          },
          {
            foreignKeyName: "avaliacoes_publicas_profissional_id_fkey"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "profissionais_credenciados"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias_estabelecimentos: {
        Row: {
          ativo: boolean | null
          atualizado_em: string | null
          codigo: string | null
          criado_em: string | null
          descricao: string | null
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean | null
          atualizado_em?: string | null
          codigo?: string | null
          criado_em?: string | null
          descricao?: string | null
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean | null
          atualizado_em?: string | null
          codigo?: string | null
          criado_em?: string | null
          descricao?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      categorias_prestadores: {
        Row: {
          ativo: boolean | null
          cor: string | null
          created_at: string | null
          criada_por: string | null
          descricao: string | null
          icone: string | null
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          cor?: string | null
          created_at?: string | null
          criada_por?: string | null
          descricao?: string | null
          icone?: string | null
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          cor?: string | null
          created_at?: string | null
          criada_por?: string | null
          descricao?: string | null
          icone?: string | null
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      certificados: {
        Row: {
          created_at: string | null
          credenciado_id: string
          dados_certificado: Json | null
          documento_url: string | null
          emitido_em: string | null
          id: string
          numero_certificado: string
          status: string
          tipo: string
          updated_at: string | null
          valido_ate: string | null
        }
        Insert: {
          created_at?: string | null
          credenciado_id: string
          dados_certificado?: Json | null
          documento_url?: string | null
          emitido_em?: string | null
          id?: string
          numero_certificado: string
          status?: string
          tipo?: string
          updated_at?: string | null
          valido_ate?: string | null
        }
        Update: {
          created_at?: string | null
          credenciado_id?: string
          dados_certificado?: Json | null
          documento_url?: string | null
          emitido_em?: string | null
          id?: string
          numero_certificado?: string
          status?: string
          tipo?: string
          updated_at?: string | null
          valido_ate?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificados_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "credenciados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificados_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "documentos_completos"
            referencedColumns: ["credenciado_id"]
          },
          {
            foreignKeyName: "certificados_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "v_dados_regularidade"
            referencedColumns: ["credenciado_id"]
          },
          {
            foreignKeyName: "certificados_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "view_geocode_failures_last_24h"
            referencedColumns: ["id"]
          },
        ]
      }
      certificados_consultas_publicas: {
        Row: {
          certificado_id: string | null
          consultado_em: string | null
          id: string
          ip_origem: unknown | null
          parametro_busca: string | null
          resultado: string
          tipo_consulta: string
          user_agent: string | null
        }
        Insert: {
          certificado_id?: string | null
          consultado_em?: string | null
          id?: string
          ip_origem?: unknown | null
          parametro_busca?: string | null
          resultado: string
          tipo_consulta: string
          user_agent?: string | null
        }
        Update: {
          certificado_id?: string | null
          consultado_em?: string | null
          id?: string
          ip_origem?: unknown | null
          parametro_busca?: string | null
          resultado?: string
          tipo_consulta?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      certificados_historico: {
        Row: {
          certificado_id: string | null
          created_at: string | null
          credenciado_id: string | null
          documento_url: string | null
          gerado_por: string | null
          id: string
          metadata: Json | null
          motivo: string
          numero_certificado: string
        }
        Insert: {
          certificado_id?: string | null
          created_at?: string | null
          credenciado_id?: string | null
          documento_url?: string | null
          gerado_por?: string | null
          id?: string
          metadata?: Json | null
          motivo: string
          numero_certificado: string
        }
        Update: {
          certificado_id?: string | null
          created_at?: string | null
          credenciado_id?: string | null
          documento_url?: string | null
          gerado_por?: string | null
          id?: string
          metadata?: Json | null
          motivo?: string
          numero_certificado?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificados_historico_certificado_id_fkey"
            columns: ["certificado_id"]
            isOneToOne: false
            referencedRelation: "certificados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificados_historico_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "credenciados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificados_historico_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "documentos_completos"
            referencedColumns: ["credenciado_id"]
          },
          {
            foreignKeyName: "certificados_historico_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "v_dados_regularidade"
            referencedColumns: ["credenciado_id"]
          },
          {
            foreignKeyName: "certificados_historico_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "view_geocode_failures_last_24h"
            referencedColumns: ["id"]
          },
        ]
      }
      certificados_regularidade: {
        Row: {
          ativo: boolean | null
          cancelado: boolean | null
          cancelado_em: string | null
          cancelado_por: string | null
          codigo_verificacao: string
          created_at: string | null
          credenciado_id: string
          dados_snapshot: Json
          detalhes: Json
          emitido_em: string
          emitido_por: string | null
          hash_verificacao: string
          id: string
          metadata_pdf: Json | null
          motivo_cancelamento: string | null
          numero_certificado: string
          pendencias: Json
          status: Database["public"]["Enums"]["status_regularidade_enum"]
          substituido_por: string | null
          total_consultas: number | null
          ultima_consulta: string | null
          updated_at: string | null
          url_pdf: string | null
          valido_ate: string
          valido_de: string
        }
        Insert: {
          ativo?: boolean | null
          cancelado?: boolean | null
          cancelado_em?: string | null
          cancelado_por?: string | null
          codigo_verificacao: string
          created_at?: string | null
          credenciado_id: string
          dados_snapshot: Json
          detalhes?: Json
          emitido_em?: string
          emitido_por?: string | null
          hash_verificacao: string
          id?: string
          metadata_pdf?: Json | null
          motivo_cancelamento?: string | null
          numero_certificado: string
          pendencias?: Json
          status: Database["public"]["Enums"]["status_regularidade_enum"]
          substituido_por?: string | null
          total_consultas?: number | null
          ultima_consulta?: string | null
          updated_at?: string | null
          url_pdf?: string | null
          valido_ate: string
          valido_de: string
        }
        Update: {
          ativo?: boolean | null
          cancelado?: boolean | null
          cancelado_em?: string | null
          cancelado_por?: string | null
          codigo_verificacao?: string
          created_at?: string | null
          credenciado_id?: string
          dados_snapshot?: Json
          detalhes?: Json
          emitido_em?: string
          emitido_por?: string | null
          hash_verificacao?: string
          id?: string
          metadata_pdf?: Json | null
          motivo_cancelamento?: string | null
          numero_certificado?: string
          pendencias?: Json
          status?: Database["public"]["Enums"]["status_regularidade_enum"]
          substituido_por?: string | null
          total_consultas?: number | null
          ultima_consulta?: string | null
          updated_at?: string | null
          url_pdf?: string | null
          valido_ate?: string
          valido_de?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificados_regularidade_cancelado_por_fkey"
            columns: ["cancelado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificados_regularidade_cancelado_por_fkey"
            columns: ["cancelado_por"]
            isOneToOne: false
            referencedRelation: "v_usuarios_com_grupos"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "certificados_regularidade_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "credenciados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificados_regularidade_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "documentos_completos"
            referencedColumns: ["credenciado_id"]
          },
          {
            foreignKeyName: "certificados_regularidade_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "v_dados_regularidade"
            referencedColumns: ["credenciado_id"]
          },
          {
            foreignKeyName: "certificados_regularidade_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "view_geocode_failures_last_24h"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificados_regularidade_emitido_por_fkey"
            columns: ["emitido_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificados_regularidade_emitido_por_fkey"
            columns: ["emitido_por"]
            isOneToOne: false
            referencedRelation: "v_usuarios_com_grupos"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "certificados_regularidade_substituido_por_fkey"
            columns: ["substituido_por"]
            isOneToOne: false
            referencedRelation: "certificados_regularidade"
            referencedColumns: ["id"]
          },
        ]
      }
      cidades: {
        Row: {
          ativa: boolean | null
          created_at: string | null
          id: string
          latitude_centro: number
          longitude_centro: number
          nome: string
          populacao_total: number
          uf: string
          zoom_padrao: number | null
        }
        Insert: {
          ativa?: boolean | null
          created_at?: string | null
          id?: string
          latitude_centro: number
          longitude_centro: number
          nome: string
          populacao_total: number
          uf: string
          zoom_padrao?: number | null
        }
        Update: {
          ativa?: boolean | null
          created_at?: string | null
          id?: string
          latitude_centro?: number
          longitude_centro?: number
          nome?: string
          populacao_total?: number
          uf?: string
          zoom_padrao?: number | null
        }
        Relationships: []
      }
      contract_templates: {
        Row: {
          campos_mapeados: Json | null
          conteudo_html: string
          created_at: string | null
          created_by: string | null
          descricao: string | null
          id: string
          is_active: boolean | null
          nome: string
          updated_at: string | null
        }
        Insert: {
          campos_mapeados?: Json | null
          conteudo_html: string
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          id?: string
          is_active?: boolean | null
          nome: string
          updated_at?: string | null
        }
        Update: {
          campos_mapeados?: Json | null
          conteudo_html?: string
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          id?: string
          is_active?: boolean | null
          nome?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      contratos: {
        Row: {
          analise_id: string | null
          assinado_em: string | null
          created_at: string | null
          dados_contrato: Json | null
          documento_url: string | null
          gerado_em: string | null
          id: string
          inscricao_id: string
          numero_contrato: string | null
          status: string
          template_id: string | null
          tipo: string
          updated_at: string | null
        }
        Insert: {
          analise_id?: string | null
          assinado_em?: string | null
          created_at?: string | null
          dados_contrato?: Json | null
          documento_url?: string | null
          gerado_em?: string | null
          id?: string
          inscricao_id: string
          numero_contrato?: string | null
          status?: string
          template_id?: string | null
          tipo?: string
          updated_at?: string | null
        }
        Update: {
          analise_id?: string | null
          assinado_em?: string | null
          created_at?: string | null
          dados_contrato?: Json | null
          documento_url?: string | null
          gerado_em?: string | null
          id?: string
          inscricao_id?: string
          numero_contrato?: string | null
          status?: string
          template_id?: string | null
          tipo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contratos_analise_id_fkey"
            columns: ["analise_id"]
            isOneToOne: false
            referencedRelation: "analises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_inscricao_id_fkey"
            columns: ["inscricao_id"]
            isOneToOne: true
            referencedRelation: "inscricoes_edital"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_inscricao_id_fkey"
            columns: ["inscricao_id"]
            isOneToOne: true
            referencedRelation: "view_inscricoes_validacao_pendente"
            referencedColumns: ["inscricao_id"]
          },
          {
            foreignKeyName: "contratos_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      controle_prazos: {
        Row: {
          ativo: boolean | null
          atualizado_em: string | null
          bloqueio_automatico: boolean | null
          credenciado_id: string | null
          criado_em: string | null
          data_emissao: string | null
          data_renovacao: string | null
          data_vencimento: string
          dias_alerta_1: number | null
          dias_alerta_2: number | null
          dias_alerta_3: number | null
          dias_para_vencer: number | null
          entidade_id: string
          entidade_nome: string | null
          entidade_tipo: string
          id: string
          notificacoes_enviadas: number | null
          observacoes: string | null
          proxima_notificacao: string | null
          renovado: boolean | null
          renovavel: boolean | null
          responsavel_id: string | null
          status_atual: string | null
          ultima_notificacao_em: string | null
        }
        Insert: {
          ativo?: boolean | null
          atualizado_em?: string | null
          bloqueio_automatico?: boolean | null
          credenciado_id?: string | null
          criado_em?: string | null
          data_emissao?: string | null
          data_renovacao?: string | null
          data_vencimento: string
          dias_alerta_1?: number | null
          dias_alerta_2?: number | null
          dias_alerta_3?: number | null
          dias_para_vencer?: number | null
          entidade_id: string
          entidade_nome?: string | null
          entidade_tipo: string
          id?: string
          notificacoes_enviadas?: number | null
          observacoes?: string | null
          proxima_notificacao?: string | null
          renovado?: boolean | null
          renovavel?: boolean | null
          responsavel_id?: string | null
          status_atual?: string | null
          ultima_notificacao_em?: string | null
        }
        Update: {
          ativo?: boolean | null
          atualizado_em?: string | null
          bloqueio_automatico?: boolean | null
          credenciado_id?: string | null
          criado_em?: string | null
          data_emissao?: string | null
          data_renovacao?: string | null
          data_vencimento?: string
          dias_alerta_1?: number | null
          dias_alerta_2?: number | null
          dias_alerta_3?: number | null
          dias_para_vencer?: number | null
          entidade_id?: string
          entidade_nome?: string | null
          entidade_tipo?: string
          id?: string
          notificacoes_enviadas?: number | null
          observacoes?: string | null
          proxima_notificacao?: string | null
          renovado?: boolean | null
          renovavel?: boolean | null
          responsavel_id?: string | null
          status_atual?: string | null
          ultima_notificacao_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "controle_prazos_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "credenciados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "controle_prazos_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "documentos_completos"
            referencedColumns: ["credenciado_id"]
          },
          {
            foreignKeyName: "controle_prazos_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "v_dados_regularidade"
            referencedColumns: ["credenciado_id"]
          },
          {
            foreignKeyName: "controle_prazos_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "view_geocode_failures_last_24h"
            referencedColumns: ["id"]
          },
        ]
      }
      correcoes_inscricao: {
        Row: {
          analisada_em: string | null
          analisada_por: string | null
          campos_corrigidos: Json | null
          candidato_justificativa: string | null
          created_at: string | null
          documentos_reenviados: string[] | null
          enviada_em: string | null
          id: string
          inscricao_id: string
          status: string
          updated_at: string | null
          versao: number
        }
        Insert: {
          analisada_em?: string | null
          analisada_por?: string | null
          campos_corrigidos?: Json | null
          candidato_justificativa?: string | null
          created_at?: string | null
          documentos_reenviados?: string[] | null
          enviada_em?: string | null
          id?: string
          inscricao_id: string
          status?: string
          updated_at?: string | null
          versao?: number
        }
        Update: {
          analisada_em?: string | null
          analisada_por?: string | null
          campos_corrigidos?: Json | null
          candidato_justificativa?: string | null
          created_at?: string | null
          documentos_reenviados?: string[] | null
          enviada_em?: string | null
          id?: string
          inscricao_id?: string
          status?: string
          updated_at?: string | null
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "correcoes_inscricao_analisada_por_fkey"
            columns: ["analisada_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "correcoes_inscricao_analisada_por_fkey"
            columns: ["analisada_por"]
            isOneToOne: false
            referencedRelation: "v_usuarios_com_grupos"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "correcoes_inscricao_inscricao_id_fkey"
            columns: ["inscricao_id"]
            isOneToOne: false
            referencedRelation: "inscricoes_edital"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "correcoes_inscricao_inscricao_id_fkey"
            columns: ["inscricao_id"]
            isOneToOne: false
            referencedRelation: "view_inscricoes_validacao_pendente"
            referencedColumns: ["inscricao_id"]
          },
        ]
      }
      credenciado_categorias: {
        Row: {
          categoria_id: string
          credenciado_id: string
          criado_em: string | null
          id: string
          principal: boolean | null
        }
        Insert: {
          categoria_id: string
          credenciado_id: string
          criado_em?: string | null
          id?: string
          principal?: boolean | null
        }
        Update: {
          categoria_id?: string
          credenciado_id?: string
          criado_em?: string | null
          id?: string
          principal?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "credenciado_categorias_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_estabelecimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credenciado_categorias_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "credenciados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credenciado_categorias_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "documentos_completos"
            referencedColumns: ["credenciado_id"]
          },
          {
            foreignKeyName: "credenciado_categorias_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "v_dados_regularidade"
            referencedColumns: ["credenciado_id"]
          },
          {
            foreignKeyName: "credenciado_categorias_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "view_geocode_failures_last_24h"
            referencedColumns: ["id"]
          },
        ]
      }
      credenciado_consultorios: {
        Row: {
          ativo: boolean | null
          bairro: string | null
          cep: string | null
          cidade: string | null
          cnes: string
          complemento: string | null
          created_at: string | null
          credenciado_id: string
          especialidades_ids: string[] | null
          estado: string | null
          geocoded_at: string | null
          horarios: Json | null
          id: string
          inscricao_consultorio_id: string | null
          is_principal: boolean | null
          latitude: number | null
          logradouro: string | null
          longitude: number | null
          nome_consultorio: string
          numero: string | null
          ramal: string | null
          responsavel_tecnico_crm: string | null
          responsavel_tecnico_nome: string | null
          responsavel_tecnico_uf: string | null
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnes: string
          complemento?: string | null
          created_at?: string | null
          credenciado_id: string
          especialidades_ids?: string[] | null
          estado?: string | null
          geocoded_at?: string | null
          horarios?: Json | null
          id?: string
          inscricao_consultorio_id?: string | null
          is_principal?: boolean | null
          latitude?: number | null
          logradouro?: string | null
          longitude?: number | null
          nome_consultorio: string
          numero?: string | null
          ramal?: string | null
          responsavel_tecnico_crm?: string | null
          responsavel_tecnico_nome?: string | null
          responsavel_tecnico_uf?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnes?: string
          complemento?: string | null
          created_at?: string | null
          credenciado_id?: string
          especialidades_ids?: string[] | null
          estado?: string | null
          geocoded_at?: string | null
          horarios?: Json | null
          id?: string
          inscricao_consultorio_id?: string | null
          is_principal?: boolean | null
          latitude?: number | null
          logradouro?: string | null
          longitude?: number | null
          nome_consultorio?: string
          numero?: string | null
          ramal?: string | null
          responsavel_tecnico_crm?: string | null
          responsavel_tecnico_nome?: string | null
          responsavel_tecnico_uf?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credenciado_consultorios_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "credenciados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credenciado_consultorios_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "documentos_completos"
            referencedColumns: ["credenciado_id"]
          },
          {
            foreignKeyName: "credenciado_consultorios_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "v_dados_regularidade"
            referencedColumns: ["credenciado_id"]
          },
          {
            foreignKeyName: "credenciado_consultorios_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "view_geocode_failures_last_24h"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credenciado_consultorios_inscricao_consultorio_id_fkey"
            columns: ["inscricao_consultorio_id"]
            isOneToOne: false
            referencedRelation: "inscricao_consultorios"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "credenciado_crms_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "documentos_completos"
            referencedColumns: ["credenciado_id"]
          },
          {
            foreignKeyName: "credenciado_crms_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "v_dados_regularidade"
            referencedColumns: ["credenciado_id"]
          },
          {
            foreignKeyName: "credenciado_crms_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "view_geocode_failures_last_24h"
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
          {
            foreignKeyName: "credenciado_historico_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "documentos_completos"
            referencedColumns: ["credenciado_id"]
          },
          {
            foreignKeyName: "credenciado_historico_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "v_dados_regularidade"
            referencedColumns: ["credenciado_id"]
          },
          {
            foreignKeyName: "credenciado_historico_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "view_geocode_failures_last_24h"
            referencedColumns: ["id"]
          },
        ]
      }
      credenciado_servicos: {
        Row: {
          aceita_sus: boolean | null
          created_at: string | null
          created_by: string | null
          credenciado_id: string
          dias_atendimento: string[] | null
          disponivel: boolean | null
          disponivel_online: boolean | null
          horario_fim: string | null
          horario_inicio: string | null
          id: string
          local_atendimento: string | null
          observacoes: string | null
          preco_base: number | null
          preco_convenio: number | null
          preco_particular: number | null
          prioridade: number | null
          procedimento_id: string
          profissional_id: string | null
          requisitos: string | null
          tempo_espera_medio: number | null
          updated_at: string | null
        }
        Insert: {
          aceita_sus?: boolean | null
          created_at?: string | null
          created_by?: string | null
          credenciado_id: string
          dias_atendimento?: string[] | null
          disponivel?: boolean | null
          disponivel_online?: boolean | null
          horario_fim?: string | null
          horario_inicio?: string | null
          id?: string
          local_atendimento?: string | null
          observacoes?: string | null
          preco_base?: number | null
          preco_convenio?: number | null
          preco_particular?: number | null
          prioridade?: number | null
          procedimento_id: string
          profissional_id?: string | null
          requisitos?: string | null
          tempo_espera_medio?: number | null
          updated_at?: string | null
        }
        Update: {
          aceita_sus?: boolean | null
          created_at?: string | null
          created_by?: string | null
          credenciado_id?: string
          dias_atendimento?: string[] | null
          disponivel?: boolean | null
          disponivel_online?: boolean | null
          horario_fim?: string | null
          horario_inicio?: string | null
          id?: string
          local_atendimento?: string | null
          observacoes?: string | null
          preco_base?: number | null
          preco_convenio?: number | null
          preco_particular?: number | null
          prioridade?: number | null
          procedimento_id?: string
          profissional_id?: string | null
          requisitos?: string | null
          tempo_espera_medio?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credenciado_servicos_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "credenciados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credenciado_servicos_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "documentos_completos"
            referencedColumns: ["credenciado_id"]
          },
          {
            foreignKeyName: "credenciado_servicos_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "v_dados_regularidade"
            referencedColumns: ["credenciado_id"]
          },
          {
            foreignKeyName: "credenciado_servicos_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "view_geocode_failures_last_24h"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credenciado_servicos_procedimento_id_fkey"
            columns: ["procedimento_id"]
            isOneToOne: false
            referencedRelation: "mv_catalogo_servicos"
            referencedColumns: ["procedimento_id"]
          },
          {
            foreignKeyName: "credenciado_servicos_procedimento_id_fkey"
            columns: ["procedimento_id"]
            isOneToOne: false
            referencedRelation: "procedimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credenciado_servicos_profissional_id_fkey"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "estatisticas_profissionais"
            referencedColumns: ["profissional_id"]
          },
          {
            foreignKeyName: "credenciado_servicos_profissional_id_fkey"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "profissionais_credenciados"
            referencedColumns: ["id"]
          },
        ]
      }
      credenciados: {
        Row: {
          categoria_id: string | null
          celular: string | null
          cep: string | null
          cidade: string | null
          cidade_id: string | null
          cnpj: string | null
          cpf: string | null
          created_at: string | null
          data_descredenciamento_programado: string | null
          data_habilitacao: string | null
          data_inicio_atendimento: string | null
          data_nascimento: string | null
          data_solicitacao: string | null
          email: string | null
          endereco: string | null
          estado: string | null
          geocode_attempts: number | null
          geocoded_at: string | null
          id: string
          inscricao_id: string | null
          last_geocode_attempt: string | null
          latitude: number | null
          longitude: number | null
          motivo_descredenciamento: string | null
          motivo_suspensao: string | null
          nome: string
          numero_credenciado: string | null
          observacoes: string | null
          porte: string | null
          rg: string | null
          status: string
          suspensao_automatica: boolean | null
          suspensao_fim: string | null
          suspensao_inicio: string | null
          telefone: string | null
          tipo_credenciamento: string | null
          updated_at: string | null
          zona_id: string | null
        }
        Insert: {
          categoria_id?: string | null
          celular?: string | null
          cep?: string | null
          cidade?: string | null
          cidade_id?: string | null
          cnpj?: string | null
          cpf?: string | null
          created_at?: string | null
          data_descredenciamento_programado?: string | null
          data_habilitacao?: string | null
          data_inicio_atendimento?: string | null
          data_nascimento?: string | null
          data_solicitacao?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          geocode_attempts?: number | null
          geocoded_at?: string | null
          id?: string
          inscricao_id?: string | null
          last_geocode_attempt?: string | null
          latitude?: number | null
          longitude?: number | null
          motivo_descredenciamento?: string | null
          motivo_suspensao?: string | null
          nome: string
          numero_credenciado?: string | null
          observacoes?: string | null
          porte?: string | null
          rg?: string | null
          status?: string
          suspensao_automatica?: boolean | null
          suspensao_fim?: string | null
          suspensao_inicio?: string | null
          telefone?: string | null
          tipo_credenciamento?: string | null
          updated_at?: string | null
          zona_id?: string | null
        }
        Update: {
          categoria_id?: string | null
          celular?: string | null
          cep?: string | null
          cidade?: string | null
          cidade_id?: string | null
          cnpj?: string | null
          cpf?: string | null
          created_at?: string | null
          data_descredenciamento_programado?: string | null
          data_habilitacao?: string | null
          data_inicio_atendimento?: string | null
          data_nascimento?: string | null
          data_solicitacao?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          geocode_attempts?: number | null
          geocoded_at?: string | null
          id?: string
          inscricao_id?: string | null
          last_geocode_attempt?: string | null
          latitude?: number | null
          longitude?: number | null
          motivo_descredenciamento?: string | null
          motivo_suspensao?: string | null
          nome?: string
          numero_credenciado?: string | null
          observacoes?: string | null
          porte?: string | null
          rg?: string | null
          status?: string
          suspensao_automatica?: boolean | null
          suspensao_fim?: string | null
          suspensao_inicio?: string | null
          telefone?: string | null
          tipo_credenciamento?: string | null
          updated_at?: string | null
          zona_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credenciados_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_prestadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credenciados_cidade_id_fkey"
            columns: ["cidade_id"]
            isOneToOne: false
            referencedRelation: "cidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credenciados_inscricao_id_fkey"
            columns: ["inscricao_id"]
            isOneToOne: false
            referencedRelation: "inscricoes_edital"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credenciados_inscricao_id_fkey"
            columns: ["inscricao_id"]
            isOneToOne: false
            referencedRelation: "view_inscricoes_validacao_pendente"
            referencedColumns: ["inscricao_id"]
          },
          {
            foreignKeyName: "credenciados_zona_id_fkey"
            columns: ["zona_id"]
            isOneToOne: false
            referencedRelation: "zonas_geograficas"
            referencedColumns: ["id"]
          },
        ]
      }
      criterios_avaliacao: {
        Row: {
          ativo: boolean | null
          categoria: string | null
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
          ordem: number | null
          peso: number | null
          tipo_pontuacao: string | null
        }
        Insert: {
          ativo?: boolean | null
          categoria?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
          ordem?: number | null
          peso?: number | null
          tipo_pontuacao?: string | null
        }
        Update: {
          ativo?: boolean | null
          categoria?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          ordem?: number | null
          peso?: number | null
          tipo_pontuacao?: string | null
        }
        Relationships: []
      }
      crm_validation_cache: {
        Row: {
          api_response: Json | null
          cached_at: string | null
          crm: string
          especialidades: string[] | null
          id: string
          nome: string | null
          situacao: string | null
          uf: string
          valid: boolean
        }
        Insert: {
          api_response?: Json | null
          cached_at?: string | null
          crm: string
          especialidades?: string[] | null
          id?: string
          nome?: string | null
          situacao?: string | null
          uf: string
          valid: boolean
        }
        Update: {
          api_response?: Json | null
          cached_at?: string | null
          crm?: string
          especialidades?: string[] | null
          id?: string
          nome?: string | null
          situacao?: string | null
          uf?: string
          valid?: boolean
        }
        Relationships: []
      }
      document_templates: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          created_by: string | null
          descricao: string | null
          dias_validade: number | null
          id: string
          nome: string
          requer_assinatura: boolean | null
          template_html: string
          tipo_documento: string
          updated_at: string | null
          versao: number | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          dias_validade?: number | null
          id?: string
          nome: string
          requer_assinatura?: boolean | null
          template_html: string
          tipo_documento: string
          updated_at?: string | null
          versao?: number | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          dias_validade?: number | null
          id?: string
          nome?: string
          requer_assinatura?: boolean | null
          template_html?: string
          tipo_documento?: string
          updated_at?: string | null
          versao?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "document_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_usuarios_com_grupos"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      documentos_credenciados: {
        Row: {
          arquivo_nome: string | null
          arquivo_tamanho: number | null
          atualizado_em: string | null
          credenciado_id: string
          criado_em: string | null
          criado_por: string | null
          data_emissao: string | null
          data_vencimento: string | null
          descricao: string | null
          dias_alerta: number | null
          documento_origem_id: string | null
          id: string
          inscricao_id: string | null
          is_current: boolean | null
          meses_validade: number | null
          metadata: Json | null
          numero_documento: string | null
          observacao: string | null
          ocr_confidence: number | null
          ocr_processado: boolean | null
          ocr_resultado: Json | null
          origem: string | null
          status: string | null
          storage_path: string | null
          substituido_em: string | null
          substituido_por: string | null
          tipo_documento: string
          url_arquivo: string | null
          versao: number | null
        }
        Insert: {
          arquivo_nome?: string | null
          arquivo_tamanho?: number | null
          atualizado_em?: string | null
          credenciado_id: string
          criado_em?: string | null
          criado_por?: string | null
          data_emissao?: string | null
          data_vencimento?: string | null
          descricao?: string | null
          dias_alerta?: number | null
          documento_origem_id?: string | null
          id?: string
          inscricao_id?: string | null
          is_current?: boolean | null
          meses_validade?: number | null
          metadata?: Json | null
          numero_documento?: string | null
          observacao?: string | null
          ocr_confidence?: number | null
          ocr_processado?: boolean | null
          ocr_resultado?: Json | null
          origem?: string | null
          status?: string | null
          storage_path?: string | null
          substituido_em?: string | null
          substituido_por?: string | null
          tipo_documento: string
          url_arquivo?: string | null
          versao?: number | null
        }
        Update: {
          arquivo_nome?: string | null
          arquivo_tamanho?: number | null
          atualizado_em?: string | null
          credenciado_id?: string
          criado_em?: string | null
          criado_por?: string | null
          data_emissao?: string | null
          data_vencimento?: string | null
          descricao?: string | null
          dias_alerta?: number | null
          documento_origem_id?: string | null
          id?: string
          inscricao_id?: string | null
          is_current?: boolean | null
          meses_validade?: number | null
          metadata?: Json | null
          numero_documento?: string | null
          observacao?: string | null
          ocr_confidence?: number | null
          ocr_processado?: boolean | null
          ocr_resultado?: Json | null
          origem?: string | null
          status?: string | null
          storage_path?: string | null
          substituido_em?: string | null
          substituido_por?: string | null
          tipo_documento?: string
          url_arquivo?: string | null
          versao?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_credenciados_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "credenciados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_credenciados_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "documentos_completos"
            referencedColumns: ["credenciado_id"]
          },
          {
            foreignKeyName: "documentos_credenciados_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "v_dados_regularidade"
            referencedColumns: ["credenciado_id"]
          },
          {
            foreignKeyName: "documentos_credenciados_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "view_geocode_failures_last_24h"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_credenciados_documento_origem_id_fkey"
            columns: ["documento_origem_id"]
            isOneToOne: false
            referencedRelation: "documentos_completos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_credenciados_documento_origem_id_fkey"
            columns: ["documento_origem_id"]
            isOneToOne: false
            referencedRelation: "inscricao_documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_credenciados_inscricao_id_fkey"
            columns: ["inscricao_id"]
            isOneToOne: false
            referencedRelation: "inscricoes_edital"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_credenciados_inscricao_id_fkey"
            columns: ["inscricao_id"]
            isOneToOne: false
            referencedRelation: "view_inscricoes_validacao_pendente"
            referencedColumns: ["inscricao_id"]
          },
          {
            foreignKeyName: "documentos_credenciados_substituido_por_fkey"
            columns: ["substituido_por"]
            isOneToOne: false
            referencedRelation: "documentos_credenciados"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_credenciados_historico: {
        Row: {
          acao: string
          comentario: string | null
          data_evento: string | null
          documento_id: string | null
          id: string
          metadata: Json | null
          status_anterior: string | null
          status_novo: string | null
          usuario_nome: string | null
          usuario_responsavel: string | null
        }
        Insert: {
          acao: string
          comentario?: string | null
          data_evento?: string | null
          documento_id?: string | null
          id?: string
          metadata?: Json | null
          status_anterior?: string | null
          status_novo?: string | null
          usuario_nome?: string | null
          usuario_responsavel?: string | null
        }
        Update: {
          acao?: string
          comentario?: string | null
          data_evento?: string | null
          documento_id?: string | null
          id?: string
          metadata?: Json | null
          status_anterior?: string | null
          status_novo?: string | null
          usuario_nome?: string | null
          usuario_responsavel?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_credenciados_historico_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos_credenciados"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_emitidos: {
        Row: {
          created_at: string | null
          credenciado_id: string
          emitido_em: string
          emitido_por: string | null
          id: string
          metadata: Json | null
          numero_documento: string | null
          tipo_documento: string
          url_documento: string
          validade_ate: string | null
        }
        Insert: {
          created_at?: string | null
          credenciado_id: string
          emitido_em?: string
          emitido_por?: string | null
          id?: string
          metadata?: Json | null
          numero_documento?: string | null
          tipo_documento: string
          url_documento: string
          validade_ate?: string | null
        }
        Update: {
          created_at?: string | null
          credenciado_id?: string
          emitido_em?: string
          emitido_por?: string | null
          id?: string
          metadata?: Json | null
          numero_documento?: string | null
          tipo_documento?: string
          url_documento?: string
          validade_ate?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_emitidos_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "credenciados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_emitidos_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "documentos_completos"
            referencedColumns: ["credenciado_id"]
          },
          {
            foreignKeyName: "documentos_emitidos_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "v_dados_regularidade"
            referencedColumns: ["credenciado_id"]
          },
          {
            foreignKeyName: "documentos_emitidos_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "view_geocode_failures_last_24h"
            referencedColumns: ["id"]
          },
        ]
      }
      editais: {
        Row: {
          anexos: Json | null
          anexos_administrativos: Json | null
          anexos_processo_esperados: Json | null
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
          formularios_vinculados: Json | null
          garantia_execucao: number | null
          gestor_autorizador_id: string | null
          historico_alteracoes: Json | null
          id: string
          inscription_template_id: string | null
          local_portal: string | null
          max_especialidades: number | null
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
          uploads_config: Json | null
          use_orchestrator_v2: boolean | null
          use_programmatic_flow: boolean | null
          vagas: number | null
          workflow_id: string | null
          workflow_version: number | null
        }
        Insert: {
          anexos?: Json | null
          anexos_administrativos?: Json | null
          anexos_processo_esperados?: Json | null
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
          formularios_vinculados?: Json | null
          garantia_execucao?: number | null
          gestor_autorizador_id?: string | null
          historico_alteracoes?: Json | null
          id?: string
          inscription_template_id?: string | null
          local_portal?: string | null
          max_especialidades?: number | null
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
          uploads_config?: Json | null
          use_orchestrator_v2?: boolean | null
          use_programmatic_flow?: boolean | null
          vagas?: number | null
          workflow_id?: string | null
          workflow_version?: number | null
        }
        Update: {
          anexos?: Json | null
          anexos_administrativos?: Json | null
          anexos_processo_esperados?: Json | null
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
          formularios_vinculados?: Json | null
          garantia_execucao?: number | null
          gestor_autorizador_id?: string | null
          historico_alteracoes?: Json | null
          id?: string
          inscription_template_id?: string | null
          local_portal?: string | null
          max_especialidades?: number | null
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
          uploads_config?: Json | null
          use_orchestrator_v2?: boolean | null
          use_programmatic_flow?: boolean | null
          vagas?: number | null
          workflow_id?: string | null
          workflow_version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "editais_inscription_template_id_fkey"
            columns: ["inscription_template_id"]
            isOneToOne: false
            referencedRelation: "inscription_templates"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "edital_especialidades_edital_id_fkey"
            columns: ["edital_id"]
            isOneToOne: false
            referencedRelation: "view_rollout_status"
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
      estatisticas_credenciado: {
        Row: {
          atualizado_em: string | null
          badges: string[]
          created_at: string
          credenciado_id: string
          distribuicao_notas: Json
          id: string
          indice_resolucao: number | null
          nota_media_interna: number | null
          nota_media_publica: number | null
          performance_score: number
          ranking_especialidade: number | null
          ranking_regiao: number | null
          taxa_satisfacao: number | null
          tempo_medio_atendimento: number | null
          total_avaliacoes_internas: number
          total_avaliacoes_publicas: number
        }
        Insert: {
          atualizado_em?: string | null
          badges?: string[]
          created_at?: string
          credenciado_id: string
          distribuicao_notas?: Json
          id?: string
          indice_resolucao?: number | null
          nota_media_interna?: number | null
          nota_media_publica?: number | null
          performance_score?: number
          ranking_especialidade?: number | null
          ranking_regiao?: number | null
          taxa_satisfacao?: number | null
          tempo_medio_atendimento?: number | null
          total_avaliacoes_internas?: number
          total_avaliacoes_publicas?: number
        }
        Update: {
          atualizado_em?: string | null
          badges?: string[]
          created_at?: string
          credenciado_id?: string
          distribuicao_notas?: Json
          id?: string
          indice_resolucao?: number | null
          nota_media_interna?: number | null
          nota_media_publica?: number | null
          performance_score?: number
          ranking_especialidade?: number | null
          ranking_regiao?: number | null
          taxa_satisfacao?: number | null
          tempo_medio_atendimento?: number | null
          total_avaliacoes_internas?: number
          total_avaliacoes_publicas?: number
        }
        Relationships: [
          {
            foreignKeyName: "estatisticas_credenciado_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: true
            referencedRelation: "credenciados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estatisticas_credenciado_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: true
            referencedRelation: "documentos_completos"
            referencedColumns: ["credenciado_id"]
          },
          {
            foreignKeyName: "estatisticas_credenciado_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: true
            referencedRelation: "v_dados_regularidade"
            referencedColumns: ["credenciado_id"]
          },
          {
            foreignKeyName: "estatisticas_credenciado_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: true
            referencedRelation: "view_geocode_failures_last_24h"
            referencedColumns: ["id"]
          },
        ]
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
      generated_documents: {
        Row: {
          assinado: boolean | null
          assinado_em: string | null
          created_at: string | null
          credenciado_id: string | null
          documento_html: string | null
          documento_pdf_path: string | null
          documento_pdf_url: string | null
          generated_by: string | null
          id: string
          metadata: Json | null
          motivo: string | null
          requer_assinatura: boolean | null
          signature_request_id: string | null
          status_anterior: string | null
          status_novo: string | null
          template_id: string | null
          tipo_documento: string
          trigger_event: string | null
          updated_at: string | null
          valido_ate: string | null
          valido_de: string | null
        }
        Insert: {
          assinado?: boolean | null
          assinado_em?: string | null
          created_at?: string | null
          credenciado_id?: string | null
          documento_html?: string | null
          documento_pdf_path?: string | null
          documento_pdf_url?: string | null
          generated_by?: string | null
          id?: string
          metadata?: Json | null
          motivo?: string | null
          requer_assinatura?: boolean | null
          signature_request_id?: string | null
          status_anterior?: string | null
          status_novo?: string | null
          template_id?: string | null
          tipo_documento: string
          trigger_event?: string | null
          updated_at?: string | null
          valido_ate?: string | null
          valido_de?: string | null
        }
        Update: {
          assinado?: boolean | null
          assinado_em?: string | null
          created_at?: string | null
          credenciado_id?: string | null
          documento_html?: string | null
          documento_pdf_path?: string | null
          documento_pdf_url?: string | null
          generated_by?: string | null
          id?: string
          metadata?: Json | null
          motivo?: string | null
          requer_assinatura?: boolean | null
          signature_request_id?: string | null
          status_anterior?: string | null
          status_novo?: string | null
          template_id?: string | null
          tipo_documento?: string
          trigger_event?: string | null
          updated_at?: string | null
          valido_ate?: string | null
          valido_de?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_documents_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "credenciados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_documents_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "documentos_completos"
            referencedColumns: ["credenciado_id"]
          },
          {
            foreignKeyName: "generated_documents_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "v_dados_regularidade"
            referencedColumns: ["credenciado_id"]
          },
          {
            foreignKeyName: "generated_documents_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "view_geocode_failures_last_24h"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_documents_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_documents_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "v_usuarios_com_grupos"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "generated_documents_signature_request_id_fkey"
            columns: ["signature_request_id"]
            isOneToOne: false
            referencedRelation: "signature_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_documents_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      geocode_cache: {
        Row: {
          address_hash: string
          address_text: string
          created_at: string
          hit_count: number | null
          id: string
          last_used_at: string | null
          latitude: number
          longitude: number
          metadata: Json | null
          provider: string
        }
        Insert: {
          address_hash: string
          address_text: string
          created_at?: string
          hit_count?: number | null
          id?: string
          last_used_at?: string | null
          latitude: number
          longitude: number
          metadata?: Json | null
          provider?: string
        }
        Update: {
          address_hash?: string
          address_text?: string
          created_at?: string
          hit_count?: number | null
          id?: string
          last_used_at?: string | null
          latitude?: number
          longitude?: number
          metadata?: Json | null
          provider?: string
        }
        Relationships: []
      }
      grupos_usuarios: {
        Row: {
          ativo: boolean | null
          atualizado_em: string | null
          cor_identificacao: string | null
          criado_em: string | null
          criado_por: string | null
          descricao: string | null
          icone: string | null
          id: string
          nome: string
          permissoes: Json | null
          tipo: string
        }
        Insert: {
          ativo?: boolean | null
          atualizado_em?: string | null
          cor_identificacao?: string | null
          criado_em?: string | null
          criado_por?: string | null
          descricao?: string | null
          icone?: string | null
          id?: string
          nome: string
          permissoes?: Json | null
          tipo: string
        }
        Update: {
          ativo?: boolean | null
          atualizado_em?: string | null
          cor_identificacao?: string | null
          criado_em?: string | null
          criado_por?: string | null
          descricao?: string | null
          icone?: string | null
          id?: string
          nome?: string
          permissoes?: Json | null
          tipo?: string
        }
        Relationships: []
      }
      historico_buscas: {
        Row: {
          created_at: string | null
          filtros: Json | null
          id: string
          tempo_execucao_ms: number | null
          termo_busca: string
          total_resultados: number | null
          usuario_id: string | null
        }
        Insert: {
          created_at?: string | null
          filtros?: Json | null
          id?: string
          tempo_execucao_ms?: number | null
          termo_busca: string
          total_resultados?: number | null
          usuario_id?: string | null
        }
        Update: {
          created_at?: string | null
          filtros?: Json | null
          id?: string
          tempo_execucao_ms?: number | null
          termo_busca?: string
          total_resultados?: number | null
          usuario_id?: string | null
        }
        Relationships: []
      }
      historico_categorizacao: {
        Row: {
          alterado_por: string | null
          categoria_anterior_id: string | null
          categoria_nova_id: string | null
          created_at: string | null
          credenciado_id: string
          id: string
          motivo: string | null
        }
        Insert: {
          alterado_por?: string | null
          categoria_anterior_id?: string | null
          categoria_nova_id?: string | null
          created_at?: string | null
          credenciado_id: string
          id?: string
          motivo?: string | null
        }
        Update: {
          alterado_por?: string | null
          categoria_anterior_id?: string | null
          categoria_nova_id?: string | null
          created_at?: string | null
          credenciado_id?: string
          id?: string
          motivo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historico_categorizacao_categoria_anterior_id_fkey"
            columns: ["categoria_anterior_id"]
            isOneToOne: false
            referencedRelation: "categorias_prestadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_categorizacao_categoria_nova_id_fkey"
            columns: ["categoria_nova_id"]
            isOneToOne: false
            referencedRelation: "categorias_prestadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_categorizacao_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "credenciados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_categorizacao_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "documentos_completos"
            referencedColumns: ["credenciado_id"]
          },
          {
            foreignKeyName: "historico_categorizacao_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "v_dados_regularidade"
            referencedColumns: ["credenciado_id"]
          },
          {
            foreignKeyName: "historico_categorizacao_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "view_geocode_failures_last_24h"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_status_credenciado: {
        Row: {
          alterado_por: string | null
          alterado_por_nome: string | null
          created_at: string | null
          credenciado_id: string
          documentos_anexos: Json | null
          id: string
          metadata: Json | null
          motivo: string
          status_anterior: string
          status_novo: string
        }
        Insert: {
          alterado_por?: string | null
          alterado_por_nome?: string | null
          created_at?: string | null
          credenciado_id: string
          documentos_anexos?: Json | null
          id?: string
          metadata?: Json | null
          motivo: string
          status_anterior: string
          status_novo: string
        }
        Update: {
          alterado_por?: string | null
          alterado_por_nome?: string | null
          created_at?: string | null
          credenciado_id?: string
          documentos_anexos?: Json | null
          id?: string
          metadata?: Json | null
          motivo?: string
          status_anterior?: string
          status_novo?: string
        }
        Relationships: [
          {
            foreignKeyName: "historico_status_credenciado_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "credenciados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_status_credenciado_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "documentos_completos"
            referencedColumns: ["credenciado_id"]
          },
          {
            foreignKeyName: "historico_status_credenciado_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "v_dados_regularidade"
            referencedColumns: ["credenciado_id"]
          },
          {
            foreignKeyName: "historico_status_credenciado_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "view_geocode_failures_last_24h"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_vencimentos: {
        Row: {
          acao: string | null
          acao_por: string | null
          controle_prazo_id: string | null
          criado_em: string | null
          data_mudanca: string | null
          detalhes: Json | null
          id: string
          status_anterior: string | null
          status_novo: string
        }
        Insert: {
          acao?: string | null
          acao_por?: string | null
          controle_prazo_id?: string | null
          criado_em?: string | null
          data_mudanca?: string | null
          detalhes?: Json | null
          id?: string
          status_anterior?: string | null
          status_novo: string
        }
        Update: {
          acao?: string | null
          acao_por?: string | null
          controle_prazo_id?: string | null
          criado_em?: string | null
          data_mudanca?: string | null
          detalhes?: Json | null
          id?: string
          status_anterior?: string | null
          status_novo?: string
        }
        Relationships: [
          {
            foreignKeyName: "historico_vencimentos_controle_prazo_id_fkey"
            columns: ["controle_prazo_id"]
            isOneToOne: false
            referencedRelation: "controle_prazos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_vencimentos_controle_prazo_id_fkey"
            columns: ["controle_prazo_id"]
            isOneToOne: false
            referencedRelation: "v_prazos_completos"
            referencedColumns: ["id"]
          },
        ]
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
      indicadores_profissionais: {
        Row: {
          atendimentos: number | null
          atendimentos_meta: number | null
          avaliacao_media: number | null
          created_at: string | null
          horas_trabalhadas: number | null
          id: string
          mes_referencia: string
          observacoes: string | null
          procedimentos_realizados: number | null
          profissional_id: string
          taxa_comparecimento: number | null
          tempo_medio_atendimento: number | null
          total_avaliacoes: number | null
          updated_at: string | null
        }
        Insert: {
          atendimentos?: number | null
          atendimentos_meta?: number | null
          avaliacao_media?: number | null
          created_at?: string | null
          horas_trabalhadas?: number | null
          id?: string
          mes_referencia: string
          observacoes?: string | null
          procedimentos_realizados?: number | null
          profissional_id: string
          taxa_comparecimento?: number | null
          tempo_medio_atendimento?: number | null
          total_avaliacoes?: number | null
          updated_at?: string | null
        }
        Update: {
          atendimentos?: number | null
          atendimentos_meta?: number | null
          avaliacao_media?: number | null
          created_at?: string | null
          horas_trabalhadas?: number | null
          id?: string
          mes_referencia?: string
          observacoes?: string | null
          procedimentos_realizados?: number | null
          profissional_id?: string
          taxa_comparecimento?: number | null
          tempo_medio_atendimento?: number | null
          total_avaliacoes?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "indicadores_profissionais_profissional_id_fkey"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "estatisticas_profissionais"
            referencedColumns: ["profissional_id"]
          },
          {
            foreignKeyName: "indicadores_profissionais_profissional_id_fkey"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "profissionais_credenciados"
            referencedColumns: ["id"]
          },
        ]
      }
      inscricao_consultorios: {
        Row: {
          ativo: boolean | null
          bairro: string | null
          cep: string | null
          cidade: string | null
          cnes: string | null
          complemento: string | null
          created_at: string | null
          created_by: string | null
          especialidades_ids: string[] | null
          estado: string | null
          horarios: Json | null
          id: string
          inscricao_id: string
          is_principal: boolean | null
          logradouro: string | null
          nome_consultorio: string | null
          numero: string | null
          ramal: string | null
          responsavel_tecnico_crm: string | null
          responsavel_tecnico_nome: string | null
          responsavel_tecnico_uf: string | null
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnes?: string | null
          complemento?: string | null
          created_at?: string | null
          created_by?: string | null
          especialidades_ids?: string[] | null
          estado?: string | null
          horarios?: Json | null
          id?: string
          inscricao_id: string
          is_principal?: boolean | null
          logradouro?: string | null
          nome_consultorio?: string | null
          numero?: string | null
          ramal?: string | null
          responsavel_tecnico_crm?: string | null
          responsavel_tecnico_nome?: string | null
          responsavel_tecnico_uf?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnes?: string | null
          complemento?: string | null
          created_at?: string | null
          created_by?: string | null
          especialidades_ids?: string[] | null
          estado?: string | null
          horarios?: Json | null
          id?: string
          inscricao_id?: string
          is_principal?: boolean | null
          logradouro?: string | null
          nome_consultorio?: string | null
          numero?: string | null
          ramal?: string | null
          responsavel_tecnico_crm?: string | null
          responsavel_tecnico_nome?: string | null
          responsavel_tecnico_uf?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inscricao_consultorios_inscricao_id_fkey"
            columns: ["inscricao_id"]
            isOneToOne: false
            referencedRelation: "inscricoes_edital"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inscricao_consultorios_inscricao_id_fkey"
            columns: ["inscricao_id"]
            isOneToOne: false
            referencedRelation: "view_inscricoes_validacao_pendente"
            referencedColumns: ["inscricao_id"]
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
          eh_reenvio: boolean | null
          id: string
          inscricao_id: string
          is_current: boolean | null
          motivo_reenvio: string | null
          observacoes: string | null
          ocr_confidence: number | null
          ocr_processado: boolean | null
          ocr_resultado: Json | null
          parent_document_id: string | null
          replaced_at: string | null
          replaced_by: string | null
          status: string | null
          tipo_documento: string
          updated_at: string | null
          uploaded_by: string | null
          versao: number | null
          versao_anterior_id: string | null
        }
        Insert: {
          analisado_em?: string | null
          analisado_por?: string | null
          arquivo_nome: string
          arquivo_tamanho?: number | null
          arquivo_url: string
          created_at?: string | null
          eh_reenvio?: boolean | null
          id?: string
          inscricao_id: string
          is_current?: boolean | null
          motivo_reenvio?: string | null
          observacoes?: string | null
          ocr_confidence?: number | null
          ocr_processado?: boolean | null
          ocr_resultado?: Json | null
          parent_document_id?: string | null
          replaced_at?: string | null
          replaced_by?: string | null
          status?: string | null
          tipo_documento: string
          updated_at?: string | null
          uploaded_by?: string | null
          versao?: number | null
          versao_anterior_id?: string | null
        }
        Update: {
          analisado_em?: string | null
          analisado_por?: string | null
          arquivo_nome?: string
          arquivo_tamanho?: number | null
          arquivo_url?: string
          created_at?: string | null
          eh_reenvio?: boolean | null
          id?: string
          inscricao_id?: string
          is_current?: boolean | null
          motivo_reenvio?: string | null
          observacoes?: string | null
          ocr_confidence?: number | null
          ocr_processado?: boolean | null
          ocr_resultado?: Json | null
          parent_document_id?: string | null
          replaced_at?: string | null
          replaced_by?: string | null
          status?: string | null
          tipo_documento?: string
          updated_at?: string | null
          uploaded_by?: string | null
          versao?: number | null
          versao_anterior_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inscricao_documentos_inscricao_id_fkey"
            columns: ["inscricao_id"]
            isOneToOne: false
            referencedRelation: "inscricoes_edital"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inscricao_documentos_inscricao_id_fkey"
            columns: ["inscricao_id"]
            isOneToOne: false
            referencedRelation: "view_inscricoes_validacao_pendente"
            referencedColumns: ["inscricao_id"]
          },
          {
            foreignKeyName: "inscricao_documentos_parent_document_id_fkey"
            columns: ["parent_document_id"]
            isOneToOne: false
            referencedRelation: "documentos_completos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inscricao_documentos_parent_document_id_fkey"
            columns: ["parent_document_id"]
            isOneToOne: false
            referencedRelation: "inscricao_documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inscricao_documentos_versao_anterior_id_fkey"
            columns: ["versao_anterior_id"]
            isOneToOne: false
            referencedRelation: "documentos_completos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inscricao_documentos_versao_anterior_id_fkey"
            columns: ["versao_anterior_id"]
            isOneToOne: false
            referencedRelation: "inscricao_documentos"
            referencedColumns: ["id"]
          },
        ]
      }
      inscricao_eventos: {
        Row: {
          dados: Json | null
          descricao: string | null
          id: string
          inscricao_id: string
          timestamp: string | null
          tipo_evento: string
          usuario_id: string | null
        }
        Insert: {
          dados?: Json | null
          descricao?: string | null
          id?: string
          inscricao_id: string
          timestamp?: string | null
          tipo_evento: string
          usuario_id?: string | null
        }
        Update: {
          dados?: Json | null
          descricao?: string | null
          id?: string
          inscricao_id?: string
          timestamp?: string | null
          tipo_evento?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inscricao_eventos_inscricao_id_fkey"
            columns: ["inscricao_id"]
            isOneToOne: false
            referencedRelation: "inscricoes_edital"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inscricao_eventos_inscricao_id_fkey"
            columns: ["inscricao_id"]
            isOneToOne: false
            referencedRelation: "view_inscricoes_validacao_pendente"
            referencedColumns: ["inscricao_id"]
          },
        ]
      }
      inscricao_validacoes: {
        Row: {
          analista_id: string
          comentario_analista: string | null
          created_at: string | null
          dados_ocr_esperado: Json | null
          dados_ocr_real: Json | null
          discrepancias: Json | null
          documento_id: string | null
          id: string
          inscricao_id: string
          ocr_validado: boolean | null
          status: string
          updated_at: string | null
        }
        Insert: {
          analista_id: string
          comentario_analista?: string | null
          created_at?: string | null
          dados_ocr_esperado?: Json | null
          dados_ocr_real?: Json | null
          discrepancias?: Json | null
          documento_id?: string | null
          id?: string
          inscricao_id: string
          ocr_validado?: boolean | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          analista_id?: string
          comentario_analista?: string | null
          created_at?: string | null
          dados_ocr_esperado?: Json | null
          dados_ocr_real?: Json | null
          discrepancias?: Json | null
          documento_id?: string | null
          id?: string
          inscricao_id?: string
          ocr_validado?: boolean | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inscricao_validacoes_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos_completos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inscricao_validacoes_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "inscricao_documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inscricao_validacoes_inscricao_id_fkey"
            columns: ["inscricao_id"]
            isOneToOne: false
            referencedRelation: "inscricoes_edital"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inscricao_validacoes_inscricao_id_fkey"
            columns: ["inscricao_id"]
            isOneToOne: false
            referencedRelation: "view_inscricoes_validacao_pendente"
            referencedColumns: ["inscricao_id"]
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
          data_validacao: string | null
          edital_id: string
          id: string
          is_rascunho: boolean | null
          motivo_rejeicao: string | null
          protocolo: string | null
          retry_count: number | null
          status: string
          tipo_credenciamento: string | null
          updated_at: string | null
          validacao_status: string | null
          workflow_execution_id: string | null
        }
        Insert: {
          analisado_em?: string | null
          analisado_por?: string | null
          candidato_id: string
          created_at?: string | null
          dados_inscricao?: Json | null
          data_validacao?: string | null
          edital_id: string
          id?: string
          is_rascunho?: boolean | null
          motivo_rejeicao?: string | null
          protocolo?: string | null
          retry_count?: number | null
          status?: string
          tipo_credenciamento?: string | null
          updated_at?: string | null
          validacao_status?: string | null
          workflow_execution_id?: string | null
        }
        Update: {
          analisado_em?: string | null
          analisado_por?: string | null
          candidato_id?: string
          created_at?: string | null
          dados_inscricao?: Json | null
          data_validacao?: string | null
          edital_id?: string
          id?: string
          is_rascunho?: boolean | null
          motivo_rejeicao?: string | null
          protocolo?: string | null
          retry_count?: number | null
          status?: string
          tipo_credenciamento?: string | null
          updated_at?: string | null
          validacao_status?: string | null
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
            foreignKeyName: "inscricoes_edital_candidato_profile_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "v_usuarios_com_grupos"
            referencedColumns: ["usuario_id"]
          },
          {
            foreignKeyName: "inscricoes_edital_edital_id_fkey"
            columns: ["edital_id"]
            isOneToOne: false
            referencedRelation: "editais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inscricoes_edital_edital_id_fkey"
            columns: ["edital_id"]
            isOneToOne: false
            referencedRelation: "view_rollout_status"
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
      inscription_templates: {
        Row: {
          anexos_obrigatorios: Json
          campos_formulario: Json
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          anexos_obrigatorios?: Json
          campos_formulario?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          anexos_obrigatorios?: Json
          campos_formulario?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      lembretes_avaliacao: {
        Row: {
          created_at: string | null
          credenciado_id: string
          data_lembrete: string
          gestor_id: string
          id: string
          notificado_em: string | null
          periodo_referencia: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          credenciado_id: string
          data_lembrete: string
          gestor_id: string
          id?: string
          notificado_em?: string | null
          periodo_referencia: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          credenciado_id?: string
          data_lembrete?: string
          gestor_id?: string
          id?: string
          notificado_em?: string | null
          periodo_referencia?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lembretes_avaliacao_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "credenciados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lembretes_avaliacao_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "documentos_completos"
            referencedColumns: ["credenciado_id"]
          },
          {
            foreignKeyName: "lembretes_avaliacao_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "v_dados_regularidade"
            referencedColumns: ["credenciado_id"]
          },
          {
            foreignKeyName: "lembretes_avaliacao_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "view_geocode_failures_last_24h"
            referencedColumns: ["id"]
          },
        ]
      }
      logs_regras_suspensao: {
        Row: {
          acao_aplicada: string
          aplicado_em: string | null
          aplicado_por: string | null
          credenciado_id: string
          dados_gatilho: Json | null
          id: string
          motivo: string
          regra_id: string | null
        }
        Insert: {
          acao_aplicada: string
          aplicado_em?: string | null
          aplicado_por?: string | null
          credenciado_id: string
          dados_gatilho?: Json | null
          id?: string
          motivo: string
          regra_id?: string | null
        }
        Update: {
          acao_aplicada?: string
          aplicado_em?: string | null
          aplicado_por?: string | null
          credenciado_id?: string
          dados_gatilho?: Json | null
          id?: string
          motivo?: string
          regra_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logs_regras_suspensao_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "credenciados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logs_regras_suspensao_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "documentos_completos"
            referencedColumns: ["credenciado_id"]
          },
          {
            foreignKeyName: "logs_regras_suspensao_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "v_dados_regularidade"
            referencedColumns: ["credenciado_id"]
          },
          {
            foreignKeyName: "logs_regras_suspensao_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "view_geocode_failures_last_24h"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logs_regras_suspensao_regra_id_fkey"
            columns: ["regra_id"]
            isOneToOne: false
            referencedRelation: "regras_suspensao_automatica"
            referencedColumns: ["id"]
          },
        ]
      }
      modelos_justificativa: {
        Row: {
          ativo: boolean | null
          categoria: string
          created_at: string | null
          criado_por: string | null
          id: string
          nome: string
          texto_padrao: string
          updated_at: string | null
          variaveis: Json | null
        }
        Insert: {
          ativo?: boolean | null
          categoria: string
          created_at?: string | null
          criado_por?: string | null
          id?: string
          nome: string
          texto_padrao: string
          updated_at?: string | null
          variaveis?: Json | null
        }
        Update: {
          ativo?: boolean | null
          categoria?: string
          created_at?: string | null
          criado_por?: string | null
          id?: string
          nome?: string
          texto_padrao?: string
          updated_at?: string | null
          variaveis?: Json | null
        }
        Relationships: []
      }
      ocorrencias_prestadores: {
        Row: {
          anexos: Json | null
          created_at: string | null
          credenciado_id: string
          data_ocorrencia: string
          descricao: string
          gravidade: string
          id: string
          metadata: Json | null
          protocolo: string | null
          providencias: string | null
          relator_id: string | null
          status: string | null
          tipo: string
          updated_at: string | null
        }
        Insert: {
          anexos?: Json | null
          created_at?: string | null
          credenciado_id: string
          data_ocorrencia: string
          descricao: string
          gravidade?: string
          id?: string
          metadata?: Json | null
          protocolo?: string | null
          providencias?: string | null
          relator_id?: string | null
          status?: string | null
          tipo: string
          updated_at?: string | null
        }
        Update: {
          anexos?: Json | null
          created_at?: string | null
          credenciado_id?: string
          data_ocorrencia?: string
          descricao?: string
          gravidade?: string
          id?: string
          metadata?: Json | null
          protocolo?: string | null
          providencias?: string | null
          relator_id?: string | null
          status?: string | null
          tipo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ocorrencias_prestadores_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "credenciados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocorrencias_prestadores_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "documentos_completos"
            referencedColumns: ["credenciado_id"]
          },
          {
            foreignKeyName: "ocorrencias_prestadores_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "v_dados_regularidade"
            referencedColumns: ["credenciado_id"]
          },
          {
            foreignKeyName: "ocorrencias_prestadores_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "view_geocode_failures_last_24h"
            referencedColumns: ["id"]
          },
        ]
      }
      prazos_credenciamento: {
        Row: {
          created_at: string | null
          credenciado_id: string
          data_vencimento: string
          id: string
          observacoes: string | null
          origem_documento_id: string | null
          status: string
          tipo_prazo: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          credenciado_id: string
          data_vencimento: string
          id?: string
          observacoes?: string | null
          origem_documento_id?: string | null
          status?: string
          tipo_prazo: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          credenciado_id?: string
          data_vencimento?: string
          id?: string
          observacoes?: string | null
          origem_documento_id?: string | null
          status?: string
          tipo_prazo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prazos_credenciamento_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "credenciados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prazos_credenciamento_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "documentos_completos"
            referencedColumns: ["credenciado_id"]
          },
          {
            foreignKeyName: "prazos_credenciamento_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "v_dados_regularidade"
            referencedColumns: ["credenciado_id"]
          },
          {
            foreignKeyName: "prazos_credenciamento_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "view_geocode_failures_last_24h"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prazos_credenciamento_origem_documento_id_fkey"
            columns: ["origem_documento_id"]
            isOneToOne: false
            referencedRelation: "documentos_completos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prazos_credenciamento_origem_documento_id_fkey"
            columns: ["origem_documento_id"]
            isOneToOne: false
            referencedRelation: "inscricao_documentos"
            referencedColumns: ["id"]
          },
        ]
      }
      procedimentos: {
        Row: {
          ativo: boolean | null
          categoria: string | null
          codigo_tuss: string | null
          complexidade: string | null
          created_at: string | null
          created_by: string | null
          descricao: string | null
          duracao_media: number | null
          especialidade_id: string | null
          id: string
          nome: string
          tipo: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          categoria?: string | null
          codigo_tuss?: string | null
          complexidade?: string | null
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          duracao_media?: number | null
          especialidade_id?: string | null
          id?: string
          nome: string
          tipo?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          categoria?: string | null
          codigo_tuss?: string | null
          complexidade?: string | null
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          duracao_media?: number | null
          especialidade_id?: string | null
          id?: string
          nome?: string
          tipo?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "procedimentos_especialidade_id_fkey"
            columns: ["especialidade_id"]
            isOneToOne: false
            referencedRelation: "especialidades_medicas"
            referencedColumns: ["id"]
          },
        ]
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
      profissionais_credenciados: {
        Row: {
          ativo: boolean | null
          celular: string | null
          cpf: string | null
          created_at: string | null
          credenciado_id: string
          crm: string
          data_desvinculo: string | null
          data_nascimento: string | null
          data_vinculo: string | null
          email: string | null
          especialidade: string
          especialidade_id: string | null
          id: string
          nome: string
          principal: boolean | null
          responsavel_tecnico: boolean | null
          rg: string | null
          telefone: string | null
          uf_crm: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          celular?: string | null
          cpf?: string | null
          created_at?: string | null
          credenciado_id: string
          crm: string
          data_desvinculo?: string | null
          data_nascimento?: string | null
          data_vinculo?: string | null
          email?: string | null
          especialidade: string
          especialidade_id?: string | null
          id?: string
          nome: string
          principal?: boolean | null
          responsavel_tecnico?: boolean | null
          rg?: string | null
          telefone?: string | null
          uf_crm: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          celular?: string | null
          cpf?: string | null
          created_at?: string | null
          credenciado_id?: string
          crm?: string
          data_desvinculo?: string | null
          data_nascimento?: string | null
          data_vinculo?: string | null
          email?: string | null
          especialidade?: string
          especialidade_id?: string | null
          id?: string
          nome?: string
          principal?: boolean | null
          responsavel_tecnico?: boolean | null
          rg?: string | null
          telefone?: string | null
          uf_crm?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profissionais_credenciados_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "credenciados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profissionais_credenciados_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "documentos_completos"
            referencedColumns: ["credenciado_id"]
          },
          {
            foreignKeyName: "profissionais_credenciados_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "v_dados_regularidade"
            referencedColumns: ["credenciado_id"]
          },
          {
            foreignKeyName: "profissionais_credenciados_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "view_geocode_failures_last_24h"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profissionais_credenciados_especialidade_id_fkey"
            columns: ["especialidade_id"]
            isOneToOne: false
            referencedRelation: "especialidades_medicas"
            referencedColumns: ["id"]
          },
        ]
      }
      regras_suspensao_automatica: {
        Row: {
          acao: string
          ativo: boolean | null
          condicao: Json
          created_at: string | null
          criada_por: string | null
          descricao: string | null
          duracao_dias: number | null
          id: string
          metadata: Json | null
          nome: string
          notificar_credenciado: boolean | null
          notificar_gestores: boolean | null
          prioridade: number | null
          tipo_gatilho: string
          updated_at: string | null
        }
        Insert: {
          acao?: string
          ativo?: boolean | null
          condicao: Json
          created_at?: string | null
          criada_por?: string | null
          descricao?: string | null
          duracao_dias?: number | null
          id?: string
          metadata?: Json | null
          nome: string
          notificar_credenciado?: boolean | null
          notificar_gestores?: boolean | null
          prioridade?: number | null
          tipo_gatilho: string
          updated_at?: string | null
        }
        Update: {
          acao?: string
          ativo?: boolean | null
          condicao?: Json
          created_at?: string | null
          criada_por?: string | null
          descricao?: string | null
          duracao_dias?: number | null
          id?: string
          metadata?: Json | null
          nome?: string
          notificar_credenciado?: boolean | null
          notificar_gestores?: boolean | null
          prioridade?: number | null
          tipo_gatilho?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      rollout_audit: {
        Row: {
          action: string
          authorized_by: string | null
          created_at: string | null
          edital_id: string | null
          environment: string | null
          id: string
          metadata: Json | null
          new_value: boolean | null
          previous_value: boolean | null
          reason: string | null
        }
        Insert: {
          action: string
          authorized_by?: string | null
          created_at?: string | null
          edital_id?: string | null
          environment?: string | null
          id?: string
          metadata?: Json | null
          new_value?: boolean | null
          previous_value?: boolean | null
          reason?: string | null
        }
        Update: {
          action?: string
          authorized_by?: string | null
          created_at?: string | null
          edital_id?: string | null
          environment?: string | null
          id?: string
          metadata?: Json | null
          new_value?: boolean | null
          previous_value?: boolean | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rollout_audit_edital_id_fkey"
            columns: ["edital_id"]
            isOneToOne: false
            referencedRelation: "editais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rollout_audit_edital_id_fkey"
            columns: ["edital_id"]
            isOneToOne: false
            referencedRelation: "view_rollout_status"
            referencedColumns: ["id"]
          },
        ]
      }
      rollout_snapshots: {
        Row: {
          created_at: string | null
          created_by: string | null
          data: Json
          environment: string
          id: string
          notes: string | null
          snapshot_type: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          data: Json
          environment: string
          id?: string
          notes?: string | null
          snapshot_type: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          data?: Json
          environment?: string
          id?: string
          notes?: string | null
          snapshot_type?: string
        }
        Relationships: []
      }
      sancoes_prestadores: {
        Row: {
          aplicada_por: string | null
          created_at: string | null
          credenciado_id: string
          data_fim: string | null
          data_inicio: string
          duracao_dias: number | null
          id: string
          metadata: Json | null
          motivo: string
          observacoes: string | null
          ocorrencia_id: string | null
          processo_administrativo: string | null
          recurso_apresentado: boolean | null
          recurso_deferido: boolean | null
          status: string | null
          tipo_sancao: string
          updated_at: string | null
          valor_multa: number | null
        }
        Insert: {
          aplicada_por?: string | null
          created_at?: string | null
          credenciado_id: string
          data_fim?: string | null
          data_inicio: string
          duracao_dias?: number | null
          id?: string
          metadata?: Json | null
          motivo: string
          observacoes?: string | null
          ocorrencia_id?: string | null
          processo_administrativo?: string | null
          recurso_apresentado?: boolean | null
          recurso_deferido?: boolean | null
          status?: string | null
          tipo_sancao: string
          updated_at?: string | null
          valor_multa?: number | null
        }
        Update: {
          aplicada_por?: string | null
          created_at?: string | null
          credenciado_id?: string
          data_fim?: string | null
          data_inicio?: string
          duracao_dias?: number | null
          id?: string
          metadata?: Json | null
          motivo?: string
          observacoes?: string | null
          ocorrencia_id?: string | null
          processo_administrativo?: string | null
          recurso_apresentado?: boolean | null
          recurso_deferido?: boolean | null
          status?: string | null
          tipo_sancao?: string
          updated_at?: string | null
          valor_multa?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sancoes_prestadores_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "credenciados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sancoes_prestadores_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "documentos_completos"
            referencedColumns: ["credenciado_id"]
          },
          {
            foreignKeyName: "sancoes_prestadores_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "v_dados_regularidade"
            referencedColumns: ["credenciado_id"]
          },
          {
            foreignKeyName: "sancoes_prestadores_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "view_geocode_failures_last_24h"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sancoes_prestadores_ocorrencia_id_fkey"
            columns: ["ocorrencia_id"]
            isOneToOne: false
            referencedRelation: "ocorrencias_prestadores"
            referencedColumns: ["id"]
          },
        ]
      }
      signature_requests: {
        Row: {
          completed_at: string | null
          contrato_id: string | null
          created_at: string | null
          document_url: string | null
          external_id: string | null
          external_status: string | null
          id: string
          inscricao_id: string | null
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
          contrato_id?: string | null
          created_at?: string | null
          document_url?: string | null
          external_id?: string | null
          external_status?: string | null
          id?: string
          inscricao_id?: string | null
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
          contrato_id?: string | null
          created_at?: string | null
          document_url?: string | null
          external_id?: string | null
          external_status?: string | null
          id?: string
          inscricao_id?: string | null
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
            foreignKeyName: "fk_signature_requests_contrato"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_signature_requests_inscricao"
            columns: ["inscricao_id"]
            isOneToOne: false
            referencedRelation: "inscricoes_edital"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_signature_requests_inscricao"
            columns: ["inscricao_id"]
            isOneToOne: false
            referencedRelation: "view_inscricoes_validacao_pendente"
            referencedColumns: ["inscricao_id"]
          },
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
          categoria: string | null
          created_at: string | null
          credenciado_id: string
          dados_atuais: Json | null
          dados_propostos: Json
          documentos_anexos: Json | null
          id: string
          justificativa: string | null
          observacoes_analise: string | null
          prioridade: string | null
          solicitado_em: string | null
          status: string
          tipo_alteracao: string
          user_id: string | null
        }
        Insert: {
          analisado_em?: string | null
          analisado_por?: string | null
          categoria?: string | null
          created_at?: string | null
          credenciado_id: string
          dados_atuais?: Json | null
          dados_propostos: Json
          documentos_anexos?: Json | null
          id?: string
          justificativa?: string | null
          observacoes_analise?: string | null
          prioridade?: string | null
          solicitado_em?: string | null
          status?: string
          tipo_alteracao: string
          user_id?: string | null
        }
        Update: {
          analisado_em?: string | null
          analisado_por?: string | null
          categoria?: string | null
          created_at?: string | null
          credenciado_id?: string
          dados_atuais?: Json | null
          dados_propostos?: Json
          documentos_anexos?: Json | null
          id?: string
          justificativa?: string | null
          observacoes_analise?: string | null
          prioridade?: string | null
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
          {
            foreignKeyName: "solicitacoes_alteracao_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "documentos_completos"
            referencedColumns: ["credenciado_id"]
          },
          {
            foreignKeyName: "solicitacoes_alteracao_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "v_dados_regularidade"
            referencedColumns: ["credenciado_id"]
          },
          {
            foreignKeyName: "solicitacoes_alteracao_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "view_geocode_failures_last_24h"
            referencedColumns: ["id"]
          },
        ]
      }
      tipos_documentos_credenciados: {
        Row: {
          ativo: boolean | null
          categoria: string | null
          codigo: string
          created_at: string | null
          descricao: string | null
          dias_alerta_1: number | null
          dias_alerta_2: number | null
          dias_alerta_3: number | null
          id: string
          meses_validade_padrao: number | null
          nome: string
          obrigatorio: boolean | null
          ordem: number | null
          renovavel: boolean | null
        }
        Insert: {
          ativo?: boolean | null
          categoria?: string | null
          codigo: string
          created_at?: string | null
          descricao?: string | null
          dias_alerta_1?: number | null
          dias_alerta_2?: number | null
          dias_alerta_3?: number | null
          id?: string
          meses_validade_padrao?: number | null
          nome: string
          obrigatorio?: boolean | null
          ordem?: number | null
          renovavel?: boolean | null
        }
        Update: {
          ativo?: boolean | null
          categoria?: string | null
          codigo?: string
          created_at?: string | null
          descricao?: string | null
          dias_alerta_1?: number | null
          dias_alerta_2?: number | null
          dias_alerta_3?: number | null
          id?: string
          meses_validade_padrao?: number | null
          nome?: string
          obrigatorio?: boolean | null
          ordem?: number | null
          renovavel?: boolean | null
        }
        Relationships: []
      }
      user_consents: {
        Row: {
          accepted_at: string
          consent_type: string
          consent_version: string
          created_at: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          revoked_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string
          consent_type: string
          consent_version: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          revoked_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string
          consent_type?: string
          consent_version?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          revoked_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string | null
          id: string
          page_key: string
          preferences: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          page_key: string
          preferences?: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          page_key?: string
          preferences?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
      usuarios_grupos: {
        Row: {
          adicionado_em: string | null
          adicionado_por: string | null
          ativo: boolean | null
          grupo_id: string | null
          id: string
          observacoes: string | null
          papel: string | null
          removido_em: string | null
          removido_por: string | null
          usuario_id: string | null
        }
        Insert: {
          adicionado_em?: string | null
          adicionado_por?: string | null
          ativo?: boolean | null
          grupo_id?: string | null
          id?: string
          observacoes?: string | null
          papel?: string | null
          removido_em?: string | null
          removido_por?: string | null
          usuario_id?: string | null
        }
        Update: {
          adicionado_em?: string | null
          adicionado_por?: string | null
          ativo?: boolean | null
          grupo_id?: string | null
          id?: string
          observacoes?: string | null
          papel?: string | null
          removido_em?: string | null
          removido_por?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_grupos_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos_usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuarios_grupos_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "v_grupos_com_membros"
            referencedColumns: ["grupo_id"]
          },
        ]
      }
      webhook_deliveries: {
        Row: {
          created_at: string | null
          delivered_at: string | null
          erro: string | null
          evento: string
          id: string
          payload: Json
          resposta_body: string | null
          resposta_status: number | null
          status: string
          subscription_id: string
          tentativas: number | null
        }
        Insert: {
          created_at?: string | null
          delivered_at?: string | null
          erro?: string | null
          evento: string
          id?: string
          payload: Json
          resposta_body?: string | null
          resposta_status?: number | null
          status: string
          subscription_id: string
          tentativas?: number | null
        }
        Update: {
          created_at?: string | null
          delivered_at?: string | null
          erro?: string | null
          evento?: string
          id?: string
          payload?: Json
          resposta_body?: string | null
          resposta_status?: number | null
          status?: string
          subscription_id?: string
          tentativas?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "webhook_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          payload: Json
          queue_id: string | null
          source_ip: string | null
          status: string
          webhook_id: string
          workflow_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          payload: Json
          queue_id?: string | null
          source_ip?: string | null
          status?: string
          webhook_id: string
          workflow_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          payload?: Json
          queue_id?: string | null
          source_ip?: string | null
          status?: string
          webhook_id?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_events_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "workflow_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_events_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "workflow_webhooks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_events_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_subscriptions: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          criado_por: string | null
          eventos: string[]
          id: string
          metadata: Json | null
          nome: string
          retry_policy: Json | null
          secret: string
          updated_at: string | null
          url: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          criado_por?: string | null
          eventos: string[]
          id?: string
          metadata?: Json | null
          nome: string
          retry_policy?: Json | null
          secret: string
          updated_at?: string | null
          url: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          criado_por?: string | null
          eventos?: string[]
          id?: string
          metadata?: Json | null
          nome?: string
          retry_policy?: Json | null
          secret?: string
          updated_at?: string | null
          url?: string
        }
        Relationships: []
      }
      workflow_api_keys: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          workflow_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          workflow_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_api_keys_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
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
      workflow_checkpoints: {
        Row: {
          context: Json
          created_at: string
          execution_id: string
          id: string
          metadata: Json | null
          node_id: string
          state: string
          version: number
        }
        Insert: {
          context?: Json
          created_at?: string
          execution_id: string
          id?: string
          metadata?: Json | null
          node_id: string
          state: string
          version?: number
        }
        Update: {
          context?: Json
          created_at?: string
          execution_id?: string
          id?: string
          metadata?: Json | null
          node_id?: string
          state?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "workflow_checkpoints_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_events: {
        Row: {
          event_type: string
          execution_id: string
          from_state: string | null
          id: string
          node_id: string | null
          payload: Json | null
          timestamp: string
          to_state: string | null
        }
        Insert: {
          event_type: string
          execution_id: string
          from_state?: string | null
          id?: string
          node_id?: string | null
          payload?: Json | null
          timestamp?: string
          to_state?: string | null
        }
        Update: {
          event_type?: string
          execution_id?: string
          from_state?: string | null
          id?: string
          node_id?: string | null
          payload?: Json | null
          timestamp?: string
          to_state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_events_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_executions"
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
          is_retry: boolean | null
          previous_execution_id: string | null
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
          is_retry?: boolean | null
          previous_execution_id?: string | null
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
          is_retry?: boolean | null
          previous_execution_id?: string | null
          started_at?: string
          started_by?: string | null
          status?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_executions_previous_execution_id_fkey"
            columns: ["previous_execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_executions"
            referencedColumns: ["id"]
          },
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
          anexos: Json | null
          busca_texto: unknown | null
          content: string
          created_at: string | null
          deletada: boolean | null
          deletada_em: string | null
          editada: boolean | null
          editada_em: string | null
          em_resposta_a: string | null
          etapa_id: string | null
          etapa_nome: string | null
          execution_id: string | null
          id: string
          inscricao_id: string | null
          is_read: boolean | null
          lido_por: Json | null
          manifestacao_metadata: Json | null
          mencoes: string[] | null
          mensagem: string | null
          mensagem_html: string | null
          privada: boolean | null
          sender_id: string | null
          sender_type: string
          tipo: string
          updated_at: string | null
          usuario_email: string | null
          usuario_nome: string | null
          usuario_papel: string | null
          visivel_para: string[] | null
        }
        Insert: {
          anexos?: Json | null
          busca_texto?: unknown | null
          content: string
          created_at?: string | null
          deletada?: boolean | null
          deletada_em?: string | null
          editada?: boolean | null
          editada_em?: string | null
          em_resposta_a?: string | null
          etapa_id?: string | null
          etapa_nome?: string | null
          execution_id?: string | null
          id?: string
          inscricao_id?: string | null
          is_read?: boolean | null
          lido_por?: Json | null
          manifestacao_metadata?: Json | null
          mencoes?: string[] | null
          mensagem?: string | null
          mensagem_html?: string | null
          privada?: boolean | null
          sender_id?: string | null
          sender_type: string
          tipo?: string
          updated_at?: string | null
          usuario_email?: string | null
          usuario_nome?: string | null
          usuario_papel?: string | null
          visivel_para?: string[] | null
        }
        Update: {
          anexos?: Json | null
          busca_texto?: unknown | null
          content?: string
          created_at?: string | null
          deletada?: boolean | null
          deletada_em?: string | null
          editada?: boolean | null
          editada_em?: string | null
          em_resposta_a?: string | null
          etapa_id?: string | null
          etapa_nome?: string | null
          execution_id?: string | null
          id?: string
          inscricao_id?: string | null
          is_read?: boolean | null
          lido_por?: Json | null
          manifestacao_metadata?: Json | null
          mencoes?: string[] | null
          mensagem?: string | null
          mensagem_html?: string | null
          privada?: boolean | null
          sender_id?: string | null
          sender_type?: string
          tipo?: string
          updated_at?: string | null
          usuario_email?: string | null
          usuario_nome?: string | null
          usuario_papel?: string | null
          visivel_para?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_messages_em_resposta_a_fkey"
            columns: ["em_resposta_a"]
            isOneToOne: false
            referencedRelation: "v_mensagens_completas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_messages_em_resposta_a_fkey"
            columns: ["em_resposta_a"]
            isOneToOne: false
            referencedRelation: "workflow_messages"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "workflow_messages_inscricao_id_fkey"
            columns: ["inscricao_id"]
            isOneToOne: false
            referencedRelation: "view_inscricoes_validacao_pendente"
            referencedColumns: ["inscricao_id"]
          },
        ]
      }
      workflow_metrics: {
        Row: {
          duration_ms: number
          error_message: string | null
          execution_id: string
          id: string
          metadata: Json | null
          node_id: string
          node_type: string
          recorded_at: string
          retry_count: number | null
          status: string
        }
        Insert: {
          duration_ms: number
          error_message?: string | null
          execution_id: string
          id?: string
          metadata?: Json | null
          node_id: string
          node_type: string
          recorded_at?: string
          retry_count?: number | null
          status: string
        }
        Update: {
          duration_ms?: number
          error_message?: string | null
          execution_id?: string
          id?: string
          metadata?: Json | null
          node_id?: string
          node_type?: string
          recorded_at?: string
          retry_count?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_metrics_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_executions"
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
            foreignKeyName: "workflow_queue_inscricao_id_fkey"
            columns: ["inscricao_id"]
            isOneToOne: true
            referencedRelation: "view_inscricoes_validacao_pendente"
            referencedColumns: ["inscricao_id"]
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
      workflow_schedules: {
        Row: {
          created_at: string
          created_by: string | null
          cron_expression: string
          id: string
          input_data: Json | null
          is_active: boolean
          last_run_at: string | null
          next_run_at: string | null
          timezone: string
          updated_at: string
          workflow_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          cron_expression: string
          id?: string
          input_data?: Json | null
          is_active?: boolean
          last_run_at?: string | null
          next_run_at?: string | null
          timezone?: string
          updated_at?: string
          workflow_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          cron_expression?: string
          id?: string
          input_data?: Json | null
          is_active?: boolean
          last_run_at?: string | null
          next_run_at?: string | null
          timezone?: string
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_schedules_workflow_id_fkey"
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
      workflow_webhooks: {
        Row: {
          api_key_hash: string | null
          auth_type: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          payload_schema: Json | null
          rate_limit_per_minute: number | null
          updated_at: string
          webhook_id: string
          webhook_secret: string | null
          workflow_id: string
        }
        Insert: {
          api_key_hash?: string | null
          auth_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          payload_schema?: Json | null
          rate_limit_per_minute?: number | null
          updated_at?: string
          webhook_id: string
          webhook_secret?: string | null
          workflow_id: string
        }
        Update: {
          api_key_hash?: string | null
          auth_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          payload_schema?: Json | null
          rate_limit_per_minute?: number | null
          updated_at?: string
          webhook_id?: string
          webhook_secret?: string | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_webhooks_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
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
      zonas_geograficas: {
        Row: {
          area_km2: number | null
          cidade: string
          cidade_id: string
          created_at: string | null
          distritos_inclusos: string[] | null
          estado: string
          geometria_atualizada_em: string | null
          geometria_fonte: string | null
          geometry: Json
          geometry_simplified: Json | null
          ibge_codigo: string | null
          id: string
          osm_id: number | null
          populacao: number
          zona: string
        }
        Insert: {
          area_km2?: number | null
          cidade: string
          cidade_id: string
          created_at?: string | null
          distritos_inclusos?: string[] | null
          estado: string
          geometria_atualizada_em?: string | null
          geometria_fonte?: string | null
          geometry: Json
          geometry_simplified?: Json | null
          ibge_codigo?: string | null
          id?: string
          osm_id?: number | null
          populacao: number
          zona: string
        }
        Update: {
          area_km2?: number | null
          cidade?: string
          cidade_id?: string
          created_at?: string | null
          distritos_inclusos?: string[] | null
          estado?: string
          geometria_atualizada_em?: string | null
          geometria_fonte?: string | null
          geometry?: Json
          geometry_simplified?: Json | null
          ibge_codigo?: string | null
          id?: string
          osm_id?: number | null
          populacao?: number
          zona?: string
        }
        Relationships: [
          {
            foreignKeyName: "zonas_geograficas_cidade_id_fkey"
            columns: ["cidade_id"]
            isOneToOne: false
            referencedRelation: "cidades"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      documentos_completos: {
        Row: {
          arquivo_nome: string | null
          arquivo_url: string | null
          created_at: string | null
          credenciado_cpf: string | null
          credenciado_id: string | null
          credenciado_nome: string | null
          id: string | null
          inscricao_id: string | null
          status: string | null
          texto_busca: string | null
          tipo_documento: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inscricao_documentos_inscricao_id_fkey"
            columns: ["inscricao_id"]
            isOneToOne: false
            referencedRelation: "inscricoes_edital"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inscricao_documentos_inscricao_id_fkey"
            columns: ["inscricao_id"]
            isOneToOne: false
            referencedRelation: "view_inscricoes_validacao_pendente"
            referencedColumns: ["inscricao_id"]
          },
        ]
      }
      estatisticas_profissionais: {
        Row: {
          credenciado_id: string | null
          especialidade: string | null
          nota_media: number | null
          profissional_id: string | null
          profissional_nome: string | null
          total_1_estrela: number | null
          total_2_estrelas: number | null
          total_3_estrelas: number | null
          total_4_estrelas: number | null
          total_5_estrelas: number | null
          total_avaliacoes: number | null
          ultima_avaliacao: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profissionais_credenciados_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "credenciados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profissionais_credenciados_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "documentos_completos"
            referencedColumns: ["credenciado_id"]
          },
          {
            foreignKeyName: "profissionais_credenciados_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "v_dados_regularidade"
            referencedColumns: ["credenciado_id"]
          },
          {
            foreignKeyName: "profissionais_credenciados_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "view_geocode_failures_last_24h"
            referencedColumns: ["id"]
          },
        ]
      }
      geocoding_status: {
        Row: {
          cep: string | null
          cidade: string | null
          endereco: string | null
          estado: string | null
          geocoded_at: string | null
          geocoding_status: string | null
          id: string | null
          latitude: number | null
          longitude: number | null
          nome: string | null
          status: string | null
          tipo: string | null
        }
        Relationships: []
      }
      mv_catalogo_servicos: {
        Row: {
          aceita_sus: boolean | null
          categoria: string | null
          cidade: string | null
          credenciado_id: string | null
          credenciado_nome: string | null
          disponivel: boolean | null
          disponivel_online: boolean | null
          especialidade_nome: string | null
          estado: string | null
          id: string | null
          preco_base: number | null
          procedimento_id: string | null
          procedimento_nome: string | null
          search_vector: unknown | null
        }
        Relationships: [
          {
            foreignKeyName: "credenciado_servicos_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "credenciados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credenciado_servicos_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "documentos_completos"
            referencedColumns: ["credenciado_id"]
          },
          {
            foreignKeyName: "credenciado_servicos_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "v_dados_regularidade"
            referencedColumns: ["credenciado_id"]
          },
          {
            foreignKeyName: "credenciado_servicos_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "view_geocode_failures_last_24h"
            referencedColumns: ["id"]
          },
        ]
      }
      v_dados_regularidade: {
        Row: {
          contratos: Json | null
          cpf_cnpj: string | null
          credenciado_id: string | null
          data_ultima_atualizacao: string | null
          documentos: Json | null
          nome: string | null
          status_cadastro: string | null
          tipo_pessoa: string | null
        }
        Insert: {
          contratos?: never
          cpf_cnpj?: string | null
          credenciado_id?: string | null
          data_ultima_atualizacao?: string | null
          documentos?: never
          nome?: string | null
          status_cadastro?: string | null
          tipo_pessoa?: never
        }
        Update: {
          contratos?: never
          cpf_cnpj?: string | null
          credenciado_id?: string | null
          data_ultima_atualizacao?: string | null
          documentos?: never
          nome?: string | null
          status_cadastro?: string | null
          tipo_pessoa?: never
        }
        Relationships: []
      }
      v_dashboard_vencimentos: {
        Row: {
          atencao: number | null
          criticos: number | null
          total_prazos: number | null
          total_validos: number | null
          total_vencendo: number | null
          total_vencidos: number | null
          ultima_atualizacao: string | null
          vencem_15_dias: number | null
          vencem_30_dias: number | null
          vencem_7_dias: number | null
          vencidos_30_dias: number | null
          vencidos_90_dias: number | null
        }
        Relationships: []
      }
      v_grupos_com_membros: {
        Row: {
          ativo: boolean | null
          descricao: string | null
          grupo_id: string | null
          grupo_nome: string | null
          membros: Json | null
          tipo: string | null
          total_membros_ativos: number | null
        }
        Relationships: []
      }
      v_mensagens_completas: {
        Row: {
          anexos: Json | null
          busca_texto: unknown | null
          content: string | null
          created_at: string | null
          deletada: boolean | null
          deletada_em: string | null
          editada: boolean | null
          editada_em: string | null
          em_resposta_a: string | null
          etapa_id: string | null
          etapa_nome: string | null
          execution_id: string | null
          id: string | null
          inscricao_id: string | null
          is_read: boolean | null
          lido_por: Json | null
          mencoes: string[] | null
          mensagem: string | null
          mensagem_html: string | null
          mensagem_original: string | null
          privada: boolean | null
          sender_id: string | null
          sender_type: string | null
          tipo: string | null
          updated_at: string | null
          usuario_email: string | null
          usuario_nome: string | null
          usuario_papel: string | null
          visivel_para: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_messages_em_resposta_a_fkey"
            columns: ["em_resposta_a"]
            isOneToOne: false
            referencedRelation: "v_mensagens_completas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_messages_em_resposta_a_fkey"
            columns: ["em_resposta_a"]
            isOneToOne: false
            referencedRelation: "workflow_messages"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "workflow_messages_inscricao_id_fkey"
            columns: ["inscricao_id"]
            isOneToOne: false
            referencedRelation: "view_inscricoes_validacao_pendente"
            referencedColumns: ["inscricao_id"]
          },
        ]
      }
      v_prazos_completos: {
        Row: {
          ativo: boolean | null
          atualizado_em: string | null
          bloqueio_automatico: boolean | null
          cor_status: string | null
          credenciado_cpf: string | null
          credenciado_id: string | null
          credenciado_nome: string | null
          criado_em: string | null
          data_emissao: string | null
          data_renovacao: string | null
          data_vencimento: string | null
          dias_para_vencer: number | null
          entidade_id: string | null
          entidade_nome: string | null
          entidade_tipo: string | null
          id: string | null
          nivel_alerta: string | null
          notificacoes_enviadas: number | null
          observacoes: string | null
          proxima_notificacao: string | null
          renovado: boolean | null
          renovavel: boolean | null
          status_atual: string | null
          ultima_notificacao_em: string | null
        }
        Relationships: [
          {
            foreignKeyName: "controle_prazos_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "credenciados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "controle_prazos_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "documentos_completos"
            referencedColumns: ["credenciado_id"]
          },
          {
            foreignKeyName: "controle_prazos_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "v_dados_regularidade"
            referencedColumns: ["credenciado_id"]
          },
          {
            foreignKeyName: "controle_prazos_credenciado_id_fkey"
            columns: ["credenciado_id"]
            isOneToOne: false
            referencedRelation: "view_geocode_failures_last_24h"
            referencedColumns: ["id"]
          },
        ]
      }
      v_usuarios_com_grupos: {
        Row: {
          email: string | null
          grupos: Json | null
          nome: string | null
          total_grupos_ativos: number | null
          usuario_id: string | null
        }
        Relationships: []
      }
      view_audit_trail: {
        Row: {
          dados_antes: Json | null
          dados_depois: Json | null
          id: string | null
          ip_address: string | null
          metadata: Json | null
          operacao: string | null
          registro_id: string | null
          tabela: string | null
          timestamp: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
          user_role: string | null
        }
        Insert: {
          dados_antes?: Json | null
          dados_depois?: Json | null
          id?: string | null
          ip_address?: string | null
          metadata?: Json | null
          operacao?: string | null
          registro_id?: string | null
          tabela?: string | null
          timestamp?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_role?: string | null
        }
        Update: {
          dados_antes?: Json | null
          dados_depois?: Json | null
          id?: string | null
          ip_address?: string | null
          metadata?: Json | null
          operacao?: string | null
          registro_id?: string | null
          tabela?: string | null
          timestamp?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_role?: string | null
        }
        Relationships: []
      }
      view_credenciados_geo_stats: {
        Row: {
          avg_hours_to_geocode: number | null
          created_last_24h: number | null
          first_geocoded_at: string | null
          geocoded_last_24h: number | null
          last_geocoded_at: string | null
          success_rate_percent: number | null
          total_credenciados: number | null
          total_geocoded: number | null
          total_max_attempts_reached: number | null
          total_missing_geo: number | null
        }
        Relationships: []
      }
      view_geocode_cache_stats: {
        Row: {
          avg_hits_per_entry: number | null
          cache_reuse_rate_percent: number | null
          entries_last_week: number | null
          max_hits: number | null
          reused_entries: number | null
          total_cache_entries: number | null
          total_hits: number | null
          used_last_24h: number | null
        }
        Relationships: []
      }
      view_geocode_distribution: {
        Row: {
          estado: string | null
          geocoded: number | null
          missing: number | null
          success_rate: number | null
          total: number | null
        }
        Relationships: []
      }
      view_geocode_failures_last_24h: {
        Row: {
          cep: string | null
          cidade: string | null
          created_at: string | null
          endereco: string | null
          estado: string | null
          geocode_attempts: number | null
          hours_since_creation: number | null
          id: string | null
          last_geocode_attempt: string | null
          nome: string | null
        }
        Insert: {
          cep?: string | null
          cidade?: string | null
          created_at?: string | null
          endereco?: string | null
          estado?: string | null
          geocode_attempts?: number | null
          hours_since_creation?: never
          id?: string | null
          last_geocode_attempt?: string | null
          nome?: string | null
        }
        Update: {
          cep?: string | null
          cidade?: string | null
          created_at?: string | null
          endereco?: string | null
          estado?: string | null
          geocode_attempts?: number | null
          hours_since_creation?: never
          id?: string | null
          last_geocode_attempt?: string | null
          nome?: string | null
        }
        Relationships: []
      }
      view_inscricoes_validacao_pendente: {
        Row: {
          analistas: string | null
          candidato_email: string | null
          candidato_id: string | null
          candidato_nome: string | null
          data_inscricao: string | null
          data_validacao: string | null
          documentos_aprovados: number | null
          documentos_pendentes: number | null
          documentos_rejeitados: number | null
          edital_titulo: string | null
          inscricao_id: string | null
          total_documentos: number | null
          ultima_validacao: string | null
          validacao_status: string | null
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
            foreignKeyName: "inscricoes_edital_candidato_profile_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "v_usuarios_com_grupos"
            referencedColumns: ["usuario_id"]
          },
        ]
      }
      view_rollout_status: {
        Row: {
          contratos_assinados: number | null
          credenciados_ativos: number | null
          edital_status: string | null
          id: string | null
          inscricoes_aguardando: number | null
          inscricoes_aprovadas: number | null
          inscricoes_em_analise: number | null
          inscricoes_reprovadas: number | null
          numero_edital: string | null
          titulo: string | null
          ultima_acao_toggle: string | null
          ultima_alteracao_toggle: string | null
          use_programmatic_flow: boolean | null
        }
        Relationships: []
      }
    }
    Functions: {
      analisar_inscricoes_legadas: {
        Args: Record<PropertyKey, never>
        Returns: {
          credenciado_nome: string
          endereco_legado: string
          inscricao_id: string
          protocolo: string
          status: string
          tem_cep: boolean
          tem_endereco_estruturado: boolean
          tem_endereco_legado: boolean
        }[]
      }
      atualizar_status_prazos: {
        Args: Record<PropertyKey, never>
        Returns: {
          novos_alertas: number
          novos_vencidos: number
          total_atualizados: number
        }[]
      }
      buscar_credenciados_com_documentos: {
        Args: {
          p_apenas_com_documentos?: boolean
          p_apenas_vencidos?: boolean
          p_limite?: number
          p_offset?: number
          p_status?: string
          p_termo_busca?: string
          p_tipo_documento?: string
        }
        Returns: {
          credenciado_cnpj: string
          credenciado_cpf: string
          credenciado_email: string
          credenciado_id: string
          credenciado_nome: string
          credenciado_numero: string
          credenciado_status: string
          documentos: Json
          documentos_ativos: number
          documentos_vencendo: number
          documentos_vencidos: number
          proximo_vencimento: string
          total_documentos: number
        }[]
      }
      buscar_credenciados_com_documentos_completo: {
        Args: {
          p_apenas_com_documentos?: boolean
          p_apenas_vencidos?: boolean
          p_limite?: number
          p_offset?: number
          p_status?: string
          p_termo_busca?: string
          p_tipo_documento?: string
        }
        Returns: {
          credenciado_cnpj: string
          credenciado_cpf: string
          credenciado_email: string
          credenciado_id: string
          credenciado_nome: string
          credenciado_numero: string
          credenciado_status: string
          documentos: Json
          documentos_ativos: number
          documentos_vencendo: number
          documentos_vencidos: number
          especialidades: Json
          proximo_vencimento: string
          total_documentos: number
        }[]
      }
      buscar_credenciados_por_categoria: {
        Args: { p_categoria?: string; p_cidade?: string; p_estado?: string }
        Returns: {
          categoria: string
          categoria_codigo: string
          cidade: string
          cnpj: string
          credenciado_id: string
          estado: string
          latitude: number
          longitude: number
          nome: string
        }[]
      }
      buscar_documentos: {
        Args: {
          p_credenciado_id?: string
          p_data_fim?: string
          p_data_inicio?: string
          p_limit?: number
          p_status?: string
          p_termo?: string
          p_tipo_documento?: string
        }
        Returns: Database["public"]["CompositeTypes"]["documento_busca_resultado"][]
      }
      buscar_documentos_completos: {
        Args:
          | {
              p_apenas_com_numero?: boolean
              p_apenas_habilitados?: boolean
              p_credenciado_id?: string
              p_data_fim?: string
              p_data_inicio?: string
              p_incluir_nao_credenciados?: boolean
              p_incluir_ocr?: boolean
              p_incluir_prazos?: boolean
              p_limit?: number
              p_status?: string
              p_status_credenciado?: string
              p_termo?: string
              p_tipo_documento?: string
            }
          | {
              p_credenciado_id?: string
              p_data_fim?: string
              p_data_inicio?: string
              p_incluir_ocr?: boolean
              p_incluir_prazos?: boolean
              p_limit?: number
              p_status?: string
              p_termo?: string
              p_tipo_documento?: string
            }
          | {
              p_credenciado_id?: string
              p_data_fim?: string
              p_data_inicio?: string
              p_inscricao_id?: string
              p_limite?: number
              p_offset?: number
              p_ordenacao?: string
              p_status?: string
              p_termo?: string
              p_tipo_documento?: string
            }
        Returns: {
          arquivo_nome: string
          arquivo_url: string
          created_at: string
          credenciado_cpf: string
          credenciado_id: string
          credenciado_nome: string
          credenciado_numero: string
          credenciado_status: string
          data_habilitacao: string
          id: string
          inscricao_id: string
          is_credenciado: boolean
          ocr_resultado: Json
          prazos: Json
          status: string
          tipo_documento: string
        }[]
      }
      buscar_servicos_rede: {
        Args: {
          p_aceita_sus?: boolean
          p_categoria?: string
          p_cidade?: string
          p_disponivel_online?: boolean
          p_especialidade?: string
          p_estado?: string
          p_preco_maximo?: number
          p_procedimento?: string
        }
        Returns: {
          aceita_sus: boolean
          categoria: string
          cidade: string
          credenciado_cnpj: string
          credenciado_endereco: string
          credenciado_id: string
          credenciado_nome: string
          disponivel_online: boolean
          especialidade: string
          estado: string
          latitude: number
          local_atendimento: string
          longitude: number
          observacoes: string
          preco_base: number
          preco_particular: number
          procedimento: string
          procedimento_codigo: string
          profissional_crm: string
          profissional_nome: string
          servico_id: string
          tempo_espera_medio: number
        }[]
      }
      buscar_usuarios_para_mencao: {
        Args: { p_inscricao_id: string; p_termo?: string }
        Returns: {
          email: string
          id: string
          nome: string
          papel: string
        }[]
      }
      calcular_estatisticas_avaliacoes: {
        Args: { p_periodo_fim?: string; p_periodo_inicio?: string }
        Returns: {
          credenciados_avaliados: number
          media_geral: number
          melhor_nota: number
          pior_nota: number
          total_avaliacoes: number
        }[]
      }
      calcular_estatisticas_hibridas: {
        Args: { p_credenciado_id: string }
        Returns: {
          badges: string[]
          criterios_destaque: Json
          nota_media_interna: number
          nota_media_publica: number
          performance_score: number
          pontos_fortes: string[]
          pontos_fracos: string[]
          total_avaliacoes_internas: number
          total_avaliacoes_publicas: number
        }[]
      }
      calcular_status_regularidade: {
        Args: { p_credenciado_id: string }
        Returns: {
          detalhes: Json
          pendencias: Json
          status: Database["public"]["Enums"]["status_regularidade_enum"]
        }[]
      }
      check_geocoding_alerts: {
        Args: Record<PropertyKey, never>
        Returns: {
          alert_type: string
          count: number
          details: Json
          message: string
          severity: string
        }[]
      }
      cleanup_orphan_workflows: {
        Args: Record<PropertyKey, never>
        Returns: {
          cleaned_executions: number
          reset_queue_items: number
        }[]
      }
      consultar_certificado_por_credenciado: {
        Args: { p_credenciado_id: string } | { p_identificador: string }
        Returns: {
          certificado_id: string
          credenciado: Json
          emitido_em: string
          encontrado: boolean
          hash_verificacao: string
          numero_certificado: string
          situacao: string
          status: string
          tem_pdf: boolean
          url_pdf: string
          valido_ate: string
        }[]
      }
      consultar_certificado_publico: {
        Args: { p_tipo: string; p_valor: string }
        Returns: {
          certificado_id: string
          credenciado: Json
          emitido_em: string
          encontrado: boolean
          hash_verificacao: string
          numero_certificado: string
          situacao: string
          status: string
          tem_pdf: boolean
          url_pdf: string
          valido_ate: string
        }[]
      }
      corrigir_inscricoes_orfas: {
        Args: Record<PropertyKey, never>
        Returns: {
          credenciado_criado: boolean
          credenciado_id: string
          edital_numero: string
          erro: string
          inscricao_id: string
          protocolo: string
          status_anterior: string
        }[]
      }
      create_rollout_snapshot: {
        Args: {
          p_environment?: string
          p_notes?: string
          p_snapshot_type: string
        }
        Returns: string
      }
      criar_lembretes_avaliacao_mensal: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      detectar_zona: {
        Args: { p_cidade_id: string; p_latitude: number; p_longitude: number }
        Returns: string
      }
      disable_programmatic_flow: {
        Args: { p_edital_id: string; p_reason?: string }
        Returns: Json
      }
      documento_search_text: {
        Args: { arquivo_nome: string; tipo_documento: string }
        Returns: string
      }
      enable_programmatic_flow: {
        Args: { p_edital_id: string; p_reason?: string }
        Returns: Json
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
      enviar_correcao_inscricao: {
        Args: {
          p_campos_corrigidos: Json
          p_correcao_id: string
          p_documentos_reenviados: string[]
          p_justificativa: string
        }
        Returns: Json
      }
      estatisticas_geocodificacao: {
        Args: Record<PropertyKey, never>
        Returns: {
          consultorios_geocodificados: number
          consultorios_pendentes: number
          credenciados_geocodificados: number
          credenciados_pendentes: number
          inscricoes_sem_cep: number
          percentual_consultorios: number
          percentual_credenciados: number
          total_consultorios: number
          total_credenciados: number
        }[]
      }
      generate_address_hash: {
        Args: {
          p_cep: string
          p_cidade: string
          p_endereco: string
          p_estado: string
        }
        Returns: string
      }
      generate_api_key: {
        Args: {
          p_description?: string
          p_name?: string
          p_workflow_id?: string
        }
        Returns: string
      }
      generate_webhook_url: {
        Args: { p_workflow_id: string }
        Returns: string
      }
      gerar_api_key_externa: {
        Args: { p_nome: string; p_quota_diaria?: number }
        Returns: string
      }
      gerar_codigo_verificacao: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      gerar_hash_certificado: {
        Args:
          | {
              p_credenciado_id: string
              p_numero: string
              p_status: string
              p_timestamp: string
            }
          | { p_data: string }
        Returns: string
      }
      gerar_numero_certificado: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      gerar_protocolo_inscricao: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_assinafy_stats: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_batch_unread_counts: {
        Args: { p_inscricao_ids: string[] }
        Returns: {
          inscricao_id: string
          unread_count: number
        }[]
      }
      get_categorias_por_credenciado: {
        Args: { p_credenciado_id: string }
        Returns: {
          categoria_codigo: string
          categoria_id: string
          categoria_nome: string
          principal: boolean
        }[]
      }
      get_contratos_sem_signature_request: {
        Args: Record<PropertyKey, never>
        Returns: {
          dados_contrato: Json
          dados_inscricao: Json
          id: string
          inscricao_id: string
          numero_contrato: string
          signature_request_id: string
        }[]
      }
      get_credenciados_sem_crms: {
        Args: { tipo_cred: string }
        Returns: {
          cpf: string
          dados_inscricao: Json
          id: string
          nome: string
          status: string
          tipo_credenciamento: string
        }[]
      }
      get_document_type_for_status_change: {
        Args: { new_status: string; old_status: string }
        Returns: string
      }
      get_documento_historico: {
        Args: { p_documento_id: string }
        Returns: {
          alterado_por_nome: string
          comentario: string
          data_alteracao: string
          id: string
          status_anterior: string
          status_novo: string
          tipo_alteracao: string
        }[]
      }
      get_extrato_categorizacao: {
        Args: { p_credenciado_id: string }
        Returns: {
          categoria_anterior: string
          categoria_anterior_codigo: string
          categoria_nova: string
          categoria_nova_codigo: string
          data_alteracao: string
          id: string
          justificativa: string
          principal_anterior: boolean
          principal_nova: boolean
          tipo_operacao: string
          usuario_nome: string
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
      get_servicos_por_credenciado: {
        Args: { p_credenciado_id: string }
        Returns: {
          aceita_sus: boolean
          credenciado_id: string
          credenciado_nome: string
          dias_atendimento: string[]
          disponivel: boolean
          disponivel_online: boolean
          especialidade_id: string
          especialidade_nome: string
          horario_fim: string
          horario_inicio: string
          local_atendimento: string
          observacoes: string
          preco_base: number
          preco_convenio: number
          preco_particular: number
          procedimento_categoria: string
          procedimento_codigo: string
          procedimento_id: string
          procedimento_nome: string
          profissional_crm: string
          profissional_id: string
          profissional_nome: string
          servico_id: string
          tempo_espera_medio: number
        }[]
      }
      get_stats_categorizacao: {
        Args: { p_credenciado_id: string }
        Returns: {
          categorias_ja_vinculadas: string[]
          total_alteracoes: number
          total_alteracoes_principal: number
          total_inclusoes: number
          total_remocoes: number
          ultima_alteracao: string
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
      iniciar_correcao_inscricao: {
        Args: { p_inscricao_id: string }
        Returns: string
      }
      is_credenciado_owner: {
        Args: { _credenciado_id: string; _user_id: string }
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
      log_inscricao_evento: {
        Args: {
          p_dados?: Json
          p_descricao?: string
          p_inscricao_id: string
          p_tipo_evento: string
          p_usuario_id?: string
        }
        Returns: string
      }
      marcar_mensagem_lida: {
        Args: { p_mensagem_id: string; p_usuario_id?: string }
        Returns: boolean
      }
      mark_messages_read: {
        Args: { message_ids: string[]; user_id: string }
        Returns: undefined
      }
      migrar_crms_inscricoes: {
        Args: Record<PropertyKey, never>
        Returns: {
          resultado_credenciado_id: string
          resultado_crm: string
          resultado_especialidades: number
          resultado_numero: string
          resultado_uf: string
        }[]
      }
      migrar_documentos_sql_direto: {
        Args: { p_credenciado_ids: string[] }
        Returns: Json
      }
      migrar_prazos_existentes: {
        Args: Record<PropertyKey, never>
        Returns: {
          erros: string[]
          total_migrados: number
        }[]
      }
      normalize_address: {
        Args: { addr: string }
        Returns: string
      }
      obter_permissoes_usuario: {
        Args: { p_usuario_id: string }
        Returns: Json
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
      process_orphan_inscricoes_programaticas: {
        Args: Record<PropertyKey, never>
        Returns: {
          result_action: string
          result_edital_id: string
          result_inscricao_id: string
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
      processar_decisao_inscricao: {
        Args: {
          p_analise_id: string
          p_analista_id: string
          p_campos_reprovados?: Json
          p_documentos_reprovados?: Json
          p_inscricao_id: string
          p_justificativa: string
          p_motivo_reprovacao?: string
          p_prazo_correcao?: string
          p_status_decisao: string
        }
        Returns: Json
      }
      refresh_catalogo_servicos: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      registrar_historico_manual: {
        Args: { p_comentario: string; p_documento_id: string }
        Returns: undefined
      }
      relatorio_media_mediana_credenciados: {
        Args: {
          p_cidade?: string
          p_estado?: string
          p_mes_referencia?: string
        }
        Returns: {
          cidade: string
          cnpj: string
          credenciado_id: string
          estado: string
          media_avaliacao_rede: number
          media_produtividade_rede: number
          mediana_avaliacao_rede: number
          mediana_produtividade_rede: number
          nome_credenciado: string
          score_rede: number
          total_profissionais: number
        }[]
      }
      relatorio_media_mediana_profissionais: {
        Args: {
          p_credenciado_id?: string
          p_especialidade?: string
          p_estado?: string
          p_mes_referencia?: string
        }
        Returns: {
          cidade: string
          credenciado_id: string
          crm: string
          especialidade: string
          estado: string
          media_avaliacao: number
          media_horas: number
          media_produtividade: number
          mediana_avaliacao: number
          mediana_produtividade: number
          nome_credenciado: string
          nome_profissional: string
          profissional_id: string
          score_composto: number
          tipo_vinculo: string
          total_avaliacoes: number
          uf_crm: string
        }[]
      }
      renovar_prazo: {
        Args: {
          p_nova_data_vencimento: string
          p_observacao?: string
          p_prazo_id: string
        }
        Returns: Json
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
      sync_credenciado_from_contract: {
        Args: { p_inscricao_id: string }
        Returns: string
      }
      tabela_existe: {
        Args: { p_schema: string; p_tabela: string }
        Returns: boolean
      }
      usuario_pertence_grupo: {
        Args: { p_grupo_id: string; p_usuario_id: string }
        Returns: boolean
      }
      validar_documento: {
        Args: {
          p_comentario?: string
          p_discrepancias?: Json
          p_documento_id: string
          p_status: string
        }
        Returns: string
      }
      verificar_contratos_sem_credenciado: {
        Args: Record<PropertyKey, never>
        Returns: {
          assinado_em: string
          contrato_id: string
          inscricao_id: string
          numero_contrato: string
          status: string
          tem_dados_contrato: boolean
        }[]
      }
      verificar_credenciados_incompletos: {
        Args: Record<PropertyKey, never>
        Returns: {
          campos_faltantes: string[]
          cpf: string
          credenciado_id: string
          nome: string
          tem_crm: boolean
          tem_email: boolean
          tem_endereco: boolean
        }[]
      }
      verificar_prazos_vencendo: {
        Args: Record<PropertyKey, never>
        Returns: {
          credenciado_email: string
          credenciado_id: string
          credenciado_nome: string
          data_vencimento: string
          dias_restantes: number
          prazo_id: string
          tipo_alerta: string
          tipo_prazo: string
        }[]
      }
      verificar_regras_suspensao_automatica: {
        Args: Record<PropertyKey, never>
        Returns: {
          acao: string
          credenciado_id: string
          credenciado_nome: string
          dados_gatilho: Json
          motivo: string
          regra_id: string
          regra_nome: string
        }[]
      }
    }
    Enums: {
      app_role: "candidato" | "analista" | "gestor" | "admin"
      status_regularidade_enum:
        | "regular"
        | "regular_ressalvas"
        | "irregular"
        | "inativo"
    }
    CompositeTypes: {
      documento_busca_resultado: {
        id: string | null
        inscricao_id: string | null
        tipo_documento: string | null
        arquivo_nome: string | null
        arquivo_url: string | null
        status: string | null
        created_at: string | null
        credenciado_nome: string | null
        credenciado_cpf: string | null
        relevancia: number | null
        snippet: string | null
      }
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
      status_regularidade_enum: [
        "regular",
        "regular_ressalvas",
        "irregular",
        "inativo",
      ],
    },
  },
} as const
