import type { SurfaceItem } from '../types';
import { roundArea } from '../utils/rounding';
import { NormativeInput } from './NormativeInput';

type Props = {
  surfaces: SurfaceItem[];
  onChange: (surfaces: SurfaceItem[]) => void;
};

export function SurfaceTable({ surfaces, onChange }: Props) {
  const update = (id: string, patch: Partial<SurfaceItem>) => {
    onChange(surfaces.map((surface) => (surface.id === id ? { ...surface, ...patch } : surface)));
  };

  const total = surfaces.reduce((sum, s) => sum + s.areaHa, 0);

  return (
    <section className="card">
      <h2>2. Покрытия</h2>
      <div className="surface-table-wrap">
        <table className="surface-table">
          <thead>
            <tr>
              <th>Покрытие</th>
              <th>Площадь, га</th>
              <th>Годовой ψ</th>
              <th>Расчетный ψ</th>
              <th>Признаки</th>
            </tr>
          </thead>
          <tbody>
            {surfaces.map((surface) => (
              <tr key={surface.id}>
                <td>
                  <input value={surface.name} onChange={(e) => update(surface.id, { name: e.target.value })} />
                </td>
                <td>
                  <input type="number" step="0.0001" value={surface.areaHa} onChange={(e) => update(surface.id, { areaHa: Number(e.target.value) })} />
                </td>
                <td>
                  <NormativeInput
                    label=""
                    value={surface.annualRainCoeff}
                    onChange={(annualRainCoeff) => update(surface.id, { annualRainCoeff })}
                  />
                </td>
                <td>
                  <NormativeInput
                    label=""
                    value={surface.designRainCoeff}
                    onChange={(designRainCoeff) => update(surface.id, { designRainCoeff })}
                  />
                </td>
                <td className="checks">
                  <label><input type="checkbox" checked={surface.isHardSurface} onChange={(e) => update(surface.id, { isHardSurface: e.target.checked })} /> твердое</label>
                  <label><input type="checkbox" checked={surface.isWashed} onChange={(e) => update(surface.id, { isWashed: e.target.checked })} /> мойка</label>
                  <label><input type="checkbox" checked={surface.isCleanedFromSnow} onChange={(e) => update(surface.id, { isCleanedFromSnow: e.target.checked })} /> снег</label>
                  <label><input type="checkbox" checked={surface.routedToTreatment} onChange={(e) => update(surface.id, { routedToTreatment: e.target.checked })} /> очистка</label>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th>Итого</th>
              <th>{roundArea(total)}</th>
              <th colSpan={3}></th>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
