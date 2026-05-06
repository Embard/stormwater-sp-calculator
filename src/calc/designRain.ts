import { minutesFromLengthAndVelocity } from '../utils/units';

export function designRainParameterA(args: {
  q20: number;
  n: number;
  p: number;
  mr: number;
  gamma: number;
}): number {
  const p = Math.max(args.p, 0.000001);
  const mr = Math.max(args.mr, 1.000001);
  const rainfallRepeatFactor = Math.pow(1 + Math.log10(p) / Math.log10(mr), args.gamma);
  return args.q20 * Math.pow(20, args.n) * rainfallRepeatFactor;
}

export function designRainDurationMin(args: {
  tConMin: number;
  tCanMin: number;
  pipeLengthM: number;
  pipeVelocityMS: number;
}): { tpMin: number; trMin: number } {
  const tpMin = minutesFromLengthAndVelocity(args.pipeLengthM, args.pipeVelocityMS);
  return {
    tpMin,
    trMin: args.tConMin + args.tCanMin + tpMin
  };
}
