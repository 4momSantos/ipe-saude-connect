import { useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useStatusRegularidade, useEmitirCertificado, useHistoricoCertificados } from "@/hooks/useCertificadoRegularidade";
import { ModalVisualizarPendencias } from "@/components/ModalVisualizarPendencias";
import { FileText, Calendar, AlertTriangle, CheckCircle, FileCheck, Download, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function RegularidadeCadastral() {
  const { id } = useParams();
  const credenciadoId = id || "";
  
  const [modalPendenciasOpen, setModalPendenciasOpen] = useState(false);
  
  const { data: statusData, isLoading: loadingStatus } = useStatusRegularidade(credenciadoId);
  const { data: certificados, isLoading: loadingCerts } = useHistoricoCertificados(credenciadoId);
  const { mutate: emitir, isPending: emitindo } = useEmitirCertificado();

  const handleEmitir = (forcar = false) => {
    emitir({ credenciadoId, forcarEmissao: forcar });
  };

  if (loadingStatus) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!statusData) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Erro ao carregar status de regularidade</AlertDescription>
      </Alert>
    );
  }

  const getStatusBadge = () => {
    const statusMap = {
      regular: { color: "bg-green-500", label: "REGULAR", icon: CheckCircle },
      regular_ressalvas: { color: "bg-yellow-500", label: "REGULAR COM RESSALVAS", icon: AlertTriangle },
      irregular: { color: "bg-red-500", label: "IRREGULAR", icon: AlertTriangle },
      suspenso: { color: "bg-orange-500", label: "SUSPENSO", icon: AlertTriangle },
      inativo: { color: "bg-gray-500", label: "INATIVO", icon: AlertTriangle },
    };

    const config = statusMap[statusData.status] || statusMap.inativo;
    const Icon = config.icon;

    return (
      <div className={`${config.color} text-white p-6 rounded-lg flex items-center gap-4`}>
        <Icon className="h-12 w-12" />
        <div>
          <h2 className="text-2xl font-bold">{config.label}</h2>
          <p className="text-sm opacity-90">Situação atual do cadastro</p>
        </div>
      </div>
    );
  };

  const getValidadeDias = () => {
    if (statusData.status === 'regular') return 90;
    if (statusData.status === 'regular_ressalvas') return 60;
    if (statusData.status === 'irregular') return 30;
    return 0;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Certificado de Regularidade Cadastral</h1>
        <p className="text-muted-foreground">Verifique sua situação e emita seu certificado</p>
      </div>

      {/* Status Atual */}
      <Card>
        <CardHeader>
          <CardTitle>Status Atual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {getStatusBadge()}

          {/* Botões de Ação */}
          <div className="flex gap-3">
            {statusData.status === 'regular' || statusData.status === 'regular_ressalvas' ? (
              <Button 
                onClick={() => handleEmitir(false)}
                disabled={emitindo}
                size="lg"
              >
                <FileCheck className="mr-2 h-4 w-4" />
                Emitir Certificado
                <Badge className="ml-2" variant="secondary">
                  Válido por {getValidadeDias()} dias
                </Badge>
              </Button>
            ) : statusData.status === 'irregular' ? (
              <>
                <Button 
                  variant="outline"
                  onClick={() => setModalPendenciasOpen(true)}
                >
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Ver Pendências
                </Button>
                <Button 
                  onClick={() => handleEmitir(true)}
                  disabled={emitindo}
                  variant="secondary"
                >
                  Forçar Emissão
                  <Badge className="ml-2" variant="destructive">
                    30 dias
                  </Badge>
                </Button>
              </>
            ) : (
              <Alert variant="destructive">
                <AlertDescription>
                  Cadastro inativo. Não é possível emitir certificado.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Indicadores */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documentos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statusData.detalhes?.docs_obrigatorios_ok || 0}/{statusData.detalhes?.docs_obrigatorios_total || 0}
            </div>
            <p className="text-xs text-muted-foreground">aprovados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contratos</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusData.detalhes?.contratos_ativos || 0}</div>
            <p className="text-xs text-muted-foreground">ativos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Última Atualização</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statusData.detalhes?.cadastro_desatualizado ? "Desatualizado" : "OK"}
            </div>
            <p className="text-xs text-muted-foreground">cadastro</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendências</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statusData.pendencias?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">total</p>
          </CardContent>
        </Card>
      </div>

      {/* Histórico de Certificados */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Certificados</CardTitle>
          <CardDescription>Certificados emitidos recentemente</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingCerts ? (
            <Skeleton className="h-32 w-full" />
          ) : certificados && certificados.length > 0 ? (
            <div className="space-y-4">
              {certificados.map((cert) => {
                const isValido = !cert.cancelado && cert.ativo && new Date(cert.valido_ate) >= new Date();
                const situacao = cert.cancelado ? 'Cancelado' : !cert.ativo ? 'Substituído' : new Date(cert.valido_ate) < new Date() ? 'Expirado' : 'Válido';
                
                return (
                  <div key={cert.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{cert.numero_certificado}</p>
                        <Badge variant={isValido ? "default" : "secondary"}>
                          {situacao}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Emitido {formatDistanceToNow(new Date(cert.emitido_em), { addSuffix: true, locale: ptBR })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Válido até {new Date(cert.valido_ate).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {cert.url_pdf && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={cert.url_pdf} target="_blank" rel="noopener noreferrer">
                            <Download className="mr-2 h-4 w-4" />
                            Baixar PDF
                          </a>
                        </Button>
                      )}
                      <Button variant="outline" size="sm" asChild>
                        <a href={`/validar-certificado/${cert.codigo_verificacao}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Verificar
                        </a>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Nenhum certificado emitido ainda
            </p>
          )}
        </CardContent>
      </Card>

      {/* Modal de Pendências */}
      <ModalVisualizarPendencias 
        open={modalPendenciasOpen}
        onClose={() => setModalPendenciasOpen(false)}
        pendencias={statusData.pendencias || []}
        credenciadoId={credenciadoId}
      />
    </div>
  );
}
