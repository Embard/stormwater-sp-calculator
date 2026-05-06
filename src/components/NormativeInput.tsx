import type { NormativeValue } from '../types';

type Props = {
  label: string;
  value: NormativeValue;
  onChange: (next: NormativeValue) => void;
};

export function NormativeInput({ label, value, onChange }: Props) {
  const hasRange = value.min !== undefined || value.max !== undefined;
  const isOutOfRange =
    (value.min !== undefined && value.value < value.min) ||
    (value.max !== undefined && value.value > value.max);

  return (
    <label className={`normative-input ${isOutOfRange ? 'is-invalid' : ''}`}>
      <span className="field-label">{label}</span>
      <div className="input-row">
        <input
          type="number"
          step="0.0001"
          value={value.value}
          onChange={(e) => onChange({ ...value, value: Number(e.target.value), basis: value.basis === 'calculated' ? 'manual' : value.basis })}
        />
        <span className="unit">{value.unit}</span>
      </div>
      {hasRange && (
        <>
          <input
            className="range"
            type="range"
            min={value.min ?? value.value}
            max={value.max ?? value.value}
            step="0.0001"
            value={Math.min(value.max ?? value.value, Math.max(value.min ?? value.value, value.value))}
            onChange={(e) => onChange({ ...value, value: Number(e.target.value) })}
          />
          <span className="hint">Нормативный диапазон: {value.min ?? '—'} … {value.max ?? '—'} {value.unit}</span>
        </>
      )}
      {isOutOfRange && <span className="error-text">Значение вне диапазона, нужно обоснование</span>}
    </label>
  );
}
