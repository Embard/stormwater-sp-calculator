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

function roundVolumeForSite(value: number, annual = false): number {
  return annual ? Math.round(value) : round(value, 1);
}

function roundFlowForSite(value: number): number {
  return value > 10 ? round(value, 1) : round(value, 2);
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

function weightedNumeratorExpression(
  surfaces: SurfaceItem[],
  coefficientKey: 'annualRainCoeff' | 'coverCoeff' | 'designRainCoeff',
  predicate: (surface: SurfaceItem) => boolean
): string {
  const selected = surfaces.filter(predicate).filter((surface) => surface.areaHa > 0);
  if (selected.length === 0) return '0';
  return selected
    .map((surface) => `${formatTrim(surface[coefficientKey].value, 4)}×${formatTrim(surface.areaHa, 4)}`)
    .join('+');
}

function buildReportValues(input: ProjectInput, results: CalculationResults): Record<string, string> {
  const roofAreaHa = sumArea(input.surfaces, (surface) => surface.kind === 'roof' || surface.templateId === 'roof');
  const roofAreaM2 = roofAreaHa * 10000;
  const hardAreaHa = sumArea(input.surfaces, (surface) => surface.isHardSurface);
  const lawnAreaHa = sumArea(input.surfaces, (surface) => surface.kind === 'lawn' || surface.templateId === 'lawn');
  const treatmentAreaHa = input.treatment.rainTreatmentAreaHa > 0 ? input.treatment.rainTreatmentAreaHa : input.totalAreaHa;

  const hardPredicate = (surface: SurfaceItem) => surface.isHardSurface;
  const lawnPredicate = (surface: SurfaceItem) => surface.kind === 'lawn' || surface.templateId === 'lawn';
  const treatmentHardPredicate = (surface: SurfaceItem) => surface.routedToTreatment && surface.isHardSurface;
  const treatmentLawnPredicate = (surface: SurfaceItem) => surface.routedToTreatment && (surface.kind === 'lawn' || surface.templateId === 'lawn');
  const treatmentHardAreaHa = sumArea(input.surfaces, treatmentHardPredicate);
  const treatmentLawnAreaHa = sumArea(input.surfaces, treatmentLawnPredicate);

  const q20 = input.rainFlow.q20.value;
  const n = input.rainFlow.n.value;
  const q5 = Math.pow(4, n) * q20;
  const roofFlow = (roofAreaM2 * q5) / 10000;
  const flowExponentRaw = 1.2 * n - 0.1;

  const zmidForReport = round(input.rainFlow.zMid.value, 3);
  const parameterAForReport = round(results.rainFlow.parameterA, 2);
  const rainFlowAreaForReport = round(input.rainFlow.areaHa || treatmentAreaHa, 4);
  const trForReport = round(results.rainFlow.trMin, 2);
  const flowExponentForReport = round(flowExponentRaw, 3);
  const qrForReport = roundFlowForSite(results.rainFlow.qrLS);
  const beta = 0.75;
  const qcalForReport = round(qrForReport * beta, 2);

  const totalAreaReport = round(input.totalAreaHa, 4);
  const treatmentAreaReport = round(treatmentAreaHa, 4);
  const kyReport = round(results.annual.snowRemovalCoeffKy, 4);
  const psiAnnualReport = round(results.annual.weightedAnnualRainCoeff, 4);
  const psiMeltReport = round(input.snowMeltCoeff.value, 4);
  const meltUnevennessReport = round(input.meltUnevennessCoeff.value, 4);
  const hdReport = round(input.climate.hdWarmPeriodMm.value, 0);
  const htReport = round(input.climate.htColdPeriodMm.value, 0);
  // ha и hc нельзя округлять до целых: сайт и расчет используют дробные значения 7,25 / 18,16.
  const hcReport = round(input.climate.hcMeltTenHourMm.value, 2);
  const haReport = round(input.climate.haRainTreatmentMm.value, 2);

  // Итоговые значения в отчете должны совпадать с карточками сайта.
  // Поэтому финальные объемы берем из общего расчетного результата, а не пересчитываем заново
  // из уже округленных коэффициентов в строке отчета.
  const annualRainVolumeReport = results.annual.annualRainVolumeM3;
  const annualMeltVolumeReport = results.annual.annualMeltVolumeM3;
  const washingRateReport = round(input.washingRateLPerM2.value, 4);
  const washingCoeffReport = round(input.washingRunoffCoeff.value, 4);
  const washingAreaReport = round(input.washingAreaHa, 4);
  const washingCountReport = round(input.washingCountPerYear, 0);
  const washingVolumeReport = results.annual.washingVolumeM3;
  const annualTotalVolumeReport = results.annual.totalAnnualVolumeM3;
  const psimidReport = round(input.treatment.rainTreatmentCoeff.value, 3);
  const dailyRainVolumeReport = results.treatment.rainTreatmentVolumeM3;
  const dailyMeltVolumeReport = results.treatment.dailyMeltVolumeM3;

  const rainActiveProcessingHours = Math.max(0, input.treatment.rainProcessingHours - input.treatment.settlingHours - input.treatment.technicalBreakHours);
  const meltActiveProcessingHours = Math.max(0, input.treatment.meltProcessingHours - input.treatment.settlingHours - input.treatment.technicalBreakHours);
  const rainTreatmentCapacityForReport = results.treatment.rainTreatmentCapacityM3PerH;
  const meltTreatmentCapacityForReport = results.treatment.meltTreatmentCapacityM3PerH;
  const selectedTreatmentCapacityForReport = results.treatment.selectedTreatmentCapacityM3PerH;

  const meltResidualReport = results.treatment.meltResidualPerDayM3;
  const meltConsecutiveDaysReport = Math.max(1, input.treatment.meltConsecutiveDays || 1);
  const requiredMeltWorkingVolumeReport = results.treatment.requiredMeltWorkingVolumeM3;
  const requiredReservoirWorkingVolumeReport = results.treatment.requiredReservoirWorkingVolumeM3;
  const requiredReservoirFullVolumeReport = results.treatment.requiredReservoirFullVolumeM3;

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
    totalAreaHa: formatTrim(totalAreaReport, 4),

    hd: formatTrim(hdReport, 0),
    ht: formatTrim(htReport, 0),
    hc: formatTrim(hcReport, 2),
    haRainTreatment: formatTrim(haReport, 2),

    psiAnnual: formatTrim(round(results.annual.weightedAnnualRainCoeff, 4), 4),
    psiAnnualExpression: weightedNumeratorExpression(input.surfaces, 'annualRainCoeff', (surface) => surface.areaHa > 0),
    psiAnnualHard: formatTrim(weightedValue(input.surfaces, 'annualRainCoeff', hardPredicate), 4),
    psiAnnualLawn: formatTrim(weightedValue(input.surfaces, 'annualRainCoeff', lawnPredicate), 4),
    psiMelt: formatTrim(psiMeltReport, 4),
    psiMeltDaily: formatTrim(psiMeltReport, 4),
    ky: formatTrim(kyReport, 4),
    meltUnevennessCoeff: formatTrim(meltUnevennessReport, 4),

    annualRainVolume: formatNumber(roundVolumeForSite(annualRainVolumeReport, true), 0),
    annualMeltVolume: formatNumber(roundVolumeForSite(annualMeltVolumeReport, true), 0),
    washingRate: formatTrim(washingRateReport, 2),
    washingCoeff: formatTrim(washingCoeffReport, 3),
    washingAreaHa: formatTrim(washingAreaReport, 4),
    washingCount: formatTrim(washingCountReport, 0),
    washingVolume: formatNumber(roundVolumeForSite(washingVolumeReport, true), 0),
    annualTotalVolume: formatNumber(roundVolumeForSite(annualTotalVolumeReport, true), 0),

    rainTreatmentAreaHa: formatTrim(treatmentAreaReport, 4),
    treatmentHardAreaHa: formatTrim(treatmentHardAreaHa, 4),
    treatmentLawnAreaHa: formatTrim(treatmentLawnAreaHa, 4),
    zCoverHard: formatTrim(weightedValue(input.surfaces, 'coverCoeff', treatmentHardPredicate), 4),
    zCoverLawn: formatTrim(weightedValue(input.surfaces, 'coverCoeff', treatmentLawnPredicate), 4),
    zmidExpression: weightedNumeratorExpression(input.surfaces, 'coverCoeff', (surface) => surface.routedToTreatment && surface.areaHa > 0),
    zmid: formatNumber(zmidForReport, 3),
    psiDesignHard: formatTrim(weightedValue(input.surfaces, 'designRainCoeff', treatmentHardPredicate), 4),
    psiDesignLawn: formatTrim(weightedValue(input.surfaces, 'designRainCoeff', treatmentLawnPredicate), 4),
    psimidExpression: weightedNumeratorExpression(input.surfaces, 'designRainCoeff', (surface) => surface.routedToTreatment && surface.areaHa > 0),
    psimid: formatNumber(psimidReport, 3),
    dailyRainVolume: formatNumber(roundVolumeForSite(dailyRainVolumeReport), 1),

    dailyMeltVolume: formatNumber(roundVolumeForSite(dailyMeltVolumeReport), 1),
    snowCleanedAreaHa: formatTrim(input.snowCleanedAreaHa, 4),

    parameterA: formatNumber(parameterAForReport, 2),
    rainFlowAreaHa: formatTrim(rainFlowAreaForReport, 4),
    tr: formatNumber(trForReport, 2),
    tp: formatNumber(results.rainFlow.tpMin, 2),
    tcon: formatTrim(input.rainFlow.tConMin.value, 1),
    tcan: formatTrim(input.rainFlow.tCanMin.value, 1),
    flowExponent: formatNumber(flowExponentForReport, 3),
    qr: formatNumber(qrForReport, qrForReport > 10 ? 1 : 2),
    p: formatTrim(input.rainFlow.p.value, 2),
    gamma: formatTrim(input.rainFlow.gamma.value, 2),
    mr: formatTrim(input.rainFlow.mr.value, 0),
    beta: formatTrim(beta, 2),
    qcal: formatNumber(qcalForReport, 2),

    engineerName: input.engineerName || 'Иванов И.И',
    reportDate: input.reportDate || new Date().toLocaleDateString('ru-RU'),

    pollutedRainFraction: formatTrim(input.treatment.pollutedRainFraction.value, 3),
    rainProcessingHours: formatTrim(input.treatment.rainProcessingHours, 0),
    meltProcessingHours: formatTrim(input.treatment.meltProcessingHours, 0),
    meltConsecutiveDays: formatTrim(input.treatment.meltConsecutiveDays, 0),
    settlingHours: formatTrim(input.treatment.settlingHours, 0),
    technicalBreakHours: formatTrim(input.treatment.technicalBreakHours, 0),
    rainActiveProcessingHours: formatTrim(rainActiveProcessingHours, 0),
    meltActiveProcessingHours: formatTrim(meltActiveProcessingHours, 0),
    meltResidualPerDay: formatNumber(roundVolumeForSite(meltResidualReport), 1),
    requiredMeltWorkingVolume: formatNumber(roundVolumeForSite(requiredMeltWorkingVolumeReport), 1),
    requiredReservoirWorkingVolume: formatNumber(roundVolumeForSite(requiredReservoirWorkingVolumeReport), 1),
    requiredReservoirControlCase: requiredMeltWorkingVolumeReport > dailyRainVolumeReport ? 'талому стоку' : 'дождевому стоку',
    reservoirReservePercent: formatTrim(input.treatment.reservoirReservePercent.value, 2),
    requiredReservoirFullVolume: formatNumber(roundVolumeForSite(requiredReservoirFullVolumeReport), 1),
    reservoirWorkingVolume: formatNumber(input.treatment.reservoirWorkingVolumeM3, 2),
    reservoirCheckResult: input.treatment.reservoirWorkingVolumeM3 >= requiredReservoirWorkingVolumeReport ? 'выполняется' : 'не выполняется',
    rainTreatmentCapacity: formatNumber(rainTreatmentCapacityForReport, 2),
    meltTreatmentCapacity: formatNumber(meltTreatmentCapacityForReport, 2),
    selectedTreatmentCapacity: formatNumber(selectedTreatmentCapacityForReport, 2)
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
  // Резервная замена только для длинных технических маркеров, которые могли остаться обычным текстом.
  // Короткие обозначения формул q20, n, p, tr, Qr и т.п. здесь намеренно не трогаются:
  // они должны оставаться буквенными символами формулы, если не являются Content Control.
  const allowedKeys = [
    // Длинные/технические маркеры. Их можно безопасно заменить даже если в шаблоне
    // они случайно остались обычным текстом, а не Content Control.
    'psiAnnualExpression',
    'zmidExpression',
    'psimidExpression',
    'meltUnevennessCoeff',
    'annualRainVolume',
    'annualMeltVolume',
    'annualTotalVolume',
    'washingRate',
    'washingCoeff',
    'washingAreaHa',
    'washingCount',
    'washingVolume',
    'rainTreatmentAreaHa',
    'haRainTreatment',
    'dailyRainVolume',
    'dailyMeltVolume',
    'snowCleanedAreaHa',
    'meltResidualPerDay',
    'meltConsecutiveDays',
    'requiredMeltWorkingVolume',
    'requiredReservoirWorkingVolume',
    'requiredReservoirFullVolume',
    'requiredReservoirControlCase',
    'reservoirReservePercent',
    'reservoirWorkingVolume',
    'reservoirCheckResult',
    'rainProcessingHours',
    'meltProcessingHours',
    'settlingHours',
    'technicalBreakHours',
    'rainTreatmentCapacity',
    'meltTreatmentCapacity',
    'selectedTreatmentCapacity',
    'roofAreaM2',
    'roofFlow',
    'hardAreaHa',
    'lawnAreaHa',
    'totalAreaHa',
    'psiAnnual',
    'psiMeltDaily',
    'psiMelt',
    'zCoverHard',
    'zCoverLawn',
    'psiDesignHard',
    'psiDesignLawn',
    'parameterA',
    'rainFlowAreaHa',
    'flowExponent',
    'engineerName',
    'reportDate',
    'objectName',
    'psimid',
    'zmid',
    'qcal',
    'beta',
    'qr',
    'ky',
    'hc',
    'ht',
    'hd',
    'tp'
  ].filter((key) => values[key] !== undefined).sort((a, b) => b.length - a.length);

  return xml.replace(/<w:t(\s[^>]*)?>([^<]*)<\/w:t>/g, (node, attrs = '', text = '') => {
    let nextText = text;
    for (const key of allowedKeys) {
      if (!nextText.includes(key)) continue;
      nextText = nextText.split(key).join(escapeXml(values[key]));
    }

    // q5 короткий маркер и может быть буквенным обозначением формулы.
    // Поэтому не заменяем все q5 подряд.
    // Нужно заменить только q5 в числовой подстановке:
    //   Q = F×q5/10000 = 13 496× q5/10000 = ...
    // и итог в строке:
    //   q5 = 4^n × q20 = ... = q5 л/с
    if (values.q5) {
      const q5Value = escapeXml(values.q5);

      // Если вся строка оказалась в одном w:t, меняем только q5 после числовой площади,
      // а буквенное F×q5/10000 оставляем как формулу.
      nextText = nextText.replace(
        /(Q\s*=\s*F\s*×\s*q5\s*\/\s*10000\s*=\s*[^=]*?×\s*)q5(?=\s*\/\s*10000)/g,
        `$1${q5Value}`
      );

      // Если после Content Control с roofAreaM2 остался отдельный текстовый фрагмент "× q5/10000".
      // Не трогаем фрагмент, где есть буквенная часть "Q = F×q5/10000".
      if (!/Q\s*=\s*F\s*×\s*q5\s*\/\s*10000/.test(nextText)) {
        nextText = nextText.replace(/(×\s*)q5(\s*\/\s*10000)/g, `$1${q5Value}$2`);
      }

      // Итоговое значение q5 в строке расчета q5.
      nextText = nextText.replace(/(=\s*)q5(?=\s*л\/с)/g, `$1${q5Value}`);
    }

    return `<w:t${attrs || ''}>${nextText}</w:t>`;
  });
}



function readParagraphText(paragraphXml: string): string {
  return Array.from(paragraphXml.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g))
    .map((match) => match[1]
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'"))
    .join('');
}

function replaceParagraphWithPlainText(paragraphXml: string, text: string): string {
  const openMatch = paragraphXml.match(/^<w:p\b[^>]*>/);
  if (!openMatch) return paragraphXml;
  const openTag = openMatch[0];
  const pPrMatch = paragraphXml.match(/<w:pPr>[\s\S]*?<\/w:pPr>/);
  const pPr = pPrMatch ? pPrMatch[0] : '';
  return `${openTag}${pPr}<w:r><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`;
}

function replaceFormulaParagraphs(xml: string, values: Record<string, string>): string {
  const formulaText = (text: string): string | null => {
    const compact = text.replace(/\s+/g, '');

    if (compact.includes('Q=F×q5/10000=')) {
      return `Q = F×q5/10000 = ${values.roofAreaM2}×${values.q5}/10000 = ${values.roofFlow} л/с,`;
    }

    if (compact.includes('q5=4') && compact.includes('q20')) {
      return `q5 = 4^n × q20 = 4^${values.n} × ${values.q20}= ${values.q5} л/с, с 1 га,`;
    }

    if (compact.startsWith('Wд=10×hд×Ψд×F=')) {
      return `Wд=10×hд×Ψд×F=10×${values.hd}×${values.psiAnnual}×${values.totalAreaHa}=${values.annualRainVolume} м3/год;`;
    }

    if (compact.startsWith('Wт=10×hт×Ψт×Kу×F=')) {
      return `Wт=10×hт×Ψт×Kу×F=10×${values.ht}×${values.psiMelt}×${values.ky}×${values.totalAreaHa}=${values.annualMeltVolume} м3/год;`;
    }

    if (compact.startsWith('Wм=10×m×k×Fм×N=')) {
      return `Wм = 10×m×k×Fм×N = 10×${values.washingRate}×${values.washingCoeff}×${values.washingAreaHa}×${values.washingCount} = ${values.washingVolume} м3/год.`;
    }

    if (compact.startsWith('Ψд=(')) {
      return `Ψд=(${values.psiAnnualExpression})/ ${values.totalAreaHa} = ${values.psiAnnual}`;
    }

    if (compact.startsWith('Wг=Wд+Wт+Wм=')) {
      return `Wг=Wд+Wт+Wм=${values.annualRainVolume}+${values.annualMeltVolume}+${values.washingVolume}=${values.annualTotalVolume} м3/год.`;
    }

    if (compact.startsWith('Wд.сут.=10×ha×F×Ψmid=')) {
      return `Wд.сут.=10×ha×F×Ψmid=10×${values.haRainTreatment}×${values.rainTreatmentAreaHa}×${values.psimid}=${values.dailyRainVolume} м3/сут`;
    }

    if (compact.startsWith('Zmid=(')) {
      return `Zmid=(${values.zmidExpression})/${values.rainTreatmentAreaHa}=${values.zmid}`;
    }

    if (compact.startsWith('Ψmid=(')) {
      return `Ψmid=(${values.psimidExpression})/${values.rainTreatmentAreaHa}=${values.psimid}`;
    }

    if (compact.startsWith('Wт.сут=10×')) {
      return `Wт.сут=10×hc×F×α×Ψт×Kу=10×${values.hc}×${values.totalAreaHa}×${values.meltUnevennessCoeff}×${values.psiMelt}×${values.ky}=${values.dailyMeltVolume} м3/сут.`;
    }

    if (compact.startsWith('Ку=1−Fу/F=') || compact.startsWith('Ку=1-Fу/F=')) {
      return `Ку=1 − Fу / F= 1 - ${values.snowCleanedAreaHa}/${values.totalAreaHa}= ${values.ky},`;
    }

    if (compact.startsWith('Qr=Zmid×A^1,2×F/tr^')) {
      return `Qr=Zmid×A^1,2×F/tr^(1,2n−0,1) = ${values.zmid}×${values.parameterA}^1,2×${values.rainFlowAreaHa}/(${values.tr})^ ${values.flowExponent}= ${values.qr} л/с`;
    }

    if (compact.startsWith('A=q20·20n·') || compact.startsWith('A=q20·20^n·') || compact.startsWith('A=q20·20n·')) {
      return `A = q20 · 20^n · (1 + lgP/lgmr)^γ=${values.q20}×20^${values.n}×(1+lg${values.p}/lg${values.mr})^ ${values.gamma}=${values.parameterA}`;
    }

    if (compact.startsWith('tr=tcon+tcan+')) {
      return `tr = tcon+tcan+tp=${values.tcon}+${values.tcan}+${values.tp}=${values.tr} мин`;
    }

    if (compact.startsWith('Qcal=β×Qr=')) {
      return `Qcal=β×Qr=${values.beta}×${values.qr}=${values.qcal} л/с`;
    }

    if (compact.startsWith('Vраб.тр=max(')) {
      return `Vраб.тр=max(Wд.сут; Vт.раб)=max(${values.dailyRainVolume};${values.requiredMeltWorkingVolume})=${values.requiredReservoirWorkingVolume} м3.`;
    }

    if (compact.startsWith('Vполн.тр=Vраб.тр×(')) {
      return `Vполн.тр = Vраб.тр × (1 + Kзап/100) = ${values.requiredReservoirWorkingVolume} × (1 + ${values.reservoirReservePercent}/100) = ${values.requiredReservoirFullVolume} м3.`;
    }

    if (compact.startsWith('Qоч.д=Wд.сут/') || compact.startsWith('Qоч.д=Wд.сут/')) {
      return `Qоч.д = Wд.сут / (Tд − Tотст − Tпер) = ${values.dailyRainVolume} / (${values.rainProcessingHours} − ${values.settlingHours} − ${values.technicalBreakHours}) = ${values.rainTreatmentCapacity} м3/ч.`;
    }

    if (compact.startsWith('Qоч.т=Wт.сут/')) {
      return `Qоч.т=Wт.сут/(Tт−Tотст−Tпер)=${values.dailyMeltVolume}/(${values.meltProcessingHours}−${values.settlingHours}−${values.technicalBreakHours})=${values.meltTreatmentCapacity} м3/ч.`;
    }

    if (compact.startsWith('Qоч=max(')) {
      return `Qоч = max(Qоч.д; Qоч.т) = ${values.selectedTreatmentCapacity} м3/ч.`;
    }

    return null;
  };

  return xml.replace(/<w:p\b[\s\S]*?<\/w:p>/g, (paragraph) => {
    const text = readParagraphText(paragraph);
    const replacement = formulaText(text);
    return replacement === null ? paragraph : replaceParagraphWithPlainText(paragraph, replacement);
  });
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
      xml = replaceFormulaParagraphs(xml, values);
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
