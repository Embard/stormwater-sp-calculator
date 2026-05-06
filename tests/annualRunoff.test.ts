import { describe, expect, it } from 'vitest';
import { annualMeltVolumeM3, snowRemovalCoefficientKy, washingVolumeM3 } from '../src/calc/annualRunoff';

const areaHa = 6.5213;
const snowCleanedAreaHa = 3.2193;

describe('annual runoff formulas', () => {
  it('calculates snow removal coefficient Ky', () => {
    expect(snowRemovalCoefficientKy(areaHa, snowCleanedAreaHa)).toBeCloseTo(0.5063, 4);
  });

  it('calculates annual melted runoff for Kozenki control case', () => {
    const ky = snowRemovalCoefficientKy(areaHa, snowCleanedAreaHa);
    const volume = annualMeltVolumeM3(areaHa, 187, 0.7, ky);
    expect(volume).toBeCloseTo(4322, 0);
  });

  it('calculates washing water for Kozenki control case', () => {
    const volume = washingVolumeM3(1.8697, 1.2, 150, 0.5);
    expect(volume).toBeCloseTo(1683, 0);
  });
});
