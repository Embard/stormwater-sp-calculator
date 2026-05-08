import type { NormativeValue } from '../types';
import { parseNumericInput } from '../utils/numberInput';
import { NumericInput } from './NumericInput';

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
  const hasMin = value.min !== undefined;
  const hasMax = value.max !== undefined;
  const hasRange = hasMin && hasMax && value.min !== value.max;
  const hasAdjustableRange = hasRange;
  const outOfRange = (hasMin && value.value < value.min!) || (hasMax && value.value > value.max!);

  return (
    <label className={`field ${compact ? 'compact-field' : ''} ${outOfRange ? 'out-of-range' : ''}`}>
      {label ? <span className="field-label">{label}</span> : null}
      <div className="input-row">
        <NumericInput
          value={value.value}
          readOnly={readOnly}
          onChange={(nextValue) => onChange({ ...value, value: nextValue })}
          ariaLabel={label ?? 'Нормативное значение'}
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
