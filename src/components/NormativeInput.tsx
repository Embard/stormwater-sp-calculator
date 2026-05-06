import { useEffect, useState } from 'react';
import type { NormativeValue } from '../types';
import { formatNumericInput, normalizeNumericInput, parseNumericInput } from '../utils/numberInput';

type Props = {
  label?: string;
  value: NormativeValue;
  onChange: (value: NormativeValue) => void;
  compact?: boolean;
  showSlider?: boolean;
  readOnly?: boolean;
};

function stepFor(value: number): string {
  if (Number.isInteger(value)) return '1';
  const fraction = value.toString().split('.')[1]?.length ?? 0;
  return fraction > 2 ? '0.0001' : '0.01';
}

export function NormativeInput({
  label,
  value,
  onChange,
  compact = false,
  showSlider = true,
  readOnly = false
}: Props) {
  const [textValue, setTextValue] = useState(formatNumericInput(value.value));
  const hasRange = value.min !== undefined && value.max !== undefined;
  const hasAdjustableRange = hasRange && value.min !== value.max;
  const outOfRange = hasRange && ((value.min !== undefined && value.value < value.min) || (value.max !== undefined && value.value > value.max));

  useEffect(() => {
    setTextValue(formatNumericInput(value.value));
  }, [value.value]);

  const commitText = (raw: string) => {
    const normalized = normalizeNumericInput(raw);
    setTextValue(normalized);
    onChange({ ...value, value: parseNumericInput(normalized) });
  };

  return (
    <label className={`field ${compact ? 'compact-field' : ''} ${outOfRange ? 'out-of-range' : ''}`}>
      {label ? <span className="field-label">{label}</span> : null}
      <div className="input-row">
        <input
          type="text"
          inputMode="decimal"
          value={textValue}
          readOnly={readOnly}
          onFocus={(event) => event.currentTarget.select()}
          onChange={(event) => commitText(event.target.value)}
          onBlur={() => setTextValue(formatNumericInput(value.value))}
        />
        {value.unit !== '-' ? <span className="unit">{value.unit}</span> : null}
      </div>

      {hasRange ? (
        <span className="range-note">
          Диапазон: {value.min}–{value.max}{value.unit !== '-' ? ` ${value.unit}` : ''}
        </span>
      ) : null}

      {!readOnly && showSlider && hasAdjustableRange ? (
        <input
          className="normative-slider"
          type="range"
          min={value.min}
          max={value.max}
          step={stepFor(value.value)}
          value={value.value}
          onChange={(event) => onChange({ ...value, value: parseNumericInput(event.target.value) })}
          aria-label={label ?? 'Нормативное значение'}
        />
      ) : null}
    </label>
  );
}
