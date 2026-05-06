import { describe, expect, it } from 'vitest';
import { rainTreatmentVolumeM3 } from '../src/calc/treatmentFlow';

describe('treatment rain volume', () => {
  it('calculates rain treatment volume', () => {
    const volume = rainTreatmentVolumeM3({ haRainTreatmentMm: 10, areaHa: 1.8697, runoffCoeff: 0.8, pollutedRainFraction: 1 });
    expect(volume).toBeCloseTo(149.576, 3);
  });
});
