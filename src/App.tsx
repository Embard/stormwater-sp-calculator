import { useMemo, useState } from 'react';
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
import type { ClimateParameters, ProjectInput, SourceRef, SurfaceItem } from './types';

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

export default function App() {
  const [project, setProject] = useState<ProjectInput>(initialProject);

  const calculatedTreatmentCoeff = useMemo(
    () => weightedCoefficient(project.surfaces, 'designRainCoeff', (surface) => surface.routedToTreatment),
    [project.surfaces]
  );

  const projectForCalc = useMemo<ProjectInput>(() => {
    const treatmentArea = project.surfaces.filter((x) => x.routedToTreatment).reduce((sum, x) => sum + x.areaHa, 0);
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
  }, [project, calculatedTreatmentCoeff]);

  const results = useMemo(() => calculateProject(projectForCalc), [projectForCalc]);
  const issues = useMemo(() => validateProject(projectForCalc), [projectForCalc]);
  const sources = sourcesData as SourceRef[];

  return (
    <main className="app-shell">
      <header className="hero no-print">
        <div>
          <span className="eyebrow">СП 32.13330.2018, редакция с изменениями</span>
          <h1><Calculator size={32} /> Калькулятор ливневого стока</h1>
          <p>Расчет годовых объемов, дождевого расхода, объема на очистку, талого стока, производительности очистных сооружений и резервуара.</p>
        </div>
        <button type="button" onClick={() => window.print()}><FileText size={18} /> Печатный лист</button>
      </header>

      <div className="layout no-print">
        <div className="left-column">
          <PlaceSearch value={project.place} onSelect={(place) => setProject({ ...project, place })} />

          <section className="card">
            <h2>Общие данные</h2>
            <label className="field">
              <span className="field-label">Наименование объекта</span>
              <input value={project.objectName} onChange={(e) => setProject({ ...project, objectName: e.target.value })} />
            </label>
            <label className="field">
              <span className="field-label">Общая площадь, га</span>
              <input type="number" step="0.0001" value={project.totalAreaHa} onChange={(e) => setProject({ ...project, totalAreaHa: Number(e.target.value) })} />
            </label>
          </section>

          <SurfaceTable surfaces={project.surfaces} onChange={(surfaces) => setProject({ ...project, surfaces })} />

          <section className="card param-grid">
            <h2>Климатические и технологические параметры</h2>
            <NormativeInput label="Осадки теплого периода hд" value={project.climate.hdWarmPeriodMm} onChange={(hdWarmPeriodMm) => setProject({ ...project, climate: { ...project.climate, hdWarmPeriodMm } })} />
            <NormativeInput label="Осадки холодного периода hт" value={project.climate.htColdPeriodMm} onChange={(htColdPeriodMm) => setProject({ ...project, climate: { ...project.climate, htColdPeriodMm } })} />
            <NormativeInput label="Коэффициент талого стока ψт" value={project.snowMeltCoeff} onChange={(snowMeltCoeff) => setProject({ ...project, snowMeltCoeff })} />
            <label className="field"><span className="field-label">Площадь уборки снега, га</span><input type="number" step="0.0001" value={project.snowCleanedAreaHa} onChange={(e) => setProject({ ...project, snowCleanedAreaHa: Number(e.target.value) })} /></label>
            <label className="field"><span className="field-label">Площадь мойки, га</span><input type="number" step="0.0001" value={project.washingAreaHa} onChange={(e) => setProject({ ...project, washingAreaHa: Number(e.target.value) })} /></label>
            <NormativeInput label="Удельный расход на мойку" value={project.washingRateLPerM2} onChange={(washingRateLPerM2) => setProject({ ...project, washingRateLPerM2 })} />
            <label className="field"><span className="field-label">Количество моек в год</span><input type="number" value={project.washingCountPerYear} onChange={(e) => setProject({ ...project, washingCountPerYear: Number(e.target.value) })} /></label>
            <NormativeInput label="Коэффициент поливомоечного стока" value={project.washingRunoffCoeff} onChange={(washingRunoffCoeff) => setProject({ ...project, washingRunoffCoeff })} />
            <NormativeInput label="Коэффициент неравномерности снеготаяния" value={project.meltUnevennessCoeff} onChange={(meltUnevennessCoeff) => setProject({ ...project, meltUnevennessCoeff })} />
            <NormativeInput label="Слой талого стока hc" value={project.climate.hcMeltTenHourMm} onChange={(hcMeltTenHourMm) => setProject({ ...project, climate: { ...project.climate, hcMeltTenHourMm } })} />
          </section>

          <section className="card param-grid">
            <h2>Дождевой расход и очистка</h2>
            <NormativeInput label="q20" value={project.rainFlow.q20} onChange={(q20) => setProject({ ...project, rainFlow: { ...project.rainFlow, q20 } })} />
            <NormativeInput label="P" value={project.rainFlow.p} onChange={(p) => setProject({ ...project, rainFlow: { ...project.rainFlow, p } })} />
            <NormativeInput label="n" value={project.rainFlow.n} onChange={(n) => setProject({ ...project, rainFlow: { ...project.rainFlow, n } })} />
            <NormativeInput label="mr" value={project.rainFlow.mr} onChange={(mr) => setProject({ ...project, rainFlow: { ...project.rainFlow, mr } })} />
            <NormativeInput label="gamma" value={project.rainFlow.gamma} onChange={(gamma) => setProject({ ...project, rainFlow: { ...project.rainFlow, gamma } })} />
            <NormativeInput label="Zmid" value={project.rainFlow.zMid} onChange={(zMid) => setProject({ ...project, rainFlow: { ...project.rainFlow, zMid } })} />
            <label className="field"><span className="field-label">Длина коллектора, м</span><input type="number" value={project.rainFlow.pipeLengthM} onChange={(e) => setProject({ ...project, rainFlow: { ...project.rainFlow, pipeLengthM: Number(e.target.value) } })} /></label>
            <label className="field"><span className="field-label">Скорость, м/с</span><input type="number" step="0.01" value={project.rainFlow.pipeVelocityMS} onChange={(e) => setProject({ ...project, rainFlow: { ...project.rainFlow, pipeVelocityMS: Number(e.target.value) } })} /></label>
            <NormativeInput label="Слой расчетного дождя ha" value={project.climate.haRainTreatmentMm} onChange={(haRainTreatmentMm) => setProject({ ...project, climate: { ...project.climate, haRainTreatmentMm } })} />
            <label className="field"><span className="field-label">Резервуар, рабочий объем, м³</span><input type="number" value={project.treatment.reservoirWorkingVolumeM3} onChange={(e) => setProject({ ...project, treatment: { ...project.treatment, reservoirWorkingVolumeM3: Number(e.target.value) } })} /></label>
          </section>
        </div>
        <aside className="right-column">
          <ResultsPanel results={results} />
          <ValidationPanel issues={issues} />
        </aside>
      </div>

      <PrintSheet input={projectForCalc} results={results} issues={issues} sources={sources} />
    </main>
  );
}
