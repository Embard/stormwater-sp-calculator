import { useMemo, useState, type ReactNode } from 'react';
import { Calculator, FileText } from 'lucide-react';
import './styles/app.css';
import climateStations from './data/climateStations.json';
import { calculateProject } from './calc';
import { weightedCoefficient } from './calc/annualRunoff';
import { validateProject } from './calc/validation';
import { NormativeInput } from './components/NormativeInput';
import { ResultsPanel } from './components/ResultsPanel';
import { SurfaceTable } from './components/SurfaceTable';
import { ValidationPanel } from './components/ValidationPanel';
import { buildSurfaceFromTemplate } from './data/surfaceCatalog';
import { NumericInput } from './components/NumericInput';
import { downloadDocxReport } from './utils/docxReport';
import type { ClimateParameters, NormativeValue, ProjectInput, TreatmentInput } from './types';

const sourceId = 'sp32-2018-izm1-5';
const initialClimate = climateStations[0] as ClimateParameters;

const initialProject: ProjectInput = {
  objectName: 'Тестовый пример Козенки',
  engineerName: 'Иванов И.И',
  reportDate: new Date().toLocaleDateString('ru-RU'),
  place: {
    id: 'kozenki-mo',
    name: 'Козенки',
    region: 'Московская область',
    district: 'городской округ Коломна',
    lat: 55.07,
    lon: 38.76,
    confidence: 0.98,
    source: 'local'
  },
  climate: initialClimate,
  totalAreaHa: 6.5213,
  surfaces: [
    { ...buildSurfaceFromTemplate('driveways', 'asphalt', 1.8697), isWashed: true, isCleanedFromSnow: true, routedToTreatment: true },
    { ...buildSurfaceFromTemplate('lawns', 'lawn', 3.3020), isCleanedFromSnow: false },
    { ...buildSurfaceFromTemplate('structures', 'roof', 1.3496), isCleanedFromSnow: true }
  ],
  snowMeltCoeff: { value: 0.7, min: 0.5, max: 0.8, default: 0.7, unit: '-', sourceId, basis: 'normative-range' },
  snowCleanedAreaHa: 3.2193,
  washingAreaHa: 1.8697,
  washingRateLPerM2: { value: 1.2, min: 0.8, max: 1.5, default: 1.2, unit: 'л/м²', sourceId, basis: 'normative-range' },
  washingCountPerYear: 150,
  washingRunoffCoeff: { value: 0.5, min: 0.5, max: 0.5, default: 0.5, unit: '-', sourceId, basis: 'normative-fixed' },
  meltUnevennessCoeff: { value: 0.8, min: 0.8, max: 1, default: 0.8, unit: '-', sourceId, basis: 'normative-range' },
  rainFlow: {
    areaHa: 1.8697,
    zMid: { value: 0.32, unit: '-', sourceId, basis: 'manual', justification: 'Вводится вручную по принятой методике.' },
    q20: initialClimate.q20,
    p: { value: 1, min: 0.33, max: 20, default: 1, unit: 'год', sourceId, basis: 'normative-range' },
    n: initialClimate.n,
    mr: initialClimate.mr,
    gamma: initialClimate.gamma,
    tConMin: { value: 5, min: 5, max: 10, default: 5, unit: 'мин', sourceId, basis: 'normative-range' },
    tCanMin: { value: 0, unit: 'мин', sourceId, basis: 'manual', justification: 'Канавы не учитываются в демонстрационном примере.' },
    pipeLengthM: 120,
    pipeVelocityMS: 0.8
  },
  treatment: {
    rainTreatmentAreaHa: 1.8697,
    rainTreatmentCoeff: { value: 0.95, unit: '-', sourceId, basis: 'calculated' },
    rainTreatmentCoeffScopeAreaHa: 1.8697,
    pollutedRainFraction: { value: 1, unit: '-', sourceId, basis: 'manual', justification: 'Принято для демонстрационного примера.' },
    rainProcessingHours: 24,
    meltProcessingHours: 24,
    meltConsecutiveDays: 1,
    settlingHours: 0,
    technicalBreakHours: 0,
    reservoirWorkingVolumeM3: 350,
    reservoirReservePercent: { value: 10, min: 5, max: 10, default: 10, unit: '%', sourceId, basis: 'normative-range' },
    reservoirMode: 'regulation-only'
  }
};

