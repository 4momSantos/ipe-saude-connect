import { LucideIcon } from 'lucide-react';

interface DataDisplayProps {
  label: string;
  value?: string | number | null;
  icon?: LucideIcon;
  className?: string;
}

export function DataDisplay({ label, value, icon: Icon, className = '' }: DataDisplayProps) {
  return (
    <div className={`flex items-start gap-3 py-3 border-b border-border ${className}`}>
      {Icon && <Icon className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-muted-foreground mb-1">{label}</p>
        <p className="font-medium text-foreground break-words">
          {value || 'Não informado'}
        </p>
      </div>
    </div>
  );
}
