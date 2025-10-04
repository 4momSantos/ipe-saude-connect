import { CheckCircle, FileText, MessageSquare, AlertCircle, XCircle, Clock } from "lucide-react";

interface HistoryEvent {
  id: number;
  tipo: "criacao" | "documento" | "mensagem" | "aprovacao" | "rejeicao" | "pendencia";
  descricao: string;
  autor: string;
  data: string;
}

const historicoMock: HistoryEvent[] = [
  {
    id: 1,
    tipo: "criacao",
    descricao: "Processo de credenciamento iniciado",
    autor: "Sistema",
    data: "2025-09-28T10:00:00",
  },
  {
    id: 2,
    tipo: "documento",
    descricao: "5 documentos enviados pelo candidato",
    autor: "João Silva",
    data: "2025-09-28T10:15:00",
  },
  {
    id: 3,
    tipo: "mensagem",
    descricao: "Nova mensagem do candidato",
    autor: "João Silva",
    data: "2025-09-28T14:30:00",
  },
  {
    id: 4,
    tipo: "mensagem",
    descricao: "Resposta do analista solicitando diploma autenticado",
    autor: "Maria Santos",
    data: "2025-09-28T15:45:00",
  },
  {
    id: 5,
    tipo: "pendencia",
    descricao: "Processo marcado como pendente - aguardando diploma autenticado",
    autor: "Maria Santos",
    data: "2025-09-28T15:46:00",
  },
  {
    id: 6,
    tipo: "aprovacao",
    descricao: "Documento RG_Frente.pdf aprovado",
    autor: "Maria Santos",
    data: "2025-09-28T16:00:00",
  },
  {
    id: 7,
    tipo: "aprovacao",
    descricao: "Documento CPF.pdf aprovado",
    autor: "Maria Santos",
    data: "2025-09-28T16:01:00",
  },
];

export function HistoryTab({ processoId }: { processoId: string }) {
  const getIcon = (tipo: HistoryEvent["tipo"]) => {
    const icons = {
      criacao: <Clock className="h-5 w-5 text-blue-400" />,
      documento: <FileText className="h-5 w-5 text-purple-400" />,
      mensagem: <MessageSquare className="h-5 w-5 text-blue-400" />,
      aprovacao: <CheckCircle className="h-5 w-5 text-green-400" />,
      rejeicao: <XCircle className="h-5 w-5 text-red-400" />,
      pendencia: <AlertCircle className="h-5 w-5 text-orange-400" />,
    };
    return icons[tipo];
  };

  const getColor = (tipo: HistoryEvent["tipo"]) => {
    const colors = {
      criacao: "border-blue-500/30 bg-blue-500/5",
      documento: "border-purple-500/30 bg-purple-500/5",
      mensagem: "border-blue-500/30 bg-blue-500/5",
      aprovacao: "border-green-500/30 bg-green-500/5",
      rejeicao: "border-red-500/30 bg-red-500/5",
      pendencia: "border-orange-500/30 bg-orange-500/5",
    };
    return colors[tipo];
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />

        {/* Events */}
        <div className="space-y-6">
          {historicoMock.map((evento, index) => (
            <div key={evento.id} className="relative flex gap-4">
              {/* Icon */}
              <div className={`relative z-10 rounded-full border-2 p-2 bg-background ${getColor(evento.tipo)}`}>
                {getIcon(evento.tipo)}
              </div>

              {/* Content */}
              <div className="flex-1 pb-6">
                <div className="rounded-lg border bg-card p-4 hover-lift">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">{evento.descricao}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{evento.autor}</span>
                        <span>•</span>
                        <span>
                          {new Date(evento.data).toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
