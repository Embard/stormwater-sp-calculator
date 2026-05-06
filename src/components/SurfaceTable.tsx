import type { NormativeValue, SurfaceItem } from '../types';
import { roundArea } from '../utils/rounding';
import { NormativeInput } from './NormativeInput';

type Props = {
  surfaces: SurfaceItem[];
  onChange: (surfaces: SurfaceItem[]) => void;
};

const sourceId = 'sp32-2018-izm1-5';

function coeff(value: number, min: number, max: number): NormativeValue {
  return { value, min, max, default: value, unit: '-', sourceId, basis: 'normative-range' };
}

export function SurfaceTable({ surfaces, onChange }: Props) {
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

  return (
    <section className="card section-card">
      <div className="section-head">
        <div>
          <span className="step-label">2</span>
          <h2>Покрытия</h2>
        </div>
        <button type="button" className="secondary-button" onClick={addSurface}>Добавить покрытие</button>
      </div>

      <div className="surface-table-wrap">
        <table className="surface-table dense-table">
          <thead>
            <tr>
              <th>Покрытие</th>
              <th>Площадь, га</th>
              <th>Годовой ψ</th>
              <th>Расчетный ψ</th>
              <th>Признаки</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {surfaces.map((surface) => (
              <tr key={surface.id}>
                <td className="surface-name-cell">
                  <input value={surface.name} onChange={(event) => update(surface.id, { name: event.target.value })} />
                </td>
                <td className="surface-area-cell">
                  <input type="number" step="0.0001" value={surface.areaHa} onChange={(event) => update(surface.id, { areaHa: Number(event.target.value) })} />
                </td>
                <td>
                  <NormativeInput
                    compact
                    value={surface.annualRainCoeff}
                    onChange={(annualRainCoeff) => update(surface.id, { annualRainCoeff })}
                  />
                </td>
                <td>
                  <NormativeInput
                    compact
                    value={surface.designRainCoeff}
                    onChange={(designRainCoeff) => update(surface.id, { designRainCoeff })}
                  />
                </td>
                <td>
                  <div className="surface-flags">
                    <label title="Твердое покрытие"><input type="checkbox" checked={surface.isHardSurface} onChange={(event) => update(surface.id, { isHardSurface: event.target.checked })} /> тверд.</label>
                    <label title="Участвует в расчете поливомоечных вод"><input type="checkbox" checked={surface.isWashed} onChange={(event) => update(surface.id, { isWashed: event.target.checked })} /> мойка</label>
                    <label title="Очищается от снега"><input type="checkbox" checked={surface.isCleanedFromSnow} onChange={(event) => update(surface.id, { isCleanedFromSnow: event.target.checked })} /> снег</label>
                    <label title="Направляется на очистку"><input type="checkbox" checked={surface.routedToTreatment} onChange={(event) => update(surface.id, { routedToTreatment: event.target.checked })} /> очистка</label>
                  </div>
                </td>
                <td className="row-action-cell">
                  <button type="button" className="icon-button" onClick={() => removeSurface(surface.id)} disabled={surfaces.length <= 1} title="Удалить строку">×</button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th>Итого</th>
              <th>{roundArea(total)}</th>
              <th colSpan={4}></th>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
