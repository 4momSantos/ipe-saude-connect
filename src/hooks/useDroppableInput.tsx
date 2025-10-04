import { useState, useRef } from "react";

export function useDroppableInput<T extends HTMLInputElement | HTMLTextAreaElement = HTMLInputElement>(
  value: string,
  onChange: (value: string) => void
) {
  const [isOver, setIsOver] = useState(false);
  const inputRef = useRef<T>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setIsOver(true);
  };

  const handleDragLeave = () => {
    setIsOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);

    const variable = e.dataTransfer.getData("text/plain");
    if (!variable) return;

    const input = inputRef.current;
    if (!input) {
      // Fallback: append to end
      onChange(value ? `${value} ${variable}` : variable);
      return;
    }

    // Get cursor position
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;

    // Insert at cursor position
    const newValue = value.slice(0, start) + variable + value.slice(end);
    onChange(newValue);

    // Set cursor after inserted variable
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(start + variable.length, start + variable.length);
    }, 0);
  };

  return {
    inputRef,
    isOver,
    dropHandlers: {
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    },
  };
}
