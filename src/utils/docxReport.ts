import JSZip from 'jszip';
import type { CalculationResults, ProjectInput, SurfaceItem } from '../types';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatNumber(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return '0';
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(value);
}

function formatTrim(value: number, digits = 4): string {
  if (!Number.isFinite(value)) return '0';
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits
  }).format(value);
}

function round(value: number, digits: number): number {
  const factor = Math.pow(10, digits);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function sumArea(surfaces: SurfaceItem[], predicate: (surface: SurfaceItem) => boolean): number {
  return surfaces.filter(predicate).reduce((sum, surface) => sum + surface.areaHa, 0);
}

function weightedValue(
  surfaces: SurfaceItem[],
  coefficientKey: 'annualRainCoeff' | 'coverCoeff' | 'designRainCoeff',
  predicate: (surface: SurfaceItem) => boolean
): number {
  const selected = surfaces.filter(predicate).filter((surface) => surface.areaHa > 0);
  const area = selected.reduce((sum, surface) => sum + surface.areaHa, 0);
  if (selected.length === 0 || area <= 0) return 0;
  return selected.reduce((sum, surface) => sum + surface[coefficientKey].value * surface.areaHa, 0) / area;
}

function buildReportValues(input: ProjectInput, results: CalculationResults): Record<string, string> {
  const roofAreaHa = sumArea(input.surfaces, (surface) => surface.kind === 'roof' || surface.templateId === 'roof');
  const roofAreaM2 = roofAreaHa * 10000;
  const hardAreaHa = sumArea(input.surfaces, (surface) => surface.isHardSurface);
  const lawnAreaHa = sumArea(input.surfaces, (surface) => surface.kind === 'lawn' || surface.templateId === 'lawn');
  const treatmentAreaHa = input.treatment.rainTreatmentAreaHa > 0 ? input.treatment.rainTreatmentAreaHa : input.totalAreaHa;

  const hardPredicate = (surface: SurfaceItem) => surface.isHardSurface;
  const lawnPredicate = (surface: SurfaceItem) => surface.kind === 'lawn' || surface.templateId === 'lawn';

  const q20 = input.rainFlow.q20.value;
  const n = input.rainFlow.n.value;
  const q5 = Math.pow(4, n) * q20;
  const roofFlow = (roofAreaM2 * q5) / 10000;
  const flowExponentRaw = 1.2 * n - 0.1;

  // Для отчета результат Qr считаем по тем же округленным значениям, которые видны в подстановке.
  // Иначе получается визуальное несоответствие: в строке подстановки стоят округленные числа,
  // а итог Qr берется из точных внутренних значений калькулятора.
  const zmidForReport = round(input.rainFlow.zMid.value, 3);
  const parameterAForReport = round(results.rainFlow.parameterA, 2);
  const rainFlowAreaForReport = round(input.rainFlow.areaHa || treatmentAreaHa, 4);
  const trForReport = round(results.rainFlow.trMin, 1);
  const flowExponentForReport = round(flowExponentRaw, 2);
  const qrForReport = trForReport > 0
    ? (zmidForReport * Math.pow(parameterAForReport, 1.2) * rainFlowAreaForReport) / Math.pow(trForReport, flowExponentForReport)
    : 0;
  const beta = 0.75;
  const qcalForReport = qrForReport * beta;

  return {
    objectName: input.objectName,

    // Важно: это площадь покрытия с типом «Кровли», переведенная из га в м².
    // Например 1,3496 га = 13 496 м². Это не общая площадь объекта.
    roofAreaM2: formatNumber(roofAreaM2, 0),
    q5: formatNumber(q5, 2),
    roofFlow: formatNumber(roofFlow, 2),
    q20: formatTrim(q20, 2),
    n: formatTrim(n, 3),
    nForA: formatTrim(n, 3),

    hardAreaHa: formatTrim(hardAreaHa, 4),
    lawnAreaHa: formatTrim(lawnAreaHa, 4),
    totalAreaHa: formatTrim(input.totalAreaHa, 4),

    hd: formatTrim(input.climate.hdWarmPeriodMm.value, 0),
    ht: formatTrim(input.climate.htColdPeriodMm.value, 0),
    hc: formatTrim(input.climate.hcMeltTenHourMm.value, 0),
    haRainTreatment: formatTrim(input.climate.haRainTreatmentMm.value, 0),

    psiAnnual: formatNumber(results.annual.weightedAnnualRainCoeff, 2),
    psiAnnualHard: formatTrim(weightedValue(input.surfaces, 'annualRainCoeff', hardPredicate), 4),
    psiAnnualLawn: formatTrim(weightedValue(input.surfaces, 'annualRainCoeff', lawnPredicate), 4),
    psiMelt: formatTrim(input.snowMeltCoeff.value, 3),
    ky: formatNumber(results.annual.snowRemovalCoeffKy, 4),
    meltUnevennessCoeff: formatTrim(input.meltUnevennessCoeff.value, 3),

    annualRainVolume: formatNumber(results.annual.annualRainVolumeM3, 2),
    annualMeltVolume: formatNumber(results.annual.annualMeltVolumeM3, 2),
    washingRate: formatTrim(input.washingRateLPerM2.value, 2),
    washingCoeff: formatTrim(input.washingRunoffCoeff.value, 3),
    washingAreaHa: formatTrim(input.washingAreaHa, 4),
    washingCount: formatTrim(input.washingCountPerYear, 0),
    washingVolume: formatNumber(results.annual.washingVolumeM3, 2),
    annualTotalVolume: formatNumber(results.annual.totalAnnualVolumeM3, 2),

    rainTreatmentAreaHa: formatTrim(treatmentAreaHa, 4),
    zCoverHard: formatTrim(weightedValue(input.surfaces, 'coverCoeff', hardPredicate), 4),
    zCoverLawn: formatTrim(weightedValue(input.surfaces, 'coverCoeff', lawnPredicate), 4),
    zmid: formatNumber(zmidForReport, 3),
    psiDesignHard: formatTrim(weightedValue(input.surfaces, 'designRainCoeff', hardPredicate), 4),
    psiDesignLawn: formatTrim(weightedValue(input.surfaces, 'designRainCoeff', lawnPredicate), 4),
    psimid: formatNumber(input.treatment.rainTreatmentCoeff.value, 3),
    dailyRainVolume: formatNumber(results.treatment.rainTreatmentVolumeM3, 2),

    dailyMeltVolume: formatNumber(results.treatment.dailyMeltVolumeM3, 3),
    snowCleanedAreaHa: formatTrim(input.snowCleanedAreaHa, 4),

    parameterA: formatNumber(parameterAForReport, 2),
    rainFlowAreaHa: formatTrim(rainFlowAreaForReport, 4),
    tr: formatNumber(trForReport, 1),
    tp: formatNumber(results.rainFlow.tpMin, 1),
    tcon: formatTrim(input.rainFlow.tConMin.value, 1),
    tcan: formatTrim(input.rainFlow.tCanMin.value, 1),
    flowExponent: formatNumber(flowExponentForReport, 2),
    qr: formatNumber(qrForReport, 2),
    p: formatTrim(input.rainFlow.p.value, 2),
    gamma: formatTrim(input.rainFlow.gamma.value, 2),
    mr: formatTrim(input.rainFlow.mr.value, 0),
    beta: formatTrim(beta, 2),
    qcal: formatNumber(qcalForReport, 2),

    engineerName: 'Иванов И.И',
    reportDate: '00.00.2000'
  };
}

function replaceContentControls(xml: string, values: Record<string, string>): string {
  return xml.replace(/<w:sdt\b[\s\S]*?<\/w:sdt>/g, (block) => {
    const tagMatch = block.match(/<w:tag\s+w:val="([^"]*)"\s*\/>/);
    const aliasMatch = block.match(/<w:alias\s+w:val="([^"]*)"\s*\/>/);
    const key = tagMatch?.[1] || aliasMatch?.[1] || '';
    if (!key || values[key] === undefined) return block;

    const value = escapeXml(values[key]);
    let didReplaceFirstTextNode = false;
    return block.replace(/<w:t(\s[^>]*)?>[\s\S]*?<\/w:t>/g, (textNode, attrs = '') => {
      if (!didReplaceFirstTextNode) {
        didReplaceFirstTextNode = true;
        return `<w:t${attrs}>${value}</w:t>`;
      }
      return `<w:t${attrs}></w:t>`;
    });
  });
}

