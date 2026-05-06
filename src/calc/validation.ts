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
        `${name}: значение ниже допустимого диапазона`,
        `Принято ${value.value} ${value.unit}, при этом минимально допустимое значение ${value.min} ${value.unit}.`,
        field
      )
    );
  }
  if (value.max !== undefined && value.value > value.max) {
    issues.push(
      issue(
        `${field}-above-max`,
        'error',
        `${name}: значение выше допустимого диапазона`,
        `Принято ${value.value} ${value.unit}, при этом максимально допустимое значение ${value.max} ${value.unit}.`,
        field
      )
    );
  }
  if (value.basis === 'manual' && (!value.justification || value.justification.trim().length < 5)) {
    issues.push(
      issue(
        `${field}-manual-no-justification`,
        'warning',
        `${name}: ручное значение без обоснования`,
        `Для ручного значения ${value.value} ${value.unit} нужно указать проектное или нормативное основание.`,
        field
      )
    );
  }
  return issues;
}

function collectSurfaceValues(surfaces: SurfaceItem[]): Array<[string, NormativeValue, string]> {
  return surfaces.flatMap((surface) => [
    [`${surface.name}: ψд годовой`, surface.annualRainCoeff, `surface-${surface.id}-annualRainCoeff`] as [string, NormativeValue, string],
    [`${surface.name}: Zi`, surface.coverCoeff, `surface-${surface.id}-coverCoeff`] as [string, NormativeValue, string],
    [`${surface.name}: Ψ расчетный`, surface.designRainCoeff, `surface-${surface.id}-designRainCoeff`] as [string, NormativeValue, string]
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
        'Сумма площадей покрытий не совпадает с общей площадью',
        `Сумма покрытий ${surfaceArea.toFixed(4)} га, общая площадь ${input.totalAreaHa.toFixed(4)} га.`,
        'surfaces'
      )
    );
  }

  input.surfaces.forEach((surface) => {
    if (surface.areaHa <= 0) {
      issues.push(
        issue(
          `surface-${surface.id}-area`,
          'error',
          `${surface.name}: площадь должна быть больше нуля`,
          'Для каждого покрытия должна быть задана положительная площадь.',
          `surface-${surface.id}-area`
        )
      );
    }
    if (surface.isWashed && !surface.isHardSurface) {
      issues.push(
        issue(
          `surface-${surface.id}-wash-on-soft`,
          'warning',
          `${surface.name}: мойка отмечена для нетвердого покрытия`,
          'Поливомоечные воды обычно учитываются только для твердых покрытий.',
          `surface-${surface.id}-wash`
        )
      );
    }
  });

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

  if (input.rainFlow.areaHa > input.totalAreaHa + AREA_EPS) {
    issues.push(
      issue(
        'rain-flow-area-too-large',
        'error',
        'Площадь расчетного участка больше общей площади',
        `Для расхода в коллекторе принята площадь ${input.rainFlow.areaHa.toFixed(4)} га, что больше общей площади ${input.totalAreaHa.toFixed(4)} га.`,
        'rainFlow.areaHa'
      )
    );
  }

  if (Math.abs(input.treatment.rainTreatmentCoeffScopeAreaHa - input.treatment.rainTreatmentAreaHa) > AREA_EPS) {
    issues.push(
      issue(
        'rain-treatment-coeff-area-scope',
        'warning',
        'Коэффициент очистки рассчитан для другой площади',
        `Коэффициент Ψ = ${input.treatment.rainTreatmentCoeff.value.toFixed(4)} рассчитан для площади ${input.treatment.rainTreatmentCoeffScopeAreaHa.toFixed(4)} га, но применяется к площади ${input.treatment.rainTreatmentAreaHa.toFixed(4)} га.`,
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
        'По умолчанию принимают 0,8. Для значения 1,0 нужно добавить обоснование.',
        'meltUnevennessCoeff'
      )
    );
  }



  if (input.washingCountPerYear < 100 || input.washingCountPerYear > 150) {
    issues.push(
      issue(
        'washing-count-out-of-range',
        'error',
        'Количество моек вне рекомендуемого диапазона',
        `Принято ${input.washingCountPerYear} раз/год. Для средней полосы РФ применяется диапазон 100–150 раз/год.`,
        'washingCountPerYear'
      )
    );
  }

  if (input.rainFlow.pipeVelocityMS <= 0) {
    issues.push(
      issue(
        'pipe-velocity-zero',
        'error',
        'Не задана скорость в коллекторе',
        'Скорость в коллекторе должна быть больше нуля.',
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
        'Такое значение допускается только при расчетном подтверждении рабочего объема резервуара.',
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
    ['Период однократного превышения P', input.rainFlow.p, 'rainFlow.p'],
    ['Zmid', input.rainFlow.zMid, 'rainFlow.zMid'],
    ['Доля загрязненного объема', input.treatment.pollutedRainFraction, 'treatment.pollutedRainFraction'],
    ['Запас резервуара', input.treatment.reservoirReservePercent, 'treatment.reservoirReservePercent'],
    ...collectSurfaceValues(input.surfaces)
  ];

  normativeChecks.forEach(([name, value, field]) => issues.push(...validateNormativeValue(name, value, field)));

  return issues;
}
