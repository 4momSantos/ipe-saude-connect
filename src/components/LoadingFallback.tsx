// FASE 23: Loading fallback elegante
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingFallbackProps {
  className?: string;
  message?: string;
}

export function LoadingFallback({ className, message = "Carregando..." }: LoadingFallbackProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-12 space-y-4", className)}>
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="text-muted-foreground animate-pulse">{message}</p>
    </div>
  );
}
