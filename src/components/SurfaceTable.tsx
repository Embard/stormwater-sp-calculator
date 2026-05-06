import type { NormativeValue, SurfaceItem } from '../types';
import { roundArea } from '../utils/rounding';
import { NormativeInput } from './NormativeInput';

type Props = {
  surfaces: SurfaceItem[];
  totalAreaHa: number;
  onTotalAreaChange: (value: number) => void;
  onChange: (surfaces: SurfaceItem[]) => void;
};

const sourceId = 'sp32-2018-izm1-5';

function coeff(value: number, min: number, max: number): NormativeValue {
  return { value, min, max, default: value, unit: '-', sourceId, basis: 'normative-range' };
}

export function SurfaceTable({ surfaces, totalAreaHa, onTotalAreaChange, onChange }: Props) {
  const update = (id: string, patch: Partial<SurfaceItem>) => {
    onChange(surfaces.map((surface) => (surface.id === id ? { ...surface, ...patch } : surface)));
  };

  const addSurface = () => {
    const nextSurface: SurfaceItem = {
      id: `custom-${Date.now()}`,
      name: 'Новое покрытие',
      kind: 'custom',
      areaHa: 0,
      annualRainCoeff: coeff(0.5, 0, 1),
      designRainCoeff: coeff(0.5, 0, 1),
      isHardSurface: false,
      isWashed: false,
      isCleanedFromSnow: false,
      routedToTreatment: false
    };
    onChange([...surfaces, nextSurface]);
  };

  const removeSurface = (id: string) => {
    if (surfaces.length <= 1) return;
    onChange(surfaces.filter((surface) => surface.id !== id));
  };

  const total = surfaces.reduce((sum, surface) => sum + surface.areaHa, 0);
  const delta = Math.abs(total - totalAreaHa);
  const isAreaMismatch = delta > 0.0001;

  return (
    <section className="card section-card">
      <div className="section-head surface-head">
        <div>
          <span className="step-label">2</span>
          <h2>Покрытия и расчетная площадь</h2>
          <p className="section-subtitle">ψ годового стока применяется к годовым объемам, ψ расчетного дождя — к дождевому расходу и очистке.</p>
        </div>
        <div className="surface-head-actions">
          <label className="field compact-field total-area-field">
            <span className="field-label">Общая площадь, га</span>
            <input type="number" step="0.0001" value={totalAreaHa} onChange={(event) => onTotalAreaChange(Number(event.target.value))} />
          </label>
          <button type="button" className="secondary-button" onClick={addSurface}>Добавить покрытие</button>
        </div>
      </div>

      <div className="surface-table-wrap">
        <table className="surface-table dense-table">
          <colgroup>
            <col className="col-name" />
            <col className="col-area" />
            <col className="col-coeff" />
            <col className="col-coeff" />
            <col className="col-check" />
            <col className="col-check" />
            <col className="col-action" />
          </colgroup>
          <thead>
            <tr>
              <th>Покрытие</th>
              <th>Площадь, га</th>
              <th>ψ годовой</th>
              <th>ψ расчетный</th>
              <th>Мойка</th>
              <th>Очистка</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {surfaces.map((surface) => (
              <tr key={surface.id}>
                <td>
                  <input value={surface.name} onChange={(event) => update(surface.id, { name: event.target.value })} />
                </td>
                <td>
                  <input type="number" step="0.0001" value={surface.areaHa} onChange={(event) => update(surface.id, { areaHa: Number(event.target.value) })} />
                </td>
                <td>
                  <NormativeInput
                    compact
                    showSlider
                    value={surface.annualRainCoeff}
                    onChange={(annualRainCoeff) => update(surface.id, { annualRainCoeff })}
                  />
                </td>
                <td>
                  <NormativeInput
                    compact
                    showSlider
                    value={surface.designRainCoeff}
                    onChange={(designRainCoeff) => update(surface.id, { designRainCoeff })}
                  />
                </td>
                <td className="check-cell">
                  <input
                    type="checkbox"
                    checked={surface.isWashed}
                    onChange={(event) => update(surface.id, { isWashed: event.target.checked, isHardSurface: event.target.checked || surface.isHardSurface })}
                    aria-label={`Учитывать покрытие ${surface.name} в поливомоечных водах`}
                  />
                </td>
                <td className="check-cell">
                  <input
                    type="checkbox"
                    checked={surface.routedToTreatment}
                    onChange={(event) => update(surface.id, { routedToTreatment: event.target.checked })}
                    aria-label={`Направить покрытие ${surface.name} на очистку`}
                  />
                </td>
                <td className="row-action-cell">
                  <button type="button" className="icon-button" onClick={() => removeSurface(surface.id)} disabled={surfaces.length <= 1} title="Удалить строку">×</button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th>Сумма покрытий</th>
              <th className={isAreaMismatch ? 'area-mismatch' : ''}>{roundArea(total)}</th>
              <th colSpan={5}>{isAreaMismatch ? `Не совпадает с общей площадью на ${roundArea(delta)} га` : 'Совпадает с общей площадью'}</th>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
