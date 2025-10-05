import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

interface FieldLabelProps {
  label: string;
  required?: boolean;
  htmlFor?: string;
}

export function FieldLabel({ label, required, htmlFor }: FieldLabelProps) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <Label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </Label>
      {required && (
        <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-orange-500/10 text-orange-600 border-orange-200">
          Obrigatório
        </Badge>
      )}
    </div>
  );
}
