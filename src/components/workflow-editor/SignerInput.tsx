import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDroppableInput } from "@/hooks/useDroppableInput";

interface SignerInputProps {
  signer: {
    name: string;
    email: string;
  };
  index: number;
  onUpdate: (index: number, field: string, value: string) => void;
}

export function SignerInput({ signer, index, onUpdate }: SignerInputProps) {
  const nameInput = useDroppableInput(
    signer.name,
    (value) => onUpdate(index, 'name', value)
  );

  const emailInput = useDroppableInput(
    signer.email,
    (value) => onUpdate(index, 'email', value)
  );

  return (
    <>
      <div className="space-y-2">
        <Label>Nome (ou variável)</Label>
        <Input
          ref={nameInput.inputRef}
          value={signer.name}
          onChange={(e) => onUpdate(index, 'name', e.target.value)}
          placeholder="{candidato.nome} ou nome fixo"
          className={nameInput.isOver ? "ring-2 ring-primary" : ""}
          {...nameInput.dropHandlers}
        />
      </div>

      <div className="space-y-2">
        <Label>Email (ou variável)</Label>
        <Input
          ref={emailInput.inputRef}
          value={signer.email}
          onChange={(e) => onUpdate(index, 'email', e.target.value)}
          placeholder="{candidato.email} ou email@exemplo.com"
          className={emailInput.isOver ? "ring-2 ring-primary" : ""}
          {...emailInput.dropHandlers}
        />
      </div>
    </>
  );
}
