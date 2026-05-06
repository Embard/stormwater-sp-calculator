import type { ChangeEvent } from 'react';
import type { NormativeValue } from '../types';

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
  const hasRange = value.min !== undefined && value.max !== undefined;
  const hasAdjustableRange = hasRange && value.min !== value.max;
  const outOfRange = hasRange && ((value.min !== undefined && value.value < value.min) || (value.max !== undefined && value.value > value.max));

  const handleNumberChange = (event: ChangeEvent<HTMLInputElement>) => {
    const normalized = event.target.value.replace(',', '.').replace(/^(-?)0+(?=\d)/, '$1');
    const next = normalized === '' ? 0 : Number(normalized);
    onChange({ ...value, value: Number.isFinite(next) ? next : value.value });
  };

  return (
    <label className={`field ${compact ? 'compact-field' : ''} ${outOfRange ? 'out-of-range' : ''}`}>
      {label ? <span className="field-label">{label}</span> : null}
      <div className="input-row">
        <input
          type="number"
          step={stepFor(value.value)}
          value={value.value}
          readOnly={readOnly}
          onFocus={(event) => event.currentTarget.select()}
          onChange={handleNumberChange}
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
          onChange={(event) => onChange({ ...value, value: Number(event.target.value) })}
          aria-label={label ?? 'Нормативное значение'}
        />
      ) : null}
    </label>
  );
}
