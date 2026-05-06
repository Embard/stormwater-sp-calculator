import { describe, expect, it } from 'vitest';
import { designRainDurationMin, designRainParameterA } from '../src/calc/designRain';

describe('design rain calculations', () => {
  it('calculates pipe travel time from length and velocity', () => {
    const duration = designRainDurationMin({ tConMin: 5, tCanMin: 0, pipeLengthM: 120, pipeVelocityMS: 0.8 });
    expect(duration.tpMin).toBeCloseTo(2.5, 3);
    expect(duration.trMin).toBeCloseTo(7.5, 3);
  });

  it('calculates A parameter', () => {
    const a = designRainParameterA({ q20: 80, n: 0.67, p: 1, mr: 150, gamma: 1.54 });
    expect(a).toBeGreaterThan(0);
  });
});
