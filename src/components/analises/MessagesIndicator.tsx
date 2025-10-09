import { MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface MessagesIndicatorProps {
  unreadCount: number;
  className?: string;
}

/**
 * Indicador visual de mensagens não lidas
 * Pode ser usado em listas de inscrições, cards, etc
 */
export function MessagesIndicator({ unreadCount, className }: MessagesIndicatorProps) {
  if (unreadCount === 0) {
    return (
      <div className={cn("flex items-center gap-1.5 text-muted-foreground", className)}>
        <MessageSquare className="h-4 w-4" />
        <span className="text-xs">Sem mensagens</span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-1.5 text-primary", className)}>
      <MessageSquare className="h-4 w-4 animate-pulse" />
      <Badge variant="default" className="h-5 px-1.5 text-xs">
        {unreadCount > 99 ? "99+" : unreadCount}
      </Badge>
      <span className="text-xs font-medium">
        {unreadCount === 1 ? "1 nova mensagem" : `${unreadCount} novas mensagens`}
      </span>
    </div>
  );
}
