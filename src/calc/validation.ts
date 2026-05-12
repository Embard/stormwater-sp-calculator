import type { NormativeValue, ProjectInput, SurfaceItem, ValidationIssue } from '../types';
import { sumAreaHa } from './annualRunoff';

const AREA_EPS = 0.0001;

function issue(id: string, severity: ValidationIssue['severity'], title: string, message: string, field?: string): ValidationIssue {
  return { id, severity, title, message, field };
}

function validateNormativeValue(name: string, value: NormativeValue, field: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (value.min !== undefined && value.value < value.min) {
    issues.push(
      issue(
        `${field}-below-min`,
        'error',
        `${name}: ниже нормативного диапазона`,
        `Принято ${value.value} ${value.unit}, минимум ${value.min} ${value.unit}. Требуется исправить значение или указать обоснование ручного значения.`,
        field
      )
    );
  }
  if (value.max !== undefined && value.value > value.max) {
    issues.push(
      issue(
        `${field}-above-max`,
        'error',
        `${name}: выше нормативного диапазона`,
        `Принято ${value.value} ${value.unit}, максимум ${value.max} ${value.unit}. Требуется исправить значение или указать обоснование ручного значения.`,
        field
      )
    );
  }
  if (
    value.basis === 'manual' &&
    (value.justification === undefined || value.justification.trim().length < 5)
  ) {
    issues.push(
      issue(
        `${field}-manual-no-justification`,
        'warning',
        `${name}: ручное значение без обоснования`,
        `Для ручного значения ${value.value} ${value.unit} нужно добавить основание принятия.`,
        field
      )
    );
  }
  if (value.min !== undefined && value.value === value.min) {
    issues.push(
      issue(
        `${field}-at-min`,
        'info',
        `${name}: принято нижнее значение диапазона`,
        'Проверьте, что для выбранного минимального значения есть проектное обоснование.',
        field
      )
    );
  }
  if (value.max !== undefined && value.value === value.max) {
    issues.push(
      issue(
        `${field}-at-max`,
        'info',
        `${name}: принято верхнее значение диапазона`,
        'Проверьте, что для выбранного максимального значения есть проектное обоснование.',
        field
      )
    );
  }
  return issues;
}

function collectSurfaceValues(surfaces: SurfaceItem[]): Array<[string, NormativeValue, string]> {
  return surfaces.flatMap((surface) => [
    [`${surface.name}: коэффициент годового дождевого стока`, surface.annualRainCoeff, `surface-${surface.id}-annualRainCoeff`] as [string, NormativeValue, string],
    [`${surface.name}: коэффициент расчетного дождя`, surface.designRainCoeff, `surface-${surface.id}-designRainCoeff`] as [string, NormativeValue, string]
  ]);
}

