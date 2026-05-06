import { describe, expect, it } from 'vitest';
import { dailyMeltVolumeM3 } from '../src/calc/meltedWater';
import { snowRemovalCoefficientKy } from '../src/calc/annualRunoff';

describe('daily melted runoff', () => {
  it('calculates daily melted runoff for Kozenki control case', () => {
    const ky = snowRemovalCoefficientKy(6.5213, 3.2193);
    const volume = dailyMeltVolumeM3({
      hcMeltTenHourMm: 20,
      areaHa: 6.5213,
      meltRunoffCoeff: 0.7,
      meltUnevennessCoeff: 0.8,
      snowRemovalCoeffKy: ky
    });
    expect(volume).toBeCloseTo(370, 0);
  });
});
