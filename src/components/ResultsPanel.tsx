import type { CalculationResults } from '../types';
import { formatNumber, roundCoeff, roundFlowLS, roundVolume } from '../utils/rounding';

type Props = {
  results: CalculationResults;
};

export function ResultsPanel({ results }: Props) {
  return (
    <section className="card accent-card">
      <h2>Результаты</h2>
      <div className="result-grid">
        <div><span>Средневзвешенный ψд для Wд</span><strong>{roundCoeff(results.annual.weightedAnnualRainCoeff)}</strong></div>
        <div><span>Ky уборки снега</span><strong>{roundCoeff(results.annual.snowRemovalCoeffKy)}</strong></div>
        <div><span>Дождевой сток</span><strong>{formatNumber(roundVolume(results.annual.annualRainVolumeM3, true), 0)} м³/год</strong></div>
        <div><span>Талый сток</span><strong>{formatNumber(roundVolume(results.annual.annualMeltVolumeM3, true), 0)} м³/год</strong></div>
        <div><span>Поливомоечные воды</span><strong>{formatNumber(roundVolume(results.annual.washingVolumeM3, true), 0)} м³/год</strong></div>
        <div><span>Итого годовой объем</span><strong>{formatNumber(roundVolume(results.annual.totalAnnualVolumeM3, true), 0)} м³/год</strong></div>
        <div><span>Расчетная продолжительность дождя</span><strong>{formatNumber(results.rainFlow.trMin, 2)} мин</strong></div>
        <div><span>Расход дождевых вод</span><strong>{formatNumber(roundFlowLS(results.rainFlow.qrLS), results.rainFlow.qrLS > 10 ? 1 : 2)} л/с</strong></div>
        <div><span>Wд.сут на очистку</span><strong>{formatNumber(roundVolume(results.treatment.rainTreatmentVolumeM3), 1)} м³</strong></div>
        <div><span>Суточный объем талых вод</span><strong>{formatNumber(roundVolume(results.treatment.dailyMeltVolumeM3), 1)} м³/сут</strong></div>
        <div><span>Производительность очистных</span><strong>{formatNumber(results.treatment.selectedTreatmentCapacityM3PerH, 2)} м³/ч</strong></div>
        <div><span>Полный объем резервуара</span><strong>{formatNumber(roundVolume(results.treatment.requiredReservoirFullVolumeM3), 1)} м³</strong></div>
      </div>
    </section>
  );
}