export function validateProject(input: ProjectInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const surfaceArea = sumAreaHa(input.surfaces);

  if (Math.abs(surfaceArea - input.totalAreaHa) > AREA_EPS) {
    issues.push(
      issue(
        'surface-area-mismatch',
        'error',
        'Сумма площадей покрытий не совпадает с расчетной площадью',
        `Сумма покрытий ${surfaceArea.toFixed(4)} га, расчетная площадь ${input.totalAreaHa.toFixed(4)} га. Коэффициент стока нельзя применять к другой площади.`,
        'surfaces'
      )
    );
  }

  if (input.snowCleanedAreaHa > input.totalAreaHa + AREA_EPS) {
    issues.push(
      issue(
        'snow-cleaned-area-too-large',
        'error',
        'Площадь уборки снега больше общей площади',
        `Площадь уборки снега ${input.snowCleanedAreaHa.toFixed(4)} га, общая площадь ${input.totalAreaHa.toFixed(4)} га.`,
        'snowCleanedAreaHa'
      )
    );
  }

  const hardArea = input.surfaces.filter((x) => x.isHardSurface).reduce((sum, s) => sum + s.areaHa, 0);
  if (input.washingAreaHa > hardArea + AREA_EPS) {
    issues.push(
      issue(
        'washing-area-too-large',
        'error',
        'Площадь мойки больше площади твердых покрытий',
        `Площадь мойки ${input.washingAreaHa.toFixed(4)} га, твердые покрытия ${hardArea.toFixed(4)} га.`,
        'washingAreaHa'
      )
    );
  }

  if (Math.abs(input.treatment.rainTreatmentCoeffScopeAreaHa - input.treatment.rainTreatmentAreaHa) > AREA_EPS) {
    issues.push(
      issue(
        'rain-treatment-coeff-area-scope',
        'warning',
        'Коэффициент стока применен не к той площади',
        `Коэффициент ψ = ${input.treatment.rainTreatmentCoeff.value.toFixed(4)} рассчитан для площади ${input.treatment.rainTreatmentCoeffScopeAreaHa.toFixed(4)} га, но применен к площади ${input.treatment.rainTreatmentAreaHa.toFixed(4)} га. Пересчитайте коэффициент для территории, направляемой на очистку.`,
        'treatment.rainTreatmentCoeff'
      )
    );
  }

  if (input.meltUnevennessCoeff.value === 1 && !input.meltUnevennessCoeff.justification) {
    issues.push(
      issue(
        'melt-unevenness-one-no-justification',
        'warning',
        'Коэффициент неравномерности снеготаяния принят 1,0',
        'По умолчанию применяется 0,8. Для значения 1,0 нужно добавить ручное обоснование.',
        'meltUnevennessCoeff'
      )
    );
  }

  if (input.rainFlow.pipeVelocityMS <= 0) {
    issues.push(
      issue(
        'pipe-velocity-zero',
        'error',
        'Не задана скорость в коллекторе',
        'Время протекания tp должно быть связано с длиной и скоростью. Скорость должна быть больше нуля.',
        'rainFlow.pipeVelocityMS'
      )
    );
  }

  if (input.treatment.meltProcessingHours === 48) {
    issues.push(
      issue(
        'melt-processing-48-hours',
        'warning',
        'Период переработки талого стока принят 48 ч',
        'Такое значение допускается принимать только при расчетном подтверждении рабочего объема резервуара.',
        'treatment.meltProcessingHours'
      )
    );
  }

  const normativeChecks: Array<[string, NormativeValue, string]> = [
    ['Осадки теплого периода', input.climate.hdWarmPeriodMm, 'climate.hdWarmPeriodMm'],
    ['Осадки холодного периода', input.climate.htColdPeriodMm, 'climate.htColdPeriodMm'],
    ['q20', input.climate.q20, 'climate.q20'],
    ['n', input.climate.n, 'climate.n'],
    ['mr', input.climate.mr, 'climate.mr'],
    ['gamma', input.climate.gamma, 'climate.gamma'],
    ['Слой расчетного дождя ha', input.climate.haRainTreatmentMm, 'climate.haRainTreatmentMm'],
    ['Слой талого стока hc', input.climate.hcMeltTenHourMm, 'climate.hcMeltTenHourMm'],
    ['Коэффициент талого стока', input.snowMeltCoeff, 'snowMeltCoeff'],
    ['Удельный расход воды на мойку', input.washingRateLPerM2, 'washingRateLPerM2'],
    ['Коэффициент поливомоечного стока', input.washingRunoffCoeff, 'washingRunoffCoeff'],
    ['Коэффициент неравномерности снеготаяния', input.meltUnevennessCoeff, 'meltUnevennessCoeff'],
    ['Период однократного превышения расчетной интенсивности P', input.rainFlow.p, 'rainFlow.p'],
    ['Коэффициент Zmid', input.rainFlow.zMid, 'rainFlow.zMid'],
    ['Доля загрязненного дождевого объема', input.treatment.pollutedRainFraction, 'treatment.pollutedRainFraction'],
    ['Запас резервуара', input.treatment.reservoirReservePercent, 'treatment.reservoirReservePercent'],
    ...collectSurfaceValues(input.surfaces)
  ];

  normativeChecks.forEach(([name, value, field]) => issues.push(...validateNormativeValue(name, value, field)));

  return issues;
}
