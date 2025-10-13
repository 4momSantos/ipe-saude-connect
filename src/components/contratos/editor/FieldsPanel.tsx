import { useState } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, ChevronRight, ChevronDown, User, FileText, Calendar, Building } from "lucide-react";
import { camposDisponiveis, type AvailableField } from "@/types/contract-editor";

interface FieldsPanelProps {
  onInsertField: (field: AvailableField) => void;
}

const CATEGORY_ICONS = {
  candidato: User,
  edital: FileText,
  contrato: Building,
  sistema: Calendar,
};

const CATEGORY_LABELS = {
  candidato: "Dados do Candidato",
  edital: "Dados do Edital",
  contrato: "Dados do Contrato",
  sistema: "Sistema",
};

export function FieldsPanel({ onInsertField }: FieldsPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['candidato', 'edital', 'contrato', 'sistema'])
  );

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const filteredFields = camposDisponiveis.filter(field =>
    field.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    field.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedFields = filteredFields.reduce((acc, field) => {
    if (!acc[field.categoria]) {
      acc[field.categoria] = [];
    }
    acc[field.categoria].push(field);
    return acc;
  }, {} as Record<string, AvailableField[]>);

  return (
    <div className="flex flex-col h-full border-r bg-card">
      <div className="p-4 border-b">
        <h3 className="font-semibold mb-3">Campos Disponíveis</h3>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar campo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {Object.entries(groupedFields).map(([categoria, fields]) => {
            const Icon = CATEGORY_ICONS[categoria as keyof typeof CATEGORY_ICONS];
            const isExpanded = expandedCategories.has(categoria);

            return (
              <div key={categoria} className="mb-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 mb-1"
                  onClick={() => toggleCategory(categoria)}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  {Icon && <Icon className="h-4 w-4" />}
                  <span className="font-medium">
                    {CATEGORY_LABELS[categoria as keyof typeof CATEGORY_LABELS]}
                  </span>
                  <Badge variant="secondary" className="ml-auto">
                    {fields.length}
                  </Badge>
                </Button>

                {isExpanded && (
                  <div className="ml-6 space-y-1">
                    {fields.map((field) => (
                      <Button
                        key={field.id}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-left h-auto py-2"
                        onClick={() => onInsertField(field)}
                      >
                        <div className="flex flex-col items-start gap-1 w-full">
                          <span className="text-sm font-medium">{field.label}</span>
                          <code className="text-xs text-muted-foreground bg-muted px-1 rounded">
                            {field.preview}
                          </code>
                        </div>
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
