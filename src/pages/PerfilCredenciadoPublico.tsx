import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import { NavbarPublica } from "@/components/landing/NavbarPublica";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Award, Phone, Mail, MapPin, ArrowLeft, MessageSquare, Star } from "lucide-react";
import { useCredenciadoPublico } from "@/hooks/useCredenciadosPublicos";
import { Stars } from "@/components/avaliacoes/Stars";
import { EstatisticasAvaliacao } from "@/components/avaliacoes/EstatisticasAvaliacao";
import { ListaAvaliacoesPublicas } from "@/components/avaliacoes/ListaAvaliacoesPublicas";
import { FormularioAvaliacaoPublica } from "@/components/avaliacoes/FormularioAvaliacaoPublica";
import { toast } from "sonner";

export default function PerfilCredenciadoPublico() {
  const { id } = useParams<{ id: string }>();
  const { data: credenciado, isLoading } = useCredenciadoPublico(id);
  const [openAvaliacaoDialog, setOpenAvaliacaoDialog] = useState(false);
  const [mapboxToken, setMapboxToken] = useState<string>('');

  // Buscar token do Mapbox
  useState(() => {
    fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-mapbox-token`, {
      headers: {
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
      }
    })
      .then(res => res.json())
      .then(data => setMapboxToken(data.token))
      .catch(() => toast.error('Erro ao carregar mapa'));
  });

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <NavbarPublica />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-48 bg-muted rounded-lg" />
            <div className="h-96 bg-muted rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!credenciado) {
    return (
      <div className="min-h-screen">
        <NavbarPublica />
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Profissional não encontrado</h1>
          <Button asChild>
            <Link to="/mapa">Voltar para o Mapa</Link>
          </Button>
        </div>
      </div>
    );
  }

  const notaMedia = credenciado.estatisticas.nota_media_publica;
  const totalAvaliacoes = credenciado.estatisticas.total_avaliacoes_publicas;

  return (
    <>
      <Helmet>
        <title>{credenciado.nome} - Avaliações e Contato | IPE Saúde</title>
        <meta 
          name="description" 
          content={`Veja avaliações, formação e contato de ${credenciado.nome}. Nota média: ${notaMedia.toFixed(1)} estrelas (${totalAvaliacoes} avaliações).`} 
        />
      </Helmet>

      <div className="min-h-screen bg-background">
        <NavbarPublica />
        
        <div className="container mx-auto px-4 py-8">
          <Button variant="ghost" asChild className="mb-6">
            <Link to="/mapa">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para o Mapa
            </Link>
          </Button>

          {/* Header do Perfil */}
          <Card className="mb-8">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row gap-6">
                <Avatar className="h-32 w-32">
                  <AvatarFallback className="bg-primary/10 text-primary text-4xl">
                    {credenciado.nome?.charAt(0) || 'P'}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <h1 className="text-3xl font-bold mb-2">{credenciado.nome}</h1>
                  <p className="text-muted-foreground mb-4">
                    {credenciado.credenciado_crms?.[0]?.especialidade || 'Profissional de Saúde'}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {credenciado.credenciado_crms?.map((crm: any, idx: number) => (
                      <Badge key={idx}>
                        CRM {crm.crm}/{crm.uf_crm}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                    <div className="text-center sm:text-left">
                      <div className="text-4xl font-bold mb-1">
                        {notaMedia > 0 ? notaMedia.toFixed(1) : 'N/A'}
                      </div>
                      <Stars value={notaMedia} size="lg" readonly />
                      <p className="text-sm text-muted-foreground mt-1">
                        {totalAvaliacoes} {totalAvaliacoes === 1 ? 'avaliação' : 'avaliações'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {credenciado.telefone && (
                    <Button asChild>
                      <a href={`tel:${credenciado.telefone}`}>
                        <Phone className="mr-2 h-4 w-4" />
                        Ligar
                      </a>
                    </Button>
                  )}
                  
                  <Dialog open={openAvaliacaoDialog} onOpenChange={setOpenAvaliacaoDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Avaliar Profissional
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Avaliar {credenciado.nome}</DialogTitle>
                      </DialogHeader>
                      <FormularioAvaliacaoPublica
                        credenciadoId={credenciado.id}
                        credenciadoNome={credenciado.nome}
                        open={openAvaliacaoDialog}
                        onOpenChange={setOpenAvaliacaoDialog}
                      />
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs de Conteúdo */}
          <Tabs defaultValue="visao-geral" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
              <TabsTrigger value="avaliacoes">
                Avaliações ({totalAvaliacoes})
              </TabsTrigger>
              <TabsTrigger value="sobre">Sobre</TabsTrigger>
              <TabsTrigger value="localizacao">Localização</TabsTrigger>
            </TabsList>

            <TabsContent value="visao-geral" className="space-y-6">
              <EstatisticasAvaliacao credenciadoId={credenciado.id} />
              
              <Card>
                <CardHeader>
                  <CardTitle>Avaliações Recentes</CardTitle>
                </CardHeader>
                <CardContent>
                  <ListaAvaliacoesPublicas credenciadoId={credenciado.id} limit={3} />
                  <Button variant="link" className="mt-4 w-full" onClick={() => {
                    const tabsTrigger = document.querySelector('[value="avaliacoes"]') as HTMLElement;
                    tabsTrigger?.click();
                  }}>
                    Ver todas as avaliações →
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="avaliacoes">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Todas as Avaliações</CardTitle>
                  <Button onClick={() => setOpenAvaliacaoDialog(true)}>
                    <Star className="mr-2 h-4 w-4" />
                    Avaliar
                  </Button>
                </CardHeader>
                <CardContent>
                  <ListaAvaliacoesPublicas credenciadoId={credenciado.id} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sobre" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Especialidades</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {credenciado.credenciado_crms?.map((crm: any, idx: number) => (
                      <Badge key={idx} variant="secondary">
                        {crm.especialidade}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Contato</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {credenciado.telefone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{credenciado.telefone}</span>
                    </div>
                  )}
                  {credenciado.celular && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{credenciado.celular}</span>
                    </div>
                  )}
                  {credenciado.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{credenciado.email}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="localizacao">
              <Card>
                <CardContent className="p-0">
                  <div className="h-96 flex items-center justify-center bg-muted">
                    <p className="text-muted-foreground">Mapa será carregado em breve</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>Endereço</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p>{credenciado.endereco}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {credenciado.cidade}, {credenciado.estado}
                        {credenciado.cep && ` • CEP ${credenciado.cep}`}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}
