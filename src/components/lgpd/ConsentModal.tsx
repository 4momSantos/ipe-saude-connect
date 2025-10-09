/**
 * ConsentModal - Modal de Consentimento LGPD
 * 
 * Modal não-fechável que exige aceite explícito dos Termos de Uso
 * e Política de Privacidade antes de acessar o sistema.
 */

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Shield, FileText, Lock } from "lucide-react";

interface ConsentModalProps {
  open: boolean;
  onAccept: () => Promise<void>;
}

export function ConsentModal({ open, onAccept }: ConsentModalProps) {
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleAccept = async () => {
    setIsLoading(true);
    try {
      await onAccept();
    } catch (error) {
      console.error('[CONSENT_MODAL] Erro ao aceitar termos:', error);
      alert('Erro ao salvar consentimento. Por favor, tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const canAccept = acceptedTerms && acceptedPrivacy;

  return (
    <Dialog open={open} modal>
      <DialogContent 
        className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-primary" />
            <DialogTitle className="text-2xl">Termos de Uso e Política de Privacidade</DialogTitle>
          </div>
          <DialogDescription>
            Para continuar, é necessário ler e aceitar nossos termos e política de privacidade conforme a LGPD.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {/* Termos de Uso */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Termos de Uso</h3>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
                <p><strong>1. ACEITAÇÃO DOS TERMOS</strong></p>
                <p>Ao utilizar este sistema de credenciamento, você concorda integralmente com estes Termos de Uso. Caso não concorde, não utilize o sistema.</p>

                <p><strong>2. OBJETO DO SISTEMA</strong></p>
                <p>O sistema destina-se exclusivamente ao credenciamento de prestadores de serviços, gestão de editais, análise de inscrições e emissão de certificados de credenciamento.</p>

                <p><strong>3. OBRIGAÇÕES DO USUÁRIO</strong></p>
                <p>O usuário compromete-se a:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Fornecer informações verdadeiras, completas e atualizadas</li>
                  <li>Manter sigilo absoluto de sua senha de acesso</li>
                  <li>Não compartilhar seu acesso com terceiros</li>
                  <li>Utilizar o sistema apenas para fins legítimos</li>
                  <li>Respeitar os prazos e procedimentos estabelecidos</li>
                </ul>

                <p><strong>4. RESPONSABILIDADES</strong></p>
                <p>O usuário é responsável por todas as ações realizadas em sua conta. O sistema não se responsabiliza por danos decorrentes de uso inadequado ou acesso não autorizado.</p>

                <p><strong>5. PROPRIEDADE INTELECTUAL</strong></p>
                <p>Todo o conteúdo do sistema (textos, imagens, layout, código) é protegido por direitos autorais e não pode ser reproduzido sem autorização.</p>

                <p><strong>6. ALTERAÇÕES</strong></p>
                <p>Reservamo-nos o direito de alterar estes termos a qualquer momento. Usuários serão notificados e deverão aceitar novamente para continuar usando o sistema.</p>
              </div>
            </div>

            <Separator />

            {/* Política de Privacidade */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Política de Privacidade - LGPD</h3>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
                <p><strong>1. DADOS COLETADOS</strong></p>
                <p>Coletamos e tratamos os seguintes dados pessoais:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li><strong>Dados cadastrais:</strong> nome completo, CPF/CNPJ, RG, data de nascimento, e-mail, telefone, endereço</li>
                  <li><strong>Dados profissionais:</strong> CRM, especialidade médica, horários de atendimento</li>
                  <li><strong>Documentos:</strong> diplomas, certidões, comprovantes diversos</li>
                  <li><strong>Dados de navegação:</strong> endereço IP, logs de acesso, cookies</li>
                </ul>

                <p><strong>2. FINALIDADE DO TRATAMENTO</strong></p>
                <p>Seus dados são tratados para:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Processar e avaliar inscrições em editais de credenciamento</li>
                  <li>Emitir certificados e contratos de credenciamento</li>
                  <li>Garantir segurança e conformidade regulatória</li>
                  <li>Comunicação oficial sobre processos e prazos</li>
                  <li>Cumprimento de obrigações legais e regulatórias</li>
                </ul>

                <p><strong>3. BASE LEGAL (LGPD)</strong></p>
                <p>O tratamento de dados é realizado com base em:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li><strong>Art. 7º, I:</strong> Consentimento explícito do titular</li>
                  <li><strong>Art. 7º, II:</strong> Cumprimento de obrigação legal</li>
                  <li><strong>Art. 7º, V:</strong> Execução de contrato</li>
                </ul>

                <p><strong>4. COMPARTILHAMENTO DE DADOS</strong></p>
                <p>Seus dados não são vendidos ou cedidos a terceiros. Compartilhamento ocorre apenas:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Com autoridades legais mediante ordem judicial</li>
                  <li>Com prestadores de serviço essenciais (ex: assinatura digital, OCR)</li>
                  <li>Sempre com garantias contratuais de proteção</li>
                </ul>

                <p><strong>5. SEUS DIREITOS (LGPD Art. 18º)</strong></p>
                <p>Você tem direito a:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li><strong>Confirmação:</strong> Saber se tratamos seus dados</li>
                  <li><strong>Acesso:</strong> Obter cópia de seus dados</li>
                  <li><strong>Correção:</strong> Solicitar correção de dados incorretos</li>
                  <li><strong>Anonimização:</strong> Solicitar anonimização de dados</li>
                  <li><strong>Portabilidade:</strong> Receber dados em formato estruturado</li>
                  <li><strong>Revogação:</strong> Revogar consentimento a qualquer momento</li>
                </ul>

                <p><strong>6. SEGURANÇA</strong></p>
                <p>Implementamos medidas técnicas e organizacionais para proteger seus dados contra acessos não autorizados, perda ou vazamento.</p>

                <p><strong>7. RETENÇÃO DE DADOS</strong></p>
                <p>Dados são mantidos pelo período necessário para as finalidades descritas, ou conforme exigido por lei. Após, são anonimizados ou excluídos.</p>

                <p><strong>8. CONTATO - ENCARREGADO DE DADOS</strong></p>
                <p>Para exercer seus direitos ou esclarecer dúvidas sobre privacidade:</p>
                <p><strong>E-mail:</strong> privacidade@sistema.gov.br</p>
                <p><strong>Prazo de resposta:</strong> até 15 dias úteis</p>
              </div>
            </div>
          </div>
        </ScrollArea>

        <Separator />

        {/* Checkboxes de aceite */}
        <div className="space-y-3 pt-2">
          <div className="flex items-start gap-3">
            <Checkbox 
              id="terms" 
              checked={acceptedTerms} 
              onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
            />
            <label 
              htmlFor="terms" 
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Li e aceito os <strong>Termos de Uso</strong>
            </label>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox 
              id="privacy" 
              checked={acceptedPrivacy} 
              onCheckedChange={(checked) => setAcceptedPrivacy(checked as boolean)}
            />
            <label 
              htmlFor="privacy" 
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Li e aceito a <strong>Política de Privacidade</strong> e autorizo o tratamento de meus dados conforme a LGPD
            </label>
          </div>
        </div>

        {/* Botão de aceitar */}
        <Button 
          onClick={handleAccept} 
          disabled={!canAccept || isLoading}
          className="w-full"
          size="lg"
        >
          {isLoading ? 'Salvando...' : 'Aceitar e Continuar'}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          Ao clicar em "Aceitar", você confirma que leu e compreendeu todos os termos acima.
        </p>
      </DialogContent>
    </Dialog>
  );
}
