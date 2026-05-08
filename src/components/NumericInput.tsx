import { useEffect, useState } from 'react';
import { formatNumericInput, normalizeNumericInput, parseNumericInput } from '../utils/numberInput';

type NumericInputProps = {
  value: number;
  onChange: (value: number) => void;
  readOnly?: boolean;
  className?: string;
  step?: string;
  min?: number;
  max?: number;
  ariaLabel?: string;
};

export function NumericInput({
  value,
  onChange,
  readOnly = false,
  className,
  step,
  min,
  max,
  ariaLabel
}: NumericInputProps) {
  const [textValue, setTextValue] = useState(formatNumericInput(value));
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setTextValue(formatNumericInput(value));
    }
  }, [value, isEditing]);

  const updateText = (raw: string) => {
    const normalized = normalizeNumericInput(raw);
    setTextValue(normalized);
    onChange(parseNumericInput(normalized));
  };

  return (
    <input
      className={className}
      type="text"
      inputMode="decimal"
      value={textValue}
      readOnly={readOnly}
      step={step}
      min={min}
      max={max}
      aria-label={ariaLabel}
      onFocus={(event) => {
        setIsEditing(true);
        event.currentTarget.select();
      }}
      onChange={(event) => updateText(event.target.value)}
      onBlur={() => {
        setIsEditing(false);
        setTextValue(formatNumericInput(value));
      }}
    />
  );
}
