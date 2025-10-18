import { Button } from "@/components/ui/button";
import { useReprocessStuckContracts } from "@/hooks/useReprocessStuckContracts";
import { RefreshCw } from "lucide-react";

export const ReprocessButton = () => {
  const { mutate, isPending } = useReprocessStuckContracts();

  return (
    <Button
      onClick={() => mutate()}
      disabled={isPending}
      size="sm"
      variant="outline"
    >
      <RefreshCw className={`mr-2 h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
      {isPending ? 'Reprocessando...' : 'Reprocessar Contratos Órfãos'}
    </Button>
  );
};
