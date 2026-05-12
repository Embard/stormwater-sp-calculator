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
        `Принято ${value.value} ${value.unit}, минимум ${value.min} ${value.unit}. Исправьте значение или подтвердите расчетным обоснованием вне калькулятора.`,
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
        `Принято ${value.value} ${value.unit}, максимум ${value.max} ${value.unit}. Исправьте значение или подтвердите расчетным обоснованием вне калькулятора.`,
        field
      )
    );
  }

  return issues;
}

function collectSurfaceValues(surfaces: SurfaceItem[]): Array<[string, NormativeValue, string]> {
  return surfaces.flatMap((surface) => [
    [`${surface.name}: ψд для годового объема Wд`, surface.annualRainCoeff, `surface-${surface.id}-annualRainCoeff`] as [string, NormativeValue, string],
    [`${surface.name}: Zi для расчетного расхода Qr`, surface.coverCoeff, `surface-${surface.id}-coverCoeff`] as [string, NormativeValue, string],
    [`${surface.name}: Ψi для объема дождя на очистку`, surface.designRainCoeff, `surface-${surface.id}-designRainCoeff`] as [string, NormativeValue, string]
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
        `Сумма покрытий ${surfaceArea.toFixed(4)} га, общая площадь ${input.totalAreaHa.toFixed(4)} га. Проверьте площади перед расчетом.`,
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

  const hardArea = input.surfaces.filter((x) => x.isHardSurface).reduce((sum, surface) => sum + surface.areaHa, 0);
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

  if (input.treatment.rainTreatmentAreaHa <= 0) {
    issues.push(
      issue(
        'rain-treatment-area-zero',
        'error',
        'Не задана площадь дождевого стока на очистку',
        'Отметьте хотя бы одно покрытие галочкой «На очистку» или проверьте площади покрытий.',
        'treatment.rainTreatmentAreaHa'
      )
    );
  }

  if (input.rainFlow.pipeVelocityMS <= 0) {
    issues.push(
      issue(
        'pipe-velocity-zero',
        'error',
        'Не задана скорость в коллекторе',
        'Скорость должна быть больше нуля, иначе нельзя определить время протекания по трубе.',
        'rainFlow.pipeVelocityMS'
      )
    );
  }

  if (input.treatment.rainProcessingHours <= input.treatment.settlingHours + input.treatment.technicalBreakHours) {
    issues.push(
      issue(
        'rain-processing-hours-invalid',
        'error',
        'Недостаточный период переработки дождевого стока',
        'Период переработки дождя должен быть больше суммы отстаивания и технологических перерывов.',
        'treatment.rainProcessingHours'
      )
    );
  }

  if (input.treatment.meltProcessingHours <= input.treatment.settlingHours + input.treatment.technicalBreakHours) {
    issues.push(
      issue(
        'melt-processing-hours-invalid',
        'error',
        'Недостаточный период переработки талого стока',
        'Период переработки талого стока должен быть больше суммы отстаивания и технологических перерывов.',
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
    ['Ψт для годового объема талых вод Wт', input.snowMeltCoeff, 'snowMeltCoeff'],
    ['Ψт для суточного объема талых вод Wт.сут', input.dailyMeltRunoffCoeff, 'dailyMeltRunoffCoeff'],
    ['Удельный расход воды на мойку', input.washingRateLPerM2, 'washingRateLPerM2'],
    ['Коэффициент поливомоечного стока', input.washingRunoffCoeff, 'washingRunoffCoeff'],
    ['Коэффициент неравномерности снеготаяния', input.meltUnevennessCoeff, 'meltUnevennessCoeff'],
    ['Период однократного превышения расчетной интенсивности P', input.rainFlow.p, 'rainFlow.p'],
    ['Zmid', input.rainFlow.zMid, 'rainFlow.zMid'],
    ['Доля объема на очистку', input.treatment.pollutedRainFraction, 'treatment.pollutedRainFraction'],
    ['Запас резервуара', input.treatment.reservoirReservePercent, 'treatment.reservoirReservePercent'],
    ...collectSurfaceValues(input.surfaces)
  ];

  normativeChecks.forEach(([name, value, field]) => issues.push(...validateNormativeValue(name, value, field)));

  return issues;
}
