import { forwardRef, type ChangeEvent } from 'react';
import { Input, type InputProps } from './Input';
import { formatNumericInput, normalizeNumericInput } from '@/utils/number';

export interface FormattedNumberInputProps extends Omit<InputProps, 'type' | 'value' | 'onChange'> {
  value: string;
  onChange: (value: string) => void;
}

export const FormattedNumberInput = forwardRef<HTMLInputElement, FormattedNumberInputProps>(
  ({ value, onChange, ...props }, ref) => {
    function handleChange(event: ChangeEvent<HTMLInputElement>) {
      onChange(normalizeNumericInput(event.target.value));
    }

    return (
      <Input
        {...props}
        ref={ref}
        type="text"
        inputMode="decimal"
        value={formatNumericInput(value)}
        onChange={handleChange}
      />
    );
  },
);

FormattedNumberInput.displayName = 'FormattedNumberInput';
