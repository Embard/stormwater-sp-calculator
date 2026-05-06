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

function sumArea(surfaces: SurfaceItem[], predicate: (surface: SurfaceItem) => boolean): number {
  return surfaces.filter(predicate).reduce((sum, surface) => sum + surface.areaHa, 0);
}

function coefficientExpression(
  surfaces: SurfaceItem[],
  coefficientKey: 'annualRainCoeff' | 'coverCoeff' | 'designRainCoeff',
  predicate: (surface: SurfaceItem) => boolean = () => true
): string {
  const selected = surfaces.filter(predicate).filter((surface) => surface.areaHa > 0);
  const area = selected.reduce((sum, surface) => sum + surface.areaHa, 0);
  if (selected.length === 0 || area <= 0) return '(0)/0';
  const numerator = selected
    .map((surface) => `${formatTrim(surface[coefficientKey].value, 4)}*${formatTrim(surface.areaHa, 4)}`)
    .join('+');
  return `(${numerator})/${formatTrim(area, 4)}`;
}

function buildReportValues(input: ProjectInput, results: CalculationResults): Record<string, string> {
  const roofAreaHa = sumArea(input.surfaces, (surface) => surface.kind === 'roof' || surface.templateId === 'roof');
  const roofAreaM2 = roofAreaHa * 10000;
  const hardAreaHa = sumArea(input.surfaces, (surface) => surface.isHardSurface);
  const lawnAreaHa = sumArea(input.surfaces, (surface) => surface.kind === 'lawn' || surface.templateId === 'lawn');
  const treatmentPredicate = (surface: SurfaceItem) => surface.routedToTreatment;
  const treatmentAreaHa = input.treatment.rainTreatmentAreaHa > 0 ? input.treatment.rainTreatmentAreaHa : input.totalAreaHa;

  const q20 = input.rainFlow.q20.value;
  const n = input.rainFlow.n.value;
  const q5 = Math.pow(4, n) * q20;
  const roofFlow = (roofAreaM2 * q5) / 10000;
  const exponent = 1.2 * n - 0.1;
  const qcal = results.rainFlow.qrLS * 0.75;
  const annualTotalNoWash = results.annual.annualRainVolumeM3 + results.annual.annualMeltVolumeM3;

  return {
    objectName: input.objectName,
    roofAreaM2: formatNumber(roofAreaM2, 0),
    q5: formatNumber(q5, 2),
    roofFlow: formatNumber(roofFlow, 2),
    q20: formatTrim(q20, 2),
    n: formatTrim(n, 3),
    hardAreaHa: formatTrim(hardAreaHa, 4),
    lawnAreaHa: formatTrim(lawnAreaHa, 4),
    totalAreaHa: formatTrim(input.totalAreaHa, 4),
    hd: formatTrim(input.climate.hdWarmPeriodMm.value, 0),
    ht: formatTrim(input.climate.htColdPeriodMm.value, 0),
    psiAnnual: formatNumber(results.annual.weightedAnnualRainCoeff, 2),
    psiAnnualExpression: coefficientExpression(input.surfaces, 'annualRainCoeff'),
    psiMelt: formatTrim(input.snowMeltCoeff.value, 3),
    ky: formatNumber(results.annual.snowRemovalCoeffKy, 4),
    annualRainVolume: formatNumber(results.annual.annualRainVolumeM3, 2),
    annualMeltVolume: formatNumber(results.annual.annualMeltVolumeM3, 2),
    annualTotalNoWashVolume: formatNumber(annualTotalNoWash, 2),
    zmid: formatNumber(input.rainFlow.zMid.value, 3),
    zmidExpression: coefficientExpression(input.surfaces, 'coverCoeff', treatmentPredicate),
    psimid: formatNumber(input.treatment.rainTreatmentCoeff.value, 3),
    psimidExpression: coefficientExpression(input.surfaces, 'designRainCoeff', treatmentPredicate),
    dailyRainVolume: formatNumber(results.treatment.rainTreatmentVolumeM3, 2),
    dailyMeltVolume: formatNumber(results.treatment.dailyMeltVolumeM3, 3),
    parameterA: formatNumber(results.rainFlow.parameterA, 2),
    rainFlowAreaHa: formatTrim(input.rainFlow.areaHa || treatmentAreaHa, 4),
    tr: formatNumber(results.rainFlow.trMin, 1),
    tp: formatNumber(results.rainFlow.tpMin, 1),
    tcon: formatTrim(input.rainFlow.tConMin.value, 1),
    tcan: formatTrim(input.rainFlow.tCanMin.value, 1),
    flowExponent: formatNumber(exponent, 2),
    qr: formatNumber(results.rainFlow.qrLS, 2),
    p: formatTrim(input.rainFlow.p.value, 2),
    gamma: formatTrim(input.rainFlow.gamma.value, 2),
    mr: formatTrim(input.rainFlow.mr.value, 0),
    qcal: formatNumber(qcal, 2)
  };
}

async function replacePlaceholdersInZip(zip: JSZip, values: Record<string, string>) {
  const xmlFiles = Object.keys(zip.files).filter((path) => path.startsWith('word/') && path.endsWith('.xml'));

  await Promise.all(
    xmlFiles.map(async (path) => {
      const file = zip.file(path);
      if (!file) return;
      let xml = await file.async('string');
      for (const [key, rawValue] of Object.entries(values)) {
        const value = escapeXml(rawValue);
        xml = xml.split(`{{${key}}}`).join(value);
      }
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
  await replacePlaceholdersInZip(zip, values);

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
