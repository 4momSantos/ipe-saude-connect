import { 
  Type, 
  Mail, 
  Phone, 
  Calendar, 
  Hash, 
  MessageSquare, 
  List, 
  CheckSquare, 
  Upload,
  CreditCard,
  Building2,
  Stethoscope,
  IdCard,
  MapPin
} from "lucide-react";
import { FieldType } from "@/types/workflow-editor";
import { Badge } from "@/components/ui/badge";

export interface FieldTypeOption {
  type: FieldType;
  label: string;
  icon: typeof Type;
  description: string;
  hasAPI?: boolean;
}

export const fieldTypeOptions: FieldTypeOption[] = [
  { type: 'text', label: 'Texto Curto', icon: Type, description: 'Campo de texto simples' },
  { type: 'email', label: 'Email', icon: Mail, description: 'Endereço de email' },
  { type: 'phone', label: 'Telefone', icon: Phone, description: 'Número de telefone' },
  { type: 'cpf', label: 'CPF', icon: CreditCard, description: 'CPF com validação', hasAPI: true },
  { type: 'cnpj', label: 'CNPJ', icon: Building2, description: 'CNPJ com validação', hasAPI: true },
  { type: 'crm', label: 'CRM', icon: Stethoscope, description: 'CRM médico com validação', hasAPI: true },
  { type: 'nit', label: 'NIT/PIS/PASEP', icon: IdCard, description: 'NIT com validação', hasAPI: true },
  { type: 'cep', label: 'CEP', icon: MapPin, description: 'CEP com busca de endereço', hasAPI: true },
  { type: 'rg', label: 'RG', icon: IdCard, description: 'Registro Geral' },
  { type: 'date', label: 'Data', icon: Calendar, description: 'Seletor de data' },
  { type: 'number', label: 'Número', icon: Hash, description: 'Campo numérico' },
  { type: 'textarea', label: 'Texto Longo', icon: MessageSquare, description: 'Área de texto multilinha' },
  { type: 'select', label: 'Seleção', icon: List, description: 'Lista de opções' },
  { type: 'checkbox', label: 'Checkbox', icon: CheckSquare, description: 'Caixa de seleção' },
  { type: 'file', label: 'Upload', icon: Upload, description: 'Upload de arquivo' },
];

interface FieldTypesSidebarProps {
  onAddField: (type: FieldType) => void;
}

export function FieldTypesSidebar({ onAddField }: FieldTypesSidebarProps) {
  return (
    <div className="w-64 bg-card border-r border-border overflow-y-auto">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-bold text-foreground">Tipos de Campo</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Clique para adicionar ao formulário
        </p>
      </div>
      
      <div className="p-3 space-y-2">
        {fieldTypeOptions.map(({ type, label, icon: Icon, description, hasAPI }) => (
          <button
            key={type}
            onClick={() => onAddField(type)}
            className="w-full flex items-start gap-3 p-3 bg-muted/50 hover:bg-accent rounded-lg transition-all duration-200 text-left group hover:scale-[1.02] hover:shadow-md"
          >
            <div className="p-2 rounded-md bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <Icon className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                  {label}
                </span>
                {hasAPI && (
                  <Badge variant="secondary" className="text-[10px] px-1 py-0">
                    API
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
