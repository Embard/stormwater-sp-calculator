import type { AnnualRunoffResult, SurfaceItem } from '../types';
import { lPerM2HaToM3, mmHaToM3 } from '../utils/units';

export function sumAreaHa(surfaces: SurfaceItem[]): number {
  return surfaces.reduce((sum, s) => sum + s.areaHa, 0);
}

export function weightedCoefficient(
  surfaces: SurfaceItem[],
  coefficientKey: 'annualRainCoeff' | 'designRainCoeff',
  filter: (surface: SurfaceItem) => boolean = () => true
): number {
  const selected = surfaces.filter(filter);
  const area = sumAreaHa(selected);
  if (area <= 0) return 0;
  return selected.reduce((sum, s) => sum + s.areaHa * s[coefficientKey].value, 0) / area;
}

export function snowRemovalCoefficientKy(totalAreaHa: number, snowCleanedAreaHa: number): number {
  if (totalAreaHa <= 0) return 1;
  const ky = 1 - snowCleanedAreaHa / totalAreaHa;
  return Math.min(1, Math.max(0, ky));
}

export function annualRainVolumeM3(areaHa: number, hdWarmPeriodMm: number, weightedPsi: number): number {
  return mmHaToM3(hdWarmPeriodMm, areaHa) * weightedPsi;
}

export function annualMeltVolumeM3(
  areaHa: number,
  htColdPeriodMm: number,
  meltRunoffCoeff: number,
  ky: number
): number {
  return mmHaToM3(htColdPeriodMm, areaHa) * meltRunoffCoeff * ky;
}

export function washingVolumeM3(
  washingAreaHa: number,
  washingRateLPerM2: number,
  washingCountPerYear: number,
  washingRunoffCoeff: number
): number {
  return lPerM2HaToM3(washingRateLPerM2, washingAreaHa) * washingCountPerYear * washingRunoffCoeff;
}

export function calculateAnnualRunoff(args: {
  totalAreaHa: number;
  surfaces: SurfaceItem[];
  hdWarmPeriodMm: number;
  htColdPeriodMm: number;
  meltRunoffCoeff: number;
  snowCleanedAreaHa: number;
  washingAreaHa: number;
  washingRateLPerM2: number;
  washingCountPerYear: number;
  washingRunoffCoeff: number;
}): AnnualRunoffResult {
  const weightedAnnualRainCoeff = weightedCoefficient(args.surfaces, 'annualRainCoeff');
  const annualRainVolume = annualRainVolumeM3(args.totalAreaHa, args.hdWarmPeriodMm, weightedAnnualRainCoeff);
  const ky = snowRemovalCoefficientKy(args.totalAreaHa, args.snowCleanedAreaHa);
  const annualMeltVolume = annualMeltVolumeM3(args.totalAreaHa, args.htColdPeriodMm, args.meltRunoffCoeff, ky);
  const washingVolume = washingVolumeM3(
    args.washingAreaHa,
    args.washingRateLPerM2,
    args.washingCountPerYear,
    args.washingRunoffCoeff
  );

  return {
    totalAreaHa: args.totalAreaHa,
    weightedAnnualRainCoeff,
    annualRainVolumeM3: annualRainVolume,
    snowRemovalCoeffKy: ky,
    annualMeltVolumeM3: annualMeltVolume,
    washingVolumeM3: washingVolume,
    totalAnnualVolumeM3: annualRainVolume + annualMeltVolume + washingVolume
  };
}
