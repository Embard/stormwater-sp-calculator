import type { CalculationResults, ProjectInput } from '../types';
import { calculateAnnualRunoff } from './annualRunoff';
import { calculateRainFlow } from './rainFlow';
import { calculateTreatment } from './treatmentFlow';

export function calculateProject(input: ProjectInput): CalculationResults {
  const annual = calculateAnnualRunoff({
    totalAreaHa: input.totalAreaHa,
    surfaces: input.surfaces,
    hdWarmPeriodMm: input.climate.hdWarmPeriodMm.value,
    htColdPeriodMm: input.climate.htColdPeriodMm.value,
    meltRunoffCoeff: input.snowMeltCoeff.value,
    snowCleanedAreaHa: input.snowCleanedAreaHa,
    washingAreaHa: input.washingAreaHa,
    washingRateLPerM2: input.washingRateLPerM2.value,
    washingCountPerYear: input.washingCountPerYear,
    washingRunoffCoeff: input.washingRunoffCoeff.value
  });

  const rainFlow = calculateRainFlow(input.rainFlow);

  const treatment = calculateTreatment({
    treatment: input.treatment,
    haRainTreatmentMm: input.climate.haRainTreatmentMm.value,
    hcMeltTenHourMm: input.climate.hcMeltTenHourMm.value,
    totalAreaHa: input.totalAreaHa,
    meltRunoffCoeff: input.dailyMeltRunoffCoeff.value,
    meltUnevennessCoeff: input.meltUnevennessCoeff.value,
    snowRemovalCoeffKy: annual.snowRemovalCoeffKy
  });

  return { annual, rainFlow, treatment };
}