function replaceKnownPlainPlaceholders(xml: string, values: Record<string, string>): string {
  // Резервная замена на случай, если отдельный маркер случайно оставлен обычным текстом.
  // Основной режим — Content Controls по тегам.
  const safePlainKeys = ['q5', 'lawnAreaHa', 'engineerName', 'reportDate'];
  let nextXml = xml;
  for (const key of safePlainKeys) {
    if (values[key] === undefined) continue;
    const value = escapeXml(values[key]);
    nextXml = nextXml.split(`<w:t>${key}</w:t>`).join(`<w:t>${value}</w:t>`);
    nextXml = nextXml.split(`<w:t xml:space="preserve">${key}</w:t>`).join(`<w:t xml:space="preserve">${value}</w:t>`);
  }
  return nextXml;
}

async function replaceReportValuesInZip(zip: JSZip, values: Record<string, string>) {
  const xmlFiles = Object.keys(zip.files).filter((path) => path.startsWith('word/') && path.endsWith('.xml'));

  await Promise.all(
    xmlFiles.map(async (path) => {
      const file = zip.file(path);
      if (!file) return;
      let xml = await file.async('string');
      xml = replaceContentControls(xml, values);
      xml = replaceKnownPlainPlaceholders(xml, values);
      zip.file(path, xml);
    })
  );
}

export async function downloadDocxReport(input: ProjectInput, results: CalculationResults) {
  const templateUrl = `${import.meta.env.BASE_URL}templates/rain-report-template.docx`;
  const response = await fetch(templateUrl);
  if (!response.ok) {
    throw new Error('Не удалось загрузить шаблон Word-отчета. Проверьте public/templates/rain-report-template.docx');
  }

  const templateBuffer = await response.arrayBuffer();
  const zip = await JSZip.loadAsync(templateBuffer);
  const values = buildReportValues(input, results);
  await replaceReportValuesInZip(zip, values);

  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeObjectName = input.objectName.replace(/[\\/:*?"<>|]+/g, '_').trim() || 'livnevka';
  link.href = url;
  link.download = `Расчет ливневки - ${safeObjectName}.docx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