type SectionCardProps = {
  step: string;
  title: string;
  children: ReactNode;
};

function SectionCard({ step, title, children }: SectionCardProps) {
  return (
    <section className="card section-card">
      <div className="section-head">
        <div>
          <span className="step-label">{step}</span>
          <h2>{title}</h2>
        </div>
      </div>
      {children}
    </section>
  );
}

type NumberFieldProps = {
  label: string;
  value: number;
  onChange: (next: number) => void;
  step?: string;
  unit?: string;
  readOnly?: boolean;
  min?: number;
  max?: number;
  showSlider?: boolean;
};

function NumberField({ label, value, onChange, step = '0.0001', unit, readOnly = false, min, max, showSlider = false }: NumberFieldProps) {
  const hasMin = min !== undefined;
  const hasMax = max !== undefined;
  const hasRange = hasMin && hasMax && min !== max;
  const isOutOfRange = (hasMin && value < min!) || (hasMax && value > max!);
  const hasSlider = showSlider && hasRange && !readOnly;

  return (
    <label className={`field compact-field ${isOutOfRange ? 'out-of-range' : ''}`}>
      <span className="field-label">{label}</span>
      <div className="input-row">
        <NumericInput
          value={value}
          readOnly={readOnly}
          step={step}
          min={min}
          max={max}
          onChange={onChange}
          ariaLabel={label}
        />
        {unit ? <span className="unit">{unit}</span> : null}
      </div>
      {hasRange ? <span className="range-note">Диапазон: {min}–{max}{unit ? ` ${unit}` : ''}</span> : null}
      {hasSlider ? (
        <input
          className="normative-slider"
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
      ) : null}
    </label>
  );
}

function updateTreatment(project: ProjectInput, patch: Partial<TreatmentInput>): ProjectInput {
  return { ...project, treatment: { ...project.treatment, ...patch } };
}

function HelpLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a className="help-link" href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}

const helpLinks = {
  climate: 'https://www.vo-da.ru/tool/cp-info',
  rain: 'https://www.vo-da.ru/tool/rain',
  rainType: 'https://www.vo-da.ru/tool/rain-type',
  meltedWater: 'https://www.vo-da.ru/tool/meltedwater',
  layer: 'https://www.vo-da.ru/tool/layer'
};

function getReservoirReserve(mode: TreatmentInput['reservoirMode'], current?: NormativeValue): NormativeValue {
  if (mode === 'regulation-and-settling') {
    const next = current?.value !== undefined && current.value >= 35 && current.value <= 45 ? current.value : 35;
    return { value: next, min: 35, max: 45, default: 35, unit: '%', sourceId, basis: 'normative-range' };
  }
  const next = current?.value !== undefined && current.value >= 5 && current.value <= 10 ? current.value : 10;
  return { value: next, min: 5, max: 10, default: 10, unit: '%', sourceId, basis: 'normative-range' };
}

