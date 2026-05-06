import { mmHaToM3 } from '../utils/units';

export function dailyMeltVolumeM3(args: {
  hcMeltTenHourMm: number;
  areaHa: number;
  meltRunoffCoeff: number;
  meltUnevennessCoeff: number;
  snowRemovalCoeffKy: number;
}): number {
  return (
    mmHaToM3(args.hcMeltTenHourMm, args.areaHa) *
    args.meltRunoffCoeff *
    args.meltUnevennessCoeff *
    args.snowRemovalCoeffKy
  );
}
