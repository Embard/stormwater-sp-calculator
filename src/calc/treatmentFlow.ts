import type { TreatmentInput, TreatmentResult } from '../types';
import { mmHaToM3 } from '../utils/units';
import { dailyMeltVolumeM3 } from './meltedWater';

export function rainTreatmentVolumeM3(args: {
  haRainTreatmentMm: number;
  areaHa: number;
  runoffCoeff: number;
  pollutedRainFraction: number;
}): number {
  return mmHaToM3(args.haRainTreatmentMm, args.areaHa) * args.runoffCoeff * args.pollutedRainFraction;
}

function processingCapacity(volumeM3: number, periodHours: number, settlingHours: number, technicalBreakHours: number): number {
  const activeHours = periodHours - settlingHours - technicalBreakHours;
  if (activeHours <= 0) return Number.POSITIVE_INFINITY;
  return volumeM3 / activeHours;
}

export function requiredMeltWorkingVolumeM3(args: {
  dailyMeltVolumeM3: number;
  meltProcessingHours: number;
  consecutiveDays: number;
}): { requiredVolumeM3: number; residualPerDayM3: number } {
  const dailyVolume = Math.max(0, args.dailyMeltVolumeM3);
  const periodHours = Math.max(0, args.meltProcessingHours);
  const days = Math.max(1, Math.floor(args.consecutiveDays || 1));

  if (dailyVolume <= 0 || periodHours <= 24 || days <= 1) {
    return { requiredVolumeM3: dailyVolume, residualPerDayM3: 0 };
  }

  const residualPerDay = dailyVolume * (1 - 24 / periodHours);
  const requiredVolume = dailyVolume + (days - 1) * residualPerDay;

  return {
    requiredVolumeM3: requiredVolume,
    residualPerDayM3: residualPerDay
  };
}

export function calculateTreatment(args: {
  treatment: TreatmentInput;
  haRainTreatmentMm: number;
  hcMeltTenHourMm: number;
  totalAreaHa: number;
  meltRunoffCoeff: number;
  meltUnevennessCoeff: number;
  snowRemovalCoeffKy: number;
}): TreatmentResult {
  const rainVolume = rainTreatmentVolumeM3({
    haRainTreatmentMm: args.haRainTreatmentMm,
    areaHa: args.treatment.rainTreatmentAreaHa,
    runoffCoeff: args.treatment.rainTreatmentCoeff.value,
    pollutedRainFraction: args.treatment.pollutedRainFraction.value
  });

  const meltDailyVolume = dailyMeltVolumeM3({
    hcMeltTenHourMm: args.hcMeltTenHourMm,
    areaHa: args.totalAreaHa,
    meltRunoffCoeff: args.meltRunoffCoeff,
    meltUnevennessCoeff: args.meltUnevennessCoeff,
    snowRemovalCoeffKy: args.snowRemovalCoeffKy
  });

  const rainCapacity = processingCapacity(
    rainVolume,
    args.treatment.rainProcessingHours,
    args.treatment.settlingHours,
    args.treatment.technicalBreakHours
  );
  const meltCapacity = processingCapacity(
    meltDailyVolume,
    args.treatment.meltProcessingHours,
    args.treatment.settlingHours,
    args.treatment.technicalBreakHours
  );

  const meltStorage = requiredMeltWorkingVolumeM3({
    dailyMeltVolumeM3: meltDailyVolume,
    meltProcessingHours: args.treatment.meltProcessingHours,
    consecutiveDays: args.treatment.meltConsecutiveDays
  });

  const requiredWorkingVolume = Math.max(rainVolume, meltStorage.requiredVolumeM3);
  const reserveFactor = 1 + args.treatment.reservoirReservePercent.value / 100;
  const requiredReservoirFullVolume = requiredWorkingVolume * reserveFactor;

  return {
    rainTreatmentVolumeM3: rainVolume,
    dailyMeltVolumeM3: meltDailyVolume,
    rainTreatmentCapacityM3PerH: rainCapacity,
    meltTreatmentCapacityM3PerH: meltCapacity,
    selectedTreatmentCapacityM3PerH: Math.max(rainCapacity, meltCapacity),
    meltResidualPerDayM3: meltStorage.residualPerDayM3,
    requiredMeltWorkingVolumeM3: meltStorage.requiredVolumeM3,
    requiredReservoirWorkingVolumeM3: requiredWorkingVolume,
    reservoirControlCase: meltStorage.requiredVolumeM3 >= rainVolume ? 'melt' : 'rain',
    requiredReservoirFullVolumeM3: requiredReservoirFullVolume,
    reservoirIsEnoughForRain: args.treatment.reservoirWorkingVolumeM3 >= rainVolume,
    reservoirIsEnoughForMelt: args.treatment.reservoirWorkingVolumeM3 >= meltStorage.requiredVolumeM3
  };
}
