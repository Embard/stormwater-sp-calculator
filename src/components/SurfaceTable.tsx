import { Fragment } from 'react';
import { Plus, X } from 'lucide-react';
import { NormativeInput } from './NormativeInput';
import { NumericInput } from './NumericInput';
import { applySurfaceTemplate, buildSurfaceFromTemplate, getSurfaceTemplate, SURFACE_TEMPLATES } from '../data/surfaceCatalog';
import type { SurfaceItem } from '../types';
import { formatNumber } from '../utils/rounding';

type Props = {
  surfaces: SurfaceItem[];
  totalAreaHa: number;
  onTotalAreaChange: (value: number) => void;
  onChange: (surfaces: SurfaceItem[]) => void;
};

function isSliderNeeded(surface: SurfaceItem, key: 'annualRainCoeff' | 'coverCoeff' | 'designRainCoeff') {
  const coeff = surface[key];
  return coeff.min !== undefined && coeff.max !== undefined && coeff.min !== coeff.max;
}



export function SurfaceTable({ surfaces, totalAreaHa, onTotalAreaChange, onChange }: Props) {
  const updateSurface = (id: string, patch: Partial<SurfaceItem>) => {
    onChange(surfaces.map((surface) => (surface.id === id ? { ...surface, ...patch } : surface)));
  };

  const totalSurfaceArea = surfaces.reduce((sum, surface) => sum + surface.areaHa, 0);
  const areaDiff = totalSurfaceArea - totalAreaHa;
  const isAreaOk = Math.abs(areaDiff) < 0.0001;

  return (
    <section className="card section-card">
      <div className="surface-head-row">
        <div>
          <span className="step-label">2</span>
          <h2>Покрытия и расчетная площадь</h2>
          <p className="section-subtitle">ψд — годовой коэффициент стока; Z — коэффициент покрова; Ψ — постоянный коэффициент стока для расчетного дождя и очистки.</p>
          <div className="legend-row">
            <span><b>Мойка</b> — покрытие входит в площадь поливомоечных вод.</span>
            <span><b>Уборка снега</b> — покрытие входит в площадь, очищаемую от снега.</span>
            <span><b>На очистку</b> — сток с покрытия идет на очистные.</span>
          </div>
        </div>
        <div className="surface-head-actions">
          <label className="field compact-field total-area-field">
            <span className="field-label">Общая площадь, га</span>
            <NumericInput
              value={totalAreaHa}
              onChange={onTotalAreaChange}
              ariaLabel="Общая площадь, га"
            />
          </label>
          <button
            type="button"
            className="secondary-button"
            onClick={() => onChange([...surfaces, buildSurfaceFromTemplate(`surface-${Date.now()}`, 'asphalt', 0)])}
          >
            <Plus size={16} /> Добавить покрытие
          </button>
        </div>
      </div>

      <div className="surface-grid-table">
        <div className="surface-grid-header">Покрытие</div>
        <div className="surface-grid-header">Площадь, га</div>
        <div className="surface-grid-header">ψд годовой</div>
        <div className="surface-grid-header">Z покрова</div>
        <div className="surface-grid-header">Ψ расчетный</div>
        <div className="surface-grid-header center" title="Покрытие входит в площадь поливомоечных вод">Мойка</div>
        <div className="surface-grid-header center" title="Покрытие входит в площадь уборки снега">Уборка снега</div>
        <div className="surface-grid-header center" title="Сток с покрытия направляется на очистные сооружения">На очистку</div>
        <div className="surface-grid-header"></div>

        {surfaces.map((surface) => {
          const template = getSurfaceTemplate(surface.templateId);
          return (
            <Fragment key={surface.id}>
              <div className="surface-cell">
                <label className="field compact-field cell-field">
                  <select
                    value={template.id}
                    onChange={(event) => updateSurface(surface.id, applySurfaceTemplate(surface, event.target.value))}
                  >
                    {SURFACE_TEMPLATES.map((option) => (
                      <option key={option.id} value={option.id}>{option.label}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="surface-cell">
                <label className="field compact-field cell-field">
                  <NumericInput
                    value={surface.areaHa}
                    onChange={(areaHa) => updateSurface(surface.id, { areaHa })}
                    ariaLabel="Площадь покрытия, га"
                  />
                </label>
              </div>

              <div className="surface-cell">
                <NormativeInput
                  compact
                  value={surface.annualRainCoeff}
                  showSlider={isSliderNeeded(surface, 'annualRainCoeff')}
                  onChange={(annualRainCoeff) => updateSurface(surface.id, { annualRainCoeff })}
                />
              </div>

              <div className="surface-cell">
                <NormativeInput
                  compact
                  value={surface.coverCoeff}
                  showSlider={isSliderNeeded(surface, 'coverCoeff')}
                  onChange={(coverCoeff) => updateSurface(surface.id, { coverCoeff })}
                />
              </div>

              <div className="surface-cell">
                <NormativeInput
                  compact
                  value={surface.designRainCoeff}
                  showSlider={isSliderNeeded(surface, 'designRainCoeff')}
                  onChange={(designRainCoeff) => updateSurface(surface.id, { designRainCoeff })}
                />
              </div>

              <div className="surface-cell center">
                <input
                  type="checkbox"
                  title="Площадь покрытия попадет в расчет поливомоечных вод"
                  checked={surface.isWashed}
                  disabled={!surface.isHardSurface}
                  onChange={(event) => updateSurface(surface.id, { isWashed: event.target.checked })}
                  aria-label="Учитывать покрытие в площади мойки"
                />
              </div>

              <div className="surface-cell center">
                <input
                  type="checkbox"
                  title="Площадь покрытия попадет в расчет коэффициента Ky"
                  checked={surface.isCleanedFromSnow}
                  onChange={(event) => updateSurface(surface.id, { isCleanedFromSnow: event.target.checked })}
                  aria-label="Учитывать покрытие в площади уборки снега"
                />
              </div>

              <div className="surface-cell center">
                <input
                  type="checkbox"
                  title="Площадь покрытия попадет в расчет дождевого объема на очистку"
                  checked={surface.routedToTreatment}
                  onChange={(event) => updateSurface(surface.id, { routedToTreatment: event.target.checked })}
                  aria-label="Направить покрытие на очистные сооружения"
                />
              </div>

              <div className="surface-cell center">
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => onChange(surfaces.filter((item) => item.id !== surface.id))}
                  aria-label="Удалить покрытие"
                >
                  <X size={14} />
                </button>
              </div>
            </Fragment>
          );
        })}
      </div>

      <div className={`surface-summary-row ${isAreaOk ? 'area-ok' : 'area-error'}`}>
        <span>Сумма покрытий</span>
        <strong>{formatNumber(totalSurfaceArea, 4)} га</strong>
        <span>{isAreaOk ? 'Совпадает с общей площадью' : `Не совпадает: ${areaDiff > 0 ? '+' : ''}${formatNumber(areaDiff, 4)} га`}</span>
      </div>
    </section>
  );
}
