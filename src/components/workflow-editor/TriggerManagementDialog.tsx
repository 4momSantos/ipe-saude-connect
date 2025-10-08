import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Settings2 } from "lucide-react";
import { TriggerManagement } from "./TriggerManagement";

interface TriggerManagementDialogProps {
  workflowId: string | undefined;
}

export function TriggerManagementDialog({ workflowId }: TriggerManagementDialogProps) {
  if (!workflowId) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="h-4 w-4 mr-2" />
          Gerenciar Triggers
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Triggers do Workflow</DialogTitle>
          <DialogDescription>
            Configure webhooks, API keys e schedules para disparar este workflow
          </DialogDescription>
        </DialogHeader>
        <TriggerManagement workflowId={workflowId} />
      </DialogContent>
    </Dialog>
  );
}
