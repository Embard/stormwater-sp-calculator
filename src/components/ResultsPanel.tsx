import type { CalculationResults } from '../types';
import { formatNumber, roundCoeff, roundFlowLS, roundVolume } from '../utils/rounding';

type Props = {
  results: CalculationResults;
};

type MetricProps = {
  label: string;
  value: string;
  primary?: boolean;
};

function Metric({ label, value, primary = false }: MetricProps) {
  return (
    <div className={`metric ${primary ? 'primary' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function ResultsPanel({ results }: Props) {
  const rainFlowDigits = results.rainFlow.qrLS > 10 ? 1 : 2;

  return (
    <section className="card accent-card" id="results">
      <div className="section-head compact-head">
        <div>
          <h2>Результаты</h2>
          <p className="section-subtitle">Ключевые расчетные показатели</p>
        </div>
      </div>

      <div className="metric-grid main-metrics">
        <Metric label="Итого годовой объем" value={`${formatNumber(roundVolume(results.annual.totalAnnualVolumeM3, true), 0)} м³/год`} primary />
        <Metric label="Расход дождевых вод" value={`${formatNumber(roundFlowLS(results.rainFlow.qrLS), rainFlowDigits)} л/с`} primary />
        <Metric label="Средневзвешенный ψд" value={`${roundCoeff(results.annual.weightedAnnualRainCoeff)}`} />
        <Metric label="Ky уборки снега" value={`${roundCoeff(results.annual.snowRemovalCoeffKy)}`} />
        <Metric label="Дождевой сток" value={`${formatNumber(roundVolume(results.annual.annualRainVolumeM3, true), 0)} м³/год`} />
        <Metric label="Талый сток" value={`${formatNumber(roundVolume(results.annual.annualMeltVolumeM3, true), 0)} м³/год`} />
      </div>

      <details className="details-panel">
        <summary>Подробные результаты</summary>
        <div className="metric-grid detail-metrics">
          <Metric label="Поливомоечные воды" value={`${formatNumber(roundVolume(results.annual.washingVolumeM3, true), 0)} м³/год`} />
          <Metric label="Продолжительность дождя" value={`${formatNumber(results.rainFlow.trMin, 2)} мин`} />
          <Metric label="Время протекания tp" value={`${formatNumber(results.rainFlow.tpMin, 2)} мин`} />
          <Metric label="Параметр A" value={`${formatNumber(results.rainFlow.parameterA, 2)}`} />
          <Metric label="Объем дождя на очистку" value={`${formatNumber(roundVolume(results.treatment.rainTreatmentVolumeM3), 1)} м³`} />
          <Metric label="Суточный талый сток" value={`${formatNumber(roundVolume(results.treatment.dailyMeltVolumeM3), 1)} м³/сут`} />
          <Metric label="Остаток талого стока за сутки" value={`${formatNumber(roundVolume(results.treatment.meltResidualPerDayM3), 1)} м³`} />
          <Metric label="Рабочий объем по талому стоку" value={`${formatNumber(roundVolume(results.treatment.requiredMeltWorkingVolumeM3), 1)} м³`} />
          <Metric label="Расчетный рабочий объем резервуара" value={`${formatNumber(roundVolume(results.treatment.requiredReservoirWorkingVolumeM3), 1)} м³`} />
          <Metric label="Производительность очистных" value={`${formatNumber(results.treatment.selectedTreatmentCapacityM3PerH, 2)} м³/ч`} />
          <Metric label="Полный объем резервуара" value={`${formatNumber(roundVolume(results.treatment.requiredReservoirFullVolumeM3), 1)} м³`} />
        </div>
      </details>
    </section>
  );
}
