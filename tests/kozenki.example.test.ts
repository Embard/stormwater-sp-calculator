import { describe, expect, it } from 'vitest';
import { calculateAnnualRunoff } from '../src/calc/annualRunoff';
import type { SurfaceItem } from '../src/types';

const sourceId = 'sp32-2018-izm1-5';
const coeff = (value: number) => ({ value, unit: '-', sourceId, basis: 'manual' as const, justification: 'control' });

const surfaces: SurfaceItem[] = [
  { id: 'driveways', name: 'Проезды', kind: 'driveway', areaHa: 1.8697, annualRainCoeff: coeff(0.6), designRainCoeff: coeff(0.8), isHardSurface: true, isWashed: true, isCleanedFromSnow: true, routedToTreatment: true },
  { id: 'lawns', name: 'Газоны', kind: 'lawn', areaHa: 3.3020, annualRainCoeff: coeff(0.1), designRainCoeff: coeff(0.2), isHardSurface: false, isWashed: false, isCleanedFromSnow: false, routedToTreatment: false },
  { id: 'structures', name: 'Сооружения', kind: 'structure', areaHa: 1.3496, annualRainCoeff: coeff(0.5), designRainCoeff: coeff(0.95), isHardSurface: true, isWashed: false, isCleanedFromSnow: true, routedToTreatment: false }
];

describe('Kozenki control example', () => {
  it('keeps control results for formulas that are already fixed in TZ', () => {
    const result = calculateAnnualRunoff({
      totalAreaHa: 6.5213,
      surfaces,
      hdWarmPeriodMm: 443,
      htColdPeriodMm: 187,
      meltRunoffCoeff: 0.7,
      snowCleanedAreaHa: 3.2193,
      washingAreaHa: 1.8697,
      washingRateLPerM2: 1.2,
      washingCountPerYear: 150,
      washingRunoffCoeff: 0.5
    });

    expect(result.snowRemovalCoeffKy).toBeCloseTo(0.5063, 4);
    expect(result.annualMeltVolumeM3).toBeCloseTo(4322, 0);
    expect(result.washingVolumeM3).toBeCloseTo(1683, 0);
  });
});
