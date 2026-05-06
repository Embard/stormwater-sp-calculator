import type { CalculationResults, ProjectInput, SurfaceItem } from '../types';
import { weightedCoefficient } from '../calc/annualRunoff';

function n(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return '0';
  return value.toFixed(digits).replace('.', ',').replace(/,?0+$/, (match) => (match === ',0' || match === ',00' || match === ',0000' ? '' : match));
}

function nFixed(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return '0';
  return value.toFixed(digits).replace('.', ',');
}

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function selectedSurfaces(input: ProjectInput, predicate: (surface: SurfaceItem) => boolean = () => true) {
  return input.surfaces.filter(predicate).filter((surface) => surface.areaHa > 0);
}

function areaExpr(surfaces: SurfaceItem[]) {
  return surfaces.map((surface) => `${nFixed(surface.areaHa, 4)}`).join(' + ') || '0';
}

function weightedExpr(surfaces: SurfaceItem[], key: 'annualRainCoeff' | 'coverCoeff' | 'designRainCoeff') {
  const total = surfaces.reduce((sum, surface) => sum + surface.areaHa, 0);
  const numerator = surfaces.map((surface) => `${n(surface[key].value, 4)}×${nFixed(surface.areaHa, 4)}`).join(' + ') || '0';
  const result = total > 0 ? weightedCoefficient(surfaces, key) : 0;
  return `(${numerator})/${nFixed(total, 4)} = ${n(result, 4)}`;
}

