import { useId, useState } from 'react';
import type { NormativeValue } from '../types';

type Props = {
  label?: string;
  value: NormativeValue;
  onChange: (next: NormativeValue) => void;
  compact?: boolean;
  showRangeByDefault?: boolean;
  step?: number | string;
};

function formatRange(value: NormativeValue): string {
  if (value.min === undefined && value.max === undefined) return '';
  return `${value.min ?? '—'} … ${value.max ?? '—'} ${value.unit}`;
}

export function NormativeInput({
  label,
  value,
  onChange,
  compact = false,
  showRangeByDefault = false,
  step = 0.0001
}: Props) {
  const inputId = useId();
  const [rangeOpen, setRangeOpen] = useState(showRangeByDefault);
  const hasRange = value.min !== undefined || value.max !== undefined;
  const isOutOfRange =
    (value.min !== undefined && value.value < value.min) ||
    (value.max !== undefined && value.value > value.max);
  const isRangeEdge =
    (value.min !== undefined && value.value === value.min) ||
    (value.max !== undefined && value.value === value.max);

  const handleNumberChange = (nextValue: number) => {
    onChange({
      ...value,
      value: nextValue,
      basis: value.basis === 'calculated' ? 'manual' : value.basis
    });
  };

  const sliderValue = Math.min(
    value.max ?? value.value,
    Math.max(value.min ?? value.value, value.value)
  );

  return (
    <div className={`normative-input ${compact ? 'compact' : ''} ${isOutOfRange ? 'is-invalid' : ''}`}>
      {label ? <label className="field-label" htmlFor={inputId}>{label}</label> : null}
      <div className="input-row">
        <input
          id={inputId}
          type="number"
          step={step}
          value={value.value}
          onChange={(event) => handleNumberChange(Number(event.target.value))}
        />
        <span className="unit">{value.unit}</span>
      </div>

      {hasRange ? (
        <div className="normative-meta">
          <span>Диапазон: {formatRange(value)}</span>
          <button type="button" className="text-button" onClick={() => setRangeOpen((current) => !current)}>
            {rangeOpen ? 'Скрыть' : 'Шкала'}
          </button>
        </div>
      ) : null}

      {hasRange && rangeOpen ? (
        <input
          className="range"
          type="range"
          min={value.min ?? value.value}
          max={value.max ?? value.value}
          step={step}
          value={sliderValue}
          onChange={(event) => handleNumberChange(Number(event.target.value))}
        />
      ) : null}

      {isOutOfRange ? <span className="error-text">Вне диапазона — нужно обоснование</span> : null}
      {!isOutOfRange && isRangeEdge ? <span className="hint">Край диапазона — проверьте обоснование</span> : null}
    </div>
  );
}
