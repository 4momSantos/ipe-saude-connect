import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface HistoricoEvento {
  id: string;
  tipo: "status_change" | "credenciamento" | "afastamento" | "avaliacao" | "certificado" | "prazo" | "historico";
  titulo: string;
  descricao: string;
  data: string;
  responsavel?: string;
  metadata?: any;
  status?: string;
}

export const useHistoricoCredenciado = (credenciadoId: string) => {
  return useQuery({
    queryKey: ["historico-credenciado", credenciadoId],
    queryFn: async () => {
      const eventos: HistoricoEvento[] = [];

      // 1. Buscar mudanças de status (suspensão, ativação, descredenciamento)
      const { data: statusChanges } = await supabase
        .from("historico_status_credenciado")
        .select("*")
        .eq("credenciado_id", credenciadoId)
        .order("created_at", { ascending: false });

      if (statusChanges) {
        for (const change of statusChanges) {
          let responsavel = change.alterado_por_nome || "Sistema";
          
          if (!responsavel && change.alterado_por) {
            const { data: perfil } = await supabase
              .from("profiles")
              .select("nome")
              .eq("id", change.alterado_por)
              .single();
            
            if (perfil?.nome) {
              responsavel = perfil.nome;
            }
          }
          
          eventos.push({
            id: change.id,
            tipo: "status_change",
            titulo: `Mudança de Status: ${change.status_anterior} → ${change.status_novo}`,
            descricao: change.motivo || "Mudança de status do credenciado",
            data: new Date(change.created_at).toLocaleString("pt-BR"),
            responsavel,
            metadata: change.metadata,
            status: change.status_novo,
          });
        }
      }

      // 2. Buscar histórico geral do credenciado
      const { data: historico } = await supabase
        .from("credenciado_historico")
        .select("*")
        .eq("credenciado_id", credenciadoId)
        .order("created_at", { ascending: false });

      if (historico) {
        historico.forEach((item) => {
          eventos.push({
            id: item.id,
            tipo: "historico",
            titulo: item.tipo === "credenciamento" ? "Credenciamento Realizado" : 
                   item.tipo === "suspensao" ? "Suspensão Aplicada" :
                   item.tipo === "descredenciamento" ? "Descredenciamento" :
                   item.tipo.charAt(0).toUpperCase() + item.tipo.slice(1),
            descricao: item.descricao,
            data: new Date(item.created_at).toLocaleString("pt-BR"),
            responsavel: item.usuario_responsavel || "Sistema",
          });
        });
      }

      // 3. Buscar afastamentos
      const { data: afastamentos } = await supabase
        .from("afastamentos_credenciados")
        .select("*")
        .eq("credenciado_id", credenciadoId)
        .order("created_at", { ascending: false });

      if (afastamentos) {
        for (const afastamento of afastamentos) {
          let responsavel = "Sistema";
          
          if (afastamento.analisado_por) {
            const { data: perfil } = await supabase
              .from("profiles")
              .select("nome")
              .eq("id", afastamento.analisado_por)
              .single();
            
            if (perfil?.nome) {
              responsavel = perfil.nome;
            }
          }
          
          eventos.push({
            id: afastamento.id,
            tipo: "afastamento",
            titulo: `Solicitação de Afastamento - ${afastamento.tipo}`,
            descricao: afastamento.justificativa,
            data: new Date(afastamento.created_at).toLocaleString("pt-BR"),
            responsavel: afastamento.status === "pendente" ? "Pendente" : responsavel,
            status: afastamento.status,
            metadata: {
              data_inicio: afastamento.data_inicio,
              data_fim: afastamento.data_fim,
              motivo: afastamento.motivo,
            },
          });
        }
      }

      // 4. Buscar avaliações de desempenho
      const { data: avaliacoes } = await supabase
        .from("avaliacoes_prestadores")
        .select("*")
        .eq("credenciado_id", credenciadoId)
        .order("created_at", { ascending: false });

      if (avaliacoes) {
        for (const avaliacao of avaliacoes) {
          let responsavel = "Sistema";
          
          if (avaliacao.avaliador_id) {
            const { data: perfil } = await supabase
              .from("profiles")
              .select("nome")
              .eq("id", avaliacao.avaliador_id)
              .single();
            
            if (perfil?.nome) {
              responsavel = perfil.nome;
            }
          }
          
          eventos.push({
            id: avaliacao.id,
            tipo: "avaliacao",
            titulo: "Avaliação de Desempenho",
            descricao: avaliacao.pontuacao_geral ? `Pontuação: ${avaliacao.pontuacao_geral}/100` : "Avaliação de desempenho realizada",
            data: new Date(avaliacao.created_at).toLocaleString("pt-BR"),
            responsavel,
            status: avaliacao.status,
            metadata: {
              pontuacao: avaliacao.pontuacao_geral,
              periodo: avaliacao.periodo_referencia,
            },
          });
        }
      }

      // 5. Buscar emissões de certificados
      const { data: certificados } = await supabase
        .from("certificados")
        .select("*")
        .eq("credenciado_id", credenciadoId)
        .order("emitido_em", { ascending: false });

      if (certificados) {
        certificados.forEach((cert) => {
          eventos.push({
            id: cert.id,
            tipo: "certificado",
            titulo: `Certificado Emitido - ${cert.tipo}`,
            descricao: `Número: ${cert.numero_certificado}`,
            data: new Date(cert.emitido_em).toLocaleString("pt-BR"),
            status: cert.status,
            metadata: {
              valido_ate: cert.valido_ate,
              documento_url: cert.documento_url,
            },
          });
        });
      }

      // 6. Buscar prazos e alertas
      const { data: prazos } = await supabase
        .from("prazos_credenciamento")
        .select("*")
        .eq("credenciado_id", credenciadoId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (prazos) {
        prazos.forEach((prazo) => {
          const dataVencimento = new Date(prazo.data_vencimento);
          const hoje = new Date();
          const diasRestantes = Math.ceil((dataVencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
          
          eventos.push({
            id: prazo.id,
            tipo: "prazo",
            titulo: `Prazo: ${prazo.tipo_prazo}`,
            descricao: prazo.observacoes || `Vencimento em ${dataVencimento.toLocaleDateString("pt-BR")}`,
            data: new Date(prazo.created_at).toLocaleString("pt-BR"),
            status: prazo.status,
            metadata: {
              data_vencimento: prazo.data_vencimento,
              dias_restantes: diasRestantes,
            },
          });
        });
      }

      // Ordenar todos os eventos por data (mais recente primeiro)
      return eventos.sort((a, b) => {
        const dateA = new Date(a.data.split(", ").reverse().join(" "));
        const dateB = new Date(b.data.split(", ").reverse().join(" "));
        return dateB.getTime() - dateA.getTime();
      });
    },
    enabled: !!credenciadoId,
  });
};
