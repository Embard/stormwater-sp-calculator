import { useMemo, useState, type ReactNode } from 'react';
import { Calculator, FileText } from 'lucide-react';
import './styles/app.css';
import './styles/print.css';
import sourcesData from './data/sources.json';
import climateStations from './data/climateStations.json';
import { calculateProject } from './calc';
import { weightedCoefficient } from './calc/annualRunoff';
import { validateProject } from './calc/validation';
import { NormativeInput } from './components/NormativeInput';
import { PlaceSearch } from './components/PlaceSearch';
import { PrintSheet } from './components/PrintSheet';
import { ResultsPanel } from './components/ResultsPanel';
import { SurfaceTable } from './components/SurfaceTable';
import { ValidationPanel } from './components/ValidationPanel';
import type { ClimateParameters, ProjectInput, SourceRef, SurfaceItem, TreatmentInput } from './types';

const sourceId = 'sp32-2018-izm1-5';

const initialSurfaces: SurfaceItem[] = [
  {
    id: 'driveways',
    name: 'Проезды',
    kind: 'driveway',
    areaHa: 1.8697,
    annualRainCoeff: { value: 0.6, min: 0.6, max: 0.95, default: 0.6, unit: '-', sourceId, basis: 'normative-range' },
    designRainCoeff: { value: 0.8, min: 0.7, max: 0.95, default: 0.8, unit: '-', sourceId, basis: 'normative-range' },
    isHardSurface: true,
    isWashed: true,
    isCleanedFromSnow: true,
    routedToTreatment: true
  },
  {
    id: 'lawns',
    name: 'Газоны',
    kind: 'lawn',
    areaHa: 3.302,
    annualRainCoeff: { value: 0.1, min: 0.05, max: 0.2, default: 0.1, unit: '-', sourceId, basis: 'normative-range' },
    designRainCoeff: { value: 0.2, min: 0.1, max: 0.4, default: 0.2, unit: '-', sourceId, basis: 'normative-range' },
    isHardSurface: false,
    isWashed: false,
    isCleanedFromSnow: false,
    routedToTreatment: false
  },
  {
    id: 'structures',
    name: 'Сооружения',
    kind: 'structure',
    areaHa: 1.3496,
    annualRainCoeff: { value: 0.5, min: 0.5, max: 0.95, default: 0.5, unit: '-', sourceId, basis: 'normative-range' },
    designRainCoeff: { value: 0.95, min: 0.85, max: 1, default: 0.95, unit: '-', sourceId, basis: 'normative-range' },
    isHardSurface: true,
    isWashed: false,
    isCleanedFromSnow: true,
    routedToTreatment: false
  }
];

const initialClimate = climateStations[0] as ClimateParameters;

