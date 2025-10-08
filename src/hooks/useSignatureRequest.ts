import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useSignatureRequestByWorkflow(workflowExecutionId: string) {
  return useQuery({
    queryKey: ["signature-request", "workflow", workflowExecutionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("signature_requests")
        .select("*")
        .eq("workflow_execution_id", workflowExecutionId)
        .order("created_at", { ascending: false })
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!workflowExecutionId
  });
}
