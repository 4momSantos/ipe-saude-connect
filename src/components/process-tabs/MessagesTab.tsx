import { useState } from "react";
import { Send, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";

interface Message {
  id: number;
  autor: string;
  tipo: "analista" | "candidato";
  conteudo: string;
  data: string;
}

const mensagensIniciais: Message[] = [
  {
    id: 1,
    autor: "João Silva",
    tipo: "candidato",
    conteudo: "Boa tarde! Enviei todos os documentos solicitados. Há alguma pendência?",
    data: "2025-09-28T14:30:00",
  },
  {
    id: 2,
    autor: "Maria Santos",
    tipo: "analista",
    conteudo: "Olá Dr. João! Seus documentos estão em análise. O diploma de medicina precisa ser autenticado. Pode enviar uma versão com autenticação?",
    data: "2025-09-28T15:45:00",
  },
  {
    id: 3,
    autor: "João Silva",
    tipo: "candidato",
    conteudo: "Claro! Vou providenciar a autenticação e envio até amanhã.",
    data: "2025-09-28T16:00:00",
  },
];

export function MessagesTab({ processoId, candidatoNome }: { processoId: number; candidatoNome: string }) {
  const [mensagens, setMensagens] = useState<Message[]>(mensagensIniciais);
  const [novaMensagem, setNovaMensagem] = useState("");

  const handleEnviar = () => {
    if (!novaMensagem.trim()) return;

    const mensagem: Message = {
      id: mensagens.length + 1,
      autor: "Maria Santos",
      tipo: "analista",
      conteudo: novaMensagem,
      data: new Date().toISOString(),
    };

    setMensagens([...mensagens, mensagem]);
    setNovaMensagem("");
    toast.success("Mensagem enviada");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-300px)]">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {mensagens.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.tipo === "analista" ? "flex-row-reverse" : ""}`}
          >
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarFallback className={msg.tipo === "analista" ? "bg-primary/20 text-primary" : "bg-muted"}>
                {msg.autor.split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className={`flex flex-col gap-1 max-w-[70%] ${msg.tipo === "analista" ? "items-end" : ""}`}>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-foreground">{msg.autor}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(msg.data).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <div
                className={`rounded-lg px-4 py-2 ${
                  msg.tipo === "analista"
                    ? "bg-primary/10 text-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                <p className="text-sm">{msg.conteudo}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Input Area */}
      <div className="border-t border-border pt-4 space-y-3">
        <Textarea
          placeholder="Digite sua mensagem..."
          value={novaMensagem}
          onChange={(e) => setNovaMensagem(e.target.value)}
          className="min-h-[100px] bg-background resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleEnviar();
            }
          }}
        />
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">
            Shift + Enter para nova linha
          </span>
          <Button onClick={handleEnviar} className="bg-primary hover:bg-primary/90 gap-2">
            <Send className="h-4 w-4" />
            Enviar
          </Button>
        </div>
      </div>
    </div>
  );
}