function buildReportHtml(input: ProjectInput, results: CalculationResults): string {
  const allSurfaces = selectedSurfaces(input);
  const treatmentSurfaces = selectedSurfaces(input, (surface) => surface.routedToTreatment);
  const washedSurfaces = selectedSurfaces(input, (surface) => surface.isWashed);
  const snowSurfaces = selectedSurfaces(input, (surface) => surface.isCleanedFromSnow);
  const psiAnnual = results.annual.weightedAnnualRainCoeff;
  const psiTreatment = input.treatment.rainTreatmentCoeff.value;
  const zMid = input.rainFlow.zMid.value;
  const qRain = results.annual.annualRainVolumeM3;
  const qMelt = results.annual.annualMeltVolumeM3;
  const qWash = results.annual.washingVolumeM3;
  const qTotal = results.annual.totalAnnualVolumeM3;
  const ha = input.climate.haRainTreatmentMm.value;
  const dailyRain = results.treatment.rainTreatmentVolumeM3;
  const dailyMelt = results.treatment.dailyMeltVolumeM3;
  const tr = results.rainFlow.trMin;
  const tp = results.rainFlow.tpMin;
  const A = results.rainFlow.parameterA;
  const qr = results.rainFlow.qrLS;

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Расчет ливневой канализации</title>
<style>
  @page { margin: 20mm 18mm 18mm 20mm; }
  body { font-family: 'Times New Roman', serif; font-size: 12pt; color: #000; line-height: 1.25; }
  p { margin: 0 0 8pt 0; }
  .header { font-size: 10.5pt; margin-bottom: 12pt; }
  .title { font-weight: bold; text-align: center; margin: 12pt 0; }
  .formula { margin: 4pt 0 8pt 24pt; }
  .small { font-size: 10pt; }
  table { border-collapse: collapse; width: 100%; margin: 8pt 0 10pt 0; }
  td, th { border: 1px solid #000; padding: 3pt 5pt; vertical-align: top; }
  th { font-weight: bold; text-align: center; }
  .right { text-align: right; }
</style>
</head>
<body>
  <div class="header">
    <p>Акционерное общество проектная компания «Эффект» ИНН 9701256261 КПП 770101001</p>
    <p>101000, г. Москва, муниципальный округ Басманный, б-р Чистопрудный, д.13, стр.1, помещ.1/1</p>
    <p>тел./факс: +7(3952)500-171, e-mail: info@pk-effect.ru</p>
  </div>

  <p class="title">Предварительный расчет нагрузок на ливневую канализацию. Объект: "${esc(input.objectName)}"</p>
  <p><strong>Местоположение:</strong> ${esc(input.place.name)}, ${esc(input.place.region)}${input.place.district ? `, ${esc(input.place.district)}` : ''}.</p>

  <p>Площади покрытий:</p>
  <table>
    <thead>
      <tr><th>Вид поверхности</th><th>Площадь, га</th><th>ψд</th><th>Zi</th><th>Ψi</th></tr>
    </thead>
    <tbody>
      ${allSurfaces.map((surface) => `<tr><td>${esc(surface.name)}</td><td class="right">${nFixed(surface.areaHa, 4)}</td><td class="right">${n(surface.annualRainCoeff.value, 4)}</td><td class="right">${n(surface.coverCoeff.value, 4)}</td><td class="right">${n(surface.designRainCoeff.value, 4)}</td></tr>`).join('')}
      <tr><td><strong>Итого</strong></td><td class="right"><strong>${nFixed(input.totalAreaHa, 4)}</strong></td><td></td><td></td><td></td></tr>
    </tbody>
  </table>

  <p>Среднегодовой объём дождевых Wд, талых Wт и поливомоечных Wм вод определяется по формулам:</p>
  <p class="formula">Wд = 10 × hд × Ψд × F = 10 × ${n(input.climate.hdWarmPeriodMm.value, 0)} × ${n(psiAnnual, 4)} × ${nFixed(input.totalAreaHa, 4)} = ${n(qRain, 2)} м³/год;</p>
  <p class="formula">Wт = 10 × hт × Ψт × Ky × F = 10 × ${n(input.climate.htColdPeriodMm.value, 0)} × ${n(input.snowMeltCoeff.value, 2)} × ${n(results.annual.snowRemovalCoeffKy, 4)} × ${nFixed(input.totalAreaHa, 4)} = ${n(qMelt, 2)} м³/год;</p>
  <p class="formula">Wм = 10 × m × k × Fм × Ψм = 10 × ${n(input.washingRateLPerM2.value, 2)} × ${n(input.washingCountPerYear, 0)} × ${nFixed(input.washingAreaHa, 4)} × ${n(input.washingRunoffCoeff.value, 2)} = ${n(qWash, 2)} м³/год.</p>

  <p>hд — слой осадков за теплый период года, ${n(input.climate.hdWarmPeriodMm.value, 0)} мм; hт — слой осадков за холодный период года, ${n(input.climate.htColdPeriodMm.value, 0)} мм.</p>
  <p>Ψд определен как средневзвешенная величина для всей площади стока:</p>
  <p class="formula">Ψд = ${weightedExpr(allSurfaces, 'annualRainCoeff')}</p>
  <p>Коэффициент учета уборки снега:</p>
  <p class="formula">Ky = 1 − Fсн/F = 1 − ${nFixed(snowSurfaces.reduce((sum, item) => sum + item.areaHa, 0), 4)}/${nFixed(input.totalAreaHa, 4)} = ${n(results.annual.snowRemovalCoeffKy, 4)}.</p>
  <p>Средний годовой объем поверхностных сточных вод:</p>
  <p class="formula">Wг = Wд + Wт + Wм = ${n(qRain, 2)} + ${n(qMelt, 2)} + ${n(qWash, 2)} = ${n(qTotal, 2)} м³/год.</p>

  <p>Объем дождевого стока от расчетного дождя, направляемого на очистку:</p>
  <p class="formula">Wд.оч = 10 × hа × Fоч × Ψmid = 10 × ${n(ha, 0)} × ${nFixed(input.treatment.rainTreatmentAreaHa, 4)} × ${n(psiTreatment, 4)} = ${n(dailyRain, 2)} м³.</p>
  <p>Ψmid для площади, направляемой на очистку:</p>
  <p class="formula">Ψmid = ${weightedExpr(treatmentSurfaces, 'designRainCoeff')}</p>
  <p>Zmid для расчета дождевого расхода:</p>
  <p class="formula">Zmid = ${weightedExpr(treatmentSurfaces, 'coverCoeff')}</p>

  <p>Максимальный суточный объем талых вод:</p>
  <p class="formula">Wт.сут = 10 × Ψт × Ky × F × hc × Kн = 10 × ${n(input.snowMeltCoeff.value, 2)} × ${n(results.annual.snowRemovalCoeffKy, 4)} × ${nFixed(input.totalAreaHa, 4)} × ${n(input.climate.hcMeltTenHourMm.value, 0)} × ${n(input.meltUnevennessCoeff.value, 2)} = ${n(dailyMelt, 2)} м³/сут.</p>

  <p>Расходы воды в коллекторах дождевой канализации Qr, л/с, определяются методом предельных интенсивностей:</p>
  <p class="formula">A = q20 × 20ⁿ × (1 + lgP / lgmr)^γ = ${n(input.rainFlow.q20.value, 2)} × 20<sup>${n(input.rainFlow.n.value, 2)}</sup> × (1 + lg${n(input.rainFlow.p.value, 2)} / lg${n(input.rainFlow.mr.value, 0)})<sup>${n(input.rainFlow.gamma.value, 2)}</sup> = ${n(A, 2)}.</p>
  <p class="formula">tr = tcon + tcan + tp = ${n(input.rainFlow.tConMin.value, 2)} + ${n(input.rainFlow.tCanMin.value, 2)} + ${n(tp, 2)} = ${n(tr, 2)} мин.</p>
  <p class="formula">Qr = Zmid × A<sup>1,2</sup> × F / tr<sup>1,2n−0,1</sup> = ${n(zMid, 4)} × ${n(A, 2)}<sup>1,2</sup> × ${nFixed(input.rainFlow.areaHa, 4)} / ${n(tr, 2)}<sup>${n(1.2 * input.rainFlow.n.value - 0.1, 3)}</sup> = ${n(qr, qr > 10 ? 1 : 2)} л/с.</p>

  <p>К подбору очистных сооружений принимается больший расход: дождевой или талый.</p>
  <p class="formula">Qоч = ${n(results.treatment.selectedTreatmentCapacityM3PerH, 2)} м³/ч.</p>
  <p>Требуемый полный гидравлический объем резервуара:</p>
  <p class="formula">Vполн = max(Wд.оч, Wт.сут) × (1 + запас/100) = ${n(results.treatment.requiredReservoirFullVolumeM3, 2)} м³.</p>

  <p class="small">Округление выполнено после расчета, а не на промежуточных шагах.</p>
</body>
</html>`;
}

export function downloadWordReport(input: ProjectInput, results: CalculationResults) {
  const html = buildReportHtml(input, results);
  const blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' });
  const link = document.createElement('a');
  const safeName = input.objectName.replace(/[\\/:*?"<>|]+/g, '_').trim() || 'raschet-livnevki';
  link.href = URL.createObjectURL(blob);
  link.download = `${safeName}.doc`;
  document.body.appendChild(link);
  link.click();
  URL.revokeObjectURL(link.href);
  link.remove();
}
