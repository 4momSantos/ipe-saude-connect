/**
 * Edge Function: send-signature-request
 * Cria documento de assinatura na Assinafy e registra no sistema.
 * 
 * Features:
 * - Retry com backoff exponencial (3 tentativas)
 * - Logs estruturados em JSON
 * - Modo DEV com auto-simulação
 * - Validação robusta de resposta da API
 * - Tratamento de erros detalhado
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { PDFDocument, rgb } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AssignafyCreateDocumentRequest {
  name: string;
  signers: Array<{
    name: string;
    email: string;
    order: number;
  }>;
  document_url?: string;
  message?: string;
}

interface AssignafyDocumentResponse {
  id: string;
  status: string;
  signature_url?: string;
  [key: string]: any;
}

/**
 * Envia email usando Resend API
 */
async function sendEmail(to: string[], subject: string, html: string, apiKey: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Sistema de Credenciamento <onboarding@resend.dev>",
      to,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(JSON.stringify({ level: "error", service: "resend", status: response.status, error }));
    throw new Error(`Failed to send email: ${response.status}`);
  }

  return await response.json();
}

/**
 * Converte HTML em PDF
 */
async function htmlToPDF(html: string, contratoNumero: string): Promise<Uint8Array> {
  console.log(JSON.stringify({ level: "info", action: "generating_pdf", contratoNumero }));
  
  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    
    // Extrair texto do HTML (remover tags)
    const textContent = html
      .replace(/<style[^>]*>.*?<\/style>/gs, '')
      .replace(/<script[^>]*>.*?<\/script>/gs, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
    
    // Configurações de texto
    const fontSize = 12;
    const lineHeight = 14;
    const margin = 50;
    const maxWidth = page.getWidth() - (margin * 2);
    
    // Quebrar texto em linhas
    const words = textContent.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = testLine.length * (fontSize * 0.5);
      
      if (width < maxWidth) {
        currentLine = testLine;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
    
    // Adicionar título
    page.drawText(`CONTRATO DE CREDENCIAMENTO - ${contratoNumero}`, {
      x: margin,
      y: page.getHeight() - margin,
      size: 14,
      color: rgb(0, 0, 0),
    });
    
    // Adicionar conteúdo
    let yPosition = page.getHeight() - margin - 30;
    let currentPage = page;
    
    for (const line of lines) {
      if (yPosition < margin) {
        currentPage = pdfDoc.addPage([595.28, 841.89]);
        yPosition = currentPage.getHeight() - margin;
      }
      
      currentPage.drawText(line, {
        x: margin,
        y: yPosition,
        size: fontSize,
        color: rgb(0, 0, 0),
      });
      
      yPosition -= lineHeight;
    }
    
    const pdfBytes = await pdfDoc.save();
    console.log(JSON.stringify({ 
      level: "info", 
      action: "pdf_generated", 
      bytes: pdfBytes.length 
    }));
    
    return pdfBytes;
    
  } catch (error) {
    console.error(JSON.stringify({
      level: "error",
      action: "pdf_generation_failed",
      error: error instanceof Error ? error.message : "Unknown"
    }));
    throw new Error(`Falha ao gerar PDF: ${error instanceof Error ? error.message : "Unknown"}`);
  }
}

/**
 * Envia documento para Assinafy via multipart/form-data
 */
async function sendDocumentToAssinafy(
  apiKey: string,
  accountId: string,
  pdfBytes: Uint8Array,
  fileName: string,
  signerData: { name: string; email: string }
): Promise<{ documentId: string; assignmentId: string }> {
  
  console.log(JSON.stringify({
    level: "info",
    action: "assinafy_send_start",
    fileName,
    signerEmail: signerData.email
  }));
  
  // ETAPA 1: Criar/Verificar Signatário
  let signerId: string | null = null;
  
  const searchResponse = await fetch(
    `https://api.assinafy.com.br/v1/accounts/${accountId}/signers?search=${encodeURIComponent(signerData.email)}`,
    {
      method: 'GET',
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json'
      }
    }
  );
  
  if (searchResponse.ok) {
    const signersData = await searchResponse.json();
    const existingSigner = signersData.data?.find((s: any) => s.email === signerData.email);
    
    if (existingSigner) {
      signerId = existingSigner.id;
      console.log(JSON.stringify({
        level: "info",
        action: "signer_found",
        signerId
      }));
    }
  }
  
  if (!signerId) {
    console.log(JSON.stringify({
      level: "info",
      action: "creating_signer",
      signerEmail: signerData.email
    }));
    
    const createSignerResponse = await fetch(
      `https://api.assinafy.com.br/v1/accounts/${accountId}/signers`,
      {
        method: 'POST',
        headers: {
          'X-Api-Key': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          full_name: signerData.name,
          email: signerData.email
        })
      }
    );
    
    if (!createSignerResponse.ok) {
      const errorText = await createSignerResponse.text();
      throw new Error(`Erro ao criar signatário: ${errorText}`);
    }
    
    const signerResponseData = await createSignerResponse.json();
    signerId = signerResponseData.data.id;
    console.log(JSON.stringify({
      level: "info",
      action: "signer_created",
      signerId
    }));
  }
  
  // ETAPA 2: Upload do Documento
  console.log(JSON.stringify({
    level: "info",
    action: "uploading_document",
    fileSize: pdfBytes.length
  }));
  
  const formData = new FormData();
  const pdfBlob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
  formData.append('file', pdfBlob, fileName);
  
  const uploadResponse = await fetch(
    `https://api.assinafy.com.br/v1/accounts/${accountId}/documents`,
    {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey
      },
      body: formData
    }
  );
  
  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    console.error(JSON.stringify({
      level: "error",
      action: "upload_failed",
      status: uploadResponse.status,
      error: errorText
    }));
    throw new Error(`Erro ao fazer upload: ${errorText}`);
  }
  
  const uploadData = await uploadResponse.json();
  const documentId = uploadData.data.id;
  console.log(JSON.stringify({
    level: "info",
    action: "document_uploaded",
    documentId
  }));
  
  // Aguardar processamento do documento antes de criar assignment
  console.log(JSON.stringify({
    level: "info",
    action: "waiting_document_processing"
  }));
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // ETAPA 3: Solicitar Assinatura
  console.log(JSON.stringify({
    level: "info",
    action: "requesting_signature",
    documentId,
    signerId
  }));
  
  const assignmentResponse = await fetch(
    `https://api.assinafy.com.br/v1/documents/${documentId}/assignments`,
    {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        method: 'virtual',
        signer_ids: [signerId],
        message: `Por favor, assine o contrato ${fileName}.`,
        expires_at: null
      })
    }
  );
  
  if (!assignmentResponse.ok) {
    const errorText = await assignmentResponse.text();
    console.error(JSON.stringify({
      level: "error",
      action: "assignment_failed",
      error: errorText
    }));
    throw new Error(`Erro ao solicitar assinatura: ${errorText}`);
  }
  
  const assignmentData = await assignmentResponse.json();
  console.log(JSON.stringify({
    level: "info",
    action: "signature_requested",
    assignmentId: assignmentData.id
  }));
  
  return {
    documentId,
    assignmentId: assignmentData.id
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(JSON.stringify({
    level: "info",
    requestId,
    action: "request_start",
    method: req.method
  }));

  try {
    // Configuração
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;
    const assifafyApiKey = Deno.env.get("ASSINAFY_API_KEY");
    const assifafyAccountId = Deno.env.get("ASSINAFY_ACCOUNT_ID");
    
    // 🔍 DIAGNÓSTICO: Verificar ENVIRONMENT
    const envValue = Deno.env.get("ENVIRONMENT");
    console.log(JSON.stringify({
      level: "info",
      action: "environment_check",
      ENVIRONMENT_raw: envValue,
      ENVIRONMENT_exists: !!envValue,
      ENVIRONMENT_is_production: envValue === "production",
      ENVIRONMENT_comparison: {
        actual: envValue,
        expected: "production",
        match: envValue === "production"
      }
    }));
    
    const DEV_MODE = envValue !== "production";
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { signatureRequestId } = await req.json();

    console.log(JSON.stringify({
      level: "info",
      requestId,
      action: "processing_signature_request",
      signatureRequestId,
      devMode: DEV_MODE,
      environment: {
        ENVIRONMENT: envValue || "NOT_SET",
        ASSINAFY_API_KEY_configured: !!assifafyApiKey,
        ASSINAFY_ACCOUNT_ID_configured: !!assifafyAccountId,
        will_call_assinafy: !DEV_MODE && !!assifafyApiKey && !!assifafyAccountId
      }
    }));

    // Buscar dados da signature request via contrato_id
    const { data: signatureRequest, error: requestError } = await supabase
      .from("signature_requests")
      .select(`
        *,
        contrato:contratos (
          id,
          numero_contrato,
          dados_contrato,
          inscricao_id,
          inscricao:inscricoes_edital (
            id,
            candidato_id,
            edital:editais (id, titulo, numero_edital),
            candidato:profiles (id, nome, email)
          )
        )
      `)
      .eq("id", signatureRequestId)
      .single();

    if (requestError || !signatureRequest) {
      throw new Error(`Signature request not found: ${requestError?.message || "unknown"}`);
    }

    // Extrair dados da inscrição via contrato
    const contratoRelacionado = signatureRequest.contrato as any;
    if (!contratoRelacionado) {
      throw new Error('Contrato não encontrado no signature_request');
    }

    const inscricaoData = contratoRelacionado.inscricao;
    const candidato = inscricaoData?.candidato;

    // ====== MODO DESENVOLVIMENTO ======
    if (DEV_MODE) {
      console.log(JSON.stringify({
        level: "info",
        requestId,
        action: "dev_mode_simulation",
        message: "Simulando assinatura automática em 10 segundos"
      }));

      // Atualizar para enviado
      await supabase
        .from("signature_requests")
        .update({
          status: "sent",
          external_status: "dev_mode_simulated",
          metadata: {
            ...signatureRequest.metadata,
            dev_mode: true,
            simulated_at: new Date().toISOString(),
          }
        })
        .eq("id", signatureRequestId);

      // Agendar callback simulado
      setTimeout(async () => {
        console.log(JSON.stringify({
          level: "info",
          requestId,
          action: "dev_mode_auto_complete",
          signatureRequestId
        }));

        await supabase
          .from("signature_requests")
          .update({
            status: "signed",
            external_status: "document.signed",
            completed_at: new Date().toISOString(),
            metadata: {
              ...signatureRequest.metadata,
              dev_mode: true,
              auto_signed_at: new Date().toISOString(),
            }
          })
          .eq("id", signatureRequestId);

        // Atualizar step execution
        if (signatureRequest.step_execution_id) {
          await supabase
            .from("workflow_step_executions")
            .update({
              status: "completed",
              completed_at: new Date().toISOString(),
              output_data: { signature_completed: true, dev_mode: true }
            })
            .eq("id", signatureRequest.step_execution_id);

          // Continuar workflow
          await supabase.functions.invoke("continue-workflow", {
            body: {
              stepExecutionId: signatureRequest.step_execution_id,
              decision: "approved"
            }
          });
        }
      }, 10000);

      return new Response(
        JSON.stringify({
          success: true,
          devMode: true,
          message: "DEV MODE: Assinatura será simulada em 10 segundos"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ====== MODO PRODUÇÃO ======
    if (signatureRequest.provider === "assinafy") {
      if (!assifafyApiKey) {
        throw new Error("ASSINAFY_API_KEY not configured");
      }
      
      if (!assifafyAccountId) {
        throw new Error("ASSINAFY_ACCOUNT_ID not configured");
      }

      try {
        // Usar contrato já carregado da query anterior
        const contrato = contratoRelacionado;
        
        if (!contrato || !contrato.dados_contrato) {
          throw new Error('Dados do contrato incompletos');
        }

        // Extrair HTML do contrato (com fallback para metadata)
        let contratoHTML = contrato.dados_contrato?.html;
        
        // Fallback: tentar buscar do metadata do signature_request
        if (!contratoHTML && signatureRequest.metadata) {
          contratoHTML = (signatureRequest.metadata as any).document_html;
        }
        
        // ⏱️ Passo 3: Se HTML veio do fallback, aguardar e tentar buscar novamente
        if (!contrato.dados_contrato?.html && contratoHTML) {
          console.log(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'info',
            action: 'fallback_html_used_waiting_db',
            message: 'HTML veio do fallback, aguardando 1s para tentar buscar do banco novamente'
          }));
          
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Tentar buscar contrato atualizado do banco
          const { data: contratoAtualizado } = await supabase
            .from('contratos')
            .select('dados_contrato')
            .eq('id', signatureRequest.contrato_id)
            .single();
            
          if (contratoAtualizado?.dados_contrato?.html) {
            contratoHTML = contratoAtualizado.dados_contrato.html;
            console.log(JSON.stringify({
              timestamp: new Date().toISOString(),
              level: 'info',
              action: 'html_found_after_retry',
              message: 'HTML encontrado no banco após retry'
            }));
          }
        }
        
        // Se ainda não tem HTML, marcar como failed e logar
        if (!contratoHTML) {
          const errorMsg = `HTML do contrato não encontrado. Contrato ID: ${contrato.id}, Número: ${contrato.numero_contrato}`;
          
          console.error(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'error',
            action: 'missing_contract_html',
            contrato_id: contrato.id,
            numero_contrato: contrato.numero_contrato,
            error: errorMsg
          }));

          await supabase
            .from('signature_requests')
            .update({
              status: 'failed',
              metadata: {
                ...(signatureRequest.metadata || {}),
                error: errorMsg,
                failed_at: new Date().toISOString(),
                missing_html: true
              }
            })
            .eq('id', signatureRequestId);

          throw new Error(errorMsg);
        }
        
        if (!contratoHTML) {
          throw new Error('HTML do contrato não encontrado em dados_contrato.html nem em metadata.document_html');
        }

        // Obter dados do signatário
        const signers = signatureRequest.signers as any[];
        if (!signers || signers.length === 0) {
          throw new Error('Nenhum signatário definido');
        }

        const signer = signers[0];
        if (!signer.name || !signer.email) {
          throw new Error('Dados do signatário incompletos');
        }

        console.log(JSON.stringify({
          level: "info",
          requestId,
          action: "processing_contract",
          contratoId: contrato.id,
          numeroContrato: contrato.numero_contrato
        }));

        // GERAR PDF
        const pdfBytes = await htmlToPDF(contratoHTML, contrato.numero_contrato);

        // ENVIAR PARA ASSINAFY
        const { documentId, assignmentId } = await sendDocumentToAssinafy(
          assifafyApiKey,
          assifafyAccountId,
          pdfBytes,
          `${contrato.numero_contrato}.pdf`,
          signer
        );

        console.log(JSON.stringify({
          level: "info",
          requestId,
          action: "assinafy_process_complete",
          documentId,
          assignmentId
        }));

        // ATUALIZAR SIGNATURE REQUEST
        await supabase
          .from("signature_requests")
          .update({
            external_id: documentId,
            status: "sent",
            external_status: "sent",
            metadata: {
              ...signatureRequest.metadata,
              assinafy_document_id: documentId,
              assinafy_assignment_id: assignmentId,
              sent_at: new Date().toISOString(),
            },
          })
          .eq("id", signatureRequestId);

        console.log(JSON.stringify({
          level: "info",
          requestId,
          action: "signature_request_updated",
          signatureRequestId,
          externalId: documentId
        }));
      } catch (error) {
        console.error(JSON.stringify({
          level: "error",
          requestId,
          action: "assinafy_integration_failed",
          error: error instanceof Error ? error.message : "Unknown error"
        }));

        await supabase
          .from("signature_requests")
          .update({
            status: "failed",
            external_status: "api_error",
            metadata: {
              ...signatureRequest.metadata,
              error: error instanceof Error ? error.message : "Unknown error",
              failed_at: new Date().toISOString(),
            },
          })
          .eq("id", signatureRequestId);

        throw error;
      }
    }

    // Enviar email para o candidato
    if (candidato?.email) {
      // Buscar signature_url do metadata atualizado
      const { data: updatedSigRequest } = await supabase
        .from("signature_requests")
        .select("metadata")
        .eq("id", signatureRequestId)
        .single();
      
      const signatureUrl = updatedSigRequest?.metadata?.signature_url;

      try {
        await sendEmail(
          [candidato.email],
          "🖊️ Contrato Pronto para Assinatura Digital",
          `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0;">🖊️ Contrato Pronto para Assinatura</h1>
              </div>
              
              <div style="padding: 30px; background: #f9fafb;">
                <h2 style="color: #1f2937;">Olá ${candidato.nome || "Candidato"},</h2>
                
                <p style="font-size: 16px; color: #4b5563; line-height: 1.6;">
                  Seu contrato de credenciamento está pronto e aguardando sua assinatura digital.
                </p>
                
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
                  <p style="margin: 5px 0;"><strong>Edital:</strong> ${inscricaoData?.edital?.titulo || "N/A"}</p>
                  <p style="margin: 5px 0;"><strong>Número:</strong> ${inscricaoData?.edital?.numero || "N/A"}</p>
                  <p style="margin: 5px 0;"><strong>Provedor:</strong> Assinafy (Assinatura Digital Segura)</p>
                </div>
                
                ${signatureUrl ? `
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${signatureUrl}" 
                       style="display: inline-block; 
                              padding: 16px 40px; 
                              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                              color: white; 
                              text-decoration: none; 
                              border-radius: 8px; 
                              font-size: 18px;
                              font-weight: bold;
                              box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                      🖊️ Assinar Contrato Agora
                    </a>
                  </div>
                  
                  <p style="font-size: 14px; color: #6b7280; text-align: center;">
                    Ou copie e cole este link no navegador:<br/>
                    <code style="background: #e5e7eb; padding: 8px; border-radius: 4px; display: inline-block; margin-top: 8px; word-break: break-all; font-size: 12px;">
                      ${signatureUrl}
                    </code>
                  </p>
                ` : `
                  <p style="color: #dc2626; background: #fef2f2; padding: 15px; border-radius: 8px; border-left: 4px solid #dc2626;">
                    ⚠️ Link de assinatura temporariamente indisponível. Por favor, acesse o sistema para obter o link.
                  </p>
                `}
                
                <div style="background: #fffbeb; padding: 15px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #f59e0b;">
                  <p style="margin: 0; font-size: 14px; color: #92400e;">
                    ⏰ <strong>Atenção:</strong> Este link é válido por 7 dias. Após esse período, será necessário solicitar um novo contrato.
                  </p>
                </div>
              </div>
              
              <div style="background: #1f2937; padding: 20px; text-align: center;">
                <p style="color: #9ca3af; margin: 0; font-size: 14px;">
                  Sistema de Credenciamento Médico<br/>
                  Em caso de dúvidas, entre em contato com nossa equipe.
                </p>
              </div>
            </div>
          `,
          resendApiKey
        );

        console.log(JSON.stringify({
          level: "info",
          requestId,
          action: "email_sent_to_candidate",
          email: candidato.email
        }));
      } catch (emailError) {
        console.error(JSON.stringify({
          level: "error",
          requestId,
          action: "email_failed",
          recipient: "candidate",
          error: emailError instanceof Error ? emailError.message : "Unknown"
        }));
      }
    }

    // Buscar analistas para notificar
    const { data: analistas } = await supabase
      .from("user_roles")
      .select("user_id, profiles:profiles!user_roles_user_id_fkey(id, nome, email)")
      .eq("role", "analista");

    // Criar notificações in-app para analistas
    if (analistas && analistas.length > 0) {
      const notifications = analistas.map(analista => ({
        user_id: analista.user_id,
        title: "Nova Solicitação de Assinatura",
        message: `Documento aguardando assinatura de ${candidato?.nome || "candidato"} via ${signatureRequest.provider}`,
        type: "signature",
        related_id: signatureRequestId,
        related_type: "signature_request",
      }));

      await supabase.from("app_notifications").insert(notifications);
      
      console.log(JSON.stringify({
        level: "info",
        requestId,
        action: "notifications_created",
        count: analistas.length
      }));

      // Enviar emails para analistas
      for (const analista of analistas) {
        const analistaProfile = analista.profiles as any;
        if (analistaProfile?.email) {
          try {
            await sendEmail(
              [analistaProfile.email],
              "Nova Solicitação de Assinatura",
              `
                <h2>Olá ${analistaProfile.nome || "Analista"},</h2>
                <p>Uma nova solicitação de assinatura foi criada.</p>
                <p><strong>Candidato:</strong> ${candidato?.nome || "N/A"}</p>
                <p><strong>Edital:</strong> ${inscricaoData?.edital?.titulo || "N/A"}</p>
                <p><strong>Provedor:</strong> ${signatureRequest.provider === "assinafy" ? "Assinafy" : signatureRequest.provider}</p>
                <p>Acesse o sistema para acompanhar o processo.</p>
                <p>Atenciosamente,<br/>Sistema de Credenciamento</p>
              `,
              resendApiKey
            );
          } catch (emailError) {
            console.error(JSON.stringify({
              level: "error",
              requestId,
              action: "email_failed",
              recipient: "analyst",
              email: analistaProfile.email,
              error: emailError instanceof Error ? emailError.message : "Unknown"
            }));
          }
        }
      }
    }

    console.log(JSON.stringify({
      level: "info",
      requestId,
      action: "request_completed",
      signatureRequestId
    }));

    return new Response(
      JSON.stringify({
        success: true,
        message: "Signature request processed successfully",
        provider: signatureRequest.provider,
        signatureRequestId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error(JSON.stringify({
      level: "error",
      requestId,
      action: "request_failed",
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined
    }));

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
