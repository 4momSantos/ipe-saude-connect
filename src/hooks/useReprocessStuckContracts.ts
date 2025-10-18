import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useReprocessStuckContracts = () => {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "reprocess-stuck-contracts"
      );

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      console.log("🎯 RESULTADO COMPLETO:", data);
      
      if (data.success === false) {
        toast.error(`❌ Erro: ${data.error}`);
        return;
      }

      const { total, success, failed, details } = data;
      
      toast.success(
        `✅ Processados: ${total} | Sucesso: ${success} | Falhas: ${failed}`,
        { duration: 10000 }
      );
      
      console.log("\n📊 RESUMO:");
      console.log(`   Total: ${total}`);
      console.log(`   ✅ Sucesso: ${success}`);
      console.log(`   ❌ Falhas: ${failed}`);
      
      console.log("\n📋 DETALHES POR CONTRATO:");
      details?.forEach((result: any, index: number) => {
        console.log(`\n${index + 1}. ${result.contrato}`);
        console.log(`   Email: ${result.email}`);
        console.log(`   Status: ${result.status}`);
        if (result.status === 'success') {
          console.log(`   ✅ Assignment ID: ${result.assignment_id}`);
          console.log(`   ✅ URL: ${result.signature_url ? 'Sim' : 'Não'}`);
        } else {
          console.log(`   ❌ Erro: ${result.error}`);
        }
      });
    },
    onError: (error: Error) => {
      console.error("❌ ERRO NA EXECUÇÃO:", error);
      toast.error(`Erro: ${error.message}`);
    },
  });
};