export default function App() {
  const [project, setProject] = useState<ProjectInput>(initialProject);

  const treatmentArea = useMemo(
    () => project.surfaces.filter((surface) => surface.routedToTreatment).reduce((sum, surface) => sum + surface.areaHa, 0),
    [project.surfaces]
  );

  const washingArea = useMemo(
    () => project.surfaces.filter((surface) => surface.isWashed).reduce((sum, surface) => sum + surface.areaHa, 0),
    [project.surfaces]
  );

  const snowCleanedArea = useMemo(
    () => project.surfaces.filter((surface) => surface.isCleanedFromSnow).reduce((sum, surface) => sum + surface.areaHa, 0),
    [project.surfaces]
  );

  const calculatedTreatmentCoeff = useMemo(
    () => weightedCoefficient(project.surfaces, 'designRainCoeff', (surface) => surface.routedToTreatment),
    [project.surfaces]
  );

  const calculatedZmid = useMemo(
    () => weightedCoefficient(project.surfaces, 'coverCoeff', (surface) => surface.routedToTreatment),
    [project.surfaces]
  );

  const collectorArea = treatmentArea > 0 ? treatmentArea : project.totalAreaHa;

  const projectForCalc = useMemo<ProjectInput>(() => {
    return {
      ...project,
      snowCleanedAreaHa: snowCleanedArea,
      washingAreaHa: washingArea,
      rainFlow: {
        ...project.rainFlow,
        areaHa: collectorArea,
        zMid: { ...project.rainFlow.zMid, value: calculatedZmid || project.rainFlow.zMid.value, basis: 'calculated' }
      },
      treatment: {
        ...project.treatment,
        rainTreatmentAreaHa: treatmentArea,
        rainTreatmentCoeff: {
          ...project.treatment.rainTreatmentCoeff,
          value: calculatedTreatmentCoeff,
          basis: 'calculated'
        },
        rainTreatmentCoeffScopeAreaHa: treatmentArea
      }
    };
  }, [project, treatmentArea, washingArea, snowCleanedArea, collectorArea, calculatedTreatmentCoeff, calculatedZmid]);

  const results = useMemo(() => calculateProject(projectForCalc), [projectForCalc]);
  const issues = useMemo(() => validateProject(projectForCalc), [projectForCalc]);

  return (
    <main className="app-shell">
      <header className="topbar no-print">
        <div className="topbar-title">
          <span className="eyebrow">СП 32.13330.2018 с изменениями</span>
          <h1><Calculator size={22} /> Калькулятор ливневого стока</h1>
        </div>
        <div className="topbar-actions">
          <button type="button" className="primary-button" onClick={() => downloadDocxReport(projectForCalc, results)}>
            <FileText size={16} /> Скачать Word-отчет
          </button>
        </div>
      </header>

      <div className="layout no-print">
        <div className="left-column">
          <SectionCard step="1" title="Объект">
            <div className="dense-grid three-columns">
              <label className="field compact-field object-name-field">
                <span className="field-label">Наименование объекта</span>
                <input
                  value={project.objectName}
                  onFocus={(event) => event.currentTarget.select()}
                  onChange={(event) => setProject({ ...project, objectName: event.target.value })}
                />
              </label>
              <label className="field compact-field">
                <span className="field-label">Инженер</span>
                <input
                  value={project.engineerName}
                  onFocus={(event) => event.currentTarget.select()}
                  onChange={(event) => setProject({ ...project, engineerName: event.target.value })}
                />
              </label>
              <label className="field compact-field">
                <span className="field-label">Дата отчета</span>
                <input
                  value={project.reportDate}
                  onFocus={(event) => event.currentTarget.select()}
                  onChange={(event) => setProject({ ...project, reportDate: event.target.value })}
                />
              </label>
            </div>
          </SectionCard>

          <SurfaceTable
            surfaces={project.surfaces}
            totalAreaHa={project.totalAreaHa}
            onTotalAreaChange={(totalAreaHa) => setProject({ ...project, totalAreaHa })}
            onChange={(surfaces) => setProject({ ...project, surfaces })}
          />

          <SectionCard step="3" title="Климат и технология">
            <div className="subsection-grid">
              <div className="subsection-box">
                <h3>Климат</h3>
                <div className="link-row">
                  <HelpLink href={helpLinks.climate}>Климатические параметры</HelpLink>
                  <HelpLink href={helpLinks.meltedWater}>Талые воды</HelpLink>
                </div>
                <div className="dense-grid two-columns">
                  <NormativeInput compact showSlider={false} label="hд, теплый период" value={project.climate.hdWarmPeriodMm} onChange={(hdWarmPeriodMm) => setProject({ ...project, climate: { ...project.climate, hdWarmPeriodMm } })} />
                  <NormativeInput compact showSlider={false} label="hт, холодный период" value={project.climate.htColdPeriodMm} onChange={(htColdPeriodMm) => setProject({ ...project, climate: { ...project.climate, htColdPeriodMm } })} />
                  <NormativeInput compact showSlider={false} label="hc, талый сток за 10 ч" value={project.climate.hcMeltTenHourMm} onChange={(hcMeltTenHourMm) => setProject({ ...project, climate: { ...project.climate, hcMeltTenHourMm } })} />
                  <NormativeInput compact showSlider label="Коэффициент талого стока" value={project.snowMeltCoeff} onChange={(snowMeltCoeff) => setProject({ ...project, snowMeltCoeff })} />
                </div>
              </div>

              <div className="subsection-box">
                <h3>Технологические параметры</h3>
                <div className="dense-grid two-columns">
                  <NumberField label="Площадь уборки снега" value={projectForCalc.snowCleanedAreaHa} readOnly unit="га" onChange={() => undefined} />
                  <NormativeInput compact showSlider label="Коэффициент неравномерности снеготаяния" value={project.meltUnevennessCoeff} onChange={(meltUnevennessCoeff) => setProject({ ...project, meltUnevennessCoeff })} />
                  <NumberField label="Площадь мойки" value={projectForCalc.washingAreaHa} readOnly unit="га" onChange={() => undefined} />
                  <NormativeInput compact showSlider label="Расход на мойку" value={project.washingRateLPerM2} onChange={(washingRateLPerM2) => setProject({ ...project, washingRateLPerM2 })} />
                  <NumberField label="Количество моек" value={project.washingCountPerYear} step="1" min={100} max={150} showSlider unit="раз/год" onChange={(washingCountPerYear) => setProject({ ...project, washingCountPerYear })} />
                  <NormativeInput compact showSlider={false} label="Коэффициент мойки" value={project.washingRunoffCoeff} onChange={(washingRunoffCoeff) => setProject({ ...project, washingRunoffCoeff })} />
                </div>
                <p className="compact-note">Площадь уборки снега, площадь мойки и площадь на очистку считаются по галочкам в таблице покрытий.</p>
              </div>
            </div>
          </SectionCard>

          <SectionCard step="4" title="Дождевой расход и объем на очистку">
            <div className="subsection-grid">
              <div className="subsection-box">
                <h3>Расход в коллекторе</h3>
                <p className="compact-note">q20, n, mr, γ и P вводятся вручную по принятому дождевому району и условиям расположения коллектора. tcan учитывается только при наличии открытых канав/лотков; если их нет — 0.</p>
                <div className="link-row">
                  <HelpLink href={helpLinks.rain}>Дождевые параметры</HelpLink>
                  <HelpLink href={helpLinks.rainType}>Тип дождя / P</HelpLink>
                  <HelpLink href={helpLinks.layer}>Слои и районы</HelpLink>
                </div>
                <div className="dense-grid three-columns">
                  <NumberField label="Площадь участка" value={projectForCalc.rainFlow.areaHa} readOnly unit="га" onChange={() => undefined} />
                  <NormativeInput compact showSlider={false} label="q20" value={project.rainFlow.q20} onChange={(q20) => setProject({ ...project, rainFlow: { ...project.rainFlow, q20 } })} />
                  <NormativeInput compact showSlider={false} label="P по табл. 9" value={project.rainFlow.p} onChange={(p) => setProject({ ...project, rainFlow: { ...project.rainFlow, p } })} />
                  <NormativeInput compact showSlider={false} label="n" value={project.rainFlow.n} onChange={(n) => setProject({ ...project, rainFlow: { ...project.rainFlow, n } })} />
                  <NormativeInput compact showSlider={false} label="mr" value={project.rainFlow.mr} onChange={(mr) => setProject({ ...project, rainFlow: { ...project.rainFlow, mr } })} />
                  <NormativeInput compact showSlider={false} label="γ" value={project.rainFlow.gamma} onChange={(gamma) => setProject({ ...project, rainFlow: { ...project.rainFlow, gamma } })} />
                  <NumberField label="Zmid по Zi" value={projectForCalc.rainFlow.zMid.value} readOnly onChange={() => undefined} />
                  <NormativeInput compact showSlider={false} label="tcon" value={project.rainFlow.tConMin} onChange={(tConMin) => setProject({ ...project, rainFlow: { ...project.rainFlow, tConMin } })} />
                  <NormativeInput compact showSlider={false} label="tcan, канавы/лотки" value={project.rainFlow.tCanMin} onChange={(tCanMin) => setProject({ ...project, rainFlow: { ...project.rainFlow, tCanMin } })} />
                  <NumberField label="Длина трубы" value={project.rainFlow.pipeLengthM} step="0.01" unit="м" onChange={(pipeLengthM) => setProject({ ...project, rainFlow: { ...project.rainFlow, pipeLengthM } })} />
                  <NumberField label="Скорость" value={project.rainFlow.pipeVelocityMS} step="0.01" unit="м/с" onChange={(pipeVelocityMS) => setProject({ ...project, rainFlow: { ...project.rainFlow, pipeVelocityMS } })} />
                </div>
              </div>

              <div className="subsection-box">
                <h3>Очистка дождевого стока</h3>
                <div className="link-row">
                  <HelpLink href={helpLinks.layer}>Объем дождя на очистку</HelpLink>
                  <HelpLink href={helpLinks.rainType}>Слои и районы</HelpLink>
                </div>
                <div className="dense-grid two-columns">
                  <NumberField label="Площадь на очистку" value={projectForCalc.treatment.rainTreatmentAreaHa} readOnly unit="га" onChange={() => undefined} />
                  <NormativeInput compact showSlider={false} label="ha, слой дождя" value={project.climate.haRainTreatmentMm} onChange={(haRainTreatmentMm) => setProject({ ...project, climate: { ...project.climate, haRainTreatmentMm } })} />
                  <NumberField label="Ψmid по Ψi" value={projectForCalc.treatment.rainTreatmentCoeff.value} readOnly onChange={() => undefined} />
                  <NormativeInput compact showSlider={false} label="Доля объема на очистку" value={project.treatment.pollutedRainFraction} onChange={(pollutedRainFraction) => setProject(updateTreatment(project, { pollutedRainFraction }))} />
                </div>
                <p className="compact-note">Площадь на очистку и Ψmid считаются по покрытиям с признаком «На очистку» и коэффициенту Ψi. Доля объема на очистку: 1 — весь расчетный дождевой объем идет на очистные; меньше 1 — только при обоснованном разделении потоков.</p>
              </div>
            </div>
          </SectionCard>

          <SectionCard step="5" title="Очистные сооружения и резервуар">
            <p className="compact-note">Здесь задаются только режимы и периоды переработки. Требуемый рабочий и полный объем резервуара смотри в результатах справа.</p>
            <div className="dense-grid three-columns">
              <NumberField label="Переработка дождя" value={project.treatment.rainProcessingHours} step="1" unit="ч" onChange={(rainProcessingHours) => setProject(updateTreatment(project, { rainProcessingHours }))} />
              <NumberField
                label="Переработка талого стока"
                value={project.treatment.meltProcessingHours}
                step="1"
                unit="ч"
                onChange={(meltProcessingHours) => setProject(updateTreatment(project, {
                  meltProcessingHours,
                  meltConsecutiveDays: meltProcessingHours > 24 ? project.treatment.meltConsecutiveDays : 1
                }))}
              />
              {project.treatment.meltProcessingHours > 24 ? (
                <NumberField label="Расчетных суток снеготаяния" value={project.treatment.meltConsecutiveDays} step="1" min={1} max={10} showSlider unit="сут" onChange={(meltConsecutiveDays) => setProject(updateTreatment(project, { meltConsecutiveDays }))} />
              ) : null}
              <NumberField label="Отстаивание" value={project.treatment.settlingHours} step="1" unit="ч" onChange={(settlingHours) => setProject(updateTreatment(project, { settlingHours }))} />
              <NumberField label="Технологические перерывы" value={project.treatment.technicalBreakHours} step="1" unit="ч" onChange={(technicalBreakHours) => setProject(updateTreatment(project, { technicalBreakHours }))} />
              <NormativeInput compact showSlider label="Запас резервуара" value={project.treatment.reservoirReservePercent} onChange={(reservoirReservePercent) => setProject(updateTreatment(project, { reservoirReservePercent }))} />
              <label className="field compact-field select-field">
                <span className="field-label">Режим резервуара</span>
                <select
                  value={project.treatment.reservoirMode}
                  onChange={(event) => {
                    const reservoirMode = event.target.value as TreatmentInput['reservoirMode'];
                    setProject(updateTreatment(project, {
                      reservoirMode,
                      reservoirReservePercent: getReservoirReserve(reservoirMode, project.treatment.reservoirReservePercent)
                    }));
                  }}
                >
                  <option value="regulation-only">Только регулирование</option>
                  <option value="regulation-and-settling">Регулирование + предварительное осветление</option>
                </select>
              </label>
            </div>
          </SectionCard>
        </div>

        <aside className="right-column">
          <ResultsPanel results={results} />
          <ValidationPanel issues={issues} />
        </aside>
      </div>
    </main>
  );
}
