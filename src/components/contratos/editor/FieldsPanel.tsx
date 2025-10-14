import { useState } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Collapsible, CollapsibleContent, CollapsibleTrigger 
} from "@/components/ui/collapsible";
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
        <div className="p-3">
          {Object.entries(groupedFields).map(([categoria, fields]) => {
            const Icon = CATEGORY_ICONS[categoria as keyof typeof CATEGORY_ICONS];
            const isExpanded = expandedCategories.has(categoria);

            return (
              <Collapsible
                key={categoria}
                open={isExpanded}
                onOpenChange={() => toggleCategory(categoria)}
                className="mb-4"
              >
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2">
                      {Icon && <Icon className="h-4 w-4 text-primary" />}
                      <span className="font-semibold text-sm">
                        {CATEGORY_LABELS[categoria as keyof typeof CATEGORY_LABELS]}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {fields.length}
                      </Badge>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  {/* GRID DE CARDS */}
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
                    {fields.map((field) => (
                      <Card
                        key={field.id}
                        className="cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all duration-200 group"
                        onClick={() => onInsertField(field)}
                      >
                        <CardContent className="p-3">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                              {field.label}
                            </span>
                            <code className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded break-all">
                              {field.preview}
                            </code>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
