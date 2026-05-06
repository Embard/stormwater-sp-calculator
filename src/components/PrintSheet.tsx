import type { CalculationResults, ProjectInput, SourceRef, ValidationIssue } from '../types';
import { formatNumber, roundCoeff, roundFlowLS, roundVolume } from '../utils/rounding';

type Props = {
  input: ProjectInput;
  results: CalculationResults;
  issues: ValidationIssue[];
  sources: SourceRef[];
};

export function PrintSheet({ input, results, issues, sources }: Props) {
  return (
    <section className="print-sheet card">
      <div className="print-actions no-print">
        <button type="button" onClick={() => window.print()}>Печать расчетного листа</button>
      </div>

      <h1>Расчет поверхностного стока</h1>
      <p><strong>Объект:</strong> {input.objectName}</p>
      <p><strong>Местоположение:</strong> {input.place.name}, {input.place.region}</p>

      <h2>1. Исходные данные</h2>
      <table>
        <tbody>
          <tr><td>Расчетная площадь</td><td>{formatNumber(input.totalAreaHa, 4)} га</td></tr>
          <tr><td>Осадки теплого периода</td><td>{input.climate.hdWarmPeriodMm.value} мм</td></tr>
          <tr><td>Осадки холодного периода</td><td>{input.climate.htColdPeriodMm.value} мм</td></tr>
          <tr><td>Слой талого стока за 10 дневных часов</td><td>{input.climate.hcMeltTenHourMm.value} мм</td></tr>
          <tr><td>Площадь уборки снега</td><td>{formatNumber(input.snowCleanedAreaHa, 4)} га</td></tr>
        </tbody>
      </table>

      <h2>2. Таблица покрытий</h2>
      <table>
        <thead><tr><th>Покрытие</th><th>Площадь, га</th><th>Годовой ψ</th><th>Расчетный ψ</th></tr></thead>
        <tbody>
          {input.surfaces.map((s) => (
            <tr key={s.id}>
              <td>{s.name}</td>
              <td>{formatNumber(s.areaHa, 4)}</td>
              <td>{roundCoeff(s.annualRainCoeff.value)}</td>
              <td>{roundCoeff(s.designRainCoeff.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>3. Годовые объемы</h2>
      <p>Средневзвешенный коэффициент дождевого стока ψ = {roundCoeff(results.annual.weightedAnnualRainCoeff)}.</p>
      <p>Годовой объем дождевого стока: Wд = 10 × hд × F × ψ = {formatNumber(roundVolume(results.annual.annualRainVolumeM3, true), 0)} м³/год.</p>
      <p>Коэффициент учета уборки снега Ky = 1 − Fуб / F = {roundCoeff(results.annual.snowRemovalCoeffKy)}.</p>
      <p>Годовой объем талого стока: Wт = 10 × hт × F × ψт × Ky = {formatNumber(roundVolume(results.annual.annualMeltVolumeM3, true), 0)} м³/год.</p>
      <p>Поливомоечные воды: Wм = 10 × qм × n × Fм × ψм = {formatNumber(roundVolume(results.annual.washingVolumeM3, true), 0)} м³/год.</p>
      <p><strong>Итого:</strong> {formatNumber(roundVolume(results.annual.totalAnnualVolumeM3, true), 0)} м³/год.</p>

      <h2>4. Расход дождевых вод в коллекторе</h2>
      <p>Расчетная продолжительность дождя: tr = tcon + tcan + tp = {formatNumber(results.rainFlow.trMin, 2)} мин.</p>
      <p>Параметр A = {formatNumber(results.rainFlow.parameterA, 2)}.</p>
      <p>Расход Qr = {formatNumber(roundFlowLS(results.rainFlow.qrLS), results.rainFlow.qrLS > 10 ? 1 : 2)} л/с.</p>

      <h2>5. Очистные сооружения и резервуар</h2>
      <p>Объем дождевого стока на очистку: {formatNumber(roundVolume(results.treatment.rainTreatmentVolumeM3), 1)} м³.</p>
      <p>Суточный объем талого стока: {formatNumber(roundVolume(results.treatment.dailyMeltVolumeM3), 1)} м³/сут.</p>
      <p>К подбору очистных сооружений: {formatNumber(results.treatment.selectedTreatmentCapacityM3PerH, 2)} м³/ч.</p>
      <p>Требуемый полный гидравлический объем резервуара: {formatNumber(roundVolume(results.treatment.requiredReservoirFullVolumeM3), 1)} м³.</p>

      <h2>6. Предупреждения и допущения</h2>
      {issues.length === 0 ? <p>Предупреждений нет.</p> : (
        <ul>
          {issues.map((issue) => <li key={issue.id}><strong>{issue.severity}:</strong> {issue.title}. {issue.message}</li>)}
        </ul>
      )}

      <h2>7. Источники</h2>
      <ol>
        {sources.map((source) => (
          <li key={source.id}>{source.title}. {source.revision}. Дата проверки: {source.checkedAt}. {source.note}</li>
        ))}
      </ol>

      <p className="rounding-note">Округление выполнено после расчета, а не на промежуточных шагах.</p>
    </section>
  );
}
