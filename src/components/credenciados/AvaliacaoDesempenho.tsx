import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { useAvaliacoes } from "@/hooks/useAvaliacoes";
import { toast } from "sonner";

export function AvaliacaoDesempenho({ credenciadoId }: { credenciadoId: string }) {
  const { criterios, createAvaliacao } = useAvaliacoes(credenciadoId);
  const [avaliacoes, setAvaliacoes] = useState<Record<string, number>>({});
  const [observacoes, setObservacoes] = useState<Record<string, string>>({});
  const [pontosPositivos, setPontosPositivos] = useState("");
  const [pontosMelhoria, setPontosMelhoria] = useState("");

  const handleStarClick = (criterioId: string, nota: number) => {
    setAvaliacoes({ ...avaliacoes, [criterioId]: nota });
  };

  const calcularMedia = () => {
    const notas = Object.values(avaliacoes);
    if (notas.length === 0) return 0;
    return (notas.reduce((sum, nota) => sum + nota, 0) / notas.length).toFixed(2);
  };

  const salvarAvaliacao = () => {
    if (Object.keys(avaliacoes).length === 0) {
      toast.error("Avalie pelo menos um critério");
      return;
    }

    const criteriosAvaliados = criterios.map(c => ({
      criterio_id: c.id,
      criterio_nome: c.nome,
      pontuacao: avaliacoes[c.id] || 0,
      observacao: observacoes[c.id] || ''
    }));

    const media = calcularMedia();
    createAvaliacao({
      periodo_referencia: new Date().toISOString().split('T')[0],
      pontuacao_geral: typeof media === 'string' ? parseFloat(media) : media,
      criterios: criteriosAvaliados,
      pontos_positivos: pontosPositivos,
      pontos_melhoria: pontosMelhoria,
      status: 'finalizada',
      finalizada_em: new Date().toISOString()
    });

    // Reset form
    setAvaliacoes({});
    setObservacoes({});
    setPontosPositivos("");
    setPontosMelhoria("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Avaliação de Desempenho</CardTitle>
        <p className="text-sm text-muted-foreground">
          Nota Geral: {calcularMedia()} ⭐
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {criterios.map((criterio) => (
          <div key={criterio.id} className="space-y-2">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-semibold">{criterio.nome}</h4>
                <p className="text-xs text-muted-foreground">{criterio.descricao}</p>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((nota) => (
                  <Star
                    key={nota}
                    className={`h-6 w-6 cursor-pointer transition-colors ${
                      (avaliacoes[criterio.id] || 0) >= nota 
                        ? 'fill-yellow-400 text-yellow-400' 
                        : 'text-gray-300'
                    }`}
                    onClick={() => handleStarClick(criterio.id, nota)}
                  />
                ))}
              </div>
            </div>
            <Textarea
              placeholder="Observações (opcional)"
              value={observacoes[criterio.id] || ''}
              onChange={(e) => setObservacoes({ ...observacoes, [criterio.id]: e.target.value })}
              rows={2}
            />
          </div>
        ))}

        <div className="space-y-4 border-t pt-4">
          <div className="space-y-2">
            <label className="font-semibold">Pontos Positivos</label>
            <Textarea
              value={pontosPositivos}
              onChange={(e) => setPontosPositivos(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <label className="font-semibold">Pontos de Melhoria</label>
            <Textarea
              value={pontosMelhoria}
              onChange={(e) => setPontosMelhoria(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <Button onClick={salvarAvaliacao} className="w-full">
          Salvar Avaliação
        </Button>
      </CardContent>
    </Card>
  );
}
