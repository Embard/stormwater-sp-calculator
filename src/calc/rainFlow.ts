import type { RainFlowInput, RainFlowResult } from '../types';
import { designRainDurationMin, designRainParameterA } from './designRain';

export function calculateRainFlow(input: RainFlowInput): RainFlowResult {
  const { tpMin, trMin } = designRainDurationMin({
    tConMin: input.tConMin.value,
    tCanMin: input.tCanMin.value,
    pipeLengthM: input.pipeLengthM,
    pipeVelocityMS: input.pipeVelocityMS
  });

  const parameterA = designRainParameterA({
    q20: input.q20.value,
    n: input.n.value,
    p: input.p.value,
    mr: input.mr.value,
    gamma: input.gamma.value
  });

  const exponent = 1.2 * input.n.value - 0.1;
  const qrLS =
    trMin > 0
      ? (input.zMid.value * Math.pow(parameterA, 1.2) * input.areaHa) / Math.pow(trMin, exponent)
      : 0;

  return { tpMin, trMin, parameterA, qrLS };
}
