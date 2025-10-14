import InputMask from "react-input-mask";
import { Input } from "@/components/ui/input";
import { forwardRef } from "react";

interface MaskedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  mask: string;
}

export const MaskedInput = forwardRef<HTMLInputElement, MaskedInputProps>(
  ({ mask, ...props }, ref) => {
    return (
      <InputMask mask={mask} {...props}>
        {/* @ts-ignore - InputMask typing issue */}
        {(inputProps: any) => <Input {...inputProps} ref={ref} />}
      </InputMask>
    );
  }
);

MaskedInput.displayName = "MaskedInput";

// Máscaras pré-definidas
export const CPFInput = forwardRef<HTMLInputElement, Omit<MaskedInputProps, 'mask'>>(
  (props, ref) => <MaskedInput mask="999.999.999-99" placeholder="000.000.000-00" {...props} ref={ref} />
);
CPFInput.displayName = "CPFInput";

export const CNPJInput = forwardRef<HTMLInputElement, Omit<MaskedInputProps, 'mask'>>(
  (props, ref) => <MaskedInput mask="99.999.999/9999-99" placeholder="00.000.000/0000-00" {...props} ref={ref} />
);
CNPJInput.displayName = "CNPJInput";

export const TelefoneInput = forwardRef<HTMLInputElement, Omit<MaskedInputProps, 'mask'>>(
  (props, ref) => <MaskedInput mask="(99) 99999-9999" placeholder="(00) 00000-0000" {...props} ref={ref} />
);
TelefoneInput.displayName = "TelefoneInput";

export const CEPInput = forwardRef<HTMLInputElement, Omit<MaskedInputProps, 'mask'>>(
  (props, ref) => <MaskedInput mask="99999-999" placeholder="00000-000" {...props} ref={ref} />
);
CEPInput.displayName = "CEPInput";

export const DataInput = forwardRef<HTMLInputElement, Omit<MaskedInputProps, 'mask'>>(
  (props, ref) => <MaskedInput mask="99/99/9999" placeholder="DD/MM/AAAA" {...props} ref={ref} />
);
DataInput.displayName = "DataInput";

export const CRMInput = forwardRef<HTMLInputElement, Omit<MaskedInputProps, 'mask'>>(
  (props, ref) => <MaskedInput mask="9999999" placeholder="0000000" {...props} ref={ref} />
);
CRMInput.displayName = "CRMInput";