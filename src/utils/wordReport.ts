import type { CalculationResults, ProjectInput, SurfaceItem } from '../types';
import { weightedCoefficient } from '../calc/annualRunoff';

function n(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return '0';
  return value
    .toFixed(digits)
    .replace('.', ',')
    .replace(/,(0+)$/, '')
    .replace(/(,\d*?)0+$/, '$1')
    .replace(/,$/, '');
}

function nFixed(value: number, digits = 4): string {
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

function sumArea(surfaces: SurfaceItem[]) {
  return surfaces.reduce((sum, surface) => sum + surface.areaHa, 0);
}

function coeffExpr(surfaces: SurfaceItem[], key: 'annualRainCoeff' | 'coverCoeff' | 'designRainCoeff', totalArea?: number) {
  const area = totalArea ?? sumArea(surfaces);
  if (area <= 0) return '0';
  const numerator = surfaces
    .map((surface) => `${n(surface[key].value, 4)}*${nFixed(surface.areaHa, 4)}`)
    .join('+');
  const result = weightedCoefficient(surfaces, key);
  return `(${numerator})/${nFixed(area, 4)}=${n(result, 4)}`;
}

function surfaceAreaLine(input: ProjectInput) {
  const hardArea = sumArea(selectedSurfaces(input, (surface) => surface.isHardSurface));
  const lawnArea = sumArea(selectedSurfaces(input, (surface) => surface.kind === 'lawn'));
  const otherArea = input.totalAreaHa - hardArea - lawnArea;
  const parts = [`Fтв.покр =${nFixed(hardArea, 4)} га`];
  if (lawnArea > 0) parts.push(`F газона = ${nFixed(lawnArea, 4)} га`);
  if (Math.abs(otherArea) > 0.0001) parts.push(`F проч. = ${nFixed(otherArea, 4)} га`);
  parts.push(`Fобщ=${nFixed(input.totalAreaHa, 4)} га`);
  return parts.join(', ');
}

function roofBlock(input: ProjectInput) {
  const roofs = selectedSurfaces(input, (surface) => surface.kind === 'roof');
  const roofAreaM2 = sumArea(roofs) * 10000;
  if (roofAreaM2 <= 0) return '';

  const q20 = input.rainFlow.q20.value;
  const rainN = input.rainFlow.n.value;
  const q5 = Math.pow(4, rainN) * q20;
  const q = roofAreaM2 * q5 / 10000;

  return `
<p>Расчётный расход с кровли зданий определён в соответствии с п.21.10 СП 30.13330.2020, и составляет:</p>
<p>Q = F×q5/10000 = ${n(roofAreaM2, 3)} × ${n(q5, 2)}/10000 = ${n(q, 2)} л/с, q5 = 4<sup>n</sup> × q20 = ${n(Math.pow(4, rainN), 2)} × ${n(q20, 2)} = ${n(q5, 2)} л/с, с 1 га,</p>
<p>где q20 = ${n(q20, 2)} л/с, с 1 га (согласно СП 32.13330.2018),</p>
<p>n = ${n(rainN, 2)}</p>
<p>F – площадь кровли (общая), ${n(roofAreaM2, 3)} м<sup>2</sup></p>
`;
}

function buildReportHtml(input: ProjectInput, results: CalculationResults): string {
  const allSurfaces = selectedSurfaces(input);
  const treatmentSurfaces = selectedSurfaces(input, (surface) => surface.routedToTreatment);
  const snowSurfaces = selectedSurfaces(input, (surface) => surface.isCleanedFromSnow);
  const psiAnnual = results.annual.weightedAnnualRainCoeff;
  const annualRain = results.annual.annualRainVolumeM3;
  const annualMelt = results.annual.annualMeltVolumeM3;
  const annualWash = results.annual.washingVolumeM3;
  const annualTotal = results.annual.totalAnnualVolumeM3;
  const dailyRain = results.treatment.rainTreatmentVolumeM3;
  const dailyMelt = results.treatment.dailyMeltVolumeM3;
  const meltResidual = results.treatment.meltResidualPerDayM3;
  const meltWorkingVolume = results.treatment.requiredMeltWorkingVolumeM3;
  const reservoirWorkingVolume = results.treatment.requiredReservoirWorkingVolumeM3;
  const reservoirFullVolume = results.treatment.requiredReservoirFullVolumeM3;
  const tr = results.rainFlow.trMin;
  const tp = results.rainFlow.tpMin;
  const A = results.rainFlow.parameterA;
  const qr = results.rainFlow.qrLS;
  const exponent = 1.2 * input.rainFlow.n.value - 0.1;
  const snowArea = sumArea(snowSurfaces);
  const today = new Date().toLocaleDateString('ru-RU');

  return `<!doctype html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>Расчетный расход ливневки</title>
<style>
  @page WordSection1 { size: 21cm 29.7cm; margin: 13mm 15mm 12mm 15mm; }
  div.WordSection1 { page: WordSection1; }
  body { font-family: "Times New Roman", Times, serif; font-size: 12pt; color: #000; line-height: 1.0; }
  p { margin: 0 0 2pt 0; padding: 0; font-family: "Times New Roman", Times, serif; font-size: 12pt; line-height: 1.0; }
  table.header { width: 100%; border-collapse: collapse; margin-bottom: 10pt; }
  table.header td { border: none; vertical-align: top; padding: 0; }
  .logo { font-family: Arial, sans-serif; font-size: 46pt; line-height: 46pt; font-weight: 400; }
  .company { text-align: right; font-size: 8.5pt; line-height: 1.05; }
  .title { text-align: center; margin: 4pt 0 8pt 0; }
  .center { text-align: center; }
  .right { text-align: right; }
  .formula { margin-top: 2pt; margin-bottom: 2pt; }
  .formula-block { text-align: center; margin: 3pt 0; }
  .signature-table { width: 100%; border-collapse: collapse; margin-top: 34pt; }
  .signature-table td { border: none; padding: 0; font-family: "Times New Roman", Times, serif; font-size: 12pt; }
  sup, sub { font-size: 9pt; }
</style>
</head>
<body>
<div class="WordSection1">
  <table class="header">
    <tr>
      <td style="width: 38%;"><div class="logo">Эффект</div></td>
      <td style="width: 62%;" class="company">
        Акционерное общество<br>
        проектная компания «Эффект»<br>
        ИНН 9701256261 КПП 770101001<br>
        101000, г. Москва, муниципальный округ Басманный,<br>
        б-р Чистопрудный, д.13, стр.1, помещ.1/1<br>
        тел./факс: +7(3952)500-171, e-mail: info@pk-effect.ru
      </td>
    </tr>
  </table>

  <p class="title">Предварительный расчет нагрузок на ливневую канализацию.<br>Объект: &quot;${esc(input.objectName)}&quot;</p>

  ${roofBlock(input)}

  <p>${surfaceAreaLine(input)} Среднегодовой объём дождевых Wд и талых вод Wт определяется по формулам:</p>
  <p class="formula">Wд = 10*hд*Ψд*F=10*${n(input.climate.hdWarmPeriodMm.value, 0)}*${n(psiAnnual, 2)}*${nFixed(input.totalAreaHa, 4)}=${n(annualRain, 2)} м<sup>3</sup>/год;</p>
  <p class="formula">Wт = 10*hт*Ψт*Ky*F=10*${n(input.climate.htColdPeriodMm.value, 0)}*${n(input.snowMeltCoeff.value, 2)}*${n(results.annual.snowRemovalCoeffKy, 4)}*${nFixed(input.totalAreaHa, 4)}=${n(annualMelt, 2)} м<sup>3</sup>/год;</p>
  ${annualWash > 0 ? `<p class="formula">Wм = 10*qм*nм*Fм*Ψм=10*${n(input.washingRateLPerM2.value, 2)}*${n(input.washingCountPerYear, 0)}*${nFixed(input.washingAreaHa, 4)}*${n(input.washingRunoffCoeff.value, 2)}=${n(annualWash, 2)} м<sup>3</sup>/год;</p>` : ''}
  <p>hд – слой осадков, мм, за теплый период года, ${n(input.climate.hdWarmPeriodMm.value, 0)} мм (определяется по табл. 4.1 СП 131.13330.2020 «Строительная климатология»);</p>
  <p>hт - слой осадков, мм, за холодный период года (общее годовое количество талых вод), ${n(input.climate.htColdPeriodMm.value, 0)} мм (определяется по табл. 3.1 СП 131.13330.2020 «Строительная климатология»);</p>
  <p>Ψд и Ψт – общий коэффициент стока дождевых и талых вод соответственно.</p>
  <p>Величина Ψд определена как средневзвешенная величина для всей площади стока:</p>
  <p>Ψд=${coeffExpr(allSurfaces, 'annualRainCoeff', input.totalAreaHa)}</p>
  <p>Величина коэффициента стока талых вод Ψт принята равной ${n(input.snowMeltCoeff.value, 2)}.</p>
  <p>Ку = 1 - Fсн/F = 1 - ${nFixed(snowArea, 4)}/${nFixed(input.totalAreaHa, 4)} = ${n(results.annual.snowRemovalCoeffKy, 4)}</p>
  <p>Средний годовой объём Wг поверхностных сточных вод с площадки проектируемого объекта составит:</p>
  <p class="center">Wг = Wд + Wт${annualWash > 0 ? ' + Wм' : ''} = ${n(annualTotal, 2)} м<sup>3</sup>/год.</p>
  <p class="center">Wд.сут. = 10 hа F Ψmid</p>
  <p class="center">Zmid = ${coeffExpr(treatmentSurfaces, 'coverCoeff', input.treatment.rainTreatmentAreaHa)}</p>
  <p class="center">Ψmid = ${coeffExpr(treatmentSurfaces, 'designRainCoeff', input.treatment.rainTreatmentAreaHa)}</p>
  <p class="center">Максимальный суточный объем дождевых вод</p>
  <p class="center">Wд.сут. = ${n(dailyRain, 2)} м<sup>3</sup>/сут</p>
  <p>Максимальный суточный объем талых вод Wт.сут, м<sup>3</sup>,</p>
  <p>Wт.сут =10 ΨтKу F hc Kн=${n(dailyMelt, 3)} м<sup>3</sup>/сут.</p>
  <p>При периоде переработки талого стока Tт=${n(input.treatment.meltProcessingHours, 0)} ч и количестве расчетных суток снеготаяния N=${n(input.treatment.meltConsecutiveDays, 0)} остаток талого стока за сутки составляет ${n(meltResidual, 2)} м<sup>3</sup>, расчетный рабочий объем по талому стоку составляет ${n(meltWorkingVolume, 2)} м<sup>3</sup>.</p>
  <p>Расчетный рабочий объем аккумулирующего резервуара принимается по большей величине: Vраб=max(Wд.сут, Vт.раб)=${n(reservoirWorkingVolume, 2)} м<sup>3</sup>; полный объем с запасом ${n(input.treatment.reservoirReservePercent.value, 0)}% составляет ${n(reservoirFullVolume, 2)} м<sup>3</sup>.</p>
  <p>Расходы воды в коллекторах дождевой канализации, Qr , л/с, отводящих сточные воды с селитебных территорий определяется методом предельных интенсивностей:</p>

  <p class="formula-block">Qr =</p>
  <p class="formula-block">Zmid ∙ A ∙ F / t<sub>r</sub><sup>${n(exponent, 2)}</sup> =</p>
  <p class="formula-block">${n(input.rainFlow.zMid.value, 4)} ∙ ${n(A, 2)} ∙ ${nFixed(input.rainFlow.areaHa, 4)} / (${n(tr, 2)})<sup>${n(exponent, 2)}</sup> = ${n(qr, qr > 10 ? 1 : 2)} л/с</p>

  <p class="formula-block">lgP&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;γ&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; lg${n(input.rainFlow.p.value, 2)}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${n(input.rainFlow.gamma.value, 2)}</p>
  <p>А = q20 ∙ 20<sup>n</sup> ∙ (1 + -------- ) = ${n(input.rainFlow.q20.value, 2)} ∙ 20<sup>${n(input.rainFlow.n.value, 2)}</sup> ∙ (1 + -------- ) = ${n(A, 2)}</p>
  <p class="center">lgmr&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;lg${n(input.rainFlow.mr.value, 0)}</p>
  <p>tr=tcon+tcan+tp=${n(input.rainFlow.tConMin.value, 2)}+${n(input.rainFlow.tCanMin.value, 2)}+${n(tp, 2)}=${n(tr, 2)} мин</p>

  <table class="signature-table">
    <tr>
      <td style="width: 33%;">Инженер ВК</td>
      <td style="width: 34%; text-align:center;">Ахметзянова В.Я</td>
      <td style="width: 33%; text-align:right;">${today} г.</td>
    </tr>
  </table>
</div>
</body>
</html>`;
}

export function downloadWordReport(input: ProjectInput, results: CalculationResults) {
  const html = buildReportHtml(input, results);
  const blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'Расчётный расход ливневки.doc';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