const initialProject: ProjectInput = {
  objectName: 'Тестовый пример Козенки',
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
  surfaces: initialSurfaces,
  snowMeltCoeff: { value: 0.7, min: 0.5, max: 0.8, default: 0.7, unit: '-', sourceId, basis: 'normative-range' },
  snowCleanedAreaHa: 3.2193,
  washingAreaHa: 1.8697,
  washingRateLPerM2: { value: 1.2, min: 0.8, max: 1.5, default: 1.2, unit: 'л/м²', sourceId, basis: 'normative-range' },
  washingCountPerYear: 150,
  washingRunoffCoeff: { value: 0.5, min: 0.5, max: 1, default: 0.5, unit: '-', sourceId, basis: 'normative-range' },
  meltUnevennessCoeff: { value: 0.8, min: 0.8, max: 1, default: 0.8, unit: '-', sourceId, basis: 'normative-range' },
  rainFlow: {
    areaHa: 1.8697,
    zMid: { value: 0.3196, min: 0.1, max: 1, default: 0.3196, unit: '-', sourceId, basis: 'calculated' },
    q20: initialClimate.q20,
    p: { value: 1, min: 0.33, max: 10, default: 1, unit: 'год', sourceId, basis: 'normative-range' },
    n: initialClimate.n,
    mr: initialClimate.mr,
    gamma: initialClimate.gamma,
    tConMin: { value: 5, min: 5, max: 10, default: 5, unit: 'мин', sourceId, basis: 'normative-range' },
    tCanMin: { value: 0, min: 0, max: 10, default: 0, unit: 'мин', sourceId, basis: 'manual', justification: 'Канавы не учитываются в демонстрационном примере.' },
    pipeLengthM: 120,
    pipeVelocityMS: 0.8
  },
  treatment: {
    rainTreatmentAreaHa: 1.8697,
    rainTreatmentCoeff: { value: 0.5196, min: 0.1, max: 1, default: 0.5196, unit: '-', sourceId, basis: 'calculated' },
    rainTreatmentCoeffScopeAreaHa: 6.5213,
    pollutedRainFraction: { value: 1, min: 0, max: 1, default: 1, unit: '-', sourceId, basis: 'normative-range' },
    rainProcessingHours: 24,
    meltProcessingHours: 48,
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
  note?: string;
  children: ReactNode;
};

function SectionCard({ step, title, note, children }: SectionCardProps) {
  return (
    <section className="card section-card">
      <div className="section-head">
        <div>
          <span className="step-label">{step}</span>
          <h2>{title}</h2>
          {note ? <p className="section-subtitle">{note}</p> : null}
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
};

function NumberField({ label, value, onChange, step = '0.0001', unit, readOnly = false }: NumberFieldProps) {
  return (
    <label className="field compact-field">
      <span className="field-label">{label}</span>
      <div className="input-row">
        <input
          type="number"
          step={step}
          value={value}
          readOnly={readOnly}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        {unit ? <span className="unit">{unit}</span> : null}
      </div>
    </label>
  );
}

function updateTreatment(project: ProjectInput, patch: Partial<TreatmentInput>): ProjectInput {
  return { ...project, treatment: { ...project.treatment, ...patch } };
}

export default function App() {
  const [project, setProject] = useState<ProjectInput>(initialProject);

  const treatmentArea = useMemo(
    () => project.surfaces.filter((surface) => surface.routedToTreatment).reduce((sum, surface) => sum + surface.areaHa, 0),
    [project.surfaces]
  );

  const calculatedTreatmentCoeff = useMemo(
    () => weightedCoefficient(project.surfaces, 'designRainCoeff', (surface) => surface.routedToTreatment),
    [project.surfaces]
  );

  const projectForCalc = useMemo<ProjectInput>(() => {
    return {
      ...project,
      treatment: {
        ...project.treatment,
        rainTreatmentAreaHa: treatmentArea || project.treatment.rainTreatmentAreaHa,
        rainTreatmentCoeff: {
          ...project.treatment.rainTreatmentCoeff,
          value: calculatedTreatmentCoeff || project.treatment.rainTreatmentCoeff.value,
          basis: calculatedTreatmentCoeff ? 'calculated' : project.treatment.rainTreatmentCoeff.basis
        },
        rainTreatmentCoeffScopeAreaHa: treatmentArea || project.treatment.rainTreatmentCoeffScopeAreaHa
      }
    };
  }, [project, treatmentArea, calculatedTreatmentCoeff]);

  const results = useMemo(() => calculateProject(projectForCalc), [projectForCalc]);
  const issues = useMemo(() => validateProject(projectForCalc), [projectForCalc]);
  const sources = sourcesData as SourceRef[];

  const scrollToResults = () => {
    document.getElementById('results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <main className="app-shell">
      <header className="topbar no-print">
        <div className="topbar-title">
          <span className="eyebrow">СП 32.13330.2018 с изменениями</span>
          <h1><Calculator size={22} /> Калькулятор ливневого стока</h1>
        </div>
        <div className="topbar-actions">
          <button type="button" className="secondary-button" onClick={scrollToResults}>Рассчитать</button>
          <button type="button" className="primary-button" onClick={() => window.print()}><FileText size={16} /> Печатный лист</button>
        </div>
      </header>

      <div className="layout no-print">
        <div className="left-column">
          <SectionCard step="1" title="Объект и место строительства" note="Минимум исходных данных для привязки климатических параметров и расчетной площади.">
            <div className="object-grid">
              <PlaceSearch value={project.place} onSelect={(place) => setProject({ ...project, place })} />
              <div className="object-fields">
                <label className="field compact-field">
                  <span className="field-label">Наименование объекта</span>
                  <input value={project.objectName} onChange={(event) => setProject({ ...project, objectName: event.target.value })} />
                </label>
              </div>
            </div>
          </SectionCard>

          <SurfaceTable
            surfaces={project.surfaces}
            totalAreaHa={project.totalAreaHa}
            onTotalAreaChange={(totalAreaHa) => setProject({ ...project, totalAreaHa })}
            onChange={(surfaces) => setProject({ ...project, surfaces })}
          />

          <SectionCard step="3" title="Климат и технология" note="Базовые параметры годовых объемов, талого стока и поливомоечных вод.">
            <div className="subsection-grid">
              <div className="subsection-box">
                <h3>Климат</h3>
                <div className="dense-grid two-columns">
                  <NormativeInput compact label="hд, теплый период" value={project.climate.hdWarmPeriodMm} onChange={(hdWarmPeriodMm) => setProject({ ...project, climate: { ...project.climate, hdWarmPeriodMm } })} />
                  <NormativeInput compact label="hт, холодный период" value={project.climate.htColdPeriodMm} onChange={(htColdPeriodMm) => setProject({ ...project, climate: { ...project.climate, htColdPeriodMm } })} />
                  <NormativeInput compact label="hc, талый сток за 10 ч" value={project.climate.hcMeltTenHourMm} onChange={(hcMeltTenHourMm) => setProject({ ...project, climate: { ...project.climate, hcMeltTenHourMm } })} />
                  <NormativeInput compact label="Коэффициент талого стока" value={project.snowMeltCoeff} onChange={(snowMeltCoeff) => setProject({ ...project, snowMeltCoeff })} />
                </div>
              </div>

              <div className="subsection-box">
                <h3>Технологические параметры</h3>
                <div className="dense-grid two-columns">
                  <NumberField label="Площадь уборки снега" value={project.snowCleanedAreaHa} unit="га" onChange={(snowCleanedAreaHa) => setProject({ ...project, snowCleanedAreaHa })} />
                  <NormativeInput compact label="Неравномерность снеготаяния" value={project.meltUnevennessCoeff} onChange={(meltUnevennessCoeff) => setProject({ ...project, meltUnevennessCoeff })} />
                  <NumberField label="Площадь мойки" value={project.washingAreaHa} unit="га" onChange={(washingAreaHa) => setProject({ ...project, washingAreaHa })} />
                  <NormativeInput compact label="Расход на мойку" value={project.washingRateLPerM2} onChange={(washingRateLPerM2) => setProject({ ...project, washingRateLPerM2 })} />
                  <NumberField label="Количество моек" value={project.washingCountPerYear} step="1" unit="раз/год" onChange={(washingCountPerYear) => setProject({ ...project, washingCountPerYear })} />
                  <NormativeInput compact label="Коэффициент мойки" value={project.washingRunoffCoeff} onChange={(washingRunoffCoeff) => setProject({ ...project, washingRunoffCoeff })} />
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard step="4" title="Дождевой расход и объем на очистку" note="Параметры расчетного дождя, времени протекания и площади, направляемой на очистку.">
            <div className="subsection-grid">
              <div className="subsection-box">
                <h3>Расход в коллекторе</h3>
                <div className="dense-grid three-columns">
                  <NumberField label="Площадь участка" value={project.rainFlow.areaHa} unit="га" onChange={(areaHa) => setProject({ ...project, rainFlow: { ...project.rainFlow, areaHa } })} />
                  <NormativeInput compact label="q20" value={project.rainFlow.q20} onChange={(q20) => setProject({ ...project, rainFlow: { ...project.rainFlow, q20 } })} />
                  <NormativeInput compact label="P" value={project.rainFlow.p} onChange={(p) => setProject({ ...project, rainFlow: { ...project.rainFlow, p } })} />
                  <NormativeInput compact label="n" value={project.rainFlow.n} onChange={(n) => setProject({ ...project, rainFlow: { ...project.rainFlow, n } })} />
                  <NormativeInput compact label="mr" value={project.rainFlow.mr} onChange={(mr) => setProject({ ...project, rainFlow: { ...project.rainFlow, mr } })} />
                  <NormativeInput compact label="gamma" value={project.rainFlow.gamma} onChange={(gamma) => setProject({ ...project, rainFlow: { ...project.rainFlow, gamma } })} />
                  <NormativeInput compact label="Zmid" value={project.rainFlow.zMid} onChange={(zMid) => setProject({ ...project, rainFlow: { ...project.rainFlow, zMid } })} />
                  <NormativeInput compact label="tcon" value={project.rainFlow.tConMin} onChange={(tConMin) => setProject({ ...project, rainFlow: { ...project.rainFlow, tConMin } })} />
                  <NormativeInput compact label="tcan" value={project.rainFlow.tCanMin} onChange={(tCanMin) => setProject({ ...project, rainFlow: { ...project.rainFlow, tCanMin } })} />
                  <NumberField label="Длина трубы" value={project.rainFlow.pipeLengthM} step="0.01" unit="м" onChange={(pipeLengthM) => setProject({ ...project, rainFlow: { ...project.rainFlow, pipeLengthM } })} />
                  <NumberField label="Скорость" value={project.rainFlow.pipeVelocityMS} step="0.01" unit="м/с" onChange={(pipeVelocityMS) => setProject({ ...project, rainFlow: { ...project.rainFlow, pipeVelocityMS } })} />
                </div>
              </div>

              <div className="subsection-box">
                <h3>Очистка дождевого стока</h3>
                <div className="dense-grid two-columns">
                  <NumberField label="Площадь на очистку" value={projectForCalc.treatment.rainTreatmentAreaHa} unit="га" readOnly onChange={() => undefined} />
                  <NormativeInput compact label="ha, слой дождя" value={project.climate.haRainTreatmentMm} onChange={(haRainTreatmentMm) => setProject({ ...project, climate: { ...project.climate, haRainTreatmentMm } })} />
                  <NormativeInput compact label="ψ очистки" value={projectForCalc.treatment.rainTreatmentCoeff} onChange={(rainTreatmentCoeff) => setProject(updateTreatment(project, { rainTreatmentCoeff }))} />
                  <NormativeInput compact label="Доля загрязненного объема" value={project.treatment.pollutedRainFraction} onChange={(pollutedRainFraction) => setProject(updateTreatment(project, { pollutedRainFraction }))} />
                </div>
                <p className="compact-note">Площадь на очистку и ψ пересчитываются по покрытиям с признаком «очистка».</p>
              </div>
            </div>
          </SectionCard>

          <SectionCard step="5" title="Очистные сооружения и резервуар" note="Периоды переработки, технологические перерывы и проверка рабочего объема резервуара.">
            <div className="dense-grid three-columns">
              <NumberField label="Переработка дождя" value={project.treatment.rainProcessingHours} step="1" unit="ч" onChange={(rainProcessingHours) => setProject(updateTreatment(project, { rainProcessingHours }))} />
              <NumberField label="Переработка талого стока" value={project.treatment.meltProcessingHours} step="1" unit="ч" onChange={(meltProcessingHours) => setProject(updateTreatment(project, { meltProcessingHours }))} />
              <NumberField label="Отстаивание" value={project.treatment.settlingHours} step="1" unit="ч" onChange={(settlingHours) => setProject(updateTreatment(project, { settlingHours }))} />
              <NumberField label="Технологические перерывы" value={project.treatment.technicalBreakHours} step="1" unit="ч" onChange={(technicalBreakHours) => setProject(updateTreatment(project, { technicalBreakHours }))} />
              <NumberField label="Рабочий объем резервуара" value={project.treatment.reservoirWorkingVolumeM3} step="0.1" unit="м³" onChange={(reservoirWorkingVolumeM3) => setProject(updateTreatment(project, { reservoirWorkingVolumeM3 }))} />
              <NormativeInput compact label="Запас резервуара" value={project.treatment.reservoirReservePercent} onChange={(reservoirReservePercent) => setProject(updateTreatment(project, { reservoirReservePercent }))} />
              <label className="field compact-field select-field">
                <span className="field-label">Режим резервуара</span>
                <select
                  value={project.treatment.reservoirMode}
                  onChange={(event) => setProject(updateTreatment(project, { reservoirMode: event.target.value as TreatmentInput['reservoirMode'] }))}
                >
                  <option value="regulation-only">Только регулирование</option>
                  <option value="regulation-and-settling">Регулирование + осветление</option>
                </select>
              </label>
            </div>
          </SectionCard>
        </div>

        <aside className="right-column">
          <ResultsPanel results={results} />
          <ValidationPanel issues={issues} />
          <section className="card actions-card">
            <h2>Действия</h2>
            <button type="button" className="primary-button wide" onClick={scrollToResults}>Пересчитать</button>
            <button type="button" className="secondary-button wide" onClick={() => window.print()}>Печатный лист</button>
          </section>
        </aside>
      </div>

      <PrintSheet input={projectForCalc} results={results} issues={issues} sources={sources} />
    </main>
  );
}
