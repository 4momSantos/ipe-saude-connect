import { Badge } from "@/components/ui/badge";
import { GripVertical } from "lucide-react";
import { useState } from "react";

interface DraggableVariableProps {
  variableKey: string;
  description?: string;
}

export function DraggableVariable({ variableKey, description }: DraggableVariableProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", variableKey);
    e.dataTransfer.effectAllowed = "copy";
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <Badge
      variant="secondary"
      className={`text-xs cursor-grab active:cursor-grabbing select-none transition-opacity flex items-center gap-1 ${
        isDragging ? "opacity-50" : "opacity-100"
      }`}
      draggable={true}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      title={description || "Arraste para um campo"}
    >
      <GripVertical className="h-3 w-3" />
      {variableKey}
    </Badge>
  );
}
