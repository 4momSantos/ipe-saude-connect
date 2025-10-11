import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import InputMask from "react-input-mask";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

interface DateInputProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  disabled?: (date: Date) => boolean;
  placeholder?: string;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
  error?: boolean;
  showAge?: boolean;
}

function calculateAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

export function DateInput({
  value,
  onChange,
  disabled,
  placeholder = "DD/MM/AAAA",
  minDate = new Date('1900-01-01'),
  maxDate = new Date(),
  className,
  error = false,
  showAge = false,
}: DateInputProps) {
  const [inputValue, setInputValue] = React.useState<string>(
    value ? format(value, "dd/MM/yyyy") : ""
  );
  const [open, setOpen] = React.useState(false);

  // Sincronizar inputValue quando value muda externamente
  React.useEffect(() => {
    if (value) {
      setInputValue(format(value, "dd/MM/yyyy"));
    } else {
      setInputValue("");
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = e.target.value;
    setInputValue(masked);

    // Validar apenas quando a máscara está completa (10 caracteres: DD/MM/AAAA)
    if (masked.length === 10 && masked.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      try {
        const parsedDate = parse(masked, "dd/MM/yyyy", new Date());
        
        // Validar se é uma data válida
        if (isValid(parsedDate)) {
          // Validar limites
          if (parsedDate >= minDate && parsedDate <= maxDate) {
            onChange(parsedDate);
          }
        }
      } catch (error) {
        // Data inválida, não fazer nada
      }
    } else if (masked.length === 0) {
      // Se apagou tudo, limpar
      onChange(undefined);
    }
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    onChange(date);
    setOpen(false);
  };

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex gap-2">
        <div className="flex-1">
          <InputMask
            mask="99/99/9999"
            value={inputValue}
            onChange={handleInputChange}
            placeholder={placeholder}
          >
            {(inputProps: any) => (
              <Input
                {...inputProps}
                className={cn(error && "border-destructive")}
              />
            )}
          </InputMask>
        </div>
        
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              type="button"
              className={cn(
                "shrink-0",
                error && "border-destructive"
              )}
            >
              <CalendarIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={value}
              onSelect={handleCalendarSelect}
              disabled={disabled}
              initialFocus
              captionLayout="dropdown-buttons"
              fromYear={minDate.getFullYear()}
              toYear={maxDate.getFullYear()}
              locale={ptBR}
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>
      
      {showAge && value && (
        <p className="text-xs text-muted-foreground">
          Idade: {calculateAge(value)} anos
        </p>
      )}
    </div>
  );
}
