import type { ReactNode } from 'react';
import type { CalculationResults } from '../types';
import { formatNumber, roundCoeff, roundFlowLS, roundVolume } from '../utils/rounding';

type Props = {
  results: CalculationResults;
};

type MetricProps = {
  label: string;
  value: ReactNode;
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
  return (
    <section className="card accent-card">
      <h2>Результаты</h2>

      <div className="metric-grid main-metrics">
        <Metric
          primary
          label="Расход дождевых вод Qr"
          value={`${formatNumber(roundFlowLS(results.rainFlow.qrLS), results.rainFlow.qrLS > 10 ? 1 : 2)} л/с`}
        />
        <Metric
          primary
          label="Очистные сооружения"
          value={`${formatNumber(results.treatment.selectedTreatmentCapacityM3PerH, 2)} м³/ч`}
        />
        <Metric
          primary
          label="Рабочий объем резервуара"
          value={`${formatNumber(roundVolume(results.treatment.requiredReservoirWorkingVolumeM3), 1)} м³`}
        />
        <Metric
          primary
          label="Полный объем резервуара"
          value={`${formatNumber(roundVolume(results.treatment.requiredReservoirFullVolumeM3), 1)} м³`}
        />
      </div>

      <details className="details-panel">
        <summary>Показать подробные результаты</summary>
        <div className="metric-grid detail-metrics">
          <Metric label="Средневзвешенный ψд для Wд" value={roundCoeff(results.annual.weightedAnnualRainCoeff)} />
          <Metric label="Ку уборки снега" value={roundCoeff(results.annual.snowRemovalCoeffKy)} />
          <Metric label="Дождевой сток" value={`${formatNumber(roundVolume(results.annual.annualRainVolumeM3, true), 0)} м³/год`} />
          <Metric label="Талый сток" value={`${formatNumber(roundVolume(results.annual.annualMeltVolumeM3, true), 0)} м³/год`} />
          <Metric label="Поливомоечные воды" value={`${formatNumber(roundVolume(results.annual.washingVolumeM3, true), 0)} м³/год`} />
          <Metric label="Итого годовой объем" value={`${formatNumber(roundVolume(results.annual.totalAnnualVolumeM3, true), 0)} м³/год`} />
          <Metric label="Расчетная продолжительность дождя" value={`${formatNumber(results.rainFlow.trMin, 2)} мин`} />
          <Metric label="Wд.сут на очистку" value={`${formatNumber(roundVolume(results.treatment.rainTreatmentVolumeM3), 1)} м³`} />
          <Metric label="Суточный объем талых вод" value={`${formatNumber(roundVolume(results.treatment.dailyMeltVolumeM3), 1)} м³/сут`} />
          <Metric label="Производительность по дождю" value={`${formatNumber(results.treatment.rainTreatmentCapacityM3PerH, 2)} м³/ч`} />
          <Metric label="Производительность по талому стоку" value={`${formatNumber(results.treatment.meltTreatmentCapacityM3PerH, 2)} м³/ч`} />
          <Metric label="Расчетный случай резервуара" value={results.treatment.reservoirControlCase === 'rain' ? 'дождевой сток' : 'талый сток'} />
        </div>
      </details>
    </section>
  );
}
